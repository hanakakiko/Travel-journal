# QS GPT Image 2 API 调用改进总结

## 问题背景

用户在使用 QS GPT Image 2 模型时遇到 `invalid token` 错误（Code: 10001），且日志中没有打印完整的请求体信息，特别是参考图片的链接信息。

## 已完成的改进

### 1. 完整的 FormData 日志记录 ✅

**问题**：之前的代码只打印了简单的日志信息，没有显示完整的 FormData 请求体内容。由于 FormData 无法直接序列化为 JSON，导致无法看到参考图片是否正确添加。

**解决方案**：在发送请求前添加了完整的 FormData 遍历日志：

```typescript
// 打印完整的 FormData 内容（便于调试）
qlog("=== 完整请求体 (FormData) ===");
for (const [key, value] of formData.entries()) {
  if (value instanceof Blob) {
    qlog(`  ${key}: Blob(${value.size} bytes, type: ${value.type})`);
  } else {
    qlog(`  ${key}: ${value}`);
  }
}
```

**效果**：现在可以在浏览器控制台中看到：
- 所有普通字段的值（model, prompt, size, quality）
- Blob 字段的大小和类型（image）

### 2. 参考图片下载和处理 ✅

**已实现的功能**：
- 从 URL 下载第一张参考图片
- 将图片转换为 Blob 对象
- 添加到 FormData 的 `image` 字段
- 包含错误处理和日志记录

```typescript
if (imageUrls && imageUrls.length > 0) {
  try {
    const firstImageUrl = imageUrls[0];
    qlog(`✓ 正在下载参考图片: ${firstImageUrl.slice(0, 80)}...`);
    
    const imageResponse = await fetch(firstImageUrl);
    if (!imageResponse.ok) {
      throw new Error(`无法下载参考图片，HTTP ${imageResponse.status}`);
    }
    
    const imageBlob = await imageResponse.blob();
    formData.append("image", imageBlob, "reference-image.png");
    qlog(`✓ 已添加参考图片 (${(imageBlob.size / 1024).toFixed(2)} KB)`);
  } catch (error) {
    qlog(`✗ 参考图片处理失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new Error(`QS GPT Image 2 参考图片处理失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```

### 3. 请求格式和认证 ✅

**已实现的配置**：
- **请求格式**：multipart/form-data（Edits 接口要求）
- **认证方式**：Authorization: Bearer Token
- **端点**：`https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview`
- **模型**：gpt-image-2

### 4. 响应处理 ✅

**已实现的功能**：
- 尝试从 `data[0].url` 提取图片 URL
- 如果没有 URL，尝试从 `data[0].b64_json` 提取 base64 数据
- 将 base64 数据转换为 data URL
- 如果都没有找到，使用通用的 `extractGeneratedImageUrl()` 函数

## 代码位置

**文件**：[`src/lib/modelClient.ts`](src/lib/modelClient.ts)

**函数**：
- [`callQsGptImage2Once()`](src/lib/modelClient.ts:936-1081) - 单次调用（不带重试）
- [`callQsGptImage2()`](src/lib/modelClient.ts:1086-1110) - 自动重试版本

## 调试步骤

### 1. 查看完整日志

在浏览器开发者工具中打开 Console 标签，查看 `[QS GPT Image 2]` 前缀的日志：

```
[QS GPT Image 2] request → https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview
[QS GPT Image 2]   model: gpt-image-2
[QS GPT Image 2]   prompt: 任务：基于我提供的 2 张参考图片...
[QS GPT Image 2]   size: 1024x1536
[QS GPT Image 2]   quality: high
[QS GPT Image 2]   image: 已添加参考图片 (4185.58 KB)
[QS GPT Image 2] === 完整请求体 (FormData) ===
[QS GPT Image 2]   model: gpt-image-2
[QS GPT Image 2]   prompt: 任务：基于我提供的 2 张参考图片...
[QS GPT Image 2]   size: 1024x1536
[QS GPT Image 2]   quality: high
[QS GPT Image 2]   image: Blob(4289536 bytes, type: image/png)
```

### 2. 验证参考图片

检查日志中的 `image: Blob(...)` 行：
- 如果显示 Blob 信息，说明参考图片已正确下载和添加
- 如果没有显示，说明参考图片下载失败

### 3. 验证 API Key

如果仍然收到 `invalid token` 错误，请：
1. 确认 API Key 是否有效
2. 确认 API Key 是否有权限调用 Edits 接口
3. 尝试其他认证方式（如 `api-key` 请求头）

## 相关文件

- **调试文档**：[`QS_GPT_IMAGE2_CURL_DEBUG.md`](QS_GPT_IMAGE2_CURL_DEBUG.md)
- **模型配置**：[`src/lib/modelConfig.ts`](src/lib/modelConfig.ts)
- **用户配置管理**：[`src/lib/userApiConfig.ts`](src/lib/userApiConfig.ts)
- **模型路由**：[`src/lib/modelRouter.ts`](src/lib/modelRouter.ts)

## 编译状态

✅ **代码编译成功**，无 TypeScript 错误

```
vite v6.4.2 building for production...
✓ 1593 modules transformed.
✓ built in 755ms
```

## 下一步

1. **运行应用**：`npm run dev`
2. **打开浏览器控制台**：F12 或右键 → 检查 → Console
3. **尝试生成图片**：观察完整的 FormData 日志
4. **如果仍有问题**：
   - 检查参考图片是否正确下载（查看 Blob 大小）
   - 验证 API Key 是否有效
   - 联系平台负责人，提供完整的日志输出

---

**更新时间**：2026-06-03
**状态**：✅ 完成
**编译状态**：✅ 成功
