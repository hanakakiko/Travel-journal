# 模型路由系统使用指南

## 概述

这个项目现在支持灵活的模型路由系统，可以轻松切换和添加不同的图生图模型。

## 当前支持的模型

### 1. FLUX.2 [pro] (推荐)
- **提供商**: Replicate
- **特点**: 支持最多 8 张参考图，质量最高
- **生成时间**: ~30 秒
- **状态**: ✅ 完全实现

### 2. GPT-2 (Kratos)
- **提供商**: 小红书内部 Kratos 平台
- **特点**: 速度快，适合快速迭代
- **生成时间**: ~15 秒
- **状态**: ⏳ 待实现

## 文件结构

```
src/lib/
├── modelConfig.ts      # 模型配置定义
├── modelRouter.ts      # 模型路由逻辑
└── modelClient.ts      # API 调用实现
```

## 如何添加新模型

### 第 1 步：在 `modelConfig.ts` 中定义模型配置

```typescript
export const MODEL_CONFIGS: Record<ModelType, ModelConfig> = {
  "your-model": {
    id: "your-model",
    name: "Your Model Name",
    description: "Model description",
    provider: "provider-name",
    endpoint: "/api/endpoint",
    apiTokenEnvVar: "VITE_YOUR_API_TOKEN",
    fallbackToken: "optional-fallback-token",
    maxReferenceImages: 8,
    supportedAspectRatios: ["1:1", "16:9", "9:16"],
    defaultAspectRatio: "9:16",
    supportedOutputFormats: ["png", "jpg", "webp"],
    defaultOutputFormat: "png",
    estimatedTimeSeconds: 30,
  },
};
```

### 第 2 步：在 `modelRouter.ts` 中实现模型调用

```typescript
export const callModelAPI = async (
  modelType: ModelType,
  params: ModelCallParams
): Promise<ModelCallResult> => {
  const config = getModelConfig(modelType);

  switch (modelType) {
    case "your-model":
      return await callYourModelAPI({
        prompt: params.prompt,
        imageUrls: params.imageUrls,
        // ... 其他参数
      });
    // ... 其他模型
  }
};
```

### 第 3 步：在 `modelClient.ts` 中实现具体的 API 调用

创建一个新的函数，例如 `callYourModelAPI`，实现与你的模型 API 的交互：

```typescript
const callYourModelAPI = async ({
  prompt,
  imageUrls,
  // ... 其他参数
}: YourModelParams): Promise<ModelCallResult> => {
  // 实现 API 调用逻辑
  // 返回 { imageUrl, raw }
};
```

### 第 4 步：更新 `types.ts` 中的 ModelType

```typescript
export type ModelType = "gpt-2" | "flux-2-pro" | "your-model";
```

## 使用示例

### 在代码中使用模型路由

```typescript
import { callModelAPI } from "./lib/modelRouter";

const result = await callModelAPI("flux-2-pro", {
  prompt: "Your prompt here",
  imageUrls: ["url1", "url2"],
  onAttempt: (info) => console.log(`Attempt ${info.attempt}/${info.totalAttempts}`),
});

console.log(result.imageUrl); // 生成的图片 URL
```

### 在 UI 中选择模型

用户可以在"补充信息"面板中的"生成模型"部分选择不同的模型。选择会自动保存到 `answers.selectedModel`。

## 模型配置参数说明

| 参数 | 说明 | 示例 |
|------|------|------|
| `id` | 模型唯一标识 | `"flux-2-pro"` |
| `name` | 显示名称 | `"FLUX.2 [pro]"` |
| `description` | 模型描述 | `"支持多张参考图..."` |
| `provider` | 服务提供商 | `"replicate"` |
| `endpoint` | API 端点 | `"/replicate/v1/predictions"` |
| `apiTokenEnvVar` | API Token 环境变量名 | `"VITE_REPLICATE_API_TOKEN"` |
| `fallbackToken` | 备用 Token（可选） | `"r8_..."` |
| `maxReferenceImages` | 最多支持的参考图数量 | `8` |
| `supportedAspectRatios` | 支持的宽高比 | `["1:1", "16:9"]` |
| `defaultAspectRatio` | 默认宽高比 | `"9:16"` |
| `supportedOutputFormats` | 支持的输出格式 | `["png", "jpg"]` |
| `defaultOutputFormat` | 默认输出格式 | `"png"` |
| `estimatedTimeSeconds` | 估计生成时间（秒） | `30` |

## 环境变量配置

在 `.env` 或 `.env.local` 中配置 API Token：

```env
VITE_REPLICATE_API_TOKEN=your_token_here
VITE_KRATOS_API_TOKEN=your_token_here
VITE_YOUR_API_TOKEN=your_token_here
```

## 错误处理

模型路由系统会自动处理以下错误：

- 网络异常
- API 超时
- 参数验证失败
- 模型不支持的参数

所有错误都会被转换为用户友好的中文提示。

## 扩展建议

### 添加新的模型时考虑：

1. **参考图支持**: 不同模型对参考图的支持不同
2. **宽高比**: 确保支持的宽高比列表准确
3. **输出格式**: 确保输出格式与模型实际支持一致
4. **超时时间**: 根据模型实际生成速度调整
5. **错误处理**: 实现模型特定的错误处理逻辑
6. **重试策略**: 某些模型可能需要特殊的重试策略

## 常见问题

### Q: 如何切换默认模型？
A: 在 `App.tsx` 的 `defaultAnswers` 中修改 `selectedModel` 字段。

### Q: 如何禁用某个模型？
A: 从 `MODEL_CONFIGS` 中删除该模型的配置，或从 `getAvailableModels()` 中过滤。

### Q: 如何添加模型特定的参数？
A: 在 `ModelCallParams` 中添加新参数，然后在 `callModelAPI` 中处理。

## 相关文件

- [`src/lib/modelConfig.ts`](src/lib/modelConfig.ts) - 模型配置
- [`src/lib/modelRouter.ts`](src/lib/modelRouter.ts) - 模型路由
- [`src/lib/modelClient.ts`](src/lib/modelClient.ts) - API 实现
- [`src/types.ts`](src/types.ts) - 类型定义
- [`src/App.tsx`](src/App.tsx) - UI 集成
