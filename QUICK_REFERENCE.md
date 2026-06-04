# 快速参考 - Guard 平台部署

## 核心改动

### 1. start.sh - 多 API 反向代理
```javascript
// 支持三个 API 的反向代理
const KRATOS_BACKEND = 'http://kratos-sunyihao.sl.beta.xiaohongshu.com';
const REPLICATE_BACKEND = 'https://api.replicate.com';
const MAAS_BACKEND = 'https://maas.devops.rednote.life';

// 通用反向代理函数
const createProxyHandler = (name, backendUrl, pathPrefix) => { ... };

// 为每个 API 添加反向代理
const kratosHandler = createProxyHandler('kratos', KRATOS_BACKEND, '/kratos/');
const replicateHandler = createProxyHandler('replicate', REPLICATE_BACKEND, '/replicate/');
const maasHandler = createProxyHandler('maas', MAAS_BACKEND, '/maas/');
```

### 2. modelConfig.ts - API 端点
```typescript
"qs-gpt-image-2": {
  endpoint: "/maas/openai/openai/images/generations?api-version=2025-04-01-preview",
  // ...
}
```

### 3. modelClient.ts - 默认端点
```typescript
const endpoint = userQsConfig?.customEndpoint || "/maas/openai/openai/images/generations?api-version=2025-04-01-preview";
```

## API 端点映射

| API | 应用路径 | 后端地址 |
|-----|---------|---------|
| Kratos | `/kratos/*` | `http://kratos-sunyihao.sl.beta.xiaohongshu.com/*` |
| FLUX.2 | `/replicate/*` | `https://api.replicate.com/*` |
| QS GPT Image 2 | `/maas/*` | `https://maas.devops.rednote.life/*` |

## 部署步骤

```bash
# 1. 构建应用
npm run build

# 2. 更新 exif-guard.zip
rm -rf exif-guard
unzip exif-guard.zip
cp start.sh exif-guard/
cp -r dist/* exif-guard/dist/
rm exif-guard.zip
zip -r exif-guard.zip exif-guard/

# 3. 上传到 Guard 平台
# 4. 配置环境变量（可选）
# 5. 启动应用
```

## 环境变量

```bash
APP_PORT=3000                                                    # 应用端口
APP_HOSTNAME=0.0.0.0                                            # 应用地址
KRATOS_BACKEND=http://kratos-sunyihao.sl.beta.xiaohongshu.com  # Kratos 后端
REPLICATE_BACKEND=https://api.replicate.com                    # FLUX.2 后端
MAAS_BACKEND=https://maas.devops.rednote.life                  # QS GPT Image 2 后端
```

## 验证

```bash
# 健康检查
curl http://localhost:3000/health
# 返回: {"status":"ok"}

# 查看日志
# 应该看到:
# [start] listening on 0.0.0.0:3000
# [start] Kratos backend: http://kratos-sunyihao.sl.beta.xiaohongshu.com
# [start] Replicate backend: https://api.replicate.com
# [start] MaaS backend: https://maas.devops.rednote.life
```

## 测试 API

### Kratos
1. 选择 "GPT-2 (Kratos)" 模型
2. 上传参考图片
3. 输入提示词
4. 点击生成
5. 检查日志中的 `[kratos proxy]` 日志

### FLUX.2
1. 选择 "FLUX.2 [pro]" 模型
2. 上传参考图片
3. 输入提示词
4. 点击生成
5. 检查日志中的 `[replicate proxy]` 日志

### QS GPT Image 2
1. 选择 "QS GPT Image 2" 模型
2. 上传参考图片
3. 输入提示词
4. 点击生成
5. 检查日志中的 `[maas proxy]` 日志

## 故障排查

| 问题 | 检查项 |
|------|--------|
| 应用无法启动 | 检查日志、确认端口未被占用 |
| API 返回 502/504 | 检查后端地址、网络连接 |
| API 返回 HTML | 确认使用相对路径、反向代理已配置 |
| CORS 错误 | 确认使用相对路径、反向代理已配置 |

## 文件清单

| 文件 | 说明 |
|------|------|
| [`start.sh`](start.sh) | 启动脚本，包含反向代理 |
| [`src/lib/modelConfig.ts`](src/lib/modelConfig.ts) | 模型配置 |
| [`src/lib/modelClient.ts`](src/lib/modelClient.ts) | API 调用代码 |
| [`exif-guard.zip`](exif-guard.zip) | Guard 子应用包 |
| [`MULTI_API_PROXY_FIX.md`](MULTI_API_PROXY_FIX.md) | 详细说明 |
| [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md) | 部署指南 |
| [`DEPLOYMENT_CHECKLIST.md`](DEPLOYMENT_CHECKLIST.md) | 检查清单 |

## 关键特性

✅ 通用反向代理函数 - 支持任意 API
✅ 请求头清理 - 删除污染的头
✅ Host 头设置 - 模仿 Vite changeOrigin
✅ 120 秒超时 - 满足 AI 推理需求
✅ 详细日志 - 便于诊断问题
✅ 环境变量配置 - 灵活部署

---

**最后更新**：2026-06-04 09:40
