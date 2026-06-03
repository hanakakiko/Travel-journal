# Kratos 502 错误完整解决方案

## 📋 问题概述

您的应用在 Guard 子应用中调用 Kratos 接口返回 HTTP 502 错误：

```
Kratos 接口调用失败：Kratos 接口返回 HTTP 502（已重试 2 次仍失败）
```

## 🔍 根本原因

502 Bad Gateway 错误表示 `start.sh` 中的反向代理无法成功连接到上游的 Kratos 后端服务器。

**可能的原因**（按优先级排列）：

1. **Guard Pod 无法访问 Kratos 后端**（最常见）
   - 网络配置问题
   - 防火墙规则阻止
   - DNS 解析失败

2. **环境变量未设置**
   - `KRATOS_BACKEND` 环境变量未在 Guard 平台配置

3. **请求头转发问题**
   - 某些请求头可能导致后端无法解析

4. **请求超时**
   - Kratos 后端响应太慢

## ✅ 解决方案

### 步骤 1：更新应用包

使用最新的 `exif-guard.zip` 重新部署到 Guard 平台。

**改进内容**：
- ✓ 改进的反向代理日志记录
- ✓ 更好的请求头处理
- ✓ 超时处理机制
- ✓ 更详细的错误信息

### 步骤 2：配置环境变量

在 Guard 平台的环境变量配置中添加：

```
KRATOS_BACKEND=http://kratos-sunyihao.sl.beta.xiaohongshu.com
```

### 步骤 3：验证部署

部署后，查看 Guard Pod 的日志：

```bash
kubectl logs <pod-name> -f | grep kratos
```

**预期日志**：
```
[start] listening on 0.0.0.0:3000
[start] Kratos backend: http://kratos-sunyihao.sl.beta.xiaohongshu.com
[kratos proxy] POST /kratos/ads/materialcenter/doaction -> http://kratos-sunyihao.sl.beta.xiaohongshu.com/ads/materialcenter/doaction
[kratos proxy] response 200
```

## 🔧 诊断步骤（如果仍然返回 502）

### 第一步：检查日志中的错误信息

查看 start.sh 日志中的错误：

```bash
kubectl logs <pod-name> -f | grep "kratos proxy error"
```

**常见错误**：
- `ECONNREFUSED` - 连接被拒绝
- `ENOTFOUND` - DNS 解析失败
- `ETIMEDOUT` - 连接超时

### 第二步：测试反向代理

在 Guard Pod 中执行：

```bash
curl -v http://localhost:3000/kratos/ads/materialcenter/doaction \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"tabName":"test","actionCode":"test"}'
```

**预期响应**：
- HTTP 200 或 400（来自 Kratos）
- **不应该是 502**

### 第三步：直接测试 Kratos 后端

在 Guard Pod 中执行：

```bash
curl -v http://kratos-sunyihao.sl.beta.xiaohongshu.com/ads/materialcenter/doaction \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"tabName":"test","actionCode":"test"}'
```

**预期响应**：
- HTTP 200 或 400（来自 Kratos）
- **不应该是 502 或超时**

**如果返回 502 或超时**：
- Guard Pod 无法访问 Kratos 后端
- 检查网络配置和防火墙规则

## 📚 详细文档

我为您创建了以下详细文档，帮助快速诊断和解决问题：

| 文档 | 说明 |
|------|------|
| **KRATOS_502_README.txt** | 快速指南（推荐首先阅读） |
| **KRATOS_502_CHECKLIST.md** | 快速检查清单，按顺序检查可能的问题 |
| **KRATOS_502_DIAGNOSIS.md** | 详细的诊断指南，包括常见错误和解决方案 |
| **KRATOS_502_FIX_SUMMARY.md** | 修复总结，说明改进内容和使用方法 |
| **KRATOS_PROXY_FIX.md** | 反向代理问题的详细说明 |
| **KRATOS_DEBUG.md** | 调试指南 |

## 🚀 改进的 start.sh 反向代理

最新版本的 `start.sh` 包含以下改进：

### 1. 更详细的日志记录

```javascript
console.log(`[kratos proxy] ${req.method} ${req.url} -> ${kratosUrl.href}`);
console.log(`[kratos proxy] headers:`, JSON.stringify(req.headers, null, 2));
```

### 2. 改进的请求头处理

