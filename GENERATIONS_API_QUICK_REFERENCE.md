# QS GPT Image 2 Generations API 快速参考

## 🚀 快速开始

### 1. 配置 API Key

```typescript
// 在应用中输入 API Key
const apiKey = "your-api-key-here";
```

### 2. 构建请求

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
```

### 3. 发送请求

```typescript
const response = await fetch(
  "https://maas.devops.rednote.life/openai/openai/images/generations",
  {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  }
);

const data = await response.json();
const imageUrl = data.data[0].url;
```

## 📋 参数说明

| 参数 | 值 | 说明 |
|------|-----|------|
| model | `gpt-image-2` | 模型名称（固定） |
| prompt | 文本 | 生成描述 |
| size | `1024x1536` | 输出尺寸 |
| quality | `high` | 图片质量 |
| response_format | `url` | 返回 URL 格式 |
| image | URL 数组 | 参考图片（可选） |

## 🎨 常用尺寸

```
1024x1024   - 正方形
1024x1536   - 竖屏（推荐）
1536x1024   - 横屏
2048x2048   - 2K 正方形
```

## ✅ 成功响应

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

## ❌ 错误响应

```json
{
  "error": {
    "message": "Invalid API key",
    "type": "invalid_request_error",
    "code": "invalid_api_key"
  }
}
```

## 🔧 常见问题

### Q: 如何添加参考图片？
A: 在 `image` 字段中传递 URL 数组：
```json
"image": ["url1", "url2", "url3"]
```

### Q: 可以传递多少张参考图片？
A: 理论上没有限制，但推荐 1-4 张效果最佳。

### Q: 如何改变输出尺寸？
A: 修改 `size` 参数：
```json
"size": "2048x2048"
```

### Q: 如何提高图片质量？
A: 使用 `quality: "high"`（已默认设置）。

### Q: API Key 在哪里获取？
A: 从 QS 平台的 API 管理页面获取。

## 📞 故障排查

| 错误 | 原因 | 解决 |
|------|------|------|
| 401 Unauthorized | API Key 无效 | 检查 API Key |
| 400 Bad Request | 参数错误 | 检查参数格式 |
| 429 Too Many Requests | 请求过于频繁 | 等待后重试 |
| 500 Internal Server Error | 服务器错误 | 稍后重试 |

## 🔗 相关链接

- [完整 API 文档](API_RESPONSE_FORMAT.md)
- [迁移总结](GENERATIONS_API_MIGRATION.md)
- [配置指南](QS_GPT_IMAGE_2_SETUP.md)

---

**最后更新**: 2026年6月3日
