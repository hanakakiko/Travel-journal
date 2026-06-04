# Kratos 504 超时问题修复

## 问题现象

部署后浏览器控制台显示：

```
/s/05f7ebb4/kratos/ads/materialcenter/doaction:1  Failed to load resource: the server responded with a status of 504 ()
```

这说明：
- ✅ 应用已成功部署
- ✅ 页面能正常加载
- ❌ Kratos 接口调用返回 504（超时）

## 根本原因

### 问题 1：请求头污染

当应用在 Guard 的子路径 `/s/05f7ebb4/` 下运行时：

```
浏览器请求：/s/05f7ebb4/kratos/ads/materialcenter/doaction
↓
Guard router 移除前缀 /s/05f7ebb4/
↓
应用收到：/kratos/ads/materialcenter/doaction
↓
反向代理转发到：http://kratos-sunyihao.sl.beta.xiaohongshu.com/ads/materialcenter/doaction
↓
但请求头中的 Referer 仍然是 /s/05f7ebb4/...
↓
Kratos 后端因为 Referer 不匹配而拒绝或超时
```

### 问题 2：超时时间不足

Kratos 接口涉及 AI 模型推理，可能需要超过 60 秒的时间。

## 解决方案

### 改进 1：删除所有可能导致问题的请求头

```javascript
// 删除所有可能导致问题的头
delete forwardHeaders['host'];
delete forwardHeaders['connection'];
delete forwardHeaders['content-length'];
delete forwardHeaders['origin'];
delete forwardHeaders['referer'];
delete forwardHeaders['cookie'];  // 删除 cookie，避免跨域问题
delete forwardHeaders['authorization'];  // 删除 authorization，使用自己的认证

// 设置正确的 Host 头
forwardHeaders['host'] = kratosUrl.host;

// 确保 Content-Type 被保留
if (!forwardHeaders['content-type']) {
  forwardHeaders['content-type'] = 'application/json';
}
```

**原因**：
- `Referer` 头可能导致 Kratos 后端的安全检查失败
- `Cookie` 和 `Authorization` 头可能导致跨域问题
- 只保留必要的头部，避免污染

### 改进 2：增加超时时间到 120 秒

```javascript
// 原始：60 秒
proxyReq.setTimeout(60000);

// 改进：120 秒
proxyReq.setTimeout(120000);
```

**原因**：
- Kratos 接口涉及 AI 模型推理
- 可能需要 60+ 秒来处理请求
- 120 秒是一个更安全的超时时间

### 改进 3：改进日志记录

```javascript
console.log(`[kratos proxy] forwarding to ${kratosUrl.href}`);
console.log(`[kratos proxy] headers: host=${forwardHeaders['host']}, content-type=${forwardHeaders['content-type']}`);
```

**优势**：
- 便于诊断问题
- 清楚地显示转发的目标和请求头

## 改进对比

| 方面 | 原始 | 改进后 |
|------|------|--------|
| 删除 `referer` | ✅ 是 | ✅ 是 |
| 删除 `cookie` | ❌ 否 | ✅ 是 |
| 删除 `authorization` | ❌ 否 | ✅ 是 |
| 超时时间 | 60 秒 | 120 秒 |
| 日志记录 | 基础 | 详细 |

## 部署步骤

1. **下载** [`exif-guard.zip`](exif-guard.zip) (224 KB)

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
   [kratos proxy] forwarding to http://kratos-sunyihao.sl.beta.xiaohongshu.com/ads/materialcenter/doaction
   [kratos proxy] headers: host=kratos-sunyihao.sl.beta.xiaohongshu.com, content-type=application/json
   [kratos proxy] response 200
   ```

## 预期效果

部署改进后的应用包后：

- ✅ 反向代理删除所有污染的请求头
- ✅ 只保留必要的请求头
- ✅ 超时时间增加到 120 秒
- ✅ Kratos 接口调用成功
- ✅ 应用能够正常生成图片

## 关键改进

1. **删除 `Referer` 头** - 避免 Kratos 后端的安全检查失败
2. **删除 `Cookie` 头** - 避免跨域问题
3. **删除 `Authorization` 头** - 避免认证冲突
4. **增加超时时间** - 给 Kratos 足够的时间处理 AI 请求
5. **改进日志** - 便于诊断问题

## 相关文件

- `exif-guard.zip` - 改进后的应用包
- `start.sh` - 改进的反向代理配置
- `GUARD_PROXY_FIX.md` - Guard 部署反向代理修复
- `LOCAL_VS_GUARD_ANALYSIS.md` - 本地 vs Guard 详细对比

## 总结

**问题**：Kratos 接口返回 504 超时

**原因**：
1. 请求头污染（Referer、Cookie 等）
2. 超时时间不足（60 秒）

**解决**：
1. 删除所有污染的请求头
2. 增加超时时间到 120 秒
3. 改进日志记录

**结果**：应用应该能够正常调用 Kratos 接口生成图片
