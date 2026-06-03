# Kratos 502 错误诊断与解决方案

## 问题现象

应用在 Guard 子应用中调用 Kratos 接口返回 HTTP 502：

```
Kratos 接口调用失败：Kratos 接口返回 HTTP 502（已重试 2 次仍失败）
```

## 根本原因分析

502 Bad Gateway 错误表示反向代理（start.sh 中的 Node.js HTTP 服务器）无法成功连接到上游的 Kratos 后端服务器。可能的原因包括：

### 1. **网络连接问题**（最常见）

Guard Pod 可能无法访问 Kratos 后端：

```
http://kratos-sunyihao.sl.beta.xiaohongshu.com
```

**症状**：
- start.sh 日志中出现 `[kratos proxy error] ECONNREFUSED` 或 `ENOTFOUND`
- 或者连接超时

**检查方法**：
```bash
# 在 Guard Pod 中执行
curl -v http://kratos-sunyihao.sl.beta.xiaohongshu.com/ads/materialcenter/doaction \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"test":"test"}'
```

**解决方案**：
- 确认 Guard Pod 的网络配置允许访问 Kratos 后端
- 检查防火墙规则和网络策略
- 如果 Kratos 后端地址不同，设置环境变量：
  ```bash
  export KRATOS_BACKEND=http://your-kratos-backend.com
  ```

### 2. **环境变量未设置**

如果 `KRATOS_BACKEND` 环境变量未设置，start.sh 会使用默认值。

**症状**：
- start.sh 启动日志显示 `[start] Kratos backend: http://kratos-sunyihao.sl.beta.xiaohongshu.com`
- 但实际的 Kratos 后端地址不同

**检查方法**：
```bash
# 在 Guard Pod 中执行
echo $KRATOS_BACKEND
```

**解决方案**：
- 在 Guard 平台的环境变量配置中添加：
  ```
  KRATOS_BACKEND=http://kratos-sunyihao.sl.beta.xiaohongshu.com
  ```

### 3. **请求头或请求体转发问题**

反向代理可能没有正确转发请求头或请求体。

**症状**：
- Kratos 返回 400 Bad Request（参数检查失败）
- 或者返回 502（后端无法解析请求）

**检查方法**：
- 查看 start.sh 的日志，确认转发的请求头是否完整
- 检查 `Content-Type` 和 `Content-Length` 是否正确

**解决方案**：
- 已在最新的 start.sh 中改进了请求头处理：
  - 删除了可能导致问题的 `host` 和 `connection` 头
  - 删除了 `content-length` 头，让 Node.js 自动计算
  - 保留了原始请求的其他头部（包括 `Content-Type`）

### 4. **请求超时**

Kratos 后端响应太慢，导致反向代理超时。

**症状**：
- start.sh 日志中出现 `[kratos proxy timeout]`
- 应用返回 504 Gateway Timeout

**检查方法**：
- 检查 Kratos 后端的响应时间
- 检查网络延迟

**解决方案**：
- 当前超时时间为 30 秒，可以在 start.sh 中调整：
  ```javascript
  proxyReq.setTimeout(60000); // 改为 60 秒
  ```

## 改进的 start.sh 反向代理

最新版本的 start.sh 包含以下改进：

1. **更好的日志记录**：
   ```javascript
   console.log(`[kratos proxy] ${req.method} ${req.url} -> ${kratosUrl.href}`);
   console.log(`[kratos proxy] headers:`, JSON.stringify(req.headers, null, 2));
   ```

2. **改进的请求头处理**：
   ```javascript
   const forwardHeaders = { ...req.headers };
   delete forwardHeaders['host'];
   delete forwardHeaders['connection'];
   delete forwardHeaders['content-length'];
   ```

3. **超时处理**：
   ```javascript
   proxyReq.on('timeout', () => {
     console.error('[kratos proxy timeout]');
     proxyReq.destroy();
     res.writeHead(504, { 'Content-Type': 'application/json' });
     res.end(JSON.stringify({ error: 'Kratos proxy timeout' }));
   });
   proxyReq.setTimeout(30000);
   ```

## 调试步骤

### 第一步：查看 start.sh 日志

部署后，查看 Guard Pod 的日志：

```bash
# 查看最近的日志
kubectl logs <pod-name> -f

# 或在 Guard 平台的日志查看器中查看
```

关键日志：
- `[start] listening on 0.0.0.0:3000` - 服务启动成功
- `[start] Kratos backend: http://...` - Kratos 后端地址
- `[kratos proxy] POST /kratos/... -> http://...` - 请求转发
- `[kratos proxy] response 200` - 响应状态码
- `[kratos proxy error]` - 转发失败的错误信息

### 第二步：测试反向代理

在 Guard Pod 中执行：

```bash
# 测试应用的反向代理
curl -v http://localhost:3000/kratos/ads/materialcenter/doaction \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"tabName":"material_analysis_tab","actionCode":"UnifiedPic2PicAction","paramsMap":{"prompt":"test","imageUrls":["https://example.com/image.jpg"]}}'
```

预期响应：
- 如果 Kratos 后端可达，应该返回 Kratos 的实际响应（可能是 400 Bad Request，但不是 502）
- 如果返回 502，说明反向代理无法连接到 Kratos 后端

### 第三步：直接测试 Kratos 后端

在 Guard Pod 中执行：

```bash
# 直接测试 Kratos 后端（不经过反向代理）
curl -v http://kratos-sunyihao.sl.beta.xiaohongshu.com/ads/materialcenter/doaction \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"tabName":"material_analysis_tab","actionCode":"UnifiedPic2PicAction","paramsMap":{"prompt":"test","imageUrls":["https://example.com/image.jpg"]}}'
```

预期响应：
- 如果返回 200 或 400，说明 Kratos 后端可达
- 如果返回 502 或超时，说明 Guard Pod 无法访问 Kratos 后端

## 常见错误信息

| 错误信息 | 原因 | 解决方案 |
|---------|------|--------|
| `502 Bad Gateway` | 反向代理无法连接到后端 | 检查网络和 KRATOS_BACKEND 环境变量 |
| `504 Gateway Timeout` | 反向代理请求超时 | 增加超时时间或检查后端性能 |
| `ECONNREFUSED` | 连接被拒绝 | 检查 Kratos 后端是否运行 |
| `ENOTFOUND` | DNS 解析失败 | 检查 Kratos 后端地址是否正确 |
| `ETIMEDOUT` | 连接超时 | 检查网络连接和防火墙 |

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
- `start.sh` - 包含反向代理逻辑的启动脚本
- `src/lib/modelClient.ts` - Kratos 接口调用代码
- `KRATOS_PROXY_FIX.md` - 反向代理问题的详细说明
- `KRATOS_DEBUG.md` - 调试指南

## 下一步

1. 使用最新的 `exif-guard.zip` 重新部署到 Guard 平台
2. 查看 start.sh 的日志，确认反向代理是否正常工作
3. 如果仍然返回 502，按照上述调试步骤逐一排查
4. 如果问题仍未解决，可以尝试临时解决方案或联系 Guard 平台支持
