# QS GPT Image 2 API 请求和响应格式说明

## 📋 概述

QS GPT Image 2 API 使用 **JSON** 格式，支持多张参考图片输入，并返回图片 URL。本文档说明了完整的请求和响应格式。

## 📊 API 请求格式

### 请求方式
- **方法**: POST
- **路径**: `/v1/images/generations`
- **Content-Type**: `application/json`
- **认证**: `Authorization: Bearer YOUR_API_KEY`

### 请求参数（JSON Body）

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| model | string | ✅ | 模型名称，必须是 "gpt-image-2" |
| prompt | string | ✅ | 生成图片的描述文本 |
| image | array | ❌ | 参考图片 URL 列表（可选，支持多张） |
| size | string | ✅ | 生成图片的尺寸，格式为 "宽x高" |
| quality | string | ✅ | 图片质量，支持 "low", "medium", "high" |
| response_format | string | ✅ | 响应格式，使用 "url" 返回图片 URL |

### 支持的尺寸

常用尺寸：
- `1024x1024` - 正方形
- `1024x1536` - 竖屏（推荐用于手帐）
- `1536x1024` - 横屏
- `2048x2048` - 2K 正方形
- `2048x1152` - 2K 横屏
- `2160x3840` - 4K 竖屏
- `3840x2160` - 4K 横屏

尺寸限制：
- 最大边长 ≤ 3840px
- 两个边长都必须是 16px 的倍数
- 长边与短边之比 ≤ 3:1
- 总像素数 655,360 ~ 8,294,400

### 请求示例（cURL）

```bash
curl --location '/v1/images/generations' \
  --header 'Authorization: Bearer YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "model": "gpt-image-2",
    "prompt": "一张手帐拼贴，包含旅游元素、票根、贴纸",
    "size": "1024x1536",
    "quality": "high",
    "response_format": "url",
    "image": [
      "https://example.com/reference1.jpg",
      "https://example.com/reference2.jpg"
    ]
  }'
```

### 请求示例（JavaScript/TypeScript）

```typescript
const requestBody = {
  model: "gpt-image-2",
  prompt: "一张手帐拼贴，包含旅游元素、票根、贴纸",
  size: "1024x1536",
  quality: "high",
  response_format: "url",
  image: [
    "https://example.com/reference1.jpg",
    "https://example.com/reference2.jpg"
  ]
};

const response = await fetch("https://maas.devops.rednote.life/openai/openai/images/generations", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(requestBody),
});

const data = await response.json();
const imageUrl = data.data[0].url;
```

### 参考图片处理

- 参考图片通过 `image` 数组传递（支持多张）
- 参考图片可以帮助 API 更好地理解用户的需求
- 如果不提供参考图片，API 会根据 prompt 直接生成图片
- 推荐使用 1-4 张参考图片，效果最佳

## 📊 API 响应格式

### 成功响应示例

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

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| created | number | 响应创建时间戳 |
| data | array | 生成的图片数组 |
| data[0].url | string | 生成的图片 URL |

### 错误响应示例

```json
{
  "error": {
    "message": "Invalid API key",
    "type": "invalid_request_error",
    "code": "invalid_api_key"
  }
}
```

## 🔄 完整流程

1. **构建请求体**
   - 设置模型名称为 "gpt-image-2"
   - 填写生成描述（prompt）
   - 设置输出尺寸
   - 添加参考图片 URL（可选）
   - 设置响应格式为 "url"

2. **发送请求**
   - 使用 POST 方法
   - 设置 Authorization 请求头
   - 发送 JSON 格式的请求体

3. **处理响应**
   - 检查响应状态码
   - 从 `data[0].url` 获取生成的图片 URL
   - 使用图片 URL 显示或下载图片

## ⚠️ 常见错误

### 401 Unauthorized
- **原因**: API Key 无效或过期
- **解决**: 检查 API Key 是否正确，重新获取新的 API Key

### 400 Bad Request
- **原因**: 请求参数不正确
- **解决**: 检查参数格式，确保所有必需参数都已提供

### 429 Too Many Requests
- **原因**: 请求过于频繁
- **解决**: 等待一段时间后重试，或联系 QS 平台增加配额

### 500 Internal Server Error
- **原因**: 服务器错误
- **解决**: 稍后重试，或联系 QS 平台技术支持

## 🔗 相关文档

- [`MULTIPART_FORM_UPDATE.md`](MULTIPART_FORM_UPDATE.md) - 更新说明
- [`QS_GPT_IMAGE_2_SETUP.md`](QS_GPT_IMAGE_2_SETUP.md) - 完整配置指南
- [`QUICK_START.md`](QUICK_START.md) - 快速开始指南
