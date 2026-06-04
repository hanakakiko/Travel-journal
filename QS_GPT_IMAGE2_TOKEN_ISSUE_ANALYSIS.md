# QS GPT Image 2 Token 问题 - 根本原因与修复

## 🎯 问题根本原因

**端点路径错误！**

### 对比分析

| 项目 | 官方文档 | 你的代码 | 状态 |
|------|--------|--------|------|
| 端点路径 | `/v1/images/edits` | `/openai/openai/images/edits` | ❌ 错误 |
| 查询参数 | 无 | `?api-version=2025-04-01-preview` | ❌ 不需要 |
| Authorization | `Bearer {{YOUR_API_KEY}}` | `Bearer ${apiKey}` | ✅ 正确 |
| Content-Type | multipart/form-data | multipart/form-data | ✅ 正确 |

### 为什么会返回 "invalid token"？

1. **请求被路由到错误的服务**
   - 你的代码发送到：`/openai/openai/images/edits`
   - 官方端点是：`/v1/images/edits`
   - 错误的路径导致请求被处理的服务不同

2. **API Key 与端点不匹配**
   - 你的 API Key 是为 `/v1/images/edits` 生成的
   - 但请求发送到了 `/openai/openai/images/edits`
   - 接收请求的服务不认识这个 API Key
   - 返回 `"invalid token, please check your token"`

3. **额外的查询参数**
   - `?api-version=2025-04-01-preview` 可能不被支持
   - 可能导致请求被拒绝

## ✅ 修复方案

### 修改的代码位置

文件：[`src/lib/modelClient.ts`](src/lib/modelClient.ts:954-957)

**修改前：**
```typescript
const endpoint = (userConfig as any)?.modelType === "qs-gpt-image-2" && userConfig?.customEndpoint
  ? userConfig.customEndpoint
  : "https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview";
```

**修改后：**
```typescript
const endpoint = (userConfig as any)?.modelType === "qs-gpt-image-2" && userConfig?.customEndpoint
  ? userConfig.customEndpoint
  : "https://maas.devops.rednote.life/v1/images/edits";
```

### 修改内容

1. ✅ 将路径从 `/openai/openai/images/edits` 改为 `/v1/images/edits`
2. ✅ 移除了不必要的查询参数 `?api-version=2025-04-01-preview`

## 🧪 验证修复

修改后，你应该看到：

1. **请求成功发送**
   - 日志显示 `request → https://maas.devops.rednote.life/v1/images/edits`
   - 不再有 `?api-version=...` 参数

2. **API 返回正确的响应**
   - 不再返回 `"invalid token"` 错误
   - 返回包含 `data` 数组的成功响应
   - 响应中包含生成的图片 URL 或 base64 数据

3. **日志显示成功**
   - `✓ 生成成功，图片 URL: ...`

## 📝 总结

| 问题 | 原因 | 修复 |
|------|------|------|
| `"invalid token"` 错误 | 端点路径错误 | 改为 `/v1/images/edits` |
| 请求被拒绝 | 路由到错误的服务 | 移除 `?api-version=...` |
| API Key 不被识别 | 端点与 Key 不匹配 | 使用正确的端点 |

## 🔍 为什么会出现这个错误？

这个错误很可能是因为：
1. 代码是基于某个旧版本或错误的文档编写的
2. 或者是在集成多个 API 时，不同的端点格式混淆了
3. `/openai/openai/` 这个双重路径看起来像是复制粘贴错误

现在修复后，应该能正常工作了！🎉

