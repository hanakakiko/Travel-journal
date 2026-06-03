# 构建产物缺失问题修复

## 问题

部署到 Guard 平台时报错：

```
[install] missing build artifacts: dist/
[install] script failed (exit Some(1)): [install] missing build artifacts: dist/
```

## 原因

Guard 平台的 `install.sh` 脚本检查 `dist/` 目录是否存在。如果缺少构建产物，部署会失败。

之前上传的 `exif-guard.zip` 中缺少 `dist/` 目录（构建产物）。

## 解决方案

### 已修复

✅ 已重新构建应用：
```bash
npm install
npm run build
```

✅ 已重新打包 `exif-guard.zip`，包含：
- `dist/index.html` - 构建后的 HTML
- `dist/assets/index-CicdzN59.js` - 构建后的 JavaScript（340 KB）
- `dist/assets/index-CCOMUhGR.css` - 构建后的 CSS（59 KB）
- `src/` - 源代码
- `start.sh` - 启动脚本（包含改进的反向代理）
- `install.sh` - 安装脚本
- `health.sh` - 健康检查脚本
- `package.json` - 依赖配置

### 文件大小

- **exif-guard.zip**: 217 KB（包含构建产物）
- **dist/**: 400 KB（构建产物）

## 部署步骤

1. **下载最新的 `exif-guard.zip`**（217 KB）

2. **上传到 Guard 平台**

3. **配置环境变量**：
   ```
   KRATOS_BACKEND=http://kratos-sunyihao.sl.beta.xiaohongshu.com
   ```

4. **部署**

5. **验证**：
   ```bash
   kubectl logs <pod-name> -f | grep "install\|start"
   ```

   预期日志：
   ```
   [install] checking build artifacts...
   [install] dist/ exists ✓
   [install] success
   [start] listening on 0.0.0.0:3000
   [start] Kratos backend: http://kratos-sunyihao.sl.beta.xiaohongshu.com
   ```

## install.sh 脚本

`install.sh` 脚本的作用是检查构建产物是否存在：

```bash
#!/bin/sh
set -e

cd "$(dirname "$0")"

# 检查构建产物
if [ ! -d "dist" ]; then
  echo "[install] missing build artifacts: dist/"
  exit 1
fi

echo "[install] success"
```

## 为什么需要构建产物？

Guard 平台期望应用的构建产物已经准备好，而不是在 Pod 启动时才构建。这样做的好处：

1. **加快启动速度** - 不需要在 Pod 中执行 npm install 和 npm run build
2. **减少 Pod 资源占用** - 不需要在 Pod 中安装 Node.js 开发工具
3. **确保一致性** - 构建产物在开发机上生成，确保一致性

## 相关文件

- `exif-guard.zip` - 完整的子应用包（包含构建产物）
- `install.sh` - 安装脚本（检查构建产物）
- `start.sh` - 启动脚本（启动 HTTP 服务器）
- `health.sh` - 健康检查脚本
