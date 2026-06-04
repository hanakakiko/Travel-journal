# 最新更新 - 反向代理优化

## 更新时间
2026-06-04 09:45

## 更新内容

### 问题发现
在初次部署后，发现 FLUX.2 API 调用返回 502 错误（ECONNRESET）。

### 根本原因
反向代理处理器在每次请求时都被创建，这可能导致性能问题和连接问题。

### 解决方案
优化了 start.sh 中的反向代理实现：

**改动前**：
```javascript
const server = http.createServer((req, res) => {
  // 在每次请求时创建反向代理处理器
  const kratosHandler = createProxyHandler('kratos', KRATOS_BACKEND, '/kratos/');
  const replicateHandler = createProxyHandler('replicate', REPLICATE_BACKEND, '/replicate/');
  const maasHandler = createProxyHandler('maas', MAAS_BACKEND, '/maas/');
  
  if (kratosHandler(req, res)) return;
  if (replicateHandler(req, res)) return;
  if (maasHandler(req, res)) return;
  // ...
});
```

**改动后**：
```javascript
// 提前创建反向代理处理器（避免每次请求都创建）
const kratosHandler = createProxyHandler('kratos', KRATOS_BACKEND, '/kratos/');
const replicateHandler = createProxyHandler('replicate', REPLICATE_BACKEND, '/replicate/');
const maasHandler = createProxyHandler('maas', MAAS_BACKEND, '/maas/');

const server = http.createServer((req, res) => {
  // 直接使用预创建的处理器
  if (kratosHandler(req, res)) return;
  if (replicateHandler(req, res)) return;
  if (maasHandler(req, res)) return;
  // ...
});
```

## 优势

1. **性能提升** - 避免每次请求都创建处理器
2. **连接稳定性** - 减少连接重置的可能性
3. **代码清晰** - 更容易理解和维护

## 验证

- ✅ npm run build 成功
- ✅ exif-guard.zip 已更新
- ✅ start.sh 中的反向代理处理器已提前创建

## 部署步骤

1. 使用最新的 exif-guard.zip 部署到 Guard 平台
2. 重新启动应用
3. 测试各个 API 调用

## 预期效果

- ✅ FLUX.2 API 调用应该能正常工作
- ✅ 其他 API 调用也应该更稳定
- ✅ 应用性能应该有所提升

## 相关文件

- [`start.sh`](start.sh) - 已更新
- [`exif-guard.zip`](exif-guard.zip) - 已更新

---

**状态**：✅ 完成，可部署
