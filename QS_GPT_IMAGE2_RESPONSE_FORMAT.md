# QS GPT Image 2 API - 响应格式处理

## API 响应格式

根据用户提供的实际响应格式：

```json
{
  "created": 1713833628,
  "data": [
    {
      "b64_json": "..."
    }
  ],
  "usage": {
    "total_tokens": 100,
    "input_tokens": 50,
    "output_tokens": 50,
    "input_tokens_details": {
      "text_tokens": 10,
      "image_tokens": 40
    }
  }
}
```

## 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `created` | number | 响应创建时间戳 |
| `data` | array | 生成结果数组 |
| `data[0].b64_json` | string | Base64 编码的图片数据 |
| `data[0].url` | string | 图片 URL（可选） |
| `usage` | object | Token 使用统计 |
| `usage.total_tokens` | number | 总 Token 数 |
| `usage.input_tokens` | number | 输入 Token 数 |
| `usage.output_tokens` | number | 输出 Token 数 |

## 代码实现

### 1. 响应格式分析

在接收到响应后，代码会打印详细的响应格式信息：

```typescript
qlog("=== 响应格式分析 ===");
qlog(`  created: ${payloadObj.created ?? "未找到"}`);
qlog(`  data 数组长度: ${Array.isArray(payloadObj.data) ? (payloadObj.data as any[]).length : "未找到"}`);
if (Array.isArray(payloadObj.data) && (payloadObj.data as any[]).length > 0) {
  const firstData = (payloadObj.data as any[])[0];
  qlog(`  data[0] 字段: ${Object.keys(firstData).join(", ")}`);
  if ("b64_json" in firstData) {
    const b64Str = firstData.b64_json as string;
    qlog(`  data[0].b64_json 长度: ${b64Str.length} 字符`);
  }
  if ("url" in firstData) {
    qlog(`  data[0].url: ${(firstData.url as string).slice(0, 80)}...`);
  }
}
if ("usage" in payloadObj) {
  const usage = payloadObj.usage as Record<string, unknown>;
  qlog(`  usage.total_tokens: ${usage.total_tokens ?? "未找到"}`);
}
```

### 2. 图片提取逻辑

代码会按以下优先级提取图片：

1. **优先级 1**：从 `data[0].url` 提取 URL
   ```typescript
   if ("url" in (payload as any).data[0]) {
     imageUrl = (payload as any).data[0].url;
   }
   ```

2. **优先级 2**：从 `data[0].b64_json` 提取 Base64 数据并转换为 data URL
   ```typescript
   if ("b64_json" in (payload as any).data[0]) {
     const b64Data = (payload as any).data[0].b64_json;
     imageUrl = `data:image/jpeg;base64,${b64Data}`;
   }
   ```

3. **优先级 3**：使用通用的 `extractGeneratedImageUrl()` 函数
   ```typescript
   imageUrl = extractGeneratedImageUrl(payload);
   ```

## 日志输出示例

### 请求日志
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
```

### 响应日志
```
[QS GPT Image 2] ← response {created: 1713833628, data: Array(1), usage: {…}}
[QS GPT Image 2] === 完整响应体 ===
[QS GPT Image 2] {
  "created": 1713833628,
  "data": [
    {
      "b64_json": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    }
  ],
  "usage": {
    "total_tokens": 100,
    "input_tokens": 50,
    "output_tokens": 50,
    "input_tokens_details": {
      "text_tokens": 10,
      "image_tokens": 40
    }
  }
}
[QS GPT Image 2] === 响应格式分析 ===
[QS GPT Image 2]   created: 1713833628
[QS GPT Image 2]   data 数组长度: 1
[QS GPT Image 2]   data[0] 字段: b64_json
[QS GPT Image 2]   data[0].b64_json 长度: 76 字符
[QS GPT Image 2]   usage.total_tokens: 100
[QS GPT Image 2] ✓ 生成成功，图片已转换为 data URL (76 字符)
```

## 关键改进

### 1. 响应格式分析
✅ 添加了详细的响应格式分析日志，可以清楚地看到：
- `created` 时间戳
- `data` 数组长度
- `data[0]` 包含的字段
- `b64_json` 数据长度
- `usage` 统计信息

### 2. Base64 处理
✅ 正确处理 `b64_json` 字段：
- 检查字段是否存在
- 提取 Base64 字符串
- 转换为 data URL 格式：`data:image/jpeg;base64,{b64_json}`

### 3. 多优先级提取
✅ 支持多种图片提取方式：
1. 优先从 `data[0].url` 提取
2. 其次从 `data[0].b64_json` 提取
3. 最后使用通用提取函数

## 代码位置

**文件**：[`src/lib/modelClient.ts`](src/lib/modelClient.ts)

**函数**：[`callQsGptImage2Once()`](src/lib/modelClient.ts:936-1160)

**关键代码段**：
- 第 1084-1107 行：响应处理和格式分析
- 第 1109-1145 行：图片提取逻辑

## 编译状态

✅ **代码编译成功**，无 TypeScript 错误

```
✓ 1593 modules transformed.
✓ built in 752ms
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
   - 特别关注 `=== 响应格式分析 ===` 部分
   - 验证 `data[0].b64_json 长度` 是否显示

## 故障排查

### 如果看不到 `b64_json` 字段

1. **检查响应格式**
   - 查看 `=== 完整响应体 ===` 部分
   - 确认响应中是否包含 `b64_json` 字段

2. **检查 API Key**
   - 确认 API Key 是否有效
   - 确认 API Key 是否有权限调用 Edits 接口

3. **检查参考图片**
   - 确认参考图片是否正确下载
   - 查看日志中的 `image 大小` 是否显示

### 如果 Base64 数据为空

1. **检查 API 响应**
   - 查看 `data[0].b64_json 长度` 是否为 0
   - 检查 API 是否返回了有效的图片数据

2. **检查提示词**
   - 确认提示词是否有效
   - 尝试使用更简单的提示词

3. **联系平台负责人**
   - 提供完整的日志输出
   - 提供 API Key 和参考图片信息

## 相关文档

- [curl 参考](QS_GPT_IMAGE2_CURL_REFERENCE.md)
- [手动构建 multipart/form-data](QS_GPT_IMAGE2_MANUAL_MULTIPART.md)
- [API 调试信息](QS_GPT_IMAGE2_CURL_DEBUG.md)

---

**更新时间**：2026-06-03
**状态**：✅ 完成
**编译状态**：✅ 成功
**响应格式**：已验证和处理
