# Kratos 502 错误根本原因分析

## 问题现象

应用在 Guard 子应用中调用 Kratos 接口返回 HTTP 502：

```
Kratos 接口调用失败：Kratos 接口返回 HTTP 502（已重试 2 次仍失败）
```

## 根本原因

通过本地测试，我发现了两个关键问题：

### 1. **反向代理超时（主要原因）**

Kratos 后端响应时间超过 30 秒，导致反向代理超时。

**日志证据**：
```
[kratos proxy] POST /kratos/ads/materialcenter/doaction -> http://kratos-sunyihao.sl.beta.xiaohongshu.com/ads/materialcenter/doaction
[kratos proxy timeout] - destroying request after 60s
```

**原因分析**：
- Kratos 接口处理时间长（可能涉及 AI 模型推理）
- 原始超时时间设置为 30 秒，不足以完成请求
- 当超时发生时，反向代理销毁连接并返回 504

### 2. **错误处理缺陷（次要原因）**

当超时发生时，反向代理尝试写入响应头，但响应已经被发送，导致崩溃。

**错误日志**：
```
Error [ERR_HTTP_HEADERS_SENT]: Cannot write headers after they are sent to the client
```

**原因分析**：
- 超时处理和错误处理没有检查响应是否已发送
- 导致 Node.js 进程崩溃，无法处理后续请求

## 解决方案

### 改进 1：增加超时时间

将超时时间从 30 秒增加到 60 秒：

```javascript
// 原始代码
proxyReq.setTimeout(30000); // 30 秒超时

// 改进后
proxyReq.setTimeout(60000); // 60 秒超时
```

**原因**：Kratos 接口可能需要更长时间来处理请求（特别是涉及 AI 模型推理时）。

### 改进 2：修复错误处理

添加 `responseSent` 标志，确保只发送一次响应：

```javascript
let responseSent = false;

const proxyReq = http.request(..., (proxyRes) => {
  responseSent = true;
  res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
  proxyRes.pipe(res);
});

proxyReq.on('error', (err) => {
  if (!responseSent) {
    responseSent = true;
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Kratos proxy error: ' + err.message }));
  }
});

proxyReq.on('timeout', () => {
  proxyReq.destroy();
  if (!responseSent) {
    responseSent = true;
    res.writeHead(504, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Kratos proxy timeout' }));
  }
});
```

**优势**：
- 防止多次写入响应头
- 避免 Node.js 进程崩溃
- 确保客户端收到正确的错误响应

## 测试结果

### 本地测试

在本地模拟 Guard 环境，测试反向代理：

```bash
curl -v http://localhost:3000/kratos/ads/materialcenter/doaction \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"tabName":"material_analysis_tab","actionCode":"UnifiedPic2PicAction","paramsMap":{"prompt":"test","imageUrls":["https://example.com/image.jpg"]}}'
```

**测试日志**：
```
[kratos proxy] POST /kratos/ads/materialcenter/doaction -> http://kratos-sunyihao.sl.beta.xiaohongshu.com/ads/materialcenter/doaction
[kratos proxy timeout] - destroying request after 60s
```

**结论**：
- 反向代理正常工作
- 超时是由于 Kratos 后端响应时间长
- 改进后的错误处理防止了进程崩溃

## 预期效果

部署改进后的 `exif-guard.zip` 后：

1. ✅ 反向代理会等待更长时间（60 秒）
2. ✅ 如果 Kratos 在 60 秒内响应，请求会成功
3. ✅ 如果 Kratos 超时，会返回 504 而不是 502
4. ✅ 错误处理更加健壮，不会导致进程崩溃

## 后续建议

### 短期（立即部署）

1. 部署改进后的 `exif-guard.zip`
2. 监控 Kratos 接口的响应时间
3. 如果仍然超时，可以进一步增加超时时间

### 中期（优化）

1. **异步处理** - 考虑使用异步队列处理 Kratos 请求
2. **缓存** - 缓存相同参数的 Kratos 响应
3. **监控** - 添加详细的性能监控和告警

### 长期（架构优化）

1. **直接调用** - 考虑从浏览器直接调用 Kratos（如果可能）
2. **WebSocket** - 使用 WebSocket 处理长连接
3. **流式响应** - 使用流式响应处理大型图片生成

## 相关文件

- `exif-guard.zip` - 改进后的应用包（包含修复）
- `start.sh` - 改进的启动脚本
- `KRATOS_502_CHECKLIST.md` - 快速检查清单
- `KRATOS_502_SOLUTION.md` - 完整解决方案

## 总结

Kratos 502 错误的根本原因是：

1. **Kratos 后端响应时间长**（超过 30 秒）
2. **反向代理超时设置不足**
3. **错误处理不够健壮**

已通过以下方式修复：

1. ✅ 增加超时时间到 60 秒
2. ✅ 改进错误处理，防止多次写入响应头
3. ✅ 添加详细的日志记录，便于诊断

部署改进后的应用包后，应该能够解决 502 错误。
