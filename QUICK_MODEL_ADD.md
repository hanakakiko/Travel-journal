# 快速添加新模型 - 5 分钟指南

## 快速步骤

### 1️⃣ 在 `src/lib/modelConfig.ts` 中添加模型配置

```typescript
// 在 MODEL_CONFIGS 对象中添加
"your-model-id": {
  id: "your-model-id",
  name: "Your Model Display Name",
  description: "Brief description of the model",
  provider: "provider-name",
  endpoint: "/api/your-endpoint",
  apiTokenEnvVar: "VITE_YOUR_API_TOKEN",
  fallbackToken: "optional-token",
  maxReferenceImages: 8,
  supportedAspectRatios: ["1:1", "16:9", "9:16"],
  defaultAspectRatio: "9:16",
  supportedOutputFormats: ["png", "jpg"],
  defaultOutputFormat: "png",
  estimatedTimeSeconds: 30,
},
```

### 2️⃣ 在 `src/types.ts` 中更新 ModelType

```typescript
export type ModelType = "gpt-2" | "flux-2-pro" | "your-model-id";
```

### 3️⃣ 在 `src/lib/modelRouter.ts` 中添加路由

```typescript
case "your-model-id":
  return await callYourModelAPI({
    prompt: params.prompt,
    imageUrls: params.imageUrls,
    targetWidth: params.targetWidth,
    targetHeight: params.targetHeight,
    timeoutMs: params.timeoutMs,
    maxAttempts: params.maxAttempts,
    retryDelayMs: params.retryDelayMs,
    onAttempt: params.onAttempt,
  });
```

### 4️⃣ 在 `src/lib/modelClient.ts` 中实现 API 调用

```typescript
const callYourModelAPI = async ({
  prompt,
  imageUrls,
  targetWidth = DEFAULT_GEN_WIDTH,
  targetHeight = DEFAULT_GEN_HEIGHT,
  timeoutMs = 300_000,
  maxAttempts = 3,
  retryDelayMs = 1500,
  onAttempt,
}: YourModelParams): Promise<ModelCallResult> => {
  // 实现你的 API 调用逻辑
  // 必须返回 { imageUrl: string, raw: unknown }
  
  return {
    imageUrl: "https://...",
    raw: responseData,
  };
};
```

### 5️⃣ 配置环境变量

在 `.env.local` 中添加：
```env
VITE_YOUR_API_TOKEN=your_token_here
```

## 完成！🎉

模型现在会自动出现在 UI 的"生成模型"选择器中。

## 最小化实现示例

```typescript
// modelConfig.ts
"simple-model": {
  id: "simple-model",
  name: "Simple Model",
  description: "A simple test model",
  provider: "test",
  endpoint: "/api/simple",
  apiTokenEnvVar: "VITE_SIMPLE_TOKEN",
  maxReferenceImages: 1,
  supportedAspectRatios: ["1:1"],
  defaultAspectRatio: "1:1",
  supportedOutputFormats: ["png"],
  defaultOutputFormat: "png",
  estimatedTimeSeconds: 10,
}

// modelRouter.ts
case "simple-model":
  return await callSimpleModelAPI(params);

// modelClient.ts
const callSimpleModelAPI = async (params: ModelCallParams) => {
  const response = await fetch("/api/simple", {
    method: "POST",
    body: JSON.stringify({
      prompt: params.prompt,
      images: params.imageUrls,
    }),
  });
  const data = await response.json();
  return {
    imageUrl: data.result_url,
    raw: data,
  };
};
```

## 常见参数值

### 宽高比
- `"1:1"` - 正方形
- `"16:9"` - 横向
- `"9:16"` - 竖向（推荐用于手帐）
- `"3:2"`, `"2:3"`, `"4:5"`, `"5:4"`, `"3:4"`, `"4:3"` - 其他比例

### 输出格式
- `"png"` - 无损，文件较大
- `"jpg"` - 有损，文件较小
- `"webp"` - 现代格式，平衡质量和大小

### 生成时间估计
- 快速模型: 10-15 秒
- 中等模型: 20-30 秒
- 高质量模型: 30-60 秒

## 调试技巧

1. **查看完整请求/响应**: 检查浏览器控制台的 `[Kratos]` 日志
2. **测试 API Token**: 确保环境变量正确设置
3. **验证参数格式**: 检查 API 文档确保参数格式正确
4. **处理错误**: 实现适当的错误处理和重试逻辑

## 需要帮助？

参考完整指南: [`MODEL_ROUTING_GUIDE.md`](MODEL_ROUTING_GUIDE.md)
