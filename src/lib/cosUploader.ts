/**
 * 腾讯云 COS PUT 上传工具
 * ---------------------------------------------------------------------------
 * 目标：把用户本地选中的图片上传到测试 bucket，得到 Kratos UnifiedPic2PicAction
 *      可访问的公网 URL，再交给 LLM 做参考图。
 *
 * 等价 curl：
 *   curl -X PUT "https://journal-photos-1302323802.cos.ap-shanghai.myqcloud.com/{path}" \
 *        -H "Content-Type: image/png" \
 *        --data-binary @本地文件
 *
 * 设计要点：
 *   1. **无签名 PUT**：依赖该 bucket 已开放匿名 PUT/READ 权限（测试环境约定）。
 *      生产环境若需正式签名，请改造此处接入 STS / 临时密钥。
 *   2. **路径策略**：journal/yyyymmdd/uuid.ext，避免覆盖与重名冲突。
 *   3. **Content-Type**：优先用 File.type，未知扩展兜底为 application/octet-stream。
 *   4. **失败处理**：上传失败抛出可读 Error；调用方决定是否阻断本地预览。
 *   5. **CORS**：浏览器直连 PUT 需要 bucket 控制台配置 CORS 规则（允许 PUT + 当前 origin），
 *      代码层面无法绕过，README 已说明。
 */

/** 上传基础 URL（含协议、bucket-region 域名，不含末尾斜杠）。 */
const COS_PUT_BASE =
  (import.meta.env.VITE_COS_PUT_BASE as string | undefined)?.replace(/\/+$/, "") ||
  "https://journal-photos-1302323802.cos.ap-shanghai.myqcloud.com";

/** 对象前缀（默认 journal/）。 */
const COS_PATH_PREFIX = ((import.meta.env.VITE_COS_PATH_PREFIX as string | undefined) || "journal/").replace(
  /^\/+|\/+$/g,
  "",
);

/** 由文件名 / MIME 推断扩展名，兜底为 bin。 */
const inferExtension = (file: File): string => {
  const fromName = /\.([a-zA-Z0-9]{1,6})$/.exec(file.name)?.[1]?.toLowerCase();
  if (fromName) return fromName;
  const mimeMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/heic": "heic",
    "image/heif": "heif",
    "image/avif": "avif",
    "image/bmp": "bmp",
    "image/svg+xml": "svg",
  };
  return mimeMap[file.type] || "bin";
};

/** 生成形如 20251229 的日期段（按本地时区即可，仅用于路径分桶）。 */
const todayStamp = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
};

/** UUID 兜底（旧浏览器无 crypto.randomUUID 时用时间戳 + 随机数）。 */
const uniqueId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
};

/**
 * Vite 代理路径前缀（仅 dev 生效，对应 vite.config.ts 的 /cos-upload 反代）。
 * 开启代理后浏览器认为 PUT 是同源请求，不会触发 CORS preflight，
 * dev 环境无需在 COS 控制台配 CORS 也能直接上传。
 */
const DEV_PROXY_PREFIX = "/cos-upload";

/**
 * 是否走 dev 代理：
 *   - import.meta.env.DEV 为 true（vite dev 启动）；
 *   - 同时未通过 VITE_COS_PUT_BASE 强制覆盖（用户可显式关闭代理跑真实链路）。
 * 注：production 构建（vite build / preview）走完整 URL，依赖 bucket CORS 或部署侧反代。
 */
const USE_DEV_PROXY =
  import.meta.env.DEV && !(import.meta.env.VITE_COS_PUT_BASE as string | undefined);

/** 单独构造对象 key（不含 host），供 dev/prod 两种路径共用。 */
const buildObjectKey = (file: File): string => {
  const ext = inferExtension(file);
  return [COS_PATH_PREFIX, todayStamp(), `${uniqueId()}.${ext}`].filter(Boolean).join("/");
};

/** 真正向网络发出的 PUT 地址：dev 走 /cos-upload 反代、prod 走完整 COS URL。 */
const buildRequestUrl = (objectKey: string): string => {
  if (USE_DEV_PROXY) return `${DEV_PROXY_PREFIX}/${objectKey}`;
  return `${COS_PUT_BASE}/${objectKey}`;
};

/** 返回给 LLM/Kratos 使用的「对外可访问 URL」始终是完整 COS 公网链接。 */
const buildPublicUrl = (objectKey: string): string => `${COS_PUT_BASE}/${objectKey}`;

const DEFAULT_TIMEOUT_MS = 60_000;

const COS_DEBUG = import.meta.env.DEV;
const clog = (...args: unknown[]) => {
  if (COS_DEBUG) console.info("[COS]", ...args);
};

/**
 * 把本地 File PUT 上传到 COS，成功返回可被 LLM 访问的公网 URL。
 *
 * @param file 浏览器 File 对象（通常来自 <input type="file">）
 * @param timeoutMs 单次上传超时（默认 60s，大图可适当调大）
 * @returns 上传后的完整 URL
 */
export const uploadToCos = async (file: File, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<string> => {
  if (!file) throw new Error("待上传文件为空");
  const objectKey = buildObjectKey(file);
  const requestUrl = buildRequestUrl(objectKey);
  const publicUrl = buildPublicUrl(objectKey);
  const contentType = file.type || "application/octet-stream";

  clog("PUT →", requestUrl, { size: file.size, type: contentType, viaProxy: USE_DEV_PROXY });

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(requestUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      // fetch 会把 File 当成 binary body 透传，无需再 ArrayBuffer 转换
      body: file,
      signal: controller.signal,
      // 避免代理 / Service Worker 缓存
      cache: "no-store",
    });

    if (!response.ok) {
      // 读取一小段响应文本帮助定位（COS 失败时返回 XML 描述）
      const body = await response.text().catch(() => "");
      throw new Error(
        `COS 上传失败 HTTP ${response.status}${body ? `：${body.slice(0, 200)}` : ""}`,
      );
    }

    clog("← uploaded", publicUrl);
    // 返回的是「对外公网 URL」，不是 dev 代理路径——给 LLM/Kratos 用必须是公网可达。
    return publicUrl;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`COS 上传 ${Math.round(timeoutMs / 1000)} 秒内未完成`);
    }
    if (error instanceof TypeError && /Failed to fetch|NetworkError/i.test(error.message)) {
      // dev 环境理论上已被 /cos-upload 代理消化，如果还失败八成是代理没生效（需要重启 vite dev）。
      throw new Error(
        USE_DEV_PROXY
          ? "COS 上传被浏览器拦截：dev 代理 /cos-upload 未生效，请重启 `npm run dev` 让 vite.config.ts 的代理配置加载"
          : "COS 上传被浏览器拦截（多半是 CORS）：请在 COS 控制台为该 bucket 配置允许 PUT 的 CORS 规则，或部署时同样反代 /cos-upload",
      );
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

/**
 * 批量上传：保持与输入顺序一致返回；任意失败不中断其它任务，失败项返回 null。
 * 适合多张图片并发上传场景，调用方按需自行决定是否阻断。
 */
export const uploadManyToCos = async (
  files: File[],
  timeoutMs?: number,
): Promise<Array<string | null>> => {
  return Promise.all(
    files.map(async (file) => {
      try {
        return await uploadToCos(file, timeoutMs);
      } catch (error) {
        clog("× upload failed", file.name, error);
        return null;
      }
    }),
  );
};
