# Kratos 502 错误 - 后续步骤

## 🎯 立即行动

### 1. 重新部署应用

使用最新的 `exif-guard.zip` 重新部署到 Guard 平台：

```bash
# 上传 exif-guard.zip 到 Guard 平台
# 执行部署流程
```

### 2. 配置环境变量

在 Guard 平台的环境变量配置中添加：

```
KRATOS_BACKEND=http://kratos-sunyihao.sl.beta.xiaohongshu.com
```

### 3. 查看日志

部署后，查看 Guard Pod 的日志：

```bash
kubectl logs <pod-name> -f | grep kratos
```

## 📋 检查清单

部署前：
- [ ] 已下载最新的 `exif-guard.zip`
- [ ] 已确认 Kratos 后端地址是否正确

部署后：
- [ ] 已在 Guard 平台设置 `KRATOS_BACKEND` 环境变量
- [ ] 已查看 start.sh 的日志
- [ ] 已确认日志中没有 `[kratos proxy error]`

## 🔍 诊断步骤

如果仍然返回 502，按照以下步骤诊断：

### 第一步：检查日志

```bash
kubectl logs <pod-name> -f | grep "kratos proxy"
```

查看是否有错误信息：
- `ECONNREFUSED` - 连接被拒绝
- `ENOTFOUND` - DNS 解析失败
- `ETIMEDOUT` - 连接超时

### 第二步：测试反向代理

```bash
# 在 Guard Pod 中执行
curl -v http://localhost:3000/kratos/ads/materialcenter/doaction \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"tabName":"test","actionCode":"test"}'
```

### 第三步：直接测试 Kratos 后端

```bash
# 在 Guard Pod 中执行
curl -v http://kratos-sunyihao.sl.beta.xiaohongshu.com/ads/materialcenter/doaction \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"tabName":"test","actionCode":"test"}'
```

## 📚 参考文档

- **KRATOS_502_README.txt** - 快速指南
- **KRATOS_502_CHECKLIST.md** - 快速检查清单
- **KRATOS_502_DIAGNOSIS.md** - 详细诊断指南
- **KRATOS_502_SOLUTION.md** - 完整解决方案
- **KRATOS_PROXY_FIX.md** - 反向代理说明

## 💡 常见问题

### Q: 为什么返回 502？
A: start.sh 中的反向代理无法连接到 Kratos 后端。可能是网络问题、环境变量未设置或 Kratos 后端地址不正确。

### Q: 如何检查反向代理是否工作？
A: 在 Guard Pod 中执行 `curl http://localhost:3000/kratos/...` 测试反向代理。

### Q: 如何检查 Kratos 后端是否可达？
A: 在 Guard Pod 中执行 `curl http://kratos-sunyihao.sl.beta.xiaohongshu.com/...` 直接测试后端。

### Q: 如果 Guard Pod 无法访问 Kratos 后端怎么办？
A: 检查网络配置和防火墙规则。可能需要联系 Guard 平台支持。

## 🚀 预期结果

部署最新的 `exif-guard.zip` 后，应该能够：

1. ✅ 正确转发 `/kratos/` 请求到 Kratos 后端
2. ✅ 返回 Kratos 的实际响应（而不是 502）
3. ✅ 在日志中看到详细的转发信息
4. ✅ 应用能够正常调用 Kratos 接口生成图片

## 📞 需要帮助？

如果问题仍未解决，请提供以下信息：

1. start.sh 的完整日志
2. curl 测试的结果
3. Guard 平台的环境变量配置
4. Guard Pod 的网络配置

---

**最后更新**：2026-06-03
**版本**：exif-guard.zip (91K)
