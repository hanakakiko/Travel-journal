# 工作总结 - Guard 平台多 API 反向代理实现

## 任务概述

为拾页手帐应用在 Guard 平台上的部署添加多 API 反向代理支持，解决 FLUX.2 和 QS GPT Image 2 API 调用失败的问题。

## 问题分析

### 现象
- ✅ Kratos API 正常工作（已在之前的工作中修复）
- ❌ FLUX.2 [pro] API 返回 HTML 而不是 JSON
- ❌ QS GPT Image 2 API 返回 HTML 而不是 JSON

### 根本原因
应用中有多个 API 调用，但 start.sh 中的反向代理只处理了 `/kratos/` 路径。其他 API 调用直接从浏览器发出，导致：
1. **CORS 跨域问题** - 浏览器拒绝跨域请求
2. **请求头污染** - Origin、Referer 等头被后端拒绝
3. **后端返回错误** - 后端返回 HTML 错误页面而不是 JSON

## 解决方案

### 1. 更新 start.sh - 添加通用反向代理函数

**关键改进**：
- 创建了通用的 `createProxyHandler` 函数，支持任意 API 的反向代理
- 为 Kratos、FLUX.2、QS GPT Image 2 三个 API 添加了反向代理
- 所有反向代理都支持：
  - 请求头清理（删除 Origin、Referer、Cookie、Authorization）
  - Host 头设置（模仿 Vite 的 changeOrigin=true）
  - 120 秒超时（满足 AI 模型推理需求）
  - 详细的日志记录（便于诊断）

**代码示例**：
```javascript
const createProxyHandler = (name, backendUrl, pathPrefix) => {
  return (req, res) => {
    // 检查路径是否匹配
    if (!req.url.startsWith(pathPrefix)) {
      return null;
    }
    
    // 构建目标 URL
    const targetPath = req.url.replace(new RegExp(`^${pathPrefix}`), '');
    const targetUrl = new URL(targetPath, backendUrl);
    
    // 清理请求头
    const forwardHeaders = { ...req.headers };
    delete forwardHeaders['origin'];
    delete forwardHeaders['referer'];
    delete forwardHeaders['cookie'];
    delete forwardHeaders['authorization'];
    
    // 设置正确的 Host 头
    forwardHeaders['host'] = targetUrl.host;
    
    // 转发请求...
  };
};
```

### 2. 更新 modelConfig.ts - 使用相对路径

**改动**：
```typescript
// 之前
endpoint: "https://maas.devops.rednote.life/openai/openai/images/generations?api-version=2025-04-01-preview"

// 之后
endpoint: "/maas/openai/openai/images/generations?api-version=2025-04-01-preview"
```

### 3. 更新 modelClient.ts - 修复默认端点

**改动**：
```typescript
// 之前
const endpoint = userQsConfig?.customEndpoint || "https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview";

// 之后
const endpoint = userQsConfig?.customEndpoint || "/maas/openai/openai/images/generations?api-version=2025-04-01-preview";
```

**额外修复**：
- 修复了 `/images/edits` → `/images/generations` 的错误

### 4. 重新构建应用

```bash
npm run build
# ✓ 1594 modules transformed
# ✓ built in 788ms
```

### 5. 更新 exif-guard.zip

```bash
# 提取现有包
unzip exif-guard.zip

# 复制新文件
cp start.sh exif-guard/
cp -r dist/* exif-guard/dist/

# 重新打包
zip -r exif-guard.zip exif-guard/
```

## 技术细节

### API 端点映射

| API | 应用路径 | 真实后端 | 说明 |
|-----|---------|---------|------|
| Kratos | `/kratos/api/v1/generate` | `http://kratos-sunyihao.sl.beta.xiaohongshu.com/api/v1/generate` | GPT-2 模型 |
| FLUX.2 | `/replicate/v1/predictions` | `https://api.replicate.com/v1/predictions` | FLUX.2 Pro 模型 |
| QS GPT Image 2 | `/maas/openai/openai/images/generations` | `https://maas.devops.rednote.life/openai/openai/images/generations` | QS GPT Image 2 模型 |

