# QS GPT Image 2 API 迁移总结

## 📝 概述

已成功将 QS GPT Image 2 API 调用从 **Edits 接口（multipart/form-data）** 迁移到 **Generations 接口（JSON）**。

## 🔄 变更内容

### 1. 接口变更

| 项目 | 之前 | 现在 |
|------|------|------|
| **端点** | `/v1/images/edits` | `/v1/images/generations` |
| **请求格式** | multipart/form-data | application/json |
| **认证方式** | `api-key` 请求头 | `Authorization: Bearer` 请求头 |
| **参考图片** | 单个文件（form data） | URL 数组（JSON） |
| **响应格式** | base64 (`b64_json`) | URL (`url`) |

### 2. 代码变更

#### 修改的文件
- **[`src/lib/modelClient.ts`](src/lib/modelClient.ts)** - `callQsGptImage2Once()` 函数

#### 关键改动

**请求体构建**
```typescript
// 之前：FormData
const formData = new FormData();
formData.append("model", "gpt-image-2");
formData.append("image", blob, "reference-image.jpg");

// 现在：JSON
const requestBody = {
  model: "gpt-image-2",
  prompt: prompt,
  size: `${targetWidth}x${targetHeight}`,
  quality: "high",
  response_format: "url",
  image: imageUrls, // 直接使用 URL 数组
};
```

**请求头设置**
```typescript
// 之前
headers: {
  "api-key": apiKey,
}

// 现在
headers: {
  "Authorization": `Bearer ${apiKey}`,
  "Content-Type": "application/json",
}
```

**响应处理**
```typescript
// 之前：从 base64 转换
imageUrl = `data:image/jpeg;base64,${b64Data}`;

// 现在：直接使用 URL
imageUrl = (payload as any).data[0].url;
```

### 3. 优势

✅ **更简洁** - JSON 格式比 multipart/form-data 更易处理  
✅ **更标准** - 符合 OpenAI 标准的 Generations API  
✅ **支持多图** - 可以传递多张参考图片 URL  
✅ **更灵活** - 返回 URL 而不是 base64，便于缓存和分享  
✅ **更快速** - 不需要下载和转换图片为 Blob  

## 🧪 测试步骤

1. **打开应用**
   - 访问应用首页

2. **配置 API Key**
   - 点击 "API 配置"
   - 选择 "QS GPT Image 2" 模型
   - 输入有效的 API Key

3. **上传参考照片**
   - 点击 "选择照片"
   - 选择一张或多张照片

4. **填写手帐信息**
   - 输入手帐主题、描述等信息

5. **生成手帐**
   - 点击 "装订手帐本"
   - 等待 API 响应

6. **验证结果**
   - 检查生成的图片是否正确显示
   - 查看浏览器控制台日志确认请求格式

## 📊 请求/响应示例

### 请求示例

```json
{
  "model": "gpt-image-2",
  "prompt": "一张手帐拼贴，包含旅游元素、票根、贴纸",
  "size": "1024x1536",
  "quality": "high",
  "response_format": "url",
  "image": [
    "https://example.com/reference1.jpg",
    "https://example.com/reference2.jpg"
  ]
}
```

### 响应示例

```json
{
  "created": 1780490929,
  "data": [
    {
      "url": "https://example.com/generated-image.jpg"
    }
  ]
}
```

## 🔧 故障排查

### 问题：API 返回 "invalid token" 错误

**可能原因**：
1. API Key 不正确或已过期
2. API Key 没有权限访问该模型
3. API Key 格式不正确

**解决方案**：
1. 检查 API Key 是否正确复制
2. 从 QS 平台重新获取新的 API Key
3. 确保 API Key 有权限访问 `gpt-image-2` 模型

### 问题：生成的图片显示不出来

**可能原因**：
1. 图片 URL 无效或已过期
2. 网络连接问题
3. 跨域问题

**解决方案**：
1. 检查浏览器控制台是否有错误信息
2. 尝试在新标签页打开图片 URL
3. 检查网络连接

### 问题：参考图片没有被使用

**可能原因**：
1. 参考图片 URL 无效
2. API 不支持该格式的图片
3. 参考图片过大或过小

**解决方案**：
1. 确保参考图片 URL 可以直接访问
2. 使用常见格式（JPG、PNG）
3. 确保图片尺寸在合理范围内

## 📚 相关文档

- [`API_RESPONSE_FORMAT.md`](API_RESPONSE_FORMAT.md) - 完整的 API 格式说明
- [`MULTIPART_FORM_UPDATE.md`](MULTIPART_FORM_UPDATE.md) - 之前的 multipart 更新说明
- [`QS_GPT_IMAGE_2_SETUP.md`](QS_GPT_IMAGE_2_SETUP.md) - 完整配置指南
- [`QUICK_START.md`](QUICK_START.md) - 快速开始指南

## ✅ 完成清单

- [x] 修改 API 端点为 `/v1/images/generations`
- [x] 改用 JSON 格式而不是 multipart/form-data
- [x] 更新认证方式为 `Authorization: Bearer`
- [x] 支持多张参考图片 URL
- [x] 改用 URL 响应格式而不是 base64
- [x] 更新 API 文档
- [x] 测试代码构建

## 🚀 下一步

1. **用户测试** - 用户需要测试新的 Generations 接口是否能正确调用
2. **API 响应验证** - 确认 API 是否正确返回图片 URL
3. **参考图片验证** - 确认参考图片是否被正确使用
4. **性能优化** - 如果需要，可以优化图片加载和缓存

---

**更新日期**: 2026年6月3日  
**状态**: ✅ 完成  
**构建状态**: ✅ 成功
