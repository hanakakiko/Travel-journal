# 本地开发 vs Guard 部署差异分析

## 问题现象

- ✅ **本地开发**（`http://localhost:5173/`）- 能正常使用
- ❌ **Guard 部署** - 返回 HTTP 502

## 根本原因

本地开发和 Guard 部署使用的代理方式不同，导致请求头处理差异。

## 详细对比

### 本地开发环境（Vite Dev Server）

**配置**（`vite.config.ts`）：
```javascript
server: {
  proxy: {
    "/kratos": {
      target: "http://kratos-sunyihao.sl.beta.xiaohongshu.com",
      changeOrigin: true,  // ✅ 关键：改变 Origin 头
      rewrite: (path) => path.replace(/^\/kratos/, ""),  // ✅ 关键：重写路径
    },
  },
}
```

**请求流程**：
```
浏览器 → Vite Dev Server (localhost:5173)
         ↓
         改变 Origin 头
         重写路径
         ↓
         Kratos 后端 (kratos-sunyihao.sl.beta.xiaohongshu.com)
```

**请求头处理**：
- ✅ `Origin` 头被改变为 Kratos 后端的域名
- ✅ `Referer` 头被改变为 Kratos 后端的域名
- ✅ `Host` 头被设置为 Kratos 后端的域名
- ✅ 路径被重写（移除 `/kratos` 前缀）

### Guard 部署环境（Node.js HTTP Server）

**原始配置**（`start.sh`）：
```javascript
if (req.url.startsWith('/kratos/')) {
  const kratosPath = req.url.replace(/^\/kratos/, '');
  const kratosUrl = new URL(kratosPath, KRATOS_BACKEND);
  
  const forwardHeaders = { ...req.headers };
  delete forwardHeaders['host'];
  delete forwardHeaders['connection'];
  delete forwardHeaders['content-length'];
  
  // ❌ 问题：没有设置正确的 Host 头
  // ❌ 问题：没有删除 origin 和 referer 头
}
```

**问题**：
- ❌ `Origin` 头仍然指向 Guard 应用的域名
- ❌ `Referer` 头仍然指向 Guard 应用的域名
- ❌ `Host` 头没有被正确设置
- ✅ 路径被正确重写

**请求流程**：
```
浏览器 → Guard 应用 (localhost:3000 或 Guard 域名)
         ↓
         没有改变 Origin 头 ❌
         没有改变 Referer 头 ❌
         ↓
         Kratos 后端 (kratos-sunyihao.sl.beta.xiaohongshu.com)
         ↓
         拒绝请求（CORS 或其他原因）❌
```

## 解决方案

### 改进的反向代理配置

```javascript
// 关键：模仿 Vite 的代理行为
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

## 对比表

| 方面 | 本地开发（Vite） | Guard 部署（原始） | Guard 部署（改进） |
|------|-----------------|------------------|------------------|
| 代理方式 | Vite dev server | Node.js HTTP | Node.js HTTP |
| `changeOrigin` | ✅ true | ❌ false | ✅ true（通过设置 Host） |
| `rewrite` 路径 | ✅ 是 | ✅ 是 | ✅ 是 |
| 删除 `origin` | ✅ 是 | ❌ 否 | ✅ 是 |
| 删除 `referer` | ✅ 是 | ❌ 否 | ✅ 是 |
| 设置 `host` | ✅ 是 | ❌ 否 | ✅ 是 |
| 能否调用 Kratos | ✅ 是 | ❌ 否 | ✅ 是 |

## 为什么这样修复有效

1. **`Host` 头** - Kratos 后端可能检查 Host 头来验证请求来源
2. **`Origin` 和 `Referer` 头** - 这些头可能触发 CORS 检查或其他安全检查
3. **模仿 Vite 行为** - 既然本地开发能工作，Guard 部署应该也能工作

## 测试方法

### 本地测试

```bash
# 启动改进后的服务器
node /tmp/test-server.js

# 测试反向代理
curl -v http://localhost:3000/kratos/ads/materialcenter/doaction \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"tabName":"material_analysis_tab","actionCode":"UnifiedPic2PicAction","paramsMap":{"prompt":"test","imageUrls":["https://example.com/image.jpg"]}}'
```

### Guard 部署测试

```bash
# 查看日志
kubectl logs <pod-name> -f | grep kratos

# 预期日志
[kratos proxy] POST /kratos/ads/materialcenter/doaction -> http://kratos-sunyihao.sl.beta.xiaohongshu.com/ads/materialcenter/doaction
[kratos proxy] forwarding headers: {"method":"POST","host":"kratos-sunyihao.sl.beta.xiaohongshu.com","content-type":"application/json"}
[kratos proxy] response 200
```

## 相关文件

- `exif-guard.zip` - 改进后的应用包
- `start.sh` - 改进的反向代理配置
- `vite.config.ts` - 本地开发的代理配置
- `KRATOS_502_FINAL_FIX.md` - 最终修复说明

## 总结

**问题**：Guard 部署的反向代理没有正确处理请求头，导致 Kratos 后端拒绝请求。

**解决**：模仿 Vite 的代理行为，正确处理 `Host`、`Origin` 和 `Referer` 头。

**结果**：Guard 部署应该能够正常调用 Kratos 接口，就像本地开发一样。
