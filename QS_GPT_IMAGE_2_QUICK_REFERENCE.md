# QS GPT Image 2 /images/edits 快速参考

## 官方示例 → 项目实现对照表

### 官方 curl 命令
```bash
curl -sS -X POST "https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview" \
  -H "api-key: xxx" \
  -F "image=@./img_1k.jpeg" \
  -F "prompt=High Contrast, hyper detailed photo, 2k UHD" \
  -F "n=1" \
  -F "quality=low" \
  -F "size=1024x1024"
```

### 项目中的实现

```typescript
// 1. 配置（src/lib/modelConfig.ts）
"qs-gpt-image-2": {
  endpoint: "https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview",
  // ...
}

// 2. 调用（src/lib/modelClient.ts）
const result = await callQsGptImage2({
  prompt: "High Contrast, hyper detailed photo, 2k UHD",
  imageUrls: ["./img_1k.jpeg"],  // 自动转换为 Blob
  targetWidth: 1024,
  targetHeight: 1024,
});

// 3. 返回结果
console.log(result.imageUrl);  // 生成的图片 URL 或 data URL
```

## 关键改动对比

| 方面 | 之前 | 现在 |
|------|------|------|
| **端点** | `/maas/openai/openai/images/generations` | `https://maas.devops.rednote.life/openai/openai/images/edits` |
| **认证** | `Authorization: Bearer ${apiKey}` | `api-key: ${apiKey}` |
| **image 字段** | 字符串 URL | Blob 对象（文件上传） |
| **model 字段** | "gpt-image-2" | ❌ 移除 |
| **response_format** | "b64_json" | ❌ 移除 |
| **quality** | ❌ 无 | "low" |
| **n** | ❌ 无 | "1" |

## 文件修改清单

### ✅ 已修改

1. **`src/lib/modelConfig.ts`** (第 72-85 行)
   - 更新 endpoint URL
   - 更新描述文案

2. **`src/lib/modelClient.ts`** (第 1114-1311 行)
   - 更新 `callQsGptImage2Once` 函数
   - 改为 Blob 对象上传
   - 改为 api-key 认证
   - 添加 quality 和 n 参数
   - 移除 model 和 response_format 参数

### ✅ 无需修改

- `src/lib/modelRouter.ts` - 路由逻辑保持不变
- `src/lib/userApiConfig.ts` - 配置管理保持不变
- 其他模型的实现 - 不受影响

## 使用示例

### 基础调用

```typescript
import { callQsGptImage2 } from "./lib/modelClient";

const result = await callQsGptImage2({
  prompt: "High Contrast, hyper detailed photo, 2k UHD",
  imageUrls: ["https://example.com/image.jpg"],
  targetWidth: 1024,
  targetHeight: 1024,
});

console.log(result.imageUrl);  // 生成的图片 URL
```

### 带重试的调用

```typescript
const result = await callQsGptImage2({
  prompt: "Your prompt here",
  imageUrls: ["image_url"],
  targetWidth: 1024,
  targetHeight: 1024,
  maxAttempts: 3,           // 最多重试 3 次
  retryDelayMs: 1500,       // 重试延迟 1.5 秒
  onAttempt: (info) => {
    console.log(`尝试 ${info.attempt}/${info.totalAttempts}`);
  },
});
```

### 通过 modelRouter 调用

```typescript
import { callModelAPI } from "./lib/modelRouter";

const result = await callModelAPI({
  modelType: "qs-gpt-image-2",
  prompt: "Your prompt here",
  imageUrls: ["image_url"],
  targetWidth: 1024,
  targetHeight: 1024,
});
```

## 调试技巧

### 1. 查看完整请求日志

打开浏览器 DevTools (F12) → Console，搜索 `[QS GPT Image 2]`

```
[QS GPT Image 2] request → https://maas.devops.rednote.life/...
[QS GPT Image 2] === 完整 curl 命令 ===
curl -sS -X POST "..." \
  -H "api-key: xxx" \
  -F "image=@..." \
  ...
```

### 2. 复制 curl 命令测试

从控制台复制生成的 curl 命令，在终端直接运行：

```bash
curl -sS -X POST "https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview" \
  -H "api-key: your_api_key" \
  -F "image=@./test.jpg" \
  -F "prompt=test" \
  -F "quality=low" \
  -F "n=1" \
  -F "size=1024x1024"
```

### 3. 检查响应格式

控制台会打印完整的响应体：

```
[QS GPT Image 2] === 完整响应体 ===
{
  "created": 1234567890,
  "data": [
    {
      "url": "https://..." 或 "b64_json": "..."
    }
  ]
}
```

## 常见错误排查

### ❌ 错误：`api-key header missing`

**原因：** 使用了旧的 `Authorization: Bearer` 认证方式

**解决：** 已自动修复，使用 `api-key` header

### ❌ 错误：`image field required`

**原因：** 图片 URL 无法访问或转换失败

**解决：** 
- 检查图片 URL 是否有效
- 检查 CORS 设置
- 查看控制台错误信息

### ❌ 错误：`image size exceeds limit`

**原因：** 图片文件过大（> 4MB）

**解决：** 压缩图片或使用更小的图片

### ❌ 错误：`unsupported image format`

**原因：** 图片格式不支持

**解决：** 使用 PNG、JPG、WebP 格式

## 参数说明

### 必需参数

| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `prompt` | string | 编辑提示词 | "High Contrast, hyper detailed photo" |
| `imageUrls` | string[] | 图片 URL 列表 | `["https://example.com/img.jpg"]` |

### 可选参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `targetWidth` | number | 1024 | 输出图片宽度 |
| `targetHeight` | number | 1024 | 输出图片高度 |
| `maxAttempts` | number | 3 | 最大重试次数 |
| `retryDelayMs` | number | 1500 | 重试延迟（毫秒） |
| `timeoutMs` | number | 300000 | 请求超时（毫秒） |
| `onAttempt` | function | - | 重试回调函数 |

## 响应格式

### 成功响应

```typescript
{
  imageUrl: string,  // 生成的图片 URL 或 data URL
  raw: {
    created: number,
    data: [
      {
        url?: string,      // 图片 URL
        b64_json?: string  // Base64 编码的图片
      }
    ]
  }
}
```

### 错误响应

```typescript
throw new Error("QS GPT Image 2 API 返回 HTTP 400：...")
```

## 性能指标

- **估计生成时间：** 20 秒
- **最大文件大小：** 4 MB
- **支持的格式：** PNG, JPG, WebP
- **支持的尺寸：** 1024x1024（推荐）

## 相关文件

- 📄 [`src/lib/modelConfig.ts`](src/lib/modelConfig.ts) - 模型配置
- 📄 [`src/lib/modelClient.ts`](src/lib/modelClient.ts) - API 实现
- 📄 [`src/lib/modelRouter.ts`](src/lib/modelRouter.ts) - 路由逻辑
- 📄 [`QS_GPT_IMAGE_2_EDITS_MIGRATION.md`](QS_GPT_IMAGE_2_EDITS_MIGRATION.md) - 详细改造指南

## 总结

✅ 已完全改造为官方 `/images/edits` 端点
✅ 自动处理 URL → Blob 转换
✅ 支持文件验证和错误处理
✅ 详细的调试日志
✅ 向后兼容的配置系统

现在可以直接使用官方示例中的参数了！🎉
