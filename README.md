# 拾页手帐

手机优先的手帐生成网页。当前版本本地可用：

- 多图上传与预览
- 客户端读取 EXIF：时间、相机、镜头、焦距、光圈、快门、ISO、坐标
- 点选式补全：场景、情绪、叙述方式、标题
- 自动/手动风格：优雅纸本、复古繁盛、旅行档案、可爱治愈
- 模板切换与照片顺序调整
- 6-10 页可翻阅手帐本
- 导出当前页或全部页为 PNG

## 运行

```bash
npm install
npm run dev
```

默认地址：

```text
http://localhost:5173
```

手机预览时，让手机和电脑处在同一网络，打开 Vite 输出的 Network 地址。

## API Key 配置

本项目支持多个 AI 模型，需要配置相应的 API Key。支持三种配置方式（优先级从高到低）：

### 1. 本地配置文件（推荐开发时使用）

复制 `src/lib/api-keys.local.ts` 文件（如果还没有的话），在其中填入你的 API Key：

```typescript
export const API_KEYS_CONFIG = {
  VITE_KRATOS_API_TOKEN: "your-kratos-api-key",
  VITE_REPLICATE_API_TOKEN: "your-replicate-api-token",
  VITE_QS_GPT_IMAGE_2_API_KEY: "your-qs-gpt-image-2-api-key",
  VITE_MAAS_API_KEY: "your-maas-api-key",
  // ... 其他配置
};
```

**注意**：此文件已在 `.gitignore` 中，不会被提交到版本控制。

### 2. 环境变量（推荐生产环境使用）

在 `.env` 或 `.env.local` 文件中配置：

```bash
VITE_KRATOS_API_TOKEN=your-kratos-api-token
VITE_REPLICATE_API_TOKEN=your-replicate-api-token
VITE_QS_GPT_IMAGE_2_API_KEY=your-qs-gpt-image-2-api-key
VITE_MAAS_API_KEY=your-maas-api-key
```

或在启动时传入：

```bash
VITE_KRATOS_API_TOKEN=xxx npm run dev
```

### 3. UI 配置面板

在应用中点击右上角的 API 配置按钮，输入你的 API Key。此方式会将配置存储在浏览器的 localStorage 中。

### 支持的模型

| 模型 | 环境变量 | 获取方式 |
|---|---|---|
| GPT-2 (Kratos) | `VITE_KRATOS_API_TOKEN` | 联系管理员 叶瑄（丁江颖） |
| FLUX.2 Pro (Replicate) | `VITE_REPLICATE_API_TOKEN` | https://replicate.com/account/api-tokens |
| QS GPT Image 2 | `VITE_QS_GPT_IMAGE_2_API_KEY` | 联系管理员 叶瑄（丁江颖） |
| 视觉大模型 (qwen3-vl) | `VITE_MAAS_API_KEY` | 联系管理员 叶瑄（丁江颖） |

### 模型可用性

- 只有配置了 API Key 的模型才会在「生成模型」下拉菜单中显示
- 如果没有配置任何模型的 API Key，应用会提示需要先配置或联系管理员

## Kratos LLM 接入（默认开启）

点击「装订手帐本」时，前端会按下方流程触发 Kratos 的 `UnifiedPic2PicAction`，用返回的图片替换右侧默认拼贴模板：

1. 把用户在弹窗里配置的**场景 / 情绪 / 叙述方式 / 风格 / 模板 / 标题**拼成一条中文 `prompt`（实现见 [`buildKratosPrompt`](src/lib/modelClient.ts)）。
2. 收集每张照片对应的远程链接，优先级：**用户手填 > COS 自动上传得到的 URL > 接口示例兜底**，保证 `imageUrls` ≥ 2。详见下方「图片自动上传到 COS」一节。
3. 通过本地 Vite 代理 `/kratos/...` 转发到 `http://kratos-sunyihao.sl.beta.xiaohongshu.com/ads/materialcenter/doaction`，绕开浏览器 CORS。代理见 [`vite.config.ts`](vite.config.ts)。
4. 从返回 JSON 中自动提取图片链接（兼容 `data.imageUrl`、`data.url`、嵌套或数组结构等多种字段），写入 `JournalDraft.generatedImageUrl`。
5. 右侧画册：
   - 顶部新增一张「LLM 生成结果」横幅，展示生成图、prompt、一键下载；
   - 封面页与章节页的多照片拼贴会被替换为这张生成图；
   - 翻页、内页文字、EXIF 信息、按 PNG 导出等原能力全部保留。

