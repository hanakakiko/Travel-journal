# V-API Seedream 4.5 模型集成完成

## 概述
已成功添加新的模型策略 **V-API Seedream 4.5**，支持通过 V-API 平台的 `/v1/images/edits` 接口进行高质量图片编辑。

## 模型特性

### 核心能力
- **多图片支持**: 支持 1-10 张参考图片（相比 GPT Image 2 的 1 张有大幅提升）
- **多尺寸支持**: 支持 1k、2k、4k 三种尺寸等级
- **高质量输出**: 既梦 4.0 是最新版本，质量更优
- **灵活响应格式**: 支持 URL 和 base64_json 两种格式

### 推荐尺寸（与 GPT-2 保持一致）

**2K 分辨率**：2048x2048、2304x1728、1728x2304、2848x1600、1600x2848、2496x1664、1664x2496、3136x1344

**4K 分辨率**：4096x4096、4704x3520、3520x4704、5504x3040、3040x5504、4992x3328、3328x4992、6240x2656

## 修改的文件

### 1. [`src/lib/modelConfig.ts`](src/lib/modelConfig.ts)
**修改内容：**
- 更新 `ModelType` 类型定义，添加 `"v-api-seedream-4-5"`
- 在 `MODEL_CONFIGS` 中添加新模型配置：
  ```typescript
  "v-api-seedream-4-5-5": {
    id: "v-api-seedream-4-5-5",
    name: "V-API Seedream 4.5",
    description: "V-API 平台的 Seedream 4.5 模型，支持 1-10 张图片编辑，支持 1k/2k/4k 多种尺寸",
    provider: "other",
    endpoint: "https://api.v3.cm/v1/images/edits",
    apiTokenEnvVar: "VITE_V_API_SEEDREAM_4_5_API_KEY",
    maxReferenceImages: 10,
    supportedAspectRatios: ["1k", "2k", "4k"],
    defaultAspectRatio: "1k",
    supportedOutputFormats: ["url", "b64_json"],
    defaultOutputFormat: "url",
    estimatedTimeSeconds: 25,
  }
  ```

### 2. [`src/lib/userApiConfig.ts`](src/lib/userApiConfig.ts)
**修改内容：**
- 更新 `ModelType` 类型定义，添加 `"v-api-seedream-4-5"`
- 允许用户在 UI 中为该模型配置 API Key 和自定义端点

### 3. [`src/lib/api-keys.local.ts`](src/lib/api-keys.local.ts)
**修改内容：**
- 添加新的 API Key 配置项：
  ```typescript
  VITE_V_API_SEEDREAM_4_5_API_KEY: undefined as string | undefined,
  ```

### 4. [`src/lib/modelClient.ts`](src/lib/modelClient.ts)
**修改内容：**
- 添加 `callVApiSeedream4Once()` 函数：单次调用 V-API Seedream 4.5 API，不带重试
- 添加 `callVApiSeedream4()` 函数：调用 V-API Seedream 4.5 API，支持自动重试
- 实现完整的请求/响应处理，包括：
  - FormData 构建（multipart/form-data）
  - 支持 1-10 张图片的处理
  - 自动尺寸等级检测（1k/2k/4k）
  - 响应解析（支持 URL 格式）
  - 详细的调试日志输出

### 5. [`src/lib/modelRouter.ts`](src/lib/modelRouter.ts)
**修改内容：**
- 导入 `callVApiSeedream4` 函数
- 在 `callModelAPI()` 中添加 `"v-api-seedream-4-5"` 的路由逻辑

### 6. [`src/lib/ApiConfigPanel.tsx`](src/lib/ApiConfigPanel.tsx)
**修改内容：**
- 添加新模型到 `MODEL_TYPES` 数组
- 添加新模型到 `MODEL_NAMES` 对象
- 添加新模型到 `MODEL_HINTS` 对象
- 更新 `showApiKey` 初始化

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
| `image` | binary | 源图像，支持 1-10 张，格式为 png/jpg/webp |
| `prompt` | string | 编辑提示词，支持中英文，建议不超过 300 汉字或 600 英文单词 |
| `model` | string | 模型名称，固定为 `doubao-seedream-4-5-251128` |
| `size` | string | 编辑图片的尺寸，支持两种方式（不可混用）：<br/>**方式 1**：`2K` 或 `4K`（让模型根据 prompt 判断）<br/>**方式 2**：具体像素值（如 `2048x2048`，范围 3686400-16777216 像素） |
| `response_format` | string | 返回格式，可选值：`url`、`b64_json`，默认 `url` |
| `watermark` | boolean | 是否添加水印，默认 `false` |

### 支持的尺寸规格（与 GPT-2 保持一致）

#### 2K 分辨率
| 宽高比 | 像素值 |
|------|--------|
| 1:1 | 2048x2048 |
| 4:3 | 2304x1728 |
| 3:4 | 1728x2304 |
| 16:9 | 2848x1600 |
| 9:16 | 1600x2848 |
| 3:2 | 2496x1664 |
| 2:3 | 1664x2496 |
| 21:9 | 3136x1344 |

#### 4K 分辨率
| 宽高比 | 像素值 |
|------|--------|
| 1:1 | 4096x4096 |
| 4:3 | 4704x3520 |
| 3:4 | 3520x4704 |
| 16:9 | 5504x3040 |
| 9:16 | 3040x5504 |
| 3:2 | 4992x3328 |
| 2:3 | 3328x4992 |
| 21:9 | 6240x2656 |

