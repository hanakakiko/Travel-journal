# QS GPT Image 2 API - curl 命令日志

## 功能说明

代码现在会在发送请求前自动生成并打印等效的 curl 命令，方便调试和诊断。

## 日志输出示例

```
[QS GPT Image 2] === 等效的 curl 命令 ===
[QS GPT Image 2] curl --location 'https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview' \
  --header 'Authorization: Bearer YOUR_API_KEY' \
  --form 'image=@"/path/to/reference-image.jpeg"' \
  --form 'prompt="任务：基于我提供的 2 张参考图片..."' \
  --form 'model="gpt-image-2"' \
  --form 'size=""' \
  --form 'response_format=""'
```

## 使用方式

### 1. 查看日志

在浏览器控制台中查看 `[QS GPT Image 2]` 前缀的日志，找到 `=== 等效的 curl 命令 ===` 部分。

### 2. 复制 curl 命令

将打印的 curl 命令复制到终端，替换以下部分：
- `YOUR_API_KEY` - 替换为实际的 API Key
- `/path/to/reference-image.jpeg` - 替换为实际的参考图片路径

### 3. 执行 curl 命令

```bash
curl --location 'https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview' \
  --header 'Authorization: Bearer your_actual_api_key' \
  --form 'image=@"/path/to/your/image.jpeg"' \
  --form 'prompt="你的提示词"' \
  --form 'model="gpt-image-2"' \
  --form 'size=""' \
  --form 'response_format=""'
```

## 代码实现

```typescript
// 生成等效的 curl 命令（用于调试）
qlog("=== 等效的 curl 命令 ===");
const curlCommand = `curl --location '${endpoint}' \\
  --header 'Authorization: Bearer YOUR_API_KEY' \\
  ${imageBlob ? `--form 'image=@"/path/to/reference-image.${imageBlob.type === "image/png" ? "png" : "jpg"}"' \\` : ""}
  --form 'prompt="${prompt.slice(0, 100)}..."' \\
  --form 'model="gpt-image-2"' \\
  --form 'size=""' \\
  --form 'response_format=""'`;
qlog(curlCommand);
```

## 完整日志流程

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
[QS GPT Image 2]   字段顺序: image, prompt, model, size, response_format
[QS GPT Image 2]   image 大小: 4185.58 KB (image/jpeg)
[QS GPT Image 2]   prompt 长度: 1587 字符
[QS GPT Image 2]   model: gpt-image-2
[QS GPT Image 2]   size: (空字符串)
[QS GPT Image 2]   response_format: (空字符串)
[QS GPT Image 2] === 等效的 curl 命令 ===
[QS GPT Image 2] curl --location 'https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview' \
  --header 'Authorization: Bearer YOUR_API_KEY' \
  --form 'image=@"/path/to/reference-image.jpeg"' \
  --form 'prompt="任务：基于我提供的 2 张参考图片..."' \
  --form 'model="gpt-image-2"' \
  --form 'size=""' \
  --form 'response_format=""'
```

## 调试步骤

### 步骤 1：运行应用

```bash
npm run dev
```

### 步骤 2：打开浏览器控制台

按 F12 或右键 → 检查 → Console

### 步骤 3：尝试生成图片

在应用中选择参考图片和提示词，点击生成按钮。

### 步骤 4：查看 curl 命令

在控制台中找到 `=== 等效的 curl 命令 ===` 部分，复制完整的 curl 命令。

### 步骤 5：在终端中测试

```bash
# 替换 YOUR_API_KEY 和图片路径
curl --location 'https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview' \
  --header 'Authorization: Bearer YOUR_API_KEY' \
  --form 'image=@"/path/to/image.jpeg"' \
  --form 'prompt="带上眼镜"' \
  --form 'model="gpt-image-2"' \
  --form 'size=""' \
  --form 'response_format=""'
```

## 故障排查

### 如果 curl 命令执行失败

1. **检查 API Key**
   - 确认 `YOUR_API_KEY` 已替换为实际的 API Key
   - 确认 API Key 是否有效

2. **检查参考图片路径**
   - 确认 `/path/to/reference-image.jpeg` 是正确的文件路径
   - 确认文件是否存在

3. **检查网络连接**
   - 确认网络连接是否正常
   - 确认是否有代理或防火墙限制

4. **检查提示词**
   - 确认提示词是否正确
   - 尝试使用更简单的提示词

## 代码位置

**文件**：[`src/lib/modelClient.ts`](src/lib/modelClient.ts)

**函数**：[`callQsGptImage2Once()`](src/lib/modelClient.ts:936-1175)

**关键代码段**：第 1055-1063 行

## 编译状态

✅ **代码编译成功**，无 TypeScript 错误

```
✓ 1593 modules transformed.
✓ built in 750ms
```

## 下一步

1. ✅ 代码已完成并编译成功
2. ⏳ 运行应用：`npm run dev`
3. ⏳ 打开浏览器控制台：F12
4. ⏳ 尝试生成图片
5. ⏳ 查看并复制 curl 命令
6. ⏳ 在终端中测试 curl 命令

---

**更新时间**：2026-06-03
**状态**：✅ 完成
**编译状态**：✅ 成功
