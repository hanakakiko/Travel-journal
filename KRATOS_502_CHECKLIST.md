# Kratos 502 错误快速检查清单

## 🔍 快速诊断（按顺序检查）

### ✅ 第一步：检查 start.sh 日志

```bash
# 查看 Guard Pod 日志
kubectl logs <pod-name> -f | grep kratos
```

**预期日志**：
```
[start] listening on 0.0.0.0:3000
[start] Kratos backend: http://kratos-sunyihao.sl.beta.xiaohongshu.com
[kratos proxy] POST /kratos/ads/materialcenter/doaction -> http://kratos-sunyihao.sl.beta.xiaohongshu.com/ads/materialcenter/doaction
[kratos proxy] response 200
```

**如果看到错误**：
- `[kratos proxy error] ECONNREFUSED` → 连接被拒绝，检查网络
- `[kratos proxy error] ENOTFOUND` → DNS 解析失败，检查地址
- `[kratos proxy timeout]` → 超时，检查后端性能

### ✅ 第二步：检查环境变量

```bash
# 在 Guard Pod 中执行
echo $KRATOS_BACKEND
```

**预期输出**：
```
http://kratos-sunyihao.sl.beta.xiaohongshu.com
```

**如果为空**：
- 在 Guard 平台的环境变量配置中添加：
  ```
  KRATOS_BACKEND=http://kratos-sunyihao.sl.beta.xiaohongshu.com
  ```

### ✅ 第三步：测试反向代理

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

**如果返回 502**：
- 反向代理无法连接到 Kratos 后端
- 检查网络和防火墙规则

### ✅ 第四步：直接测试 Kratos 后端

```bash
# 在 Guard Pod 中执行
curl -v http://kratos-sunyihao.sl.beta.xiaohongshu.com/ads/materialcenter/doaction \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"tabName":"test","actionCode":"test"}'
```

**预期响应**：
- HTTP 200 或 400（来自 Kratos）
- **不应该是 502 或超时**

**如果返回 502 或超时**：
- Guard Pod 无法访问 Kratos 后端
- 检查网络配置和防火墙规则

## 🛠️ 常见问题与解决方案

### 问题 1：502 Bad Gateway

**原因**：反向代理无法连接到 Kratos 后端

**解决方案**：
1. 检查 Guard Pod 的网络配置
2. 确认 Kratos 后端地址是否正确
3. 检查防火墙规则
4. 尝试从 Guard Pod 中直接 curl Kratos 后端

### 问题 2：504 Gateway Timeout

**原因**：Kratos 后端响应太慢

**解决方案**：
1. 检查 Kratos 后端的性能
2. 增加超时时间（在 start.sh 中修改 `proxyReq.setTimeout(30000)` 为更大的值）
3. 检查网络延迟

### 问题 3：400 Bad Request

**原因**：请求参数不正确

**解决方案**：
1. 检查应用代码中的 Kratos 请求参数
2. 确认请求体格式是否正确
3. 查看 Kratos 的错误信息

### 问题 4：ECONNREFUSED

**原因**：连接被拒绝，Kratos 后端可能未运行

**解决方案**：
1. 检查 Kratos 后端是否运行
2. 确认 Kratos 后端地址是否正确
3. 检查防火墙规则

### 问题 5：ENOTFOUND

**原因**：DNS 解析失败

**解决方案**：
1. 检查 Kratos 后端地址是否正确
2. 检查 Guard Pod 的 DNS 配置
3. 尝试使用 IP 地址而不是域名

## 📋 部署前检查清单

- [ ] 已更新 `exif-guard.zip` 到最新版本
- [ ] 已在 Guard 平台设置环境变量 `KRATOS_BACKEND`
- [ ] 已确认 Guard Pod 的网络配置允许访问 Kratos 后端
- [ ] 已确认 Kratos 后端地址是否正确
- [ ] 已确认应用代码中使用的是相对路径 `/kratos/...`

## 📞 需要帮助？

如果按照上述步骤仍无法解决问题，请提供以下信息：

1. **start.sh 的完整日志**（包括错误信息）
2. **curl 测试的结果**（第三步和第四步）
3. **Guard 平台的环境变量配置**
4. **Guard Pod 的网络配置**（如有防火墙规则）
5. **Kratos 后端的地址和状态**

## 相关文件

- `KRATOS_502_DIAGNOSIS.md` - 详细的诊断指南
- `KRATOS_PROXY_FIX.md` - 反向代理问题的详细说明
- `KRATOS_DEBUG.md` - 调试指南
