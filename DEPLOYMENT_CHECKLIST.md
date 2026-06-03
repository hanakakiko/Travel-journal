# Guard 子应用部署检查清单

## 📋 部署前检查

### 应用包检查

- [x] `exif-guard.zip` 已生成（217 KB）
- [x] 包含 `dist/` 目录（构建产物）
- [x] 包含 `src/` 目录（源代码）
- [x] 包含 `start.sh`（启动脚本，包含改进的反向代理）
- [x] 包含 `install.sh`（安装脚本）
- [x] 包含 `health.sh`（健康检查脚本）
- [x] 包含 `package.json`（依赖配置）

### 脚本检查

- [x] `install.sh` - 检查 `dist/` 目录是否存在
- [x] `start.sh` - 启动 Node.js HTTP 服务器，包含反向代理
- [x] `health.sh` - 返回 `{"status":"ok"}`

### 环境变量检查

- [ ] 已在 Guard 平台配置 `KRATOS_BACKEND`
  ```
  KRATOS_BACKEND=http://kratos-sunyihao.sl.beta.xiaohongshu.com
  ```

## 🚀 部署步骤

### 第一步：上传应用包

1. 下载 `exif-guard.zip`（217 KB）
2. 上传到 Guard 平台
3. 选择部署配置

### 第二步：配置环境变量

在 Guard 平台的环境变量配置中添加：

```
KRATOS_BACKEND=http://kratos-sunyihao.sl.beta.xiaohongshu.com
```

### 第三步：执行部署

1. 点击"部署"按钮
2. Guard 平台会自动执行：
   - `install.sh` - 检查构建产物
   - `start.sh` - 启动应用
   - `health.sh` - 健康检查

### 第四步：验证部署

部署后，查看 Guard Pod 的日志：

```bash
kubectl logs <pod-name> -f
```

**预期日志**：

```
[install] success
[start] listening on 0.0.0.0:3000
[start] Kratos backend: http://kratos-sunyihao.sl.beta.xiaohongshu.com
```

## ✅ 部署后检查

### 检查应用是否启动

```bash
# 检查 Pod 状态
kubectl get pods | grep exif

# 查看日志
kubectl logs <pod-name> -f
```

**预期状态**：
- Pod 状态：`Running`
- 日志中有 `[start] listening on 0.0.0.0:3000`

### 检查健康检查

```bash
# 在 Guard Pod 中执行
curl -v http://localhost:3000/health
```

**预期响应**：
```json
{"status":"ok"}
```

### 检查反向代理

```bash
# 在 Guard Pod 中执行
curl -v http://localhost:3000/kratos/ads/materialcenter/doaction \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"tabName":"test","actionCode":"test"}'
```

**预期响应**：
- HTTP 200 或 400（来自 Kratos）
- **不应该是 502**

### 检查应用是否可访问

```bash
# 在 Guard Pod 中执行
curl -v http://localhost:3000/
```

**预期响应**：
- HTTP 200
- 返回 HTML（应用首页）

## 🔧 常见问题

### 问题 1：install.sh 失败 - missing build artifacts

**原因**：`dist/` 目录不存在

**解决方案**：
- 确保上传的 `exif-guard.zip` 包含 `dist/` 目录
- 使用最新的 `exif-guard.zip`（217 KB）

### 问题 2：start.sh 失败 - 无法启动应用

**原因**：可能是 Node.js 版本不兼容或依赖缺失

**解决方案**：
- 检查 Guard 平台的 Node.js 版本
- 确保 `package.json` 中的 `engines` 字段正确

### 问题 3：502 Bad Gateway - Kratos 接口调用失败

**原因**：反向代理无法连接到 Kratos 后端

**解决方案**：
- 检查 `KRATOS_BACKEND` 环境变量是否正确设置
- 检查 Guard Pod 的网络配置
- 参考 `KRATOS_502_CHECKLIST.md`

### 问题 4：应用无法访问

**原因**：可能是路由配置问题或应用未启动

**解决方案**：
- 检查 Guard Pod 的日志
- 确保应用已启动（`[start] listening on 0.0.0.0:3000`）
- 检查 Guard 平台的路由配置

## 📚 相关文档

- `BUILD_ARTIFACTS_FIX.md` - 构建产物缺失问题修复
- `KRATOS_502_CHECKLIST.md` - Kratos 502 错误快速检查清单
- `KRATOS_502_SOLUTION.md` - Kratos 502 错误完整解决方案
- `KRATOS_PROXY_FIX.md` - 反向代理问题说明

## 📞 需要帮助？

如果部署失败，请提供以下信息：

1. **Guard 平台的错误日志**
2. **Pod 的完整日志**（`kubectl logs <pod-name>`）
3. **环境变量配置**
4. **Guard 平台的版本和配置**

---

**最后更新**：2026-06-03
**版本**：exif-guard.zip (217 KB)