```javascript
const forwardHeaders = { ...req.headers };
delete forwardHeaders['host'];
delete forwardHeaders['connection'];
delete forwardHeaders['content-length']; // 让 Node.js 自动计算
```

### 3. 超时处理

```javascript
proxyReq.on('timeout', () => {
  console.error('[kratos proxy timeout]');
  proxyReq.destroy();
  res.writeHead(504, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Kratos proxy timeout' }));
});
proxyReq.setTimeout(30000); // 30 秒超时
```

## 📦 文件清单

```
exif-guard.zip (91K)
├── 改进的 start.sh（包含反向代理和日志）
├── install.sh
├── health.sh
├── package.json
├── src/
├── dist/（构建产物）
└── ...

诊断文档：
├── KRATOS_502_README.txt（快速指南）
├── KRATOS_502_CHECKLIST.md（快速检查清单）
├── KRATOS_502_DIAGNOSIS.md（详细诊断指南）
├── KRATOS_502_FIX_SUMMARY.md（修复总结）
├── KRATOS_PROXY_FIX.md（反向代理说明）
└── KRATOS_DEBUG.md（调试指南）
```

## 🎯 预期效果

部署最新的 `exif-guard.zip` 后，应该能够：

1. ✅ 正确转发 `/kratos/` 请求到 Kratos 后端
2. ✅ 返回 Kratos 的实际响应（而不是 502）
3. ✅ 在日志中看到详细的转发信息
4. ✅ 快速诊断和解决问题

## 🆘 如果问题仍未解决

### 可能原因 1：Guard Pod 无法访问 Kratos 后端

**检查方法**：
```bash
# 在 Guard Pod 中执行
curl -v http://kratos-sunyihao.sl.beta.xiaohongshu.com/ads/materialcenter/doaction \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"test":"test"}'
```

**解决方案**：
- 检查 Guard Pod 的网络配置
- 检查防火墙规则
- 确认 Kratos 后端地址是否正确

### 可能原因 2：环境变量未设置

**检查方法**：
```bash
# 在 Guard Pod 中执行
echo $KRATOS_BACKEND
```

**解决方案**：
- 在 Guard 平台的环境变量配置中添加 `KRATOS_BACKEND`

### 可能原因 3：Kratos 后端地址不正确

**解决方案**：
- 确认 Kratos 后端地址是否为 `http://kratos-sunyihao.sl.beta.xiaohongshu.com`
- 如果不同，更新 `KRATOS_BACKEND` 环境变量

## 💡 临时解决方案

如果反向代理仍然无法工作，可以尝试以下方案：

### 方案 A：使用完整的 Kratos 后端 URL

修改应用代码，使用完整的 Kratos 后端 URL：

```typescript
// src/lib/modelClient.ts
const endpoint = "http://kratos-sunyihao.sl.beta.xiaohongshu.com/ads/materialcenter/doaction";
```

**缺点**：应用与 Kratos 后端紧耦合，不利于环境切换。

### 方案 B：在 Guard 平台配置反向代理

如果 Guard 平台支持，可以在平台层配置反向代理，而不是在应用的 start.sh 中。

## 📞 需要帮助？

如果按照上述步骤仍无法解决问题，请提供以下信息：

1. **start.sh 的完整日志**（包括错误信息）
2. **curl 测试的结果**（第二步和第三步）
3. **Guard 平台的环境变量配置**
4. **Guard Pod 的网络配置**（如有防火墙规则）
5. **Kratos 后端的地址和状态**

## 📖 相关资源

- [`exif-guard.zip`](exif-guard.zip) - 完整的子应用包
- [`KRATOS_502_README.txt`](KRATOS_502_README.txt) - 快速指南
- [`KRATOS_502_CHECKLIST.md`](KRATOS_502_CHECKLIST.md) - 快速检查清单
- [`KRATOS_502_DIAGNOSIS.md`](KRATOS_502_DIAGNOSIS.md) - 详细诊断指南
- [`KRATOS_502_FIX_SUMMARY.md`](KRATOS_502_FIX_SUMMARY.md) - 修复总结
- [`KRATOS_PROXY_FIX.md`](KRATOS_PROXY_FIX.md) - 反向代理说明
- [`KRATOS_DEBUG.md`](KRATOS_DEBUG.md) - 调试指南
