# QS GPT Image 2 API 最新改进 - 手动构建 multipart/form-data

## 问题

之前使用浏览器的 FormData API 时，日志中只显示了 `prompt` 字段，其他字段（特别是 `image`）没有被正确显示。这导致无法清楚地看到参考图片是否被正确添加到请求中。

## 解决方案

✅ **改用手动构建 multipart/form-data 请求体**

不再依赖浏览器的 FormData API，而是手动构建完整的 multipart/form-data 请求体。这样可以：
- 完全控制请求内容
- 清楚地看到所有字段（model, prompt, size, quality, image）
- 更容易调试和排查问题
- 避免浏览器 FormData 的序列化问题

## 实现方式

### 核心步骤

1. **下载参考图片**
   ```typescript
   const imageBlob = await imageResponse.blob();
   ```

2. **生成随机 boundary**
   ```typescript
   const boundary = `----WebKitFormBoundary${Math.random().toString(36).substr(2, 16)}`;
   ```

3. **手动构建各个字段**
   - model: gpt-image-2
   - prompt: 用户提供的提示词
   - size: 1024x1536
   - quality: high
   - image: 参考图片的 Blob 数据

4. **合并成 Uint8Array**
   ```typescript
   const bodyArray = new Uint8Array(totalSize);
   // 逐个添加各部分
   ```

5. **发送请求**
   ```typescript
   const response = await fetch(endpoint, {
     method: "POST",
     headers: {
       "Authorization": `Bearer ${apiKey}`,
       "Content-Type": `multipart/form-data; boundary=${boundary}`,
     },
     body: bodyArray,
   });
   ```

## 日志输出示例

现在可以在浏览器控制台中看到完整的请求信息：

```
[QS GPT Image 2] request → https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview
[QS GPT Image 2]   model: gpt-image-2
[QS GPT Image 2]   prompt: 任务：基于我提供的 2 张参考图片...
[QS GPT Image 2]   size: 1024x1536
[QS GPT Image 2]   quality: high
[QS GPT Image 2]   image: 4185.58 KB (image/jpeg)
[QS GPT Image 2] === 完整请求体 (multipart/form-data) ===
[QS GPT Image 2]   boundary: ----WebKitFormBoundary1a2b3c4d5e6f7g8h
[QS GPT Image 2]   总大小: 4289.56 KB
[QS GPT Image 2]   字段: model, prompt, size, quality, image
[QS GPT Image 2]   image 大小: 4185.58 KB
```

## 关键改进

| 项目 | 之前 | 现在 |
|------|------|------|
| 请求体构建 | FormData API | 手动构建 |
| 字段可见性 | ❌ 只显示 prompt | ✅ 显示所有字段 |
| image 字段 | ❌ 无法看到 | ✅ 显示大小和类型 |
| 调试难度 | ❌ 困难 | ✅ 容易 |
| 控制度 | ❌ 有限 | ✅ 完全控制 |

## 代码位置

**文件**：[`src/lib/modelClient.ts`](src/lib/modelClient.ts)

**函数**：[`callQsGptImage2Once()`](src/lib/modelClient.ts:936-1133)

**关键代码段**：
- 第 963-981 行：下载参考图片
- 第 992-1018 行：手动构建 multipart/form-data
- 第 1020-1040 行：合并请求体
- 第 1042-1049 行：打印日志
- 第 1051-1063 行：发送请求

## 编译状态

✅ **代码编译成功**，无 TypeScript 错误

```
✓ 1593 modules transformed.
✓ built in 810ms
```

## 使用步骤

1. **运行应用**
   ```bash
   npm run dev
   ```

2. **打开浏览器控制台**
   - 按 F12 或右键 → 检查 → Console

3. **尝试生成图片**
   - 在应用中选择参考图片和提示词
   - 点击生成按钮

4. **查看日志**
   - 查看 `[QS GPT Image 2]` 前缀的日志
   - 特别关注 `=== 完整请求体 (multipart/form-data) ===` 部分
   - 验证 `image 大小` 是否正确显示

## 故障排查

### 如果仍然收到 `invalid token` 错误

1. **验证 API Key**
   - 确认 API Key 是否有效
   - 确认 API Key 是否有权限调用 Edits 接口

2. **检查参考图片**
   - 查看日志中的 `image 大小` 是否显示
   - 如果显示，说明参考图片已正确下载和添加

3. **联系平台负责人**
   - 提供完整的日志输出
   - 提供 API Key 和端点信息
   - 提供参考图片的 URL

### 如果参考图片没有被添加

1. **检查日志**
   - 查看是否有 `✓ 已下载参考图片` 日志
   - 查看是否有 `image 大小` 显示

2. **检查参考图片 URL**
   - 确认 URL 是否可访问
   - 确认 URL 是否返回有效的图片

3. **检查网络**
   - 确认网络连接是否正常
   - 确认是否有代理或防火墙限制

## 相关文档

- [手动构建 multipart/form-data 详解](QS_GPT_IMAGE2_MANUAL_MULTIPART.md)
- [API 调试信息](QS_GPT_IMAGE2_CURL_DEBUG.md)
- [改进总结](QS_GPT_IMAGE2_IMPROVEMENTS.md)

---

**更新时间**：2026-06-03
**状态**：✅ 完成
**编译状态**：✅ 成功
**下一步**：运行应用并查看日志，验证参考图片是否被正确添加
