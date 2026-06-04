# Guard 平台部署状态报告

## 当前状态

✅ **多 API 反向代理实现完成**
✅ **应用已构建和打包**
✅ **故障排查指南已创建**

## 已完成的工作

### 1. 反向代理实现
- ✅ Kratos API 反向代理 (`/kratos/`)
- ✅ FLUX.2 API 反向代理 (`/replicate/`)
- ✅ QS GPT Image 2 API 反向代理 (`/maas/`)

### 2. 代码改动
- ✅ [`start.sh`](start.sh) - 多 API 反向代理
- ✅ [`src/lib/modelConfig.ts`](src/lib/modelConfig.ts) - API 端点配置
- ✅ [`src/lib/modelClient.ts`](src/lib/modelClient.ts) - API 调用代码

### 3. 构建和打包
- ✅ npm run build 成功
- ✅ [`exif-guard.zip`](exif-guard.zip) 已更新

### 4. 文档
- ✅ [`MULTI_API_PROXY_FIX.md`](MULTI_API_PROXY_FIX.md) - 多 API 反向代理修复
- ✅ [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md) - 部署指南
- ✅ [`DEPLOYMENT_CHECKLIST.md`](DEPLOYMENT_CHECKLIST.md) - 检查清单
- ✅ [`FLUX2_502_TROUBLESHOOTING.md`](FLUX2_502_TROUBLESHOOTING.md) - FLUX.2 故障排查
- ✅ [`FLUX2_FIX_UPDATE.md`](FLUX2_FIX_UPDATE.md) - FLUX.2 修复更新
- ✅ [`QUICK_REFERENCE.md`](QUICK_REFERENCE.md) - 快速参考

## 已知问题和解决方案

### 问题：FLUX.2 API 返回 502 错误

**错误信息**：
```
replicate proxy error: read ECONNRESET
```

**可能原因**：
1. Replicate 后端服务不可用
2. 网络连接不稳定
3. 请求头配置问题
4. 请求超时

**解决方案**：
1. 查看 [`FLUX2_502_TROUBLESHOOTING.md`](FLUX2_502_TROUBLESHOOTING.md) 进行故障排查
2. 检查应用日志中的 `[replicate proxy]` 日志
3. 测试与 Replicate 后端的网络连接
4. 确保 FLUX.2 API Token 已正确配置

## 部署步骤

### 步骤 1：上传应用包
```bash
# 将 exif-guard.zip 上传到 Guard 平台
```

### 步骤 2：配置环境变量（可选）
```bash
APP_PORT=3000
APP_HOSTNAME=0.0.0.0
KRATOS_BACKEND=http://kratos-sunyihao.sl.beta.xiaohongshu.com
REPLICATE_BACKEND=https://api.replicate.com
MAAS_BACKEND=https://maas.devops.rednote.life
```

### 步骤 3：启动应用
```bash
# 点击"启动"按钮
# 等待应用启动完成
```

### 步骤 4：验证应用
```bash
# 检查应用日志
# 测试健康检查端点
# 测试各个 API 调用
```

## 测试清单

### 应用启动
- [ ] 应用能否正常启动
- [ ] 应用日志中是否有错误
- [ ] 应用是否监听正确的端口和地址

### 健康检查
- [ ] 健康检查端点是否正常：`curl http://localhost:3000/health`
- [ ] 返回值是否为 `{"status":"ok"}`

### Kratos API
- [ ] 在应用中选择 "GPT-2 (Kratos)" 模型
- [ ] 上传参考图片
- [ ] 输入提示词
- [ ] 点击生成
- [ ] 检查应用日志中的 `[kratos proxy]` 日志
- [ ] 图片是否生成成功

### FLUX.2 API
- [ ] 在应用中选择 "FLUX.2 [pro]" 模型
- [ ] 上传参考图片
- [ ] 输入提示词
- [ ] 点击生成
- [ ] 检查应用日志中的 `[replicate proxy]` 日志
- [ ] 如果返回 502 错误，查看 [`FLUX2_502_TROUBLESHOOTING.md`](FLUX2_502_TROUBLESHOOTING.md)

### QS GPT Image 2 API
- [ ] 在应用中选择 "QS GPT Image 2" 模型
- [ ] 上传参考图片
- [ ] 输入提示词
- [ ] 点击生成
- [ ] 检查应用日志中的 `[maas proxy]` 日志
- [ ] 图片是否生成成功

### 浏览器控制台
- [ ] 打开浏览器开发者工具（F12）
- [ ] 切换到 Console 标签
- [ ] 检查是否有 CORS 错误
- [ ] 检查是否有其他 JavaScript 错误

## 环境变量说明

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `APP_PORT` | 3000 | 应用监听端口 |
| `APP_HOSTNAME` | 0.0.0.0 | 应用监听地址 |
| `KRATOS_BACKEND` | http://kratos-sunyihao.sl.beta.xiaohongshu.com | Kratos 后端地址 |
| `REPLICATE_BACKEND` | https://api.replicate.com | Replicate 后端地址（FLUX.2） |
| `MAAS_BACKEND` | https://maas.devops.rednote.life | MaaS 后端地址（QS GPT Image 2） |

## 常见问题

### Q: 应用无法启动
A: 检查应用日志中的错误信息，确认 APP_PORT 没有被占用。

### Q: API 调用返回 502 或 504
A: 检查应用日志中的代理错误信息，查看 [`FLUX2_502_TROUBLESHOOTING.md`](FLUX2_502_TROUBLESHOOTING.md)。

### Q: API 调用返回 HTML 而不是 JSON
A: 确认应用使用的是相对路径（`/kratos/`、`/replicate/`、`/maas/`），反向代理已正确配置。

### Q: 浏览器控制台有 CORS 错误
A: 确认应用使用的是相对路径，反向代理已正确配置。

## 后续改进

### 短期改进
1. 监控 FLUX.2 API 的稳定性
2. 收集用户反馈
3. 根据反馈调整超时时间或其他配置

### 长期改进
1. 添加更多 API 支持
2. 优化反向代理性能
3. 添加 API 调用统计和监控

## 相关文档

- [`MULTI_API_PROXY_FIX.md`](MULTI_API_PROXY_FIX.md) - 多 API 反向代理修复详情
- [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md) - Guard 平台部署指南
- [`DEPLOYMENT_CHECKLIST.md`](DEPLOYMENT_CHECKLIST.md) - 部署检查清单
- [`FLUX2_502_TROUBLESHOOTING.md`](FLUX2_502_TROUBLESHOOTING.md) - FLUX.2 故障排查指南
- [`FLUX2_FIX_UPDATE.md`](FLUX2_FIX_UPDATE.md) - FLUX.2 修复更新说明
- [`QUICK_REFERENCE.md`](QUICK_REFERENCE.md) - 快速参考
- [`FINAL_REPORT.md`](FINAL_REPORT.md) - 最终报告

---

**最后更新**：2026-06-04 10:15
**状态**：✅ 完成，可部署
