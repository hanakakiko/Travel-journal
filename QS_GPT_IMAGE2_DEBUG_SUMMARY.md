# QS GPT Image 2 API 集成 - 踩坑总结

**最后更新**: 2026-06-03 22:40  
**状态**: 🔴 未解决 - 需要官方文档或技术支持

---

## 📋 问题概述

尝试集成 QS GPT Image 2 API 用于生成手帐拼贴图，经历了多次迭代但最终未能成功。核心问题是：**不同的请求格式会导致不同的错误，无法同时满足 token 校验和参数要求**。

---

## 🔴 已踩过的坑

### 坑 1️⃣：端点路径混淆
**问题**: 代码最初使用了 `/openai/openai/images/edits`（编辑图片）而不是 `/openai/openai/images/generations`（生成图片）

**结论**: 
- ✅ 确认用户的中转平台使用的是 **edits 端点**，这是正确的
- 不要假设 OpenAI 兼容 API 的端点路径，要根据实际中转平台确认

---

### 坑 2️⃣：认证方式混乱
**尝试过的方式**:
1. `api-key: {API_KEY}` header
2. `Authorization: Bearer {API_KEY}` header
3. 两者混用

**结论**:
- ✅ 官方文档使用 `Authorization: Bearer {API_KEY}`，这是标准方式
- ❌ `api-key` header 在 multipart/form-data 中会导致 token 校验失败
- ⚠️ 不要在 multipart 请求中混用多种认证方式

---

### 坑 3️⃣：请求格式选择困境
**核心矛盾**:

| 请求格式 | Content-Type | 结果 | 错误信息 |
|---------|-------------|------|--------|
| JSON | `application/json` | ✅ token 通过 | ❌ "missing file parameter" |
| multipart/form-data | 自动设置 | ❌ token 失败 | ❌ "invalid token, please check your token" |

**结论**:
- JSON 格式能通过 token 校验，说明 API Key 本身是对的
- multipart/form-data 格式导致 token 校验失败，可能原因：
  - 浏览器 FormData 的 boundary 格式与 API 期望不符
  - API 在解析 multipart 时有 bug，导致 Authorization header 丢失
  - API 需要在 form 字段中传递 token（未验证）

---

### 坑 4️⃣：图片格式选择
**尝试过的方式**:

| 方式 | 格式 | 结果 |
|-----|------|------|
| URL 字符串（JSON） | `"image": "https://..."` | ❌ "missing file parameter" |
| base64 编码（JSON） | `"image": "data:image/jpeg;base64,..."` | ❌ "missing file parameter" |
| Blob 文件（multipart） | FormData.append("image", blob) | ❌ "invalid token" |
| URL 字符串（multipart） | FormData.append("image", "https://...") | ❌ "invalid token" |

**结论**:
- ❌ JSON 格式中的任何图片表示方式都会导致 "missing file parameter"
- ❌ multipart 格式中的任何图片方式都会导致 "invalid token"
- 问题不在图片格式本身，而在请求格式的根本不兼容

---

### 坑 5️⃣：多图片字段命名
**尝试过的方式**:
1. 多个 `image` 字段（单数）
2. 单个 `images` 数组字段（复数）
3. 混合使用

**结论**:
- 无法确定哪种是正确的，因为都被 token 校验失败或参数错误阻挡了
- 需要官方文档明确说明

---

### 坑 6️⃣：Header 设置
**尝试过的方式**:
1. 显式设置 `Content-Type: application/json`
2. 显式设置 `Content-Type: multipart/form-data; boundary=...`
3. 不设置 Content-Type，让浏览器自动处理

**结论**:
- ✅ 对于 JSON：显式设置 `Content-Type: application/json` 是必需的
- ⚠️ 对于 multipart：不设置 Content-Type，让浏览器自动处理是标准做法
- ❌ 手动设置 boundary 会导致格式错误

---

