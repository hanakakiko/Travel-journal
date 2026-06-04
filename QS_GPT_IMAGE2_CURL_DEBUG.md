# QS GPT Image 2 API 调试信息

## 当前问题
API 返回 `invalid token` 错误，错误代码 10001

```json
{
  "Code": 10001,
  "Error": "invalid token, please check your token"
}
```

## 实际调用信息

### 请求端点
```
https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview
```

### 请求方法
- **HTTP Method**: POST
- **Content-Type**: multipart/form-data
- **Authentication**: Bearer Token

### 请求参数

| 参数 | 值 | 说明 |
|------|-----|------|
| model | gpt-image-2 | 模型名称 |
| prompt | （长提示词） | 1587 字符的详细提示 |
| size | 1024x1536 | 竖向长图尺寸 |
| quality | high | 高质量 |
| image | （参考图片） | 4185.58 KB 的 PNG 图片 |

## curl 命令示例

```bash
curl --location 'https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview' \
  --header 'Authorization: Bearer YOUR_API_KEY' \
  --form 'model="gpt-image-2"' \
  --form 'prompt="任务：基于我提供的 2 张参考图片，生成一张「一次旅程手帐」主题的手帐拼贴图。..."' \
  --form 'size="1024x1536"' \
  --form 'quality="high"' \
  --form 'image=@"/path/to/reference-image.png"'
```

## 问题诊断清单

### 1. API Key 相关
- [ ] API Key 是否有效？
- [ ] API Key 是否已过期？
- [ ] API Key 格式是否正确？（应该是一个长字符串）
- [ ] API Key 是否有权限调用 Edits 接口？
- [ ] API Key 是否有权限调用 gpt-image-2 模型？

### 2. 认证方式
- [ ] 是否应该使用 `Authorization: Bearer` 格式？
- [ ] 是否应该使用其他认证方式（如 `api-key` 请求头）？
- [ ] 是否需要在请求头中添加其他字段？

### 3. 接口配置
- [ ] 端点 URL 是否正确？
- [ ] `api-version` 参数值是否正确？
- [ ] 是否需要其他查询参数？

### 4. 请求格式
- [ ] multipart/form-data 格式是否正确？
- [ ] 参数名称是否正确？
- [ ] 参数值格式是否正确？

## 建议的调试步骤

### 步骤 1：验证 API Key
```bash
# 使用 curl 测试 API Key 是否有效
curl --location 'https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview' \
  --header 'Authorization: Bearer YOUR_API_KEY' \
  --form 'model="gpt-image-2"' \
  --form 'prompt="test"' \
  --form 'size="1024x1024"' \
  --form 'quality="high"' \
  --form 'image=@"/path/to/test-image.png"'
```

### 步骤 2：检查认证方式
尝试其他认证方式：
```bash
# 方式 1：api-key 请求头
--header 'api-key: YOUR_API_KEY'

# 方式 2：Authorization 请求头（不带 Bearer）
--header 'Authorization: YOUR_API_KEY'

# 方式 3：查询参数
# URL 中添加 ?api-key=YOUR_API_KEY
```

### 步骤 3：简化请求
移除可选参数，只保留必需参数：
```bash
curl --location 'https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview' \
  --header 'Authorization: Bearer YOUR_API_KEY' \
  --form 'model="gpt-image-2"' \
  --form 'prompt="test"' \
  --form 'image=@"/path/to/test-image.png"'
```

## 相关文档链接

- API 文档：https://gpt-best.apifox.cn/api-447258891
- 获取 API Key：https://gpt-best.apifox.cn/doc-6535931

## 日志信息汇总

### 请求日志
```
[QS GPT Image 2] request → https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview
[QS GPT Image 2]   model: gpt-image-2
[QS GPT Image 2]   prompt: 任务：基于我提供的 2 张参考图片...
[QS GPT Image 2]   size: 1024x1536
[QS GPT Image 2]   quality: high
[QS GPT Image 2]   image: 已添加参考图片 (4185.58 KB)
[QS GPT Image 2] === 完整请求体 (FormData) ===
[QS GPT Image 2]   model: gpt-image-2
[QS GPT Image 2]   prompt: 任务：基于我提供的 2 张参考图片，生成一张「一次旅程手帐」主题的手帐拼贴图。...
[QS GPT Image 2]   size: 1024x1536
[QS GPT Image 2]   quality: high
[QS GPT Image 2]   image: Blob(4289536 bytes, type: image/png)
```

### 响应日志
```
[QS GPT Image 2] ← response {Code: 10001, Error: 'invalid token, please check your token'}
```

### 错误日志
```
[QS GPT Image 2] × attempt 1/3 failed {retryable: false, isLast: false, message: 'QS GPT Image 2 API 未在返回结构中找到图片链接或 base64 数据'}
```

## 代码改进

### 已添加的改进
✅ **完整的 FormData 日志记录**：在发送请求前，代码现在会打印 FormData 的所有字段，包括：
- 普通字段（model, prompt, size, quality）的值
- Blob 字段（image）的大小和类型

这样可以清楚地看到参考图片是否正确下载和添加到请求中。

### 日志输出示例
```
[QS GPT Image 2] === 完整请求体 (FormData) ===
[QS GPT Image 2]   model: gpt-image-2
[QS GPT Image 2]   prompt: 任务：基于我提供的 2 张参考图片...
[QS GPT Image 2]   size: 1024x1536
[QS GPT Image 2]   quality: high
[QS GPT Image 2]   image: Blob(4289536 bytes, type: image/png)
```

## 下一步行动

1. **查看完整日志**：在浏览器开发者工具的 Console 标签中查看完整的 FormData 日志
2. **确认 API Key**：请检查你的 API Key 是否有效
3. **联系平台负责人**：提供上述 curl 命令和诊断清单，以及完整的日志输出
4. **测试认证方式**：尝试不同的认证方式
5. **验证权限**：确认 API Key 是否有权限调用 Edits 接口

---

**生成时间**：2026-06-03 21:30
**API 版本**：2025-04-01-preview
**模型**：gpt-image-2
**接口**：/v1/images/edits
