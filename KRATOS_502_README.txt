================================================================================
Kratos 502 错误修复 - 快速指南
================================================================================

问题：应用在 Guard 子应用中调用 Kratos 接口返回 HTTP 502

原因：start.sh 中的反向代理无法连接到 Kratos 后端

================================================================================
快速解决步骤
================================================================================

1. 使用最新的 exif-guard.zip 重新部署到 Guard 平台

2. 在 Guard 平台的环境变量配置中添加：
   KRATOS_BACKEND=http://kratos-sunyihao.sl.beta.xiaohongshu.com

3. 部署后，查看 Guard Pod 的日志：
   kubectl logs <pod-name> -f | grep kratos

4. 预期日志：
   [start] listening on 0.0.0.0:3000
   [start] Kratos backend: http://kratos-sunyihao.sl.beta.xiaohongshu.com
   [kratos proxy] POST /kratos/ads/materialcenter/doaction -> ...
   [kratos proxy] response 200

================================================================================
如果仍然返回 502
================================================================================

按照 KRATOS_502_CHECKLIST.md 中的步骤逐一排查：

1. 检查 start.sh 日志中的错误信息
2. 检查环境变量 KRATOS_BACKEND 是否正确设置
3. 在 Guard Pod 中测试反向代理：
   curl -v http://localhost:3000/kratos/ads/materialcenter/doaction \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{"tabName":"test","actionCode":"test"}'
4. 在 Guard Pod 中直接测试 Kratos 后端：
   curl -v http://kratos-sunyihao.sl.beta.xiaohongshu.com/ads/materialcenter/doaction \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{"tabName":"test","actionCode":"test"}'

================================================================================
改进内容
================================================================================

✓ 改进的 start.sh 反向代理
  - 更详细的日志记录
  - 更好的请求头处理
  - 超时处理

✓ 详细的诊断文档
  - KRATOS_502_CHECKLIST.md - 快速检查清单
  - KRATOS_502_DIAGNOSIS.md - 详细诊断指南
  - KRATOS_PROXY_FIX.md - 反向代理说明
  - KRATOS_DEBUG.md - 调试指南

================================================================================
相关文件
================================================================================

exif-guard.zip - 完整的子应用包（包含改进的 start.sh）
KRATOS_502_CHECKLIST.md - 快速检查清单
KRATOS_502_DIAGNOSIS.md - 详细诊断指南
KRATOS_502_FIX_SUMMARY.md - 修复总结
KRATOS_PROXY_FIX.md - 反向代理说明
KRATOS_DEBUG.md - 调试指南

================================================================================
