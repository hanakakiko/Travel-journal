# FLUX.2 API 502 错误修复 - 更新说明

## 问题

用户报告 FLUX.2 [pro] API 调用返回 HTTP 502 错误：
```
replicate proxy error: read ECONNRESET
```

## 分析

ECONNRESET 错误表示反向代理与 Replicate 后端的连接被重置。这可能由以下原因引起：

1. **网络连接问题** - Replicate 后端服务不可用或网络不稳定
2. **请求头配置** - 某些请求头被后端拒绝
3. **请求体问题** - 请求体格式不正确
4. **超时问题** - 请求超时

## 解决方案

### 1. 改进反向代理实现

确保反向代理正确处理所有请求头和错误情况：

**关键改进**：
- ✅ 删除所有污染的请求头（Origin、Referer、Cookie、Authorization）
- ✅ 设置正确的 Host 头
- ✅ 保留 Content-Type 头
- ✅ 提前创建反向代理处理器（避免每次请求都创建）
- ✅ 详细的错误日志记录

### 2. 添加故障排查指南

创建了 [`FLUX2_502_TROUBLESHOOTING.md`](FLUX2_502_TROUBLESHOOTING.md)，包含：
- 问题描述和可能原因
- 详细的故障排查步骤
- 常见解决方案
- 调试技巧

### 3. 环境变量配置

可以通过环境变量自定义 Replicate 后端地址：
```bash
REPLICATE_BACKEND=https://api.replicate.com
```

## 部署步骤

1. **使用最新的 exif-guard.zip**
   - 包含改进的 start.sh
   - 包含最新的构建产物

2. **重新启动应用**
   - 停止当前应用
   - 启动新应用

3. **测试 FLUX.2 API**
   - 在应用中选择 FLUX.2 [pro] 模型
   - 上传参考图片
   - 输入提示词
   - 点击生成
   - 检查应用日志中的代理日志

## 预期效果

- ✅ FLUX.2 API 调用应该能正常工作
- ✅ 应用日志中应该能看到详细的代理日志
- ✅ 如果仍然出现 502 错误，日志中会显示具体的错误信息

## 如果问题仍然存在

1. **检查应用日志**
   - 查看 `[replicate proxy error]` 日志
   - 记下具体的错误信息

2. **检查网络连接**
   - 从应用服务器测试与 Replicate 的连接
   - 使用 curl 命令测试 API 端点

3. **检查 API Token**
   - 确保 FLUX.2 API Token 已正确配置
   - 确保 API Token 有效

4. **检查请求体**
   - 确保请求体格式正确
   - 检查参考图片 URL 是否有效

5. **增加超时时间**
   - 如果 Replicate API 需要更长时间，可以在 start.sh 中增加超时时间
   - 从 120 秒增加到 180 秒或更长

## 相关文件

- [`start.sh`](start.sh) - 改进的启动脚本
- [`FLUX2_502_TROUBLESHOOTING.md`](FLUX2_502_TROUBLESHOOTING.md) - 故障排查指南
- [`exif-guard.zip`](exif-guard.zip) - 更新的 Guard 子应用包

---

**更新时间**：2026-06-04 10:15
**状态**：✅ 完成，可部署
