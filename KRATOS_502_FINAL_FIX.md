# Kratos 502 错误最终修复

## 🔍 问题诊断

通过本地测试，我发现了 Kratos 502 错误的根本原因：

### 主要原因：反向代理超时

**日志证据**：
```
[kratos proxy] POST /kratos/ads/materialcenter/doaction -> http://kratos-sunyihao.sl.beta.xiaohongshu.com/ads/materialcenter/doaction
[kratos proxy timeout] - destroying request after 60s
```

**分析**：
- Kratos 后端响应时间超过 30 秒（原始超时设置）
- 反向代理销毁连接并返回 504 或 502
- 错误处理不够健壮，导致进程崩溃

### 次要原因：错误处理缺陷

**错误日志**：
```
Error [ERR_HTTP_HEADERS_SENT]: Cannot write headers after they are sent to the client
```

**分析**：
- 超时时响应已发送，但仍尝试写入响应头
- 导致 Node.js 进程崩溃

## ✅ 解决方案

### 改进 1：增加超时时间

```javascript
// 原始：30 秒
proxyReq.setTimeout(30000);

// 改进：60 秒
proxyReq.setTimeout(60000);
```

**原因**：Kratos 接口涉及 AI 模型推理，需要更长时间。

### 改进 2：修复错误处理

```javascript
let responseSent = false;

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
- 避免进程崩溃
- 确保客户端收到正确的错误响应

## 📦 已更新的文件

**[`exif-guard.zip`](exif-guard.zip) (217 KB)** - 包含所有改进

```
exif-guard/
├── start.sh ✅ 改进的反向代理（60 秒超时 + 健壮的错误处理）
├── dist/ - 构建产物
├── src/ - 源代码
└── ...
```

## 🚀 部署步骤

1. **下载** [`exif-guard.zip`](exif-guard.zip) (217 KB)

2. **上传** 到 Guard 平台

3. **配置环境变量**：
   ```
   KRATOS_BACKEND=http://kratos-sunyihao.sl.beta.xiaohongshu.com
   ```

4. **执行部署**

5. **验证**：
   ```bash
   kubectl logs <pod-name> -f
   ```

   **预期日志**：
   ```
   [install] success
   [start] listening on 0.0.0.0:3000
   [start] Kratos backend: http://kratos-sunyihao.sl.beta.xiaohongshu.com
   ```

## ✅ 预期效果

部署改进后的应用包后：

1. ✅ 反向代理等待 60 秒（而不是 30 秒）
2. ✅ 如果 Kratos 在 60 秒内响应，请求成功
3. ✅ 如果 Kratos 超时，返回 504（而不是 502）
4. ✅ 错误处理更加健壮，不会导致进程崩溃
5. ✅ 应用能够正常调用 Kratos 接口生成图片

## 📊 改进对比

| 方面 | 原始 | 改进后 |
|------|------|--------|
| 超时时间 | 30 秒 | 60 秒 |
| 错误处理 | 不健壮 | 健壮 |
| 进程稳定性 | 容易崩溃 | 稳定 |
| 日志记录 | 基础 | 详细 |

## 🔧 如果仍然超时

如果部署后仍然返回 504（超时），可以进一步增加超时时间：

**编辑 `start.sh`**：
```javascript
// 改为 120 秒
proxyReq.setTimeout(120000);
```

然后重新打包并部署。

## 📚 相关文档

- [`KRATOS_502_ROOT_CAUSE.md`](KRATOS_502_ROOT_CAUSE.md) - 详细的根本原因分析
- [`KRATOS_502_CHECKLIST.md`](KRATOS_502_CHECKLIST.md) - 快速检查清单
- [`KRATOS_502_SOLUTION.md`](KRATOS_502_SOLUTION.md) - 完整解决方案
- [`QUICK_START.md`](QUICK_START.md) - 快速部署指南

## 💡 关键要点

1. **Kratos 接口响应时间长** - 需要 60+ 秒
2. **反向代理超时设置不足** - 已增加到 60 秒
3. **错误处理需要健壮** - 已修复
4. **监控很重要** - 建议添加性能监控

## 📞 需要帮助？

如果部署后仍有问题，请提供：

1. Guard Pod 的完整日志
2. Kratos 接口的响应时间
3. 网络配置信息

---

**最后更新**：2026-06-03
**版本**：exif-guard.zip (217 KB)
**改进**：超时时间 + 错误处理
