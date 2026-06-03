/**
 * 视觉大模型客户端（qwen3-vl-32b-instruct）
 * ---------------------------------------------------------------------------
 * 接口约定（来自需求方提供的 curl）：
 *   POST https://maas.devops.xiaohongshu.com/v1/chat/completions
 *   Headers:
 *     Content-Type: application/json
 *     api-key: QSTab73a13e3d1360627adca665ed407478
 *     x-maas-user-email: <用户邮箱>
 *     x-maas-app-id: qs-api
 *   Body:
 *     model: qwen3-vl-32b-instruct
 *     messages: [{ role: "user", content: [text + image_url] }]
 *
 * 用途：在「让小兔先看一眼照片」按钮触发后，逐张读图，让模型返回
 *   {
 *     scene: "美食 / 风景 / 人像 / 地标 / 街景 / 其他",
 *     tone:  "暖色 / 冷色 / 高对比 / 柔和 / ...",
 *     mood:  "治愈 / 热闹 / 安静 / ...",
 *     keywords: ["关键词1", "关键词2", "关键词3"]
 *   }
 * 上层把多个字段拍平成 ["美食", "暖色", "治愈", "拉花"] 之类的 chips 显示。
 */

const MAAS_DEBUG = import.meta.env.DEV;
const vlog = (...args: unknown[]) => {
  if (MAAS_DEBUG) console.info("[VLM]", ...args);
};

/** dev 走 /maas 代理避免 CORS；prod 走完整 URL，可由环境变量覆盖。 */
const MAAS_BASE =
  (import.meta.env.VITE_MAAS_BASE as string | undefined)?.replace(/\/+$/, "") ||
  (import.meta.env.DEV ? "/maas" : "https://maas.devops.xiaohongshu.com");

const MAAS_API_KEY =
  (import.meta.env.VITE_MAAS_API_KEY as string | undefined) || "QSTab73a13e3d1360627adca665ed407478";

const MAAS_USER_EMAIL =
  (import.meta.env.VITE_MAAS_USER_EMAIL as string | undefined) || "moenzhe@xiaohongshu.com";

const MAAS_APP_ID = (import.meta.env.VITE_MAAS_APP_ID as string | undefined) || "qs-api";

const DEFAULT_TIMEOUT_MS = 60_000;

const VISION_PROMPT = `你正在帮一份「手帐画册」做素材标注。请观察这张照片，用 JSON 输出，不要任何额外说明或代码块。
JSON 字段：
  - scene：场景类型，从 ["美食","风景","人像","地标","街景","建筑","室内","活动","物件","宠物","植物","其他"] 中挑一个；
  - tone：主色调，从 ["暖色","冷色","高对比","低饱和","胶片","黑白","柔和","明亮","暗调"] 中挑一个；
  - mood：氛围/情绪，用 2-4 字短词，例如「治愈」「热闹」「静谧」「怀旧」「松弛」；
  - keywords：3-5 个 2-6 字中文关键词，描述画面主体或细节（不要重复 scene/tone/mood）。
仅输出 JSON 对象本身，例如：{"scene":"美食","tone":"暖色","mood":"治愈","keywords":["咖啡","拉花","木桌","冬日"]}`;

export type VisionTagResult = {
  scene?: string;
  tone?: string;
  mood?: string;
  keywords: string[];
  /** 拍平后的全部标签，便于直接渲染 chip。 */
  flat: string[];
  /** 模型原始返回文本（调试 / 兜底解析失败时观察）。 */
  raw?: string;
};

const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit, timeoutMs: number) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`VLM ${Math.round(timeoutMs / 1000)} 秒内未返回`);
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

/** 尝试在自由文本中提取第一个 JSON 对象，对模型偶尔的 markdown 包裹做容错。 */
const extractJson = (text: string): Record<string, unknown> | null => {
  const trimmed = text.trim();
  // 直接尝试
  try {
    return JSON.parse(trimmed);
  } catch {
    // 找第一个 { 与最后一个 } 之间的内容
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
};

/**
 * 对单张照片调用 VLM，返回 scene/tone/mood/keywords 标签。
 * @param imageUrl 必须是公网可达的 URL（COS 上传后的链接最合适）。
 * @param timeoutMs 单次请求超时（默认 60s）。
 */
export const recognizePhotoTags = async (
  imageUrl: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<VisionTagResult> => {
  if (!imageUrl) throw new Error("待识别图片 URL 为空");
  const endpoint = `${MAAS_BASE}/v1/chat/completions`;

  const body = {
    model: "qwen3-vl-32b-instruct",
    messages: [
      {
        role: "system",
        content: "你是一个擅长视觉理解的 AI 标注助手，输出 JSON。",
      },
      {
        role: "user",
        content: [
          { type: "text", text: VISION_PROMPT },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
    stream: false,
    max_tokens: 512,
    temperature: 0.3,
  };

  vlog("→", endpoint, imageUrl);

  const response = await fetchWithTimeout(
    endpoint,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": MAAS_API_KEY,
        "x-maas-user-email": MAAS_USER_EMAIL,
        "x-maas-app-id": MAAS_APP_ID,
      },
      body: JSON.stringify(body),
    },
    timeoutMs,
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`VLM HTTP ${response.status}${text ? `：${text.slice(0, 180)}` : ""}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };

  if (payload.error?.message) throw new Error(`VLM 业务错：${payload.error.message}`);
  const text = payload.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("VLM 未返回有效内容");
  vlog("←", text);

  const json = extractJson(text);
  const scene = typeof json?.scene === "string" ? json.scene : undefined;
  const tone = typeof json?.tone === "string" ? json.tone : undefined;
  const mood = typeof json?.mood === "string" ? json.mood : undefined;
  const keywords = Array.isArray(json?.keywords)
    ? (json!.keywords as unknown[]).filter((k): k is string => typeof k === "string").slice(0, 6)
    : [];

  // 拍平：scene + tone + mood + keywords，去重
  const flat = Array.from(
    new Set(
      [scene, tone, mood, ...keywords]
        .filter((t): t is string => Boolean(t && t.trim()))
        .map((t) => t.trim()),
    ),
  );

  return { scene, tone, mood, keywords, flat, raw: text };
};

/** 批量识图：并发执行，单张失败不阻断其它任务。 */
export const recognizePhotoBatch = async (
  imageUrls: Array<{ id: string; url: string }>,
  timeoutMs?: number,
): Promise<Record<string, string[]>> => {
  const entries = await Promise.all(
    imageUrls.map(async ({ id, url }) => {
      try {
        const tags = await recognizePhotoTags(url, timeoutMs);
        return [id, tags.flat] as const;
      } catch (error) {
        vlog("× failed", id, error);
        return [id, [] as string[]] as const;
      }
    }),
  );
  const map: Record<string, string[]> = {};
  for (const [id, tags] of entries) {
    if (tags.length) map[id] = tags;
  }
  return map;
};
