# API Key 问题排查指南

## 🔴 当前问题

API 返回错误：
```
{
  "Code": 10001,
  "Error": "invalid token, please check your token"
}
```

## 🔍 排查步骤

### 1. 验证 API Key 格式

**正确的 API Key 应该**：
- 是一个长字符串（通常 50+ 字符）
- 不包含空格或特殊字符
- 从 QS 平台的 API 管理页面复制

**检查方法**：
1. 打开应用的 API 配置面板
2. 查看输入的 API Key
3. 确保没有多余的空格或换行符

### 2. 验证 API Key 权限

**需要确认**：
- API Key 是否有权限访问 `gpt-image-2` 模型
- API Key 是否已启用
- API Key 是否已过期

**检查方法**：
1. 登录 QS 平台
2. 进入 API 管理页面
3. 查看 API Key 的权限和状态

### 3. 验证 API Key 是否正确复制

**常见错误**：
- 复制时包含了前后的空格
- 复制了错误的 API Key（有多个时）
- 复制了部分 API Key

**正确做法**：
1. 在 QS 平台找到 API Key
2. 点击"复制"按钮（如果有）
3. 直接粘贴到应用中
4. 不要手动编辑或修改

### 4. 测试 API Key

**使用 cURL 测试**：
```bash
curl --location 'https://maas.devops.rednote.life/openai/openai/images/edits' \
  --header 'api-key: YOUR_API_KEY_HERE' \
  --form 'model="gpt-image-2"' \
  --form 'prompt="test"' \
  --form 'size="1024x1536"' \
  --form 'quality="high"' \
  --form 'response_format="b64_json"'
```

**预期响应**：
- 如果 API Key 正确：应该返回 base64 图片数据或其他有效响应
- 如果 API Key 错误：会返回 `invalid token` 错误

### 5. 检查网络连接

**可能的问题**：
- 网络连接不稳定
- 防火墙阻止了请求
- 代理设置不正确

**检查方法**：
1. 打开浏览器开发者工具（F12）
2. 进入 Network 标签
3. 尝试生成图片
4. 查看请求的详细信息

## 📋 诊断清单

- [ ] API Key 已从 QS 平台复制
- [ ] API Key 没有多余的空格或换行符
- [ ] API Key 有权限访问 `gpt-image-2` 模型
- [ ] API Key 未过期
- [ ] 网络连接正常
- [ ] 使用 cURL 测试 API Key 成功

## 🆘 如果问题仍未解决

### 可能的原因

1. **API Key 确实无效**
   - 需要从 QS 平台重新获取新的 API Key
   - 检查是否有多个 API Key，选择正确的那个

2. **API 端点不正确**
   - 当前端点：`https://maas.devops.rednote.life/openai/openai/images/edits`
   - 确认这是 QS 平台的正确端点

3. **模型名称不正确**
   - 当前模型：`gpt-image-2`
   - 确认 QS 平台上的模型名称是否相同

4. **API 版本不匹配**
   - 可能需要更新 API 调用方式
   - 查看 QS 平台的最新 API 文档

### 获取帮助

1. **查看 QS 平台文档**
   - 访问 QS 平台的 API 文档
   - 查看 `gpt-image-2` 模型的使用说明

2. **联系 QS 平台支持**
   - 提供 API Key 和错误信息
   - 询问是否有权限访问该模型

3. **检查应用日志**
   - 打开浏览器开发者工具
   - 查看完整的请求和响应信息

## 📝 调试信息

当前请求信息：
```
方法: POST
端点: https://maas.devops.rednote.life/openai/openai/images/edits
请求头:
  - api-key: [您的 API Key]
  - Content-Type: multipart/form-data (自动设置)

请求体:
  - model: gpt-image-2
  - prompt: [您的提示词]
  - size: 1024x1536
  - quality: high
  - response_format: b64_json
  - image: [参考图片文件]
```

## 🔗 相关文档

- [`API_RESPONSE_FORMAT.md`](API_RESPONSE_FORMAT.md) - API 格式说明
- [`QS_GPT_IMAGE_2_SETUP.md`](QS_GPT_IMAGE_2_SETUP.md) - 完整配置指南
- [`MULTIPART_FORM_UPDATE.md`](MULTIPART_FORM_UPDATE.md) - Multipart 更新说明

---

**最后更新**: 2024年  
**状态**: 等待用户反馈
