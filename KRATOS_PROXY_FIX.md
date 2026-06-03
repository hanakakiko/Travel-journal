# Kratos 接口代理问题修复

## 问题描述

在 CoWork Guard 子应用中运行时，调用 Kratos 接口返回 HTML 而不是 JSON：

```
Kratos 接口调用失败：Kratos 接口返回非 JSON：<!doctype html> <html lang="zh-CN"> <head> <base href="/s/05f7ebb4/"> ...
```

## 根本原因

当应用被挂在 Guard 子路径下（如 `/s/05f7ebb4/`）时：

1. 应用代码中使用相对路径：`/kratos/ads/materialcenter/doaction`
2. 浏览器会将其解析为：`/s/05f7ebb4/kratos/ads/materialcenter/doaction`
3. Guard router 会把这个请求当作应用的路由来处理
4. 由于应用中没有这个路由，SPA 兜底返回 `index.html`（HTML）
5. 应用期望 JSON，所以报错

## 解决方案

在 Guard 的 `start.sh` 中添加反向代理，将 `/kratos` 请求转发到真实的 Kratos 后端。

### 修改内容

**start.sh** 中的 Node.js HTTP 服务器现在包含：

```javascript
// 反向代理 /kratos 请求到真实的 Kratos 后端
if (req.url.startsWith('/kratos/')) {
  const kratosPath = req.url.replace(/^\/kratos/, '');
  const kratosUrl = new URL(kratosPath, KRATOS_BACKEND);
  
  const proxyReq = (kratosUrl.protocol === 'https:' ? https : http).request(
    kratosUrl,
    { method: req.method, headers: { ...req.headers, host: kratosUrl.host } },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );
  
  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Kratos proxy error: ' + err.message }));
  });
  
  req.pipe(proxyReq);
  return;
}
```

### 工作流程

1. 浏览器请求：`/kratos/ads/materialcenter/doaction`
2. Guard 的 HTTP 服务器拦截 `/kratos/` 开头的请求
3. 转发到真实的 Kratos 后端：`http://kratos-sunyihao.sl.beta.xiaohongshu.com/ads/materialcenter/doaction`
4. 返回真实的 JSON 响应给浏览器

### 环境变量

可以通过 `KRATOS_BACKEND` 环境变量自定义 Kratos 后端地址：

```bash
export KRATOS_BACKEND=http://kratos-sunyihao.sl.beta.xiaohongshu.com
./start.sh
```

默认值：`http://kratos-sunyihao.sl.beta.xiaohongshu.com`

## 应用代码无需修改

应用代码中的 Kratos 调用保持不变：

```typescript
const endpoint = "/kratos/ads/materialcenter/doaction";
```

这个相对路径在两种环境下都能工作：

- **本地开发**：Vite 的 dev server 已配置代理
- **Guard 子应用**：start.sh 中的反向代理会处理

## 测试

部署到 Guard 后，应用应该能正常调用 Kratos 接口并生成图片。

如果仍然收到 HTML 响应，检查：

1. Guard 的 `start.sh` 是否包含反向代理代码
2. `KRATOS_BACKEND` 环境变量是否正确设置
3. Kratos 后端是否可达（检查网络和防火墙）

## 相关文件

- `start.sh` - 包含反向代理逻辑的启动脚本
- `src/lib/modelClient.ts` - Kratos 接口调用代码（无需修改）
