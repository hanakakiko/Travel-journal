# Guard 平台部署指南

## 快速开始

### 1. 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:5173
```

### 2. 构建生产版本

```bash
# 构建应用
npm run build

# 输出到 dist/ 目录
```

### 3. 部署到 Guard 平台

```bash
# 1. 确保已构建应用
npm run build

# 2. 更新 exif-guard.zip（包含最新的构建产物和启动脚本）
rm -rf exif-guard
unzip exif-guard.zip
cp start.sh exif-guard/
cp -r dist/* exif-guard/dist/
rm exif-guard.zip
zip -r exif-guard.zip exif-guard/

# 3. 上传 exif-guard.zip 到 Guard 平台
# 4. 配置环境变量（见下文）
# 5. 启动应用
```

## 环境变量配置

在 Guard 平台上配置以下环境变量：

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `APP_PORT` | 3000 | 应用监听端口 |
| `APP_HOSTNAME` | 0.0.0.0 | 应用监听地址 |
| `KRATOS_BACKEND` | http://kratos-sunyihao.sl.beta.xiaohongshu.com | Kratos 后端地址 |
| `REPLICATE_BACKEND` | https://api.replicate.com | Replicate 后端地址（FLUX.2） |
| `MAAS_BACKEND` | https://maas.devops.rednote.life | MaaS 后端地址（QS GPT Image 2） |

## API 端点映射

应用中的 API 调用通过反向代理转发到真实后端：

| API | 应用路径 | 真实后端 |
|-----|---------|---------|
| Kratos | `/kratos/*` | `http://kratos-sunyihao.sl.beta.xiaohongshu.com/*` |
| FLUX.2 | `/replicate/*` | `https://api.replicate.com/*` |
| QS GPT Image 2 | `/maas/*` | `https://maas.devops.rednote.life/*` |

## 健康检查

应用提供健康检查端点：

```bash
curl http://localhost:3000/health
# 返回: {"status":"ok"}
```

## 日志查看

应用启动时会输出日志：

```
[start] listening on 0.0.0.0:3000
[start] Kratos backend: http://kratos-sunyihao.sl.beta.xiaohongshu.com
[start] Replicate backend: https://api.replicate.com
[start] MaaS backend: https://maas.devops.rednote.life
```

API 调用时会输出代理日志：

```
[kratos proxy] POST /kratos/api/v1/generate -> http://kratos-sunyihao.sl.beta.xiaohongshu.com/api/v1/generate
[kratos proxy] forwarding to http://kratos-sunyihao.sl.beta.xiaohongshu.com/api/v1/generate
[kratos proxy] headers: host=kratos-sunyihao.sl.beta.xiaohongshu.com, content-type=application/json
[kratos proxy] response 200
```

## 常见问题

### Q: 为什么需要反向代理？

A: 在 Guard 平台上，应用运行在子路径 `/s/{app_id}/` 下。直接从浏览器调用外部 API 会遇到：
- CORS 跨域问题
- 请求头污染（Origin、Referer 等）
- 后端拒绝请求

通过反向代理，所有 API 调用都从应用服务器发出，避免了这些问题。

### Q: 如何添加新的 API？

A: 在 start.sh 中：
1. 定义新的后端地址环境变量
2. 创建对应的反向代理处理器
3. 在应用代码中使用相对路径调用 API

### Q: 超时时间为什么是 120 秒？

A: Kratos 和其他 AI 模型 API 涉及复杂的推理计算，可能需要较长时间。120 秒的超时时间可以满足大多数场景。

### Q: 如何调试 API 问题？

A: 
1. 查看应用日志，找到代理日志
2. 检查请求头是否正确（Host、Content-Type 等）
3. 检查后端地址是否正确
4. 使用浏览器开发者工具查看网络请求

## 文件说明

| 文件 | 说明 |
|------|------|
| [`start.sh`](start.sh) | Guard 启动脚本，包含反向代理逻辑 |
| [`src/lib/modelConfig.ts`](src/lib/modelConfig.ts) | 模型配置，定义 API 端点 |
| [`src/lib/modelClient.ts`](src/lib/modelClient.ts) | API 调用代码 |
| [`exif-guard.zip`](exif-guard.zip) | Guard 子应用包 |
| [`MULTI_API_PROXY_FIX.md`](MULTI_API_PROXY_FIX.md) | 多 API 反向代理修复说明 |

## 相关文档

- [MULTI_API_PROXY_FIX.md](MULTI_API_PROXY_FIX.md) - 多 API 反向代理修复详情
- [KRATOS_502_FINAL_FIX.md](KRATOS_502_FINAL_FIX.md) - Kratos 502/504 错误修复
- [README.md](README.md) - 项目说明

---

**最后更新**：2026-06-04 09:40
