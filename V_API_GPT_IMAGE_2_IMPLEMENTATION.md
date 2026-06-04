# V-API GPT Image 2 模型集成完成

## 概述
已成功添加新的模型策略 **V-API GPT Image 2**，支持通过 V-API 平台的 `/v1/images/edits` 接口进行图片编辑。

## 修改的文件

### 1. [`src/lib/modelConfig.ts`](src/lib/modelConfig.ts)
**修改内容：**
- 更新 `ModelType` 类型定义，添加 `"v-api-gpt-image-2"`
- 在 `MODEL_CONFIGS` 中添加新模型配置：
  ```typescript
  "v-api-gpt-image-2": {
    id: "v-api-gpt-image-2",
    name: "V-API GPT Image 2",
    description: "V-API 平台的 GPT Image 2 模型，支持图片编辑功能",
    provider: "other",
    endpoint: "https://api.v3.cm/v1/images/edits",
    apiTokenEnvVar: "VITE_V_API_GPT_IMAGE_2_API_KEY",
    maxReferenceImages: 1,
    supportedAspectRatios: ["1:1", "16:9", "9:16"],
    defaultAspectRatio: "9:16",
    supportedOutputFormats: ["jpeg", "png"],
    defaultOutputFormat: "jpeg",
    estimatedTimeSeconds: 20,
  }
  ```

### 2. [`src/lib/userApiConfig.ts`](src/lib/userApiConfig.ts)
**修改内容：**
- 更新 `ModelType` 类型定义，添加 `"v-api-gpt-image-2"`
- 允许用户在 UI 中为该模型配置 API Key 和自定义端点

### 3. [`src/lib/api-keys.local.ts`](src/lib/api-keys.local.ts)
**修改内容：**
- 添加新的 API Key 配置项：
  ```typescript
  VITE_V_API_GPT_IMAGE_2_API_KEY: undefined as string | undefined,
  ```
- 提供示例和获取方式说明

### 4. [`src/lib/modelClient.ts`](src/lib/modelClient.ts)
**修改内容：**
- 添加 `callVApiGptImage2Once()` 函数：单次调用 V-API GPT Image 2 API，不带重试
- 添加 `callVApiGptImage2()` 函数：调用 V-API GPT Image 2 API，支持自动重试
- 实现完整的请求/响应处理，包括：
  - FormData 构建（multipart/form-data）
  - 图片 URL 和 prompt 参数传递
  - 响应解析（支持 URL 和 base64 两种格式）
  - 详细的调试日志输出

### 5. [`src/lib/modelRouter.ts`](src/lib/modelRouter.ts)
**修改内容：**
- 导入 `callVApiGptImage2` 函数
- 在 `callModelAPI()` 中添加 `"v-api-gpt-image-2"` 的路由逻辑

## API 接口规范

### 端点
```
POST https://api.v3.cm/v1/images/edits
```

### 请求格式
- **Content-Type**: `multipart/form-data`
- **Authorization**: `Bearer {API_KEY}`

### 请求参数
| 参数 | 类型 | 说明 |
|------|------|------|
| `image` | string (URL) | 参考图片 URL（可多个） |
| `prompt` | string | 生成提示词 |
| `model` | string | 模型名称，固定为 `gpt-image-2` |
| `size` | string | 输出尺寸，格式 `{width}x{height}` |
| `response_format` | string | 响应格式，支持 `b64_json` 或 `url` |

### 响应格式
```json
{
  "created": 1234567890,
  "data": [
    {
      "url": "https://...",
      "b64_json": "base64_encoded_image_data"
    }
  ],
  "usage": {
    "prompt_tokens": 100,
    "completion_tokens": 50,
    "total_tokens": 150
  }
}
```

## 使用方式

### 1. 配置 API Key

#### 方式一：本地配置文件
编辑 `src/lib/api-keys.local.ts`：
```typescript
VITE_V_API_GPT_IMAGE_2_API_KEY: "your-api-key-here",
```

#### 方式二：环境变量
在 `.env` 文件中设置：
```
VITE_V_API_GPT_IMAGE_2_API_KEY=your-api-key-here
```

#### 方式三：UI 配置面板
在应用右上角点击 API 配置按钮，为 V-API GPT Image 2 输入 API Key

### 2. 选择模型
在「补充信息」弹窗中，点击「生成模型」区域的 **V-API GPT Image 2** 按钮即可选择该模型

### 3. 生成图片
配置完成后，点击「装订手帐本」或「重新装订」按钮，应用会自动调用 V-API 接口生成图片

## 调试信息

应用会在浏览器控制台输出详细的调试日志，包括：
- 完整的请求体（multipart/form-data 字段）
- 完整的响应体（JSON 格式）
- 响应格式分析（字段提取）
- 完整的 curl 命令（便于手动测试）

## 错误处理

### 自动重试机制
- 默认最多 3 次尝试（首次 + 2 次重试）
- 仅对可重试错误触发（网络抖动、超时、5xx/429）
- 线性退避策略：第 2 次等 1.5s、第 3 次等 3s

### 常见错误
| 错误 | 原因 | 解决方案 |
|------|------|--------|
| API Key 未配置 | 未设置 VITE_V_API_GPT_IMAGE_2_API_KEY | 按上述方式配置 API Key |
| HTTP 401 | API Key 无效或过期 | 检查 API Key 是否正确 |
| HTTP 400 | 请求参数错误 | 检查图片 URL 是否可访问 |
| HTTP 429 | 请求过于频繁 | 等待后重试 |
| HTTP 5xx | 服务端错误 | 自动重试或稍后重试 |

## 技术细节

### 参考图片处理
- 支持最多 1 张参考图片（`maxReferenceImages: 1`）
- 图片必须是可公网/内网访问的 URL
- 本地上传的图片会自动上传到 COS，获得远程 URL

### 宽高比支持
- 支持的宽高比：`1:1`、`16:9`、`9:16`
- 默认宽高比：`9:16`（竖向长图）
- 实际生成尺寸：1024×1536 像素

### 输出格式
- 支持 JPEG 和 PNG 格式
- 默认输出格式：JPEG
- 响应中同时包含 URL 和 base64 两种格式

## 相关文件

- 模型配置：[`src/lib/modelConfig.ts`](src/lib/modelConfig.ts)
- 用户 API 配置：[`src/lib/userApiConfig.ts`](src/lib/userApiConfig.ts)
- API Key 本地配置：[`src/lib/api-keys.local.ts`](src/lib/api-keys.local.ts)
- 模型客户端：[`src/lib/modelClient.ts`](src/lib/modelClient.ts)
- 模型路由：[`src/lib/modelRouter.ts`](src/lib/modelRouter.ts)
- 主应用：[`src/App.tsx`](src/App.tsx)

## 后续扩展

如需添加更多模型，只需：
1. 在 `modelConfig.ts` 中添加新的 `ModelType` 和配置
2. 在 `userApiConfig.ts` 中更新 `ModelType`
3. 在 `api-keys.local.ts` 中添加新的 API Key 配置
4. 在 `modelClient.ts` 中实现新的 API 调用函数
5. 在 `modelRouter.ts` 中添加路由逻辑

UI 会自动识别并显示新模型。
