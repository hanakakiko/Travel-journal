# Guard 部署反向代理修复

## 问题诊断

您发现了关键问题：**本地开发能正常使用，Guard 部署不能**。

这说明问题不是应用代码，而是 **Guard 部署环境的反向代理配置**。

## 根本原因

本地开发使用 **Vite dev server 的代理**，Guard 部署使用 **我们自己的 Node.js 反向代理**。

两者的请求头处理方式不同：

### 本地开发（Vite）

```javascript
// vite.config.ts
"/kratos": {
  target: "http://kratos-sunyihao.sl.beta.xiaohongshu.com",
  changeOrigin: true,  // ✅ 改变 Origin 头
  rewrite: (path) => path.replace(/^\/kratos/, ""),  // ✅ 重写路径
}
```

**效果**：
- ✅ `Origin` 头被改变为 Kratos 后端的域名
- ✅ `Referer` 头被改变为 Kratos 后端的域名
- ✅ `Host` 头被设置为 Kratos 后端的域名

### Guard 部署（原始）

```javascript
// start.sh
const forwardHeaders = { ...req.headers };
delete forwardHeaders['host'];
delete forwardHeaders['connection'];
delete forwardHeaders['content-length'];
// ❌ 没有设置正确的 Host 头
// ❌ 没有删除 origin 和 referer 头
```

**问题**：
- ❌ `Origin` 头仍然指向 Guard 应用的域名
- ❌ `Referer` 头仍然指向 Guard 应用的域名
- ❌ `Host` 头没有被正确设置
- ❌ Kratos 后端拒绝请求

## 解决方案

### 改进的反向代理配置

```javascript
// 模仿 Vite 的代理行为
const forwardHeaders = { ...req.headers };

// 删除可能导致问题的头
delete forwardHeaders['host'];
delete forwardHeaders['connection'];
delete forwardHeaders['content-length'];

// 关键 1：设置正确的 Host 头（changeOrigin=true 的行为）
forwardHeaders['host'] = kratosUrl.host;

// 关键 2：移除 origin 和 referer，避免 CORS 问题
delete forwardHeaders['origin'];
delete forwardHeaders['referer'];

const proxyReq = http.request(
  kratosUrl,
  {
    method: req.method,
    headers: forwardHeaders,  // ✅ 使用改进的请求头
  },
  (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res);
  }
);
```

## 改进对比

| 方面 | 原始 | 改进后 |
|------|------|--------|
| 设置 `Host` 头 | ❌ 否 | ✅ 是 |
| 删除 `origin` 头 | ❌ 否 | ✅ 是 |
| 删除 `referer` 头 | ❌ 否 | ✅ 是 |
| 模仿 Vite 行为 | ❌ 否 | ✅ 是 |
| 能否调用 Kratos | ❌ 否 | ✅ 是 |

## 部署步骤

1. **下载** [`exif-guard.zip`](exif-guard.zip) (217 KB)

2. **上传** 到 Guard 平台

3. **配置环境变量**：
   ```
   KRATOS_BACKEND=http://kratos-sunyihao.sl.beta.xiaohongshu.com
   ```

4. **执行部署**

5. **验证**：
   ```bash
   kubectl logs <pod-name> -f | grep kratos
   ```

   **预期日志**：
   ```
   [kratos proxy] POST /kratos/ads/materialcenter/doaction -> http://kratos-sunyihao.sl.beta.xiaohongshu.com/ads/materialcenter/doaction
   [kratos proxy] forwarding headers: {"method":"POST","host":"kratos-sunyihao.sl.beta.xiaohongshu.com","content-type":"application/json"}
   [kratos proxy] response 200
   ```

## 预期效果

部署改进后的应用包后：

- ✅ Guard 部署的反向代理行为与本地 Vite 代理一致
- ✅ 请求头被正确处理
- ✅ Kratos 后端接受请求
- ✅ 应用能够正常调用 Kratos 接口生成图片
- ✅ 与本地开发环境行为一致

## 关键改进

1. **设置 `Host` 头** - 告诉 Kratos 后端请求来自正确的域名
2. **删除 `Origin` 头** - 避免 CORS 检查问题
3. **删除 `Referer` 头** - 避免安全检查问题
4. **模仿 Vite 行为** - 确保与本地开发环境一致

## 相关文件

- `exif-guard.zip` - 改进后的应用包
- `start.sh` - 改进的反向代理配置
- `LOCAL_VS_GUARD_ANALYSIS.md` - 详细的对比分析
- `vite.config.ts` - 本地开发的代理配置

## 总结

**问题**：Guard 部署的反向代理没有正确处理请求头。

**原因**：没有模仿 Vite 的 `changeOrigin=true` 行为。

**解决**：设置正确的 `Host` 头，删除 `Origin` 和 `Referer` 头。

**结果**：Guard 部署应该能够正常工作，就像本地开发一样。
