# Kratos 502 错误修复总结

## 问题

应用在 Guard 子应用中调用 Kratos 接口返回 HTTP 502：

```
Kratos 接口调用失败：Kratos 接口返回 HTTP 502（已重试 2 次仍失败）
```

## 原因

502 Bad Gateway 错误表示 start.sh 中的反向代理无法成功连接到上游的 Kratos 后端服务器。可能的原因包括：

1. **网络连接问题**（最常见）
   - Guard Pod 无法访问 Kratos 后端
   - 防火墙规则阻止连接
   - DNS 解析失败

2. **环境变量未设置**
   - `KRATOS_BACKEND` 环境变量未在 Guard 平台配置

3. **请求头或请求体转发问题**
   - 某些请求头可能导致后端无法解析请求

4. **请求超时**
   - Kratos 后端响应太慢

## 改进方案

### 1. 改进的 start.sh 反向代理

**改进内容**：

```javascript
// 更好的日志记录
console.log(`[kratos proxy] ${req.method} ${req.url} -> ${kratosUrl.href}`);
console.log(`[kratos proxy] headers:`, JSON.stringify(req.headers, null, 2));

// 改进的请求头处理
const forwardHeaders = { ...req.headers };
delete forwardHeaders['host'];
delete forwardHeaders['connection'];
delete forwardHeaders['content-length']; // 让 Node.js 自动计算

// 超时处理
proxyReq.on('timeout', () => {
  console.error('[kratos proxy timeout]');
  proxyReq.destroy();
  res.writeHead(504, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Kratos proxy timeout' }));
});
proxyReq.setTimeout(30000); // 30 秒超时
```

**优势**：
- 更详细的日志，便于诊断问题
- 更好的请求头处理，避免某些头部导致的问题
- 超时处理，避免请求无限等待

### 2. 详细的诊断文档

创建了以下文档，帮助快速诊断和解决问题：

- **KRATOS_502_CHECKLIST.md** - 快速检查清单，按顺序检查可能的问题
- **KRATOS_502_DIAGNOSIS.md** - 详细的诊断指南，包括常见错误和解决方案
- **KRATOS_PROXY_FIX.md** - 反向代理问题的详细说明
- **KRATOS_DEBUG.md** - 调试指南

## 使用方法

### 第一步：更新应用包

使用最新的 `exif-guard.zip` 重新部署到 Guard 平台。

### 第二步：配置环境变量

在 Guard 平台的环境变量配置中添加：

```
KRATOS_BACKEND=http://kratos-sunyihao.sl.beta.xiaohongshu.com
```

### 第三步：查看日志

部署后，查看 Guard Pod 的日志，确认反向代理是否正常工作：

```bash
kubectl logs <pod-name> -f | grep kratos
```

预期日志：
```
[start] listening on 0.0.0.0:3000
[start] Kratos backend: http://kratos-sunyihao.sl.beta.xiaohongshu.com
[kratos proxy] POST /kratos/ads/materialcenter/doaction -> http://kratos-sunyihao.sl.beta.xiaohongshu.com/ads/materialcenter/doaction
[kratos proxy] response 200
```

### 第四步：诊断问题

如果仍然返回 502，按照 `KRATOS_502_CHECKLIST.md` 中的步骤逐一排查。

## 关键改进点

| 改进 | 说明 |
|------|------|
| 日志记录 | 添加了详细的日志，便于诊断问题 |
| 请求头处理 | 删除了可能导致问题的 `host`、`connection` 和 `content-length` 头 |
| 超时处理 | 添加了超时处理，避免请求无限等待 |
| 错误处理 | 改进了错误处理，返回更详细的错误信息 |
| 诊断文档 | 创建了详细的诊断文档，帮助快速定位问题 |

## 预期效果

部署最新的 `exif-guard.zip` 后，应该能够：

1. ✅ 正确转发 `/kratos/` 请求到 Kratos 后端
2. ✅ 返回 Kratos 的实际响应（而不是 502）
3. ✅ 在日志中看到详细的转发信息
4. ✅ 快速诊断和解决问题

## 如果问题仍未解决

如果按照上述步骤仍无法解决问题，可能是以下原因：

1. **Guard Pod 无法访问 Kratos 后端**
   - 检查网络配置和防火墙规则
   - 尝试从 Guard Pod 中直接 curl Kratos 后端

2. **Kratos 后端地址不正确**
   - 确认 `KRATOS_BACKEND` 环境变量是否正确设置
   - 尝试使用不同的 Kratos 后端地址

3. **应用代码问题**
   - 确认应用代码中使用的是相对路径 `/kratos/...`
   - 检查请求参数是否正确

## 临时解决方案

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

## 相关文件

- `exif-guard.zip` - 完整的子应用包（包含改进的 start.sh）
- `KRATOS_502_CHECKLIST.md` - 快速检查清单
- `KRATOS_502_DIAGNOSIS.md` - 详细的诊断指南
- `KRATOS_PROXY_FIX.md` - 反向代理问题的详细说明
- `KRATOS_DEBUG.md` - 调试指南
