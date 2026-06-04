# Multipart Form-Data 更新说明

## 🔄 重要更新

已将 QS GPT Image 2 API 调用方式从 **JSON** 改为 **multipart/form-data** 格式。

## 📝 变更内容

### 1. 请求格式变更

**之前（JSON 格式）**：
```json
{
  "model": "gpt-image-2",
  "prompt": "...",
  "size": "1024x1536",
  "quality": "high",
  "output_format": "jpeg",
  "output_compression": 85,
  "image_urls": [...]
}
```

**现在（Multipart Form-Data 格式）**：
```
model: gpt-image-2
prompt: ...
size: 1024x1536
quality: high
response_format: b64_json
image: [文件]
```

### 2. 端点变更

**之前**：
```
https://maas.devops.rednote.life/openai/openai/images/generations?api-version=2025-04-01-preview
```

**现在**：
```
https://maas.devops.rednote.life/openai/openai/images/edits
```

### 3. 代码变更

#### 修改的文件
- [`src/lib/modelClient.ts`](src/lib/modelClient.ts) - `callQsGptImage2Once()` 函数

#### 关键改动

```typescript
// 构建 FormData 而不是 JSON
const formData = new FormData();
formData.append("model", "gpt-image-2");
formData.append("prompt", prompt);
formData.append("size", `${targetWidth}x${targetHeight}`);
formData.append("quality", "high");
formData.append("response_format", "b64_json");

// 添加参考图片文件
if (imageUrls && imageUrls.length > 0) {
  const imageUrl = imageUrls[0];
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  formData.append("image", blob, "reference-image.jpg");
}

// 发送请求
const response = await fetchWithTimeout(
  "QS GPT Image 2 API",
  endpoint,
  {
    method: "POST",
    headers: {
      "api-key": apiKey,
      // 不要设置 Content-Type，让浏览器自动设置
    },
    body: formData,
  },
  timeoutMs,
);
```

## ✨ 优势

1. **符合 OpenAI 标准** - 使用标准的 multipart/form-data 格式
2. **支持文件上传** - 可以直接上传图片文件而不是 URL
3. **更好的兼容性** - 与 OpenAI Edits API 兼容
4. **参考图片处理** - 自动从 URL 下载并转换为 Blob

## 🧪 测试步骤

1. 打开应用
2. 选择 "QS GPT Image 2" 模型
3. 输入 API Key
4. 上传参考照片
5. 填写手帐信息
6. 点击 "装订手帐本"
7. 观察是否成功生成图片

## 📊 请求流程

```
用户上传图片
    ↓
应用获取图片 URL
    ↓
从 URL 下载图片为 Blob
    ↓
创建 FormData 对象
    ↓
添加参数和图片文件
    ↓
发送 POST 请求到 /v1/images/edits
    ↓
API 返回 base64 数据
    ↓
转换为 data URL
    ↓
显示给用户
```

## ⚠️ 注意事项

1. **不要手动设置 Content-Type** - 浏览器会自动设置为 `multipart/form-data; boundary=...`
2. **参考图片是可选的** - 如果不提供，API 会根据 prompt 直接生成
3. **只支持第一张参考图片** - 当前实现只使用 `imageUrls[0]`
4. **图片下载可能失败** - 代码中有错误处理，会继续执行

## 🔗 相关文档

- [`API_RESPONSE_FORMAT.md`](API_RESPONSE_FORMAT.md) - 完整的 API 格式说明
- [`src/lib/modelClient.ts`](src/lib/modelClient.ts) - 实现代码

## 📞 常见问题

### Q: 为什么改用 multipart/form-data？

A: 因为 QS 平台的 edit 接口遵循 OpenAI 标准，使用 multipart/form-data 格式来处理文件上传。

### Q: 参考图片是必需的吗？

A: 不是。如果不提供参考图片，API 会根据 prompt 直接生成图片。

### Q: 可以上传多张参考图片吗？

A: 当前实现只支持一张参考图片（`imageUrls[0]`）。如果需要支持多张，可以后续扩展。

### Q: 如果图片下载失败会怎样？

A: 代码中有错误处理，会记录警告日志但继续执行，API 会根据 prompt 生成图片。

---

**更新日期**: 2024年  
**状态**: ✅ 完成  
**构建状态**: ✅ 成功
