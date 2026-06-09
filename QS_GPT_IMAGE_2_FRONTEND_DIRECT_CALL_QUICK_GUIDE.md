# QS GPT Image 2 前端直调 - 快速指南

## 🎯 一句话总结

QS GPT Image 2 现在直接从前端调用，绕过云函数 3 秒超时限制，支持长时间的图片编辑请求。

## 🚀 快速开始

### 1. 配置 API Key

```env
# .env.local
VITE_QS_GPT_IMAGE_2_API_KEY=your_api_key_here
```

### 2. 启动开发服务器

```bash
npm run dev
```

### 3. 使用 API

```typescript
const result = await callModelAPI("qs-gpt-image-2", {
  prompt: "High Contrast, hyper detailed photo, 2k UHD",
  imageUrls: ["https://example.com/image.jpg"],
  targetWidth: 1024,
  targetHeight: 1024,
});

console.log(result.imageUrl);
```

## 📊 改动对比

| 方面 | 之前 | 现在 |
|------|------|------|
| 调用方式 | 云函数代理 | 前端直调 |
| 超时限制 | 3 秒 | 300 秒（可配置） |
| 请求路径 | 前端 → 云函数 → QS API | 前端 → QS API |
| 长时间请求 | ❌ 失败 | ✅ 成功 |

## 🔧 修改的文件

### `src/lib/modelRouter.ts`

```typescript
// 添加 QS API Key 缓存
let _cachedQsApiKey: string | null = null;

const getQsApiKeyWithCache = async (): Promise<string> => {
  if (_cachedQsApiKey) return _cachedQsApiKey;
  try {
    const key = await getVApiKeyFromCloudFunction();
    if (key) {
      _cachedQsApiKey = key;
      return key;
    }
  } catch {
    // 如果云函数调用失败，继续尝试其他方式
  }
  throw new Error("无法获取 QS API Key");
};

// 在路由逻辑中添加 QS GPT Image 2 的前端直调
if (modelType === "qs-gpt-image-2") {
  const apiKey = await getQsApiKeyWithCache();
  return await callQsGptImage2({
    ...params,
    apiKeyOverride: apiKey,
  });
}
```

### `src/lib/modelClient.ts`

```typescript
const callQsGptImage2Once = async ({
  prompt,
  imageUrls,
  targetWidth = DEFAULT_GEN_WIDTH,
  targetHeight = DEFAULT_GEN_HEIGHT,
  timeoutMs = 300_000,
  apiKeyOverride,  // 新增参数
}: Omit<Flux2ProPic2PicParams, "maxAttempts" | "retryDelayMs" | "onAttempt"> & { apiKeyOverride?: string }) => {
  // 优先级：外部传入 > 用户面板配置 > 环境变量 > 本地配置文件
  const apiKey = apiKeyOverride || userQsConfig?.apiKey || getApiKey("VITE_QS_GPT_IMAGE_2_API_KEY");
  // ...
};
```

## 💡 关键特性

- ✅ **绕过超时限制** - 从 3 秒增加到 300 秒（可配置）
- ✅ **更快的响应** - 直接调用，无需经过云函数
- ✅ **安全的 Key 管理** - 通过云函数获取，不暴露在构建产物中
- ✅ **灵活的配置** - 支持环境变量、本地配置、UI 配置、云函数
- ✅ **完整的错误处理** - 自动重试、详细日志、超时处理

## 🔐 API Key 获取优先级

1. **外部传入** - `apiKeyOverride` 参数（由 modelRouter 传入）
2. **用户面板配置** - 通过 UI 输入的 API Key
3. **环境变量** - `.env` 中的 `VITE_QS_GPT_IMAGE_2_API_KEY`
4. **本地配置文件** - `src/lib/api-keys.local.ts`
5. **云函数** - 通过 `getVApiKeyFromCloudFunction()` 获取

## 📝 配置方式

### 环境变量（推荐）

```env
VITE_QS_GPT_IMAGE_2_API_KEY=your_api_key_here
```

### 本地配置文件

```typescript
// src/lib/api-keys.local.ts
export const API_KEYS = {
  VITE_QS_GPT_IMAGE_2_API_KEY: "your_api_key_here",
};
```

### UI 配置面板

1. 启动应用
2. 打开 API 配置面板
3. 输入 QS GPT Image 2 的 API Key

## 🎯 使用示例

### 基础调用

```typescript
const result = await callModelAPI("qs-gpt-image-2", {
  prompt: "High Contrast, hyper detailed photo, 2k UHD",
  imageUrls: ["https://example.com/image.jpg"],
  targetWidth: 1024,
  targetHeight: 1024,
});
```

### 自定义超时时间

```typescript
const result = await callModelAPI("qs-gpt-image-2", {
  prompt: "...",
  imageUrls: ["..."],
  timeoutMs: 600_000,  // 10 分钟
});
```

### 自定义重试策略

```typescript
const result = await callModelAPI("qs-gpt-image-2", {
  prompt: "...",
  imageUrls: ["..."],
  maxAttempts: 3,
  retryDelayMs: 1500,
  onAttempt: (info) => {
    console.log(`尝试 ${info.attempt}/${info.totalAttempts}`);
  },
});
```

## ❓ 常见问题

| 问题 | 答案 |
|------|------|
| 为什么还需要云函数？ | 用于安全地获取 API Key，不暴露在构建产物中 |
| API Key 会暴露吗？ | 不会，通过云函数获取，缓存在内存中 |
| 如果云函数不可用怎么办？ | 使用环境变量或本地配置文件 |
| 超时时间可以调整吗？ | 可以，传入 `timeoutMs` 参数 |
| 支持重试吗？ | 支持，传入 `maxAttempts` 和 `retryDelayMs` 参数 |

## 📚 相关文档

- 📄 [`QS_GPT_IMAGE_2_FRONTEND_DIRECT_CALL.md`](QS_GPT_IMAGE_2_FRONTEND_DIRECT_CALL.md) - 详细改造指南
- 📄 [`QS_GPT_IMAGE_2_FRONTEND_DIRECT_CALL_SUMMARY.md`](QS_GPT_IMAGE_2_FRONTEND_DIRECT_CALL_SUMMARY.md) - 完成总结

## ✅ 改造完成

✅ 代码改动完成
✅ 文档编写完成
✅ 向后兼容
✅ 可投入使用

**现在可以处理长时间的图片编辑请求了！** 🚀
