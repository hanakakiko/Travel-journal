# 多 API 反向代理修复

## 问题描述

在 Guard 平台上部署应用后，虽然 Kratos API 已经通过反向代理正常工作，但其他 API（FLUX.2 [pro] 和 QS GPT Image 2）仍然返回 HTML 而不是 JSON，导致应用无法调用这些 API。

## 根本原因

应用中有多个 API 调用：
1. **Kratos** - `/kratos/api/v1/generate`
2. **FLUX.2 [pro]** - `/replicate/v1/predictions`
3. **QS GPT Image 2** - `https://maas.devops.rednote.life/openai/openai/images/generations`

但 start.sh 中的反向代理只处理了 `/kratos/` 路径，其他 API 调用直接从浏览器发出，导致：
- 跨域问题（CORS）
- 请求头污染（Origin、Referer 等）
- 后端拒绝请求，返回 HTML 错误页面

## 解决方案

### 1. 更新 start.sh 中的反向代理

在 start.sh 中添加了通用的反向代理函数 `createProxyHandler`，为所有 API 添加反向代理支持：

```javascript
// 各个后端地址（从环境变量或使用默认值）
const KRATOS_BACKEND = process.env.KRATOS_BACKEND || 'http://kratos-sunyihao.sl.beta.xiaohongshu.com';
const REPLICATE_BACKEND = process.env.REPLICATE_BACKEND || 'https://api.replicate.com';
const MAAS_BACKEND = process.env.MAAS_BACKEND || 'https://maas.devops.rednote.life';

// 通用的反向代理函数
const createProxyHandler = (name, backendUrl, pathPrefix) => {
  // ... 处理请求头、超时、错误等
};

// 为每个 API 添加反向代理
const kratosHandler = createProxyHandler('kratos', KRATOS_BACKEND, '/kratos/');
const replicateHandler = createProxyHandler('replicate', REPLICATE_BACKEND, '/replicate/');
const maasHandler = createProxyHandler('maas', MAAS_BACKEND, '/maas/');
```

### 2. 更新应用代码中的 API 端点

#### modelConfig.ts
将 QS GPT Image 2 的端点从完整 URL 改为相对路径：
```typescript
// 之前
endpoint: "https://maas.devops.rednote.life/openai/openai/images/generations?api-version=2025-04-01-preview"

// 之后
endpoint: "/maas/openai/openai/images/generations?api-version=2025-04-01-preview"
```

#### modelClient.ts
在 `callQsGptImage2Once` 函数中更新默认端点：
```typescript
// 之前
const endpoint = userQsConfig?.customEndpoint || "https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview";

// 之后
const endpoint = userQsConfig?.customEndpoint || "/maas/openai/openai/images/generations?api-version=2025-04-01-preview";
```

注意：同时修复了 `/images/edits` → `/images/generations` 的错误。

## 反向代理的关键特性

1. **通用处理**：所有反向代理都使用相同的逻辑
2. **请求头清理**：删除污染的请求头（Origin、Referer、Cookie、Authorization）
3. **Host 头设置**：设置正确的 Host 头，模仿 Vite 的 `changeOrigin=true` 行为
4. **超时处理**：所有反向代理都有 120 秒的超时时间
5. **错误处理**：返回 502（代理错误）或 504（超时）
6. **日志记录**：详细的日志便于诊断问题

## 环境变量配置

可以通过以下环境变量自定义后端地址：

```bash
# Kratos 后端
KRATOS_BACKEND=http://kratos-sunyihao.sl.beta.xiaohongshu.com

# Replicate 后端（FLUX.2）
REPLICATE_BACKEND=https://api.replicate.com

# MaaS 后端（QS GPT Image 2）
MAAS_BACKEND=https://maas.devops.rednote.life
```

## 测试步骤

1. 重新构建应用：`npm run build`
2. 更新 exif-guard.zip 包
3. 部署到 Guard 平台
4. 测试各个 API 调用：
   - Kratos API：生成图片
   - FLUX.2 API：生成图片
   - QS GPT Image 2 API：生成图片

## 预期效果

- ✅ 所有 API 调用都能正确转发到后端
- ✅ 应用能够正常调用 Kratos、FLUX.2、QS GPT Image 2 等 API
- ✅ 应用能够正常生成图片
- ✅ 浏览器控制台不再出现 CORS 错误

## 相关文件

- [`start.sh`](start.sh) - 更新的启动脚本，包含多 API 反向代理
- [`src/lib/modelConfig.ts`](src/lib/modelConfig.ts) - 更新的模型配置
- [`src/lib/modelClient.ts`](src/lib/modelClient.ts) - 更新的 API 调用代码
- [`exif-guard.zip`](exif-guard.zip) - 更新的 Guard 子应用包

## 后续改进

如果需要添加更多 API，只需：
1. 在 start.sh 中定义新的后端地址
2. 创建对应的反向代理处理器
3. 在应用代码中使用相对路径调用 API

---

**更新时间**：2026-06-04 09:40
**状态**：✅ 完成
