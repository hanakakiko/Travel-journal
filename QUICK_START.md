# Guard 子应用快速部署指南

## 🎯 5 分钟快速部署

### 第一步：下载应用包

下载 [`exif-guard.zip`](exif-guard.zip)（217 KB）

**包含内容**：
- ✅ 构建产物（`dist/`）
- ✅ 源代码（`src/`）
- ✅ 启动脚本（`start.sh`）
- ✅ 安装脚本（`install.sh`）
- ✅ 健康检查脚本（`health.sh`）

### 第二步：上传到 Guard 平台

1. 登录 Guard 平台
2. 选择"新建应用"或"更新应用"
3. 上传 `exif-guard.zip`

### 第三步：配置环境变量

在 Guard 平台的环境变量配置中添加：

```
KRATOS_BACKEND=http://kratos-sunyihao.sl.beta.xiaohongshu.com
```

### 第四步：部署

点击"部署"按钮，Guard 平台会自动执行：
- `install.sh` - 检查构建产物
- `start.sh` - 启动应用
- `health.sh` - 健康检查

### 第五步：验证

部署后，查看日志：

```bash
kubectl logs <pod-name> -f
```

**预期日志**：
```
[install] success
[start] listening on 0.0.0.0:3000
[start] Kratos backend: http://kratos-sunyihao.sl.beta.xiaohongshu.com
```

## ✅ 部署成功标志

- [ ] Pod 状态为 `Running`
- [ ] 日志中有 `[install] success`
- [ ] 日志中有 `[start] listening on 0.0.0.0:3000`
- [ ] 日志中有 `[start] Kratos backend: http://...`
- [ ] 健康检查返回 `{"status":"ok"}`

## 🔍 快速诊断

### 如果部署失败

**错误**：`[install] missing build artifacts: dist/`
- **原因**：缺少构建产物
- **解决**：使用最新的 `exif-guard.zip`（217 KB）

**错误**：`502 Bad Gateway`
- **原因**：反向代理无法连接到 Kratos 后端
- **解决**：参考 [`KRATOS_502_CHECKLIST.md`](KRATOS_502_CHECKLIST.md)

**错误**：应用无法访问
- **原因**：应用未启动或路由配置问题
- **解决**：查看 Pod 日志，参考 [`DEPLOYMENT_CHECKLIST.md`](DEPLOYMENT_CHECKLIST.md)

## 📚 详细文档

| 文档 | 说明 |
|------|------|
| [`BUILD_ARTIFACTS_FIX.md`](BUILD_ARTIFACTS_FIX.md) | 构建产物缺失问题修复 |
| [`DEPLOYMENT_CHECKLIST.md`](DEPLOYMENT_CHECKLIST.md) | 部署检查清单 |
| [`KRATOS_502_CHECKLIST.md`](KRATOS_502_CHECKLIST.md) | Kratos 502 错误快速检查清单 |
| [`KRATOS_502_SOLUTION.md`](KRATOS_502_SOLUTION.md) | Kratos 502 错误完整解决方案 |
| [`README_GUARD.md`](README_GUARD.md) | Guard 改写指南 |

## 🚀 预期效果

部署成功后，应用应该能够：

1. ✅ 正确启动并监听 3000 端口
2. ✅ 返回应用首页（HTML）
3. ✅ 健康检查返回 `{"status":"ok"}`
4. ✅ 正确转发 Kratos 接口请求
5. ✅ 生成手帐图片

## 💡 常见问题

**Q: 为什么需要 `KRATOS_BACKEND` 环境变量？**
A: 应用需要调用 Kratos 接口生成图片。反向代理会将 `/kratos/` 请求转发到这个后端地址。

**Q: 如果 Kratos 后端地址不同怎么办？**
A: 修改 `KRATOS_BACKEND` 环境变量为正确的地址。

**Q: 应用在哪个路径下运行？**
A: 应用会挂在 Guard 分配的前缀下（如 `/s/05f7ebb4/`）。应用使用裸路径，由 Guard router 注入前缀。

**Q: 如何查看应用日志？**
A: 使用 `kubectl logs <pod-name> -f` 查看 Pod 日志。

## 📞 需要帮助？

如果部署失败，请提供以下信息：

1. **Guard 平台的错误日志**
2. **Pod 的完整日志**
3. **环境变量配置**
4. **Guard 平台的版本和配置**

---

**最后更新**：2026-06-03
**版本**：exif-guard.zip (217 KB)
