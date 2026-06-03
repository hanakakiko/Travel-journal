# 模型路由系统 - 快速参考卡片

## 🎯 核心概念

### 模型类型 (ModelType)
```typescript
type ModelType = "gpt-2" | "flux-2-pro" | "other";
```

### 模型配置 (ModelConfig)
```typescript
interface ModelConfig {
  id: ModelType;
  name: string;                    // 显示名称
  description: string;             // 描述文本
  provider: string;                // 提供商
  endpoint: string;                // API 端点
  apiTokenEnvVar: string;          // 环境变量名
  fallbackToken?: string;          // 备用 token
  maxReferenceImages: number;      // 最多参考图数
  supportedAspectRatios: string[]; // 支持的宽高比
  defaultAspectRatio: string;      // 默认宽高比
  supportedOutputFormats: string[]; // 支持的输出格式
  defaultOutputFormat: string;     // 默认输出格式
  estimatedTimeSeconds: number;    // 估计生成时间
}
```

## 📂 关键文件

| 文件 | 职责 | 修改频率 |
|------|------|--------|
| `src/lib/modelConfig.ts` | 模型配置定义 | 添加新模型时修改 |
| `src/lib/modelRouter.ts` | 模型路由逻辑 | 添加新模型时修改 |
| `src/lib/modelClient.ts` | API 实现 | 添加新模型时修改 |
| `src/types.ts` | 类型定义 | 添加新模型时修改 |
| `src/App.tsx` | UI 集成 | 一般不需要修改 |

## 🔄 调用流程

```
用户选择模型 → 点击生成 → callModelAPI()
                              ↓
                        modelRouter 路由
                              ↓
                    调用对应的 API 实现
                              ↓
                        返回 { imageUrl, raw }
```

## 📋 添加新模型的 5 步清单

### 步骤 1: 配置模型 (modelConfig.ts)
```typescript
"new-model": {
  id: "new-model",
  name: "New Model",
  description: "Description",
  provider: "provider",
  endpoint: "/api/endpoint",
  apiTokenEnvVar: "VITE_NEW_MODEL_TOKEN",
  maxReferenceImages: 8,
  supportedAspectRatios: ["1:1", "16:9", "9:16"],
  defaultAspectRatio: "9:16",
  supportedOutputFormats: ["png", "jpg"],
  defaultOutputFormat: "png",
  estimatedTimeSeconds: 30,
}
```

### 步骤 2: 更新类型 (types.ts)
```typescript
export type ModelType = "gpt-2" | "flux-2-pro" | "new-model";
```

### 步骤 3: 添加路由 (modelRouter.ts)
```typescript
case "new-model":
  return await callNewModelAPI(params);
```

### 步骤 4: 实现 API (modelClient.ts)
```typescript
const callNewModelAPI = async (params: ModelCallParams) => {
  // 实现 API 调用
  return { imageUrl: "...", raw: responseData };
};
```

### 步骤 5: 配置环境变量
```env
VITE_NEW_MODEL_TOKEN=your_token_here
```

## 🎨 UI 集成（自动）

模型会自动出现在 UI 的"生成模型"选择器中：
```
┌─────────────────────────────────┐
│ 生成模型                         │
├─────────────────────────────────┤
│ [FLUX.2 Pro] [GPT-2] [New Model]│
└─────────────────────────────────┘
```

## 🔍 常见参数值

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

## 🛠️ 调试命令

### 查看模型列表
```typescript
import { getAvailableModels } from "./lib/modelConfig";
console.log(getAvailableModels());
```

### 获取模型配置
```typescript
import { getModelConfig } from "./lib/modelConfig";
const config = getModelConfig("flux-2-pro");
console.log(config);
```

### 验证宽高比支持
```typescript
import { isAspectRatioSupported } from "./lib/modelConfig";
const supported = isAspectRatioSupported("flux-2-pro", "9:16");
console.log(supported); // true
```

### 验证输出格式支持
```typescript
import { isOutputFormatSupported } from "./lib/modelConfig";
const supported = isOutputFormatSupported("flux-2-pro", "png");
console.log(supported); // true
```

## 📊 当前模型状态

| 模型 | 状态 | 参考图 | 生成时间 | 质量 |
|------|------|--------|---------|------|
| FLUX.2 Pro | ✅ 完成 | 8 张 | ~30s | 最高 |
| GPT-2 | ⏳ 待实现 | 1 张 | ~15s | 中等 |

## 🚨 常见错误

### 错误: "未知的模型类型"
**原因**: 模型类型未在 `ModelType` 中定义
**解决**: 在 `src/types.ts` 中添加模型类型

### 错误: "模型配置不存在"
**原因**: 模型未在 `MODEL_CONFIGS` 中定义
**解决**: 在 `src/lib/modelConfig.ts` 中添加模型配置

### 错误: "模型路由未实现"
**原因**: 模型在 `callModelAPI()` 中没有对应的 case
**解决**: 在 `src/lib/modelRouter.ts` 中添加 case

### 错误: "API 调用失败"
**原因**: API 实现函数不存在或有错误
**解决**: 在 `src/lib/modelClient.ts` 中实现 API 函数

## 💡 最佳实践

### 1. 环境变量管理
```env
# .env.local
VITE_REPLICATE_API_TOKEN=your_token
VITE_KRATOS_API_TOKEN=your_token
VITE_NEW_MODEL_TOKEN=your_token
```

### 2. 错误处理
```typescript
try {
  const result = await callModelAPI(modelType, params);
  // 处理成功
} catch (error) {
  // 处理错误
  console.error("模型调用失败:", error);
}
```

### 3. 日志记录
```typescript
// 开发模式自动启用日志
// 查看浏览器控制台的 [Kratos] 前缀日志
```

### 4. 超时配置
```typescript
const result = await callModelAPI(modelType, {
  prompt,
  imageUrls,
  timeoutMs: 300_000, // 5 分钟
  maxAttempts: 3,
  retryDelayMs: 1500,
});
```

## 📚 相关文档

- [完整指南](MODEL_ROUTING_GUIDE.md) - 详细的使用和扩展指南
- [快速指南](QUICK_MODEL_ADD.md) - 5 分钟快速添加新模型
- [实现总结](MODEL_ROUTING_SUMMARY.md) - 实现细节和设计决策
- [实现状态](IMPLEMENTATION_STATUS.md) - 当前实现状态报告

## 🎯 快速开始

### 测试现有模型
```bash
npm run dev
# 打开应用，上传照片，选择 FLUX.2 Pro，点击生成
```

### 添加新模型
```bash
# 1. 按照 5 步清单添加模型
# 2. 配置环境变量
# 3. 重启开发服务器
npm run dev
# 4. 新模型会自动出现在 UI 中
```

### 调试 API 调用
```bash
# 打开浏览器控制台
# 查看 [Kratos] 前缀的日志
# 查看完整的请求/响应体
```

## 🔗 快速链接

- 模型配置: [`src/lib/modelConfig.ts`](src/lib/modelConfig.ts)
- 模型路由: [`src/lib/modelRouter.ts`](src/lib/modelRouter.ts)
- API 实现: [`src/lib/modelClient.ts`](src/lib/modelClient.ts)
- 类型定义: [`src/types.ts`](src/types.ts)
- UI 集成: [`src/App.tsx`](src/App.tsx)

---

**提示**: 这是一个快速参考卡片。详细信息请查看完整文档。