### 坑 7️⃣：其他可能的认证方式（未验证）
**未尝试的方式**:
1. 在 FormData 中添加 `api_key` 或 `token` 字段
2. 在 URL 中添加 `?api_key=...` 查询参数
3. 添加 Cookie header（用户之前提到的 `acw_tc`）
4. 添加其他特殊 header（如 `X-API-Key`）

**结论**:
- 这些方式可能有效，但需要官方文档确认
- 不建议盲目尝试，容易陷入无限循环

---

## 🎯 核心发现

### 最关键的诊断信息
```
JSON 格式 + Authorization: Bearer → token ✅，参数 ❌
multipart 格式 + Authorization: Bearer → token ❌，参数 ❓
```

这个矛盾表明：
1. **API Key 本身是有效的**（JSON 格式能通过 token 校验）
2. **API 对 multipart/form-data 的处理有问题**（可能是 bug 或特殊设计）
3. **API 可能根本不支持 multipart 格式**（只支持 JSON）

---

## 💡 下次尝试的建议

### 优先级 1：获取官方文档
- 联系 QS GPT Image 2 的官方技术支持
- 要求明确说明：
  - 是否支持 multipart/form-data 格式？
  - 图片参数应该如何传递（URL、base64、Blob）？
  - 是否有特殊的认证要求？

### 优先级 2：回到 JSON 格式，深入调查 "missing file parameter"
既然 JSON 格式能通过 token 校验，问题可能是：
- 字段名错误（应该是 `image` 还是 `images`？）
- 字段值格式错误（URL 需要特殊处理吗？）
- 缺少其他必需字段

**建议的调试方向**:
```typescript
// 尝试 1：改变字段名
{ "images": ["url1", "url2"] }  // 复数形式

// 尝试 2：改变 URL 格式
{ "image": { "url": "https://..." } }  // 对象形式

// 尝试 3：添加其他字段
{ "image": "url", "image_format": "url" }  // 显式说明格式

// 尝试 4：检查是否需要下载图片到本地
// 某些 API 不接受外部 URL，需要上传本地文件
```

### 优先级 3：尝试其他认证方式（仅在优先级 1、2 无果时）
1. 在 FormData 中添加 token 字段
2. 在 URL 中添加 token 查询参数
3. 添加 Cookie header

### 优先级 4：考虑替代方案
- 使用其他图片生成 API（如 DALL-E、Midjourney）
- 使用本地图片处理库进行拼贴（不依赖 API）

---

## 📝 代码现状

**当前代码位置**: [`src/lib/modelClient.ts`](src/lib/modelClient.ts:936-1172)

**当前实现**: multipart/form-data + FormData API + URL 字符串 + `Authorization: Bearer`

**状态**: 🔴 返回 "invalid token" 错误

---

## 🚫 不要再尝试的东西

1. ❌ 手动构建 multipart boundary（浏览器会自动处理）
2. ❌ 在 multipart 中使用 `api-key` header（会导致 token 校验失败）
3. ❌ 混用多种认证方式（只会增加混乱）
4. ❌ 盲目尝试各种图片编码方式（问题不在图片格式）
5. ❌ 假设 OpenAI 兼容 API 的行为完全相同（每个平台都有差异）

---

## 📊 尝试统计

- **总尝试次数**: 7+ 次主要方向
- **涉及的文件**: `src/lib/modelClient.ts` 的 `callQsGptImage2Once` 函数
- **花费时间**: 多个对话轮次
- **最终结果**: 🔴 未解决

---

## 🔗 相关资源

- **API 端点**: `https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview`
- **API Key**: `QST30bfa2e5f00da0a05e51e07096c2603b`（已在日志中暴露，建议重新生成）
- **官方文档**: 未找到（需要向技术支持索取）

---

## ✅ 下次开始时的检查清单

- [ ] 获取官方 API 文档
- [ ] 确认支持的请求格式（JSON vs multipart）
- [ ] 确认图片参数的正确格式
- [ ] 确认认证方式
- [ ] 用 Postman/curl 在本地测试，确保请求格式正确
- [ ] 只有在本地测试成功后，再集成到代码中
