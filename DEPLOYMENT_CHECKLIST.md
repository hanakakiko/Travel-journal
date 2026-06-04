# Guard 平台部署检查清单

## 部署前检查

### 代码改动验证

- [x] **start.sh** - 多 API 反向代理
  - [x] 包含 `createProxyHandler` 函数
  - [x] 支持 Kratos 反向代理 (`/kratos/`)
  - [x] 支持 FLUX.2 反向代理 (`/replicate/`)
  - [x] 支持 QS GPT Image 2 反向代理 (`/maas/`)
  - [x] 所有反向代理都有 120 秒超时
  - [x] 所有反向代理都清理污染的请求头
  - [x] 所有反向代理都设置正确的 Host 头

- [x] **src/lib/modelConfig.ts** - API 端点配置
  - [x] QS GPT Image 2 端点已更新为 `/maas/...`
  - [x] 其他模型配置保持不变

- [x] **src/lib/modelClient.ts** - API 调用代码
  - [x] `callQsGptImage2Once` 函数的默认端点已更新为 `/maas/...`
  - [x] 修复了 `/images/edits` → `/images/generations` 的错误

### 构建验证

- [x] **npm run build** - 构建成功
  - [x] 1594 modules transformed
  - [x] 生成了 dist/index.html
  - [x] 生成了 dist/assets/index-*.js
  - [x] 生成了 dist/assets/index-*.css
  - [x] 没有 TypeScript 错误

### 打包验证

- [x] **exif-guard.zip** - 包已更新
  - [x] 包含最新的 start.sh（6071 字节）
  - [x] 包含最新的构建产物
  - [x] 包含 dist/index.html
  - [x] 包含 dist/assets/index-*.js
  - [x] 包含 dist/assets/index-*.css

## 部署步骤

### 1. 上传应用包

- [ ] 将 `exif-guard.zip` 上传到 Guard 平台
- [ ] 确认上传成功

### 2. 配置环境变量

在 Guard 平台上配置以下环境变量（可选，有默认值）：

```bash
# 应用配置
APP_PORT=3000
APP_HOSTNAME=0.0.0.0

# 后端地址（可选，使用默认值）
KRATOS_BACKEND=http://kratos-sunyihao.sl.beta.xiaohongshu.com
REPLICATE_BACKEND=https://api.replicate.com
MAAS_BACKEND=https://maas.devops.rednote.life
```

- [ ] 配置 APP_PORT（如需要）
- [ ] 配置 APP_HOSTNAME（如需要）
- [ ] 配置后端地址（如需要）

### 3. 启动应用

- [ ] 点击"启动"按钮
- [ ] 等待应用启动完成
- [ ] 检查应用日志

### 4. 验证应用启动

检查应用日志中是否出现以下内容：

```
[start] listening on 0.0.0.0:3000
[start] Kratos backend: http://kratos-sunyihao.sl.beta.xiaohongshu.com
[start] Replicate backend: https://api.replicate.com
[start] MaaS backend: https://maas.devops.rednote.life
```

- [ ] 应用已启动
- [ ] 监听地址正确
- [ ] 后端地址正确

## 功能测试

### 1. 健康检查

```bash
curl http://localhost:3000/health
# 预期返回: {"status":"ok"}
```

- [ ] 健康检查端点正常

### 2. 静态文件服务

- [ ] 访问应用首页：`http://localhost:3000/`
- [ ] 页面能正常加载
- [ ] CSS 样式正常应用
- [ ] JavaScript 正常执行

### 3. Kratos API 测试

- [ ] 在应用中选择 "GPT-2 (Kratos)" 模型
- [ ] 上传参考图片
- [ ] 输入提示词
- [ ] 点击生成
- [ ] 检查应用日志中是否有 `[kratos proxy]` 日志
- [ ] 图片生成成功

### 4. FLUX.2 API 测试

- [ ] 在应用中选择 "FLUX.2 [pro]" 模型
- [ ] 上传参考图片
- [ ] 输入提示词
- [ ] 点击生成
- [ ] 检查应用日志中是否有 `[replicate proxy]` 日志
- [ ] 图片生成成功

### 5. QS GPT Image 2 API 测试

- [ ] 在应用中选择 "QS GPT Image 2" 模型
- [ ] 上传参考图片
- [ ] 输入提示词
- [ ] 点击生成
- [ ] 检查应用日志中是否有 `[maas proxy]` 日志
- [ ] 图片生成成功

### 6. 浏览器控制台检查

- [ ] 打开浏览器开发者工具（F12）
- [ ] 切换到 Console 标签
- [ ] 检查是否有 CORS 错误
- [ ] 检查是否有其他 JavaScript 错误

## 故障排查

### 问题：应用无法启动

**检查项**：
- [ ] 检查应用日志中的错误信息
- [ ] 确认 APP_PORT 没有被占用
- [ ] 确认 start.sh 文件存在且可执行

### 问题：API 调用返回 502 或 504

**检查项**：
- [ ] 检查应用日志中的代理错误信息
- [ ] 确认后端地址正确
- [ ] 确认后端服务可访问
- [ ] 检查网络连接

### 问题：API 调用返回 HTML 而不是 JSON

**检查项**：
- [ ] 确认应用使用的是相对路径（`/kratos/`、`/replicate/`、`/maas/`）
- [ ] 确认反向代理已正确配置
- [ ] 检查应用日志中的代理日志

### 问题：浏览器控制台有 CORS 错误

**检查项**：
- [ ] 确认应用使用的是相对路径
- [ ] 确认反向代理已正确配置
- [ ] 检查请求头是否被正确清理

## 部署完成

- [ ] 所有测试都通过
- [ ] 应用能正常生成图片
- [ ] 浏览器控制台没有错误
- [ ] 应用日志正常

## 后续维护

### 监控

- [ ] 定期检查应用日志
- [ ] 监控 API 调用成功率
- [ ] 监控应用性能

### 更新

- [ ] 如需添加新的 API，按照 [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) 中的步骤
- [ ] 如需修改后端地址，更新环境变量即可

---

**检查清单版本**：1.0
**最后更新**：2026-06-04 09:40
