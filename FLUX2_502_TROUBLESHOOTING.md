# FLUX.2 API 502 错误故障排查指南

## 问题描述

FLUX.2 [pro] API 调用返回 HTTP 502 错误，错误信息为：
```
replicate proxy error: read ECONNRESET
```

这表示反向代理与 Replicate 后端的连接被重置。

## 可能的原因

### 1. 网络连接问题
- Replicate 后端服务不可用
- 网络连接不稳定
- 防火墙或代理阻止了连接

### 2. 请求头配置问题
- 某些请求头被后端拒绝
- Host 头设置不正确
- Content-Type 设置不正确

### 3. 请求体问题
- 请求体格式不正确
- 请求体过大
- 请求体编码问题

### 4. 超时问题
- 请求超时（120 秒）
- 后端响应超时

## 故障排查步骤

### 步骤 1：检查应用日志

查看应用启动时的日志：
```
[start] listening on 0.0.0.0:3000
[start] Kratos backend: http://kratos-sunyihao.sl.beta.xiaohongshu.com
[start] Replicate backend: https://api.replicate.com
[start] MaaS backend: https://maas.devops.rednote.life
```

查看 API 调用时的日志：
```
[replicate proxy] POST /replicate/v1/predictions -> https://api.replicate.com/v1/predictions
[replicate proxy] forwarding to https://api.replicate.com/v1/predictions
[replicate proxy] headers: host=api.replicate.com, content-type=application/json
[replicate proxy] error read ECONNRESET
```

### 步骤 2：检查网络连接

从应用服务器测试与 Replicate 后端的连接：
```bash
# 测试 DNS 解析
nslookup api.replicate.com

# 测试 HTTPS 连接
curl -v https://api.replicate.com/

# 测试 API 端点
curl -X POST https://api.replicate.com/v1/predictions \
  -H "Authorization: Token YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"version":"...","input":{}}'
```

### 步骤 3：检查请求头

确保反向代理正确设置了请求头：
- ✅ Host 头应该是 `api.replicate.com`
- ✅ Content-Type 应该是 `application/json`
- ✅ Authorization 头应该被删除（由应用代码添加）
- ✅ Origin、Referer、Cookie 头应该被删除

### 步骤 4：检查 API Token

确保 FLUX.2 API Token 已正确配置：
1. 在应用中打开 API 配置面板
2. 检查 FLUX.2 [pro] 的 API Token 是否已输入
3. 确保 API Token 有效

### 步骤 5：检查请求体

确保请求体格式正确：
```javascript
{
  "version": "black-forest-labs/flux-2-pro",
  "input": {
    "prompt": "...",
    "input_images": ["url1", "url2", ...],
    "aspect_ratio": "9:16",
    "resolution": "1 MP",
    "output_format": "png"
  }
}
```

### 步骤 6：检查超时设置

反向代理的超时时间是 120 秒。如果 Replicate API 需要更长时间，可能会超时。

## 常见解决方案

### 解决方案 1：重启应用

有时候连接问题可以通过重启应用来解决：
```bash
# 停止应用
# 启动应用
```

### 解决方案 2：检查 Replicate 服务状态

访问 Replicate 的状态页面：
https://status.replicate.com/

### 解决方案 3：增加超时时间

如果 Replicate API 需要更长时间，可以在 start.sh 中增加超时时间：
```javascript
// 从 120000 毫秒（120 秒）增加到 180000 毫秒（180 秒）
proxyReq.setTimeout(180000);
```

### 解决方案 4：检查防火墙规则

确保防火墙允许出站 HTTPS 连接到 api.replicate.com。

### 解决方案 5：使用自定义后端地址

如果 Replicate 的默认地址不可用，可以通过环境变量设置自定义地址：
```bash
REPLICATE_BACKEND=https://custom-replicate-endpoint.com
```

## 调试技巧

### 添加详细日志

在 start.sh 中添加更详细的日志：
```javascript
proxyReq.on('error', (err) => {
  console.error(`[${name} proxy error]`, err.message, err.code);
  console.error(`[${name} proxy error details]`, {
    errno: err.errno,
    syscall: err.syscall,
    address: err.address,
    port: err.port,
  });
  // ...
});
```

### 使用 curl 测试

使用 curl 命令测试 API 调用：
```bash
curl -X POST http://localhost:3000/replicate/v1/predictions \
  -H "Authorization: Token YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "black-forest-labs/flux-2-pro",
    "input": {
      "prompt": "test",
      "input_images": ["https://example.com/image.jpg"],
      "aspect_ratio": "9:16",
      "resolution": "1 MP",
      "output_format": "png"
    }
  }'
```

### 检查浏览器网络请求

在浏览器开发者工具中：
1. 打开 Network 标签
2. 尝试生成图片
3. 查看 `/replicate/v1/predictions` 请求
4. 检查请求头和响应

## 相关文档

- [MULTI_API_PROXY_FIX.md](MULTI_API_PROXY_FIX.md) - 多 API 反向代理修复
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - 部署指南
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - 快速参考

---

**最后更新**：2026-06-04 10:15