发出的请求形状：

```json
{
  "tabName": "material_analysis_tab",
  "actionCode": "UnifiedPic2PicAction",
  "paramsMap": {
    "prompt": "<由弹窗参数拼出的中文 prompt>",
    "modelType": "gpt2",
    "imageUrls": ["https://...", "https://..."],
    "targetWidth": "1024",
    "targetHeight": "1536"
  }
}
```

如需直接走线上地址（跳过本地代理），可以通过环境变量覆盖：

```bash
VITE_KRATOS_ACTION_URL="http://your-host/ads/materialcenter/doaction" npm run dev
```

> 提示：用户上传的本地图片是 blob 链接，Kratos 服务端拿不到。本项目已实现「选图自动上传到 COS」，无需手工再贴 URL；若上传失败，仍可在弹窗里手填可访问链接，或退化为示例 CDN 图兜底。

## 图片自动上传到 COS

为了让 LLM 能直接取到用户选中的本地图片，[`processImageFile`](src/lib/imageTools.ts) 在解析 EXIF / 尺寸 / 主色的同时，会并发把 `File` PUT 到腾讯云 COS：

```bash
curl -X PUT "https://test2-1307114076.cos.ap-guangzhou.myqcloud.com/journal/YYYYMMDD/{uuid}.{ext}" \
     -H "Content-Type: image/png" \
     --data-binary @本地文件路径
```

实现位于 [`src/lib/cosUploader.ts`](src/lib/cosUploader.ts)：

- **路径策略**：`journal/yyyymmdd/uuid.ext`，按天分桶 + 唯一 UUID 防覆盖；
- **Content-Type**：优先取 `File.type`，未知扩展兜底为 `application/octet-stream`；
- **超时**：默认 60s，可在调用时覆盖；
- **失败容错**：上传失败只把 `remoteUrl` 留空，不阻断本地预览与后续流程；
- **dev / prod 双路径**（见下方）；
- **环境变量**：

  ```bash
  # 切换到另一个 bucket / 域名（一旦设置，dev 也直连真实 URL，不走 vite 代理）
  VITE_COS_PUT_BASE="https://your-bucket.cos.your-region.myqcloud.com"
  # 自定义对象前缀
  VITE_COS_PATH_PREFIX="custom-prefix/"
  ```

### 上传链路（dev 走代理 / prod 走 CORS）

| 环境 | 请求路径 | 浏览器视角 | 需要的配置 |
|---|---|---|---|
| `npm run dev` | `PUT /cos-upload/journal/...` | 同源，无 preflight | [`vite.config.ts`](vite.config.ts) 的 `/cos-upload` 反代（已开箱即用） |
| `npm run build` / `preview` 或线上 | `PUT https://test2-1307114076.cos.ap-guangzhou.myqcloud.com/journal/...` | 跨域 | bucket 控制台配置 CORS 规则 **或** 在部署侧（nginx）同步反代 `/cos-upload` |

> 注意：[`uploadToCos`](src/lib/cosUploader.ts) **返回给 LLM/Kratos 的 URL 永远是完整 COS 公网链接**，不是 dev 代理路径。这样 LLM 服务端拿到的 URL 一定可达。

### ⚠ CORS 配置（生产环境必读）

dev 环境无需配；只有 `npm run build` 或线上部署直接 PUT 到 COS 域名时才需要。
在 COS 控制台 → 该 bucket → 安全管理 → CORS 规则，至少添加：

| 字段 | 推荐值 |
|---|---|
| 来源 Origin | 你的部署域名（生产）；本地 preview 可加 `http://localhost:4173` |
| 操作 Methods | `PUT`、`GET`、`HEAD` |
| Allow-Headers | `Content-Type`、`*` |
| Expose-Headers | `ETag` |
| 超时 Max-Age | `600` |

> 该 bucket 还需开启**匿名公共读 + 匿名公共写**（仅限测试环境）。如需正式签名上传，请在 [`cosUploader.ts`](src/lib/cosUploader.ts) 中接入 STS / 临时密钥。
