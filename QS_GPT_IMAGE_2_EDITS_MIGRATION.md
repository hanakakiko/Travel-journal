# QS GPT Image 2 /images/edits 端点改造指南

## 概述

你终于拿到了官方示例！我已经将 QS GPT Image 2 的实现从 `/images/generations` 端点改造为 `/images/edits` 端点。这是一个重要的升级，支持图片编辑功能。

## 官方示例（你提供的）

```bash
curl -sS -X POST "https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview" \
  -H "api-key: xxx" \
  -F "image=@./img_1k.jpeg" \
  -F "prompt=High Contrast, hyper detailed photo, 2k UHD" \
  -F "n=1" \
  -F "quality=low" \
  -F "size=1024x1024"
```

## 关键改动

### 1. 端点更新

**之前：**
```
/maas/openai/openai/images/generations?api-version=2025-04-01-preview
```

**现在：**
```
https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview
```

### 2. 认证方式改变

**之前：**
```
Authorization: Bearer ${apiKey}
```

**现在：**
```
api-key: ${apiKey}
```

### 3. 请求体字段改变

**之前（/images/generations）：**
- `image`: 字符串 URL
- `prompt`: 提示词
- `model`: "gpt-image-2"
- `size`: "1024x1024"
- `response_format`: "b64_json"

**现在（/images/edits）：**
- `image`: 文件上传（Blob 对象）
- `prompt`: 提示词
- `quality`: "low"（新增）
- `n`: "1"（新增）
- `size`: "1024x1024"

### 4. 文件上传处理

关键改动：从 URL 字符串改为 Blob 对象上传

```typescript
// 从 URL 获取图片 Blob
const response = await fetch(imageUrl);
const blob = await response.blob();

// 添加为 File 对象而不是字符串
formData.append("image", blob, fileName);
```

这样做的好处：
- ✅ 符合官方 API 规范
- ✅ 支持更好的文件验证（大小、格式检查）
- ✅ 更安全的文件传输

## 代码改造详情

### 文件修改

#### 1. `src/lib/modelConfig.ts`

```typescript
"qs-gpt-image-2": {
  id: "qs-gpt-image-2",
  name: "QS GPT Image 2",
  description: "小红书 QS 平台的 GPT Image 2 模型，支持图片编辑，效果超好，强烈推荐！",
  provider: "other",
  endpoint: "https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview",
  apiTokenEnvVar: "VITE_QS_GPT_IMAGE_2_API_KEY",
  // ... 其他配置保持不变
}
```

#### 2. `src/lib/modelClient.ts` - `callQsGptImage2Once` 函数

**关键改动：**

1. **端点改为完整 URL**
   ```typescript
   const endpoint = userQsConfig?.customEndpoint || 
     "https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview";
   ```

2. **图片转换为 Blob 对象**
   ```typescript
   const response = await fetch(imageUrl);
   const blob = await response.blob();
   
   // 文件大小检查（最大 4MB）
   if (blob.size > MAX_FILE_SIZE_BYTES) {
     throw new Error(`图片过大...`);
   }
   
   // 文件格式检查
   if (!ALLOWED_FORMATS.includes(blob.type)) {
     qlog(`⚠️ 图片格式为 ${blob.type}...`);
   }
   
   formData.append("image", blob, fileName);
   ```

3. **认证头改为 api-key**
   ```typescript
   headers: {
     "api-key": apiKey,  // 改为 api-key 而不是 Authorization
   }
   ```

4. **添加新的请求字段**
   ```typescript
   formData.append("quality", "low");
   formData.append("n", "1");
   ```

5. **移除 model 和 response_format 字段**
   - `/images/edits` 端点不需要这两个字段

## 测试步骤

### 1. 配置 API Key

在 `.env` 文件中设置：
```
VITE_QS_GPT_IMAGE_2_API_KEY=your_api_key_here
```

或在 `src/lib/api-keys.local.ts` 中配置：
```typescript
export const API_KEYS = {
  VITE_QS_GPT_IMAGE_2_API_KEY: "your_api_key_here",
};
```

### 2. 运行开发服务器

```bash
npm run dev
```

### 3. 在浏览器控制台查看日志

打开浏览器开发者工具（F12），查看 Console 标签。你会看到详细的请求日志：

```
[QS GPT Image 2] request → https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview
[QS GPT Image 2]   model: gpt-image-2
[QS GPT Image 2]   prompt: High Contrast, hyper detailed photo, 2k UHD...
[QS GPT Image 2]   size: 1024x1024
[QS GPT Image 2]   quality: low
[QS GPT Image 2]   n: 1
[QS GPT Image 2] ✓ 图片 1 已转换为 Blob 对象 (123.5KB, image/jpeg)
[QS GPT Image 2] === 完整 curl 命令 ===
curl -sS -X POST "https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview" \
  -H "api-key: xxx..." \
  -F "image=@/path/to/img_1k.jpeg" \
  -F "prompt=High Contrast, hyper detailed photo, 2k UHD" \
  -F "quality=low" \
  -F "n=1" \
  -F "size=1024x1024"
```

### 4. 验证响应

API 应该返回类似的响应：
```json
{
  "created": 1234567890,
  "data": [
    {
      "url": "https://..."  // 或 "b64_json": "..."
    }
  ]
}
```

## 常见问题

### Q1: 为什么改用 Blob 对象而不是 URL 字符串？

**A:** `/images/edits` 端点要求文件上传，不支持 URL 字符串。这样做的好处：
- 符合 OpenAI 标准 API 规范
- 支持文件大小和格式验证
- 更安全的文件传输

### Q2: 如果图片来自 URL，怎么处理？

**A:** 代码已经处理了这个问题：
```typescript
const response = await fetch(imageUrl);
const blob = await response.blob();
formData.append("image", blob, fileName);
```

自动从 URL 获取图片并转换为 Blob 对象。

### Q3: 支持多张图片吗？

**A:** 根据官方示例，`/images/edits` 端点一次只支持一张图片。代码中的 `maxReferenceImages: 1` 已经限制了这一点。

### Q4: 为什么要添加 quality 和 n 参数？

**A:** 这些是 `/images/edits` 端点的标准参数：
- `quality`: 图片质量（"low" 或 "high"）
- `n`: 生成的图片数量（通常为 1）

### Q5: 如果 API 返回错误怎么办？

**A:** 控制台会打印详细的错误信息和完整的请求体，便于调试。

## 向后兼容性

- ✅ 用户配置面板中的自定义端点仍然有效
- ✅ 环境变量 `VITE_QS_GPT_IMAGE_2_API_KEY` 仍然有效
- ✅ 本地配置文件 `src/lib/api-keys.local.ts` 仍然有效
- ✅ 重试逻辑保持不变

## 下一步

1. **测试 API 调用** - 使用你的 API Key 测试端点
2. **验证响应格式** - 确认 API 返回的数据格式
3. **调整参数** - 根据需要调整 `quality`、`n` 等参数
4. **性能优化** - 如果需要，可以调整超时时间和重试策略

## 参考资源

- 官方示例：`curl -sS -X POST "https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview" ...`
- 项目配置：`src/lib/modelConfig.ts`
- 实现代码：`src/lib/modelClient.ts` - `callQsGptImage2Once` 函数
- 路由逻辑：`src/lib/modelRouter.ts`

## 总结

✅ 已完成改造，支持官方 `/images/edits` 端点
✅ 自动处理 URL 到 Blob 的转换
✅ 添加文件大小和格式验证
✅ 保持向后兼容性
✅ 详细的调试日志

现在你可以使用官方示例中的参数来调用 QS GPT Image 2 API 了！