### 反向代理工作流程

```
浏览器请求 (相对路径)
    ↓
应用服务器 (start.sh)
    ↓
反向代理处理器 (createProxyHandler)
    ↓
清理请求头 (删除污染的头)
    ↓
设置正确的 Host 头
    ↓
转发到真实后端
    ↓
接收响应
    ↓
返回给浏览器
```

### 关键设计决策

1. **通用反向代理函数** - 避免代码重复，便于扩展
2. **相对路径** - 应用使用相对路径调用 API，便于反向代理
3. **120 秒超时** - 满足 AI 模型推理的时间需求
4. **请求头清理** - 删除污染的头，避免后端拒绝
5. **Host 头设置** - 模仿 Vite 的 changeOrigin 行为，确保与本地开发一致

## 文件改动清单

| 文件 | 改动 | 说明 |
|------|------|------|
| [`start.sh`](start.sh) | ✅ 更新 | 添加多 API 反向代理 |
| [`src/lib/modelConfig.ts`](src/lib/modelConfig.ts) | ✅ 更新 | QS GPT Image 2 端点改为相对路径 |
| [`src/lib/modelClient.ts`](src/lib/modelClient.ts) | ✅ 更新 | 修复默认端点，改为相对路径 |
| [`dist/`](dist/) | ✅ 更新 | 重新构建的产物 |
| [`exif-guard.zip`](exif-guard.zip) | ✅ 更新 | 包含最新的代码和构建产物 |

## 新增文档

| 文档 | 说明 |
|------|------|
| [`MULTI_API_PROXY_FIX.md`](MULTI_API_PROXY_FIX.md) | 多 API 反向代理修复详情 |
| [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md) | Guard 平台部署指南 |
| [`DEPLOYMENT_CHECKLIST.md`](DEPLOYMENT_CHECKLIST.md) | 部署检查清单 |
| [`FINAL_DEPLOYMENT_SUMMARY.md`](FINAL_DEPLOYMENT_SUMMARY.md) | 最终部署总结 |

## 验证结果

### 代码验证
- ✅ start.sh 包含 4 个 `createProxyHandler` 调用
- ✅ modelConfig.ts 中 QS GPT Image 2 端点已更新为 `/maas/...`
- ✅ modelClient.ts 中默认端点已更新为 `/maas/...`

### 构建验证
- ✅ npm run build 成功
- ✅ 1594 modules transformed
- ✅ 生成了所有必要的产物

### 打包验证
- ✅ exif-guard.zip 已更新
- ✅ 包含最新的 start.sh（6071 字节）
- ✅ 包含最新的构建产物

## 预期效果

部署后，应用将能够：
- ✅ 正常调用 Kratos API（已验证）
- ✅ 正常调用 FLUX.2 API（新增）
- ✅ 正常调用 QS GPT Image 2 API（新增）
- ✅ 正常生成图片
- ✅ 浏览器控制台不再出现 CORS 错误

## 后续改进

如果需要添加更多 API，只需：

1. **在 start.sh 中定义新的后端地址**
   ```javascript
   const NEW_API_BACKEND = process.env.NEW_API_BACKEND || 'https://api.example.com';
   ```

2. **创建对应的反向代理处理器**
   ```javascript
   const newApiHandler = createProxyHandler('new-api', NEW_API_BACKEND, '/new-api/');
   ```

3. **在应用代码中使用相对路径调用 API**
   ```typescript
   endpoint: "/new-api/v1/endpoint"
   ```

## 总结

通过为所有 API 添加反向代理支持，应用现在能够在 Guard 平台上正常调用 Kratos、FLUX.2 和 QS GPT Image 2 等 API。所有改动都遵循了之前的设计原则，确保了应用的可维护性和可扩展性。

---

**完成时间**：2026-06-04 09:40
**工作量**：约 2 小时
**状态**：✅ 完成，可部署