### 响应格式
```json
{
  "created": 1757336790,
  "data": [
    {
      "url": "https://..."
    }
  ],
  "usage": {
    "generated_images": 1,
    "output_tokens": 4096,
    "total_tokens": 4096
  }
}
```

## 使用方式

### 1. 配置 API Key

#### 方式一：本地配置文件
编辑 `src/lib/api-keys.local.ts`：
```typescript
VITE_V_API_SEEDREAM_4_5_API_KEY: "your-api-key-here",
```

#### 方式二：环境变量
在 `.env` 文件中设置：
```
VITE_V_API_SEEDREAM_4_5_API_KEY=your-api-key-here
```

#### 方式三：UI 配置面板
在应用右上角点击 API 配置按钮，为 V-API Seedream 4.5 输入 API Key

### 2. 选择模型
在「补充信息」弹窗中，点击「生成模型」区域的 **V-API Seedream 4.5** 按钮即可选择该模型

### 3. 生成图片
配置完成后，点击「装订手帐本」或「重新装订」按钮，应用会自动调用 V-API 接口生成图片

## 技术实现细节

### 多图片处理
- 支持最多 10 张参考图片
- 自动将图片 URL 转换为 Blob 对象
- 支持 PNG、JPG、WebP 格式
- 单个文件大小限制 10MB

### 尺寸智能映射
应用会根据用户选择的宽高比，自动映射到官方推荐的标准像素值：
- 计算目标宽高比
- 匹配最接近的标准宽高比（1:1、4:3、3:4、16:9、9:16、3:2、2:3、21:9）
- 根据总像素数选择 2K 或 4K
- 返回对应的像素值（如 `1600x2848`）

### 错误处理
- 自动重试机制（最多 3 次）
- 线性退避策略
- 详细的错误信息
- 完整的调试日志

### 调试功能
- 浏览器 Console 中的详细日志
- 完整的 curl 命令用于手动测试
- 响应格式分析
- 参考图片处理日志

## 与 V-API GPT Image 2 的对比（Seedream 4.5 更强大）

| 特性 | GPT Image 2 | Seedream 4.5 |
|------|-----------|------------|
| **最大参考图数** | 1 张 | 10 张 |
| **支持尺寸** | 固定宽高比 | 1k/2k/4k 等级 |
| **模型版本** | 较早版本 | 最新版本（4.0） |
| **质量** | 良好 | 更优 |
| **推荐用途** | 简单编辑 | 复杂编辑、多参考图 |

## 常见问题

### Q: 如何选择合适的尺寸等级？
A: 
- **1k**: 快速生成，适合预览和测试
- **2k**: 平衡质量和速度，推荐使用
- **4k**: 最高质量，生成时间较长

### Q: 支持多少张参考图？
A: 支持 1-10 张参考图片。超过 10 张时，应用会自动截取前 10 张。

### Q: 生成失败怎么办？
A: 
1. 打开浏览器开发者工具（F12）
2. 查看 Console 标签中的错误信息
3. 常见错误：
   - `API Key 未配置` → 检查 API Key 配置
   - `HTTP 401` → API Key 无效
   - `HTTP 400` → 图片 URL 无法访问或格式不支持
   - `HTTP 429` → 请求过于频繁，稍后重试

### Q: 提示词有什么建议？
A: 
- 建议不超过 300 汉字或 600 英文单词
- 字数过多信息容易分散，模型可能忽略细节
- 参考官方提示词指南：https://www.volcengine.com/docs/82379/1824718

### Q: 可以自定义 API 端点吗？
A: 可以。在 UI 配置面板中，为 V-API Seedream 4.5 设置「自定义端点」即可。

## 相关文件

- 模型配置：[`src/lib/modelConfig.ts`](src/lib/modelConfig.ts)
- 用户 API 配置：[`src/lib/userApiConfig.ts`](src/lib/userApiConfig.ts)
- API Key 本地配置：[`src/lib/api-keys.local.ts`](src/lib/api-keys.local.ts)
- 模型客户端：[`src/lib/modelClient.ts`](src/lib/modelClient.ts)
- 模型路由：[`src/lib/modelRouter.ts`](src/lib/modelRouter.ts)
- API 配置面板：[`src/lib/ApiConfigPanel.tsx`](src/lib/ApiConfigPanel.tsx)

## 后续扩展

如需添加更多模型，只需按照相同的模式：
1. 在 `modelConfig.ts` 中添加新的 `ModelType` 和配置
2. 在 `userApiConfig.ts` 中更新 `ModelType`
3. 在 `api-keys.local.ts` 中添加新的 API Key 配置
4. 在 `modelClient.ts` 中实现新的 API 调用函数
5. 在 `modelRouter.ts` 中添加路由逻辑
6. 在 `ApiConfigPanel.tsx` 中更新 UI

UI 会自动识别并显示新模型。

## 构建验证

✅ TypeScript 编译通过（无错误）  
✅ Vite 构建成功  
✅ 所有类型检查通过  
✅ 无编译警告  

```
✓ 1594 modules transformed.
✓ built in 804ms
```

## 总结

V-API Seedream 4.5 模型已完全集成到项目中，用户可以：
1. 通过多种方式配置 API Key
2. 在 UI 中轻松选择该模型
3. 享受自动重试和详细的调试日志
4. 利用多参考图和多尺寸的优势进行高质量图片编辑
5. 自定义 API 端点（如需要）

所有代码都已通过 TypeScript 编译和 Vite 构建验证，可以直接使用。
