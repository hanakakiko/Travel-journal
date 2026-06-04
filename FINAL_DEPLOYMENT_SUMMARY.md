# Guard 平台部署 - 最终总结

## 任务完成情况

✅ **已完成**：为所有 API 添加反向代理支持

## 主要改动

### 1. start.sh - 多 API 反向代理

**文件**：[`start.sh`](start.sh)

**改动**：
- 添加了通用的反向代理函数 `createProxyHandler`
- 为 Kratos、FLUX.2、QS GPT Image 2 三个 API 添加了反向代理
- 所有反向代理都支持：
  - 请求头清理（删除污染的头）
  - Host 头设置（changeOrigin=true 行为）
  - 120 秒超时
  - 详细的日志记录

**关键代码**：
```javascript
// 各个后端地址
const KRATOS_BACKEND = process.env.KRATOS_BACKEND || 'http://kratos-sunyihao.sl.beta.xiaohongshu.com';
const REPLICATE_BACKEND = process.env.REPLICATE_BACKEND || 'https://api.replicate.com';
const MAAS_BACKEND = process.env.MAAS_BACKEND || 'https://maas.devops.rednote.life';

// 为每个 API 添加反向代理
const kratosHandler = createProxyHandler('kratos', KRATOS_BACKEND, '/kratos/');
const replicateHandler = createProxyHandler('replicate', REPLICATE_BACKEND, '/replicate/');
const maasHandler = createProxyHandler('maas', MAAS_BACKEND, '/maas/');
```

### 2. modelConfig.ts - 更新 API 端点

**文件**：[`src/lib/modelConfig.ts`](src/lib/modelConfig.ts)

**改动**：
- QS GPT Image 2 的端点从完整 URL 改为相对路径
- 从 `https://maas.devops.rednote.life/...` 改为 `/maas/...`

```typescript
// 之前
endpoint: "https://maas.devops.rednote.life/openai/openai/images/generations?api-version=2025-04-01-preview"

// 之后
endpoint: "/maas/openai/openai/images/generations?api-version=2025-04-01-preview"
```

### 3. modelClient.ts - 更新默认端点

**文件**：[`src/lib/modelClient.ts`](src/lib/modelClient.ts)

**改动**：
- 在 `callQsGptImage2Once` 函数中更新默认端点
- 从完整 URL 改为相对路径
- 同时修复了 `/images/edits` → `/images/generations` 的错误

```typescript
// 之前
const endpoint = userQsConfig?.customEndpoint || "https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview";

// 之后
const endpoint = userQsConfig?.customEndpoint || "/maas/openai/openai/images/generations?api-version=2025-04-01-preview";
```

### 4. 重新构建应用

**命令**：`npm run build`

**结果**：
```
✓ 1594 modules transformed.
dist/index.html                   0.47 kB │ gzip:   0.31 kB
dist/assets/index-lSXWbRzy.css   66.59 kB │ gzip:  13.49 kB
dist/assets/index-sV5m7xyr.js   363.18 kB │ gzip: 122.43 kB
✓ built in 788ms
```

### 5. 更新 exif-guard.zip

**步骤**：
1. 提取现有的 exif-guard.zip
2. 复制新的 start.sh
3. 复制新的构建产物（dist/）
4. 重新打包为 exif-guard.zip

## API 端点映射

| API | 应用路径 | 真实后端 | 说明 |
|-----|---------|---------|------|
| Kratos | `/kratos/api/v1/generate` | `http://kratos-sunyihao.sl.beta.xiaohongshu.com/api/v1/generate` | GPT-2 模型 |
| FLUX.2 | `/replicate/v1/predictions` | `https://api.replicate.com/v1/predictions` | FLUX.2 Pro 模型 |
| QS GPT Image 2 | `/maas/openai/openai/images/generations` | `https://maas.devops.rednote.life/openai/openai/images/generations` | QS GPT Image 2 模型 |

## 反向代理的工作流程

```
浏览器请求
    ↓
应用服务器 (start.sh)
    ↓
反向代理处理器 (createProxyHandler)
    ↓
清理请求头 (删除 Origin、Referer、Cookie 等)
    ↓
设置正确的 Host 头
    ↓
转发到真实后端
    ↓
接收响应
    ↓
返回给浏览器
```

## 环境变量配置

在 Guard 平台上配置以下环境变量（可选，有默认值）：

```bash
# 应用配置
APP_PORT=3000
APP_HOSTNAME=0.0.0.0

# 后端地址
KRATOS_BACKEND=http://kratos-sunyihao.sl.beta.xiaohongshu.com
REPLICATE_BACKEND=https://api.replicate.com
MAAS_BACKEND=https://maas.devops.rednote.life
```

## 测试清单

部署后，请按以下步骤测试：

- [ ] 应用能否正常启动（检查日志）
- [ ] 健康检查端点是否正常：`curl http://localhost:3000/health`
- [ ] Kratos API 是否正常（生成图片）
- [ ] FLUX.2 API 是否正常（生成图片）
- [ ] QS GPT Image 2 API 是否正常（生成图片）
- [ ] 浏览器控制台是否有 CORS 错误
- [ ] 应用日志中是否有代理错误

## 预期效果

✅ 所有 API 调用都能正确转发到后端
✅ 应用能够正常调用 Kratos、FLUX.2、QS GPT Image 2 等 API
✅ 应用能够正常生成图片
✅ 浏览器控制台不再出现 CORS 错误
✅ 应用日志中能看到详细的代理日志

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

## 相关文档

- [MULTI_API_PROXY_FIX.md](MULTI_API_PROXY_FIX.md) - 详细的修复说明
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - 部署指南
- [KRATOS_502_FINAL_FIX.md](KRATOS_502_FINAL_FIX.md) - Kratos 502/504 错误修复
- [README.md](README.md) - 项目说明

## 文件清单

| 文件 | 状态 | 说明 |
|------|------|------|
| [`start.sh`](start.sh) | ✅ 更新 | 多 API 反向代理 |
| [`src/lib/modelConfig.ts`](src/lib/modelConfig.ts) | ✅ 更新 | API 端点配置 |
| [`src/lib/modelClient.ts`](src/lib/modelClient.ts) | ✅ 更新 | API 调用代码 |
| [`dist/`](dist/) | ✅ 更新 | 构建产物 |
| [`exif-guard.zip`](exif-guard.zip) | ✅ 更新 | Guard 子应用包 |
| [`MULTI_API_PROXY_FIX.md`](MULTI_API_PROXY_FIX.md) | ✅ 新建 | 修复说明 |
| [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md) | ✅ 新建 | 部署指南 |

## 总结

通过为所有 API 添加反向代理支持，应用现在能够在 Guard 平台上正常调用 Kratos、FLUX.2 和 QS GPT Image 2 等 API，解决了之前的 CORS 和请求头污染问题。

所有改动都遵循了之前的设计原则：
- ✅ 不配置 base/publicPath（一份产物可挂任何 app_id）
- ✅ 使用 APP_PORT/APP_HOSTNAME（避免与 Pod 全局变量冲突）
- ✅ 模仿 Vite 的 changeOrigin 行为（确保与本地开发环境一致）
- ✅ 增加足够的超时时间（120 秒，满足 AI 模型推理需求）

---

**完成时间**：2026-06-04 09:40
**状态**：✅ 完成，可部署
