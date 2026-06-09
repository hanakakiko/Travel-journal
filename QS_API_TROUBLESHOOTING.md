# QS GPT Image 2 API 调用故障排查指南

## 问题症状

调用 QS GPT Image 2 时出现错误：
```
GPT-2 API 调用失败：CloudBase generateImage 云函数调用失败
QS_GPT_IMAGE_2_API_KEY 未在 CloudBase 云函数环境变量中配置
```

## 根本原因

这个错误说明代码仍然在调用云函数 `generateImage`，而不是直接调用 QS API。

## 解决步骤

### 步骤 1：确认前端直调模式已启用

检查 `src/lib/deploymentMode.ts` 中的 `isCloudbaseModelProxyEnabled()` 函数：

```typescript
export function isCloudbaseModelProxyEnabled(): boolean {
  // 应该返回 true（表示启用前端直调模式）
  return true;
}
```

### 步骤 2：配置 QS API Key

选择以下任意一种方式配置 API Key：

#### 方式 1：环境变量（推荐开发环境）

在项目根目录创建或编辑 `.env.local` 文件：

```bash
VITE_QS_GPT_IMAGE_2_API_KEY=your_actual_api_key_here
```

然后重启开发服务器：
```bash
npm run dev
```

#### 方式 2：API 配置面板（推荐生产环境）

1. 打开应用
2. 找到 API 配置面板（通常在设置或菜单中）
3. 找到 "QS GPT Image 2" 配置项
4. 输入你的 API Key
5. 保存配置

#### 方式 3：本地配置文件

编辑 `src/lib/api-keys.local.ts`：

```typescript
export const API_KEYS = {
  VITE_QS_GPT_IMAGE_2_API_KEY: "your_actual_api_key_here",
  // ... 其他 Key
};
```

### 步骤 3：验证配置

打开浏览器开发者工具（F12），查看控制台日志：

1. **查找 QS GPT Image 2 日志**：
   ```
   [QS GPT Image 2] request → https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview
   ```

2. **确认请求头中有 API Key**：
   ```
   [QS GPT Image 2] Headers:
     api-key: your_key_first_10_chars...last_10_chars
   ```

3. **确认没有调用云函数**：
   - 不应该看到 `CloudBase generateImage` 的日志
   - 不应该看到 `callGenerateImageFunction` 的日志

### 步骤 4：测试 API 调用

在浏览器控制台中手动测试：

```javascript
// 导入必要的函数
import { callModelAPI } from './src/lib/modelRouter';

// 调用 API
const result = await callModelAPI("qs-gpt-image-2", {
  prompt: "测试提示词",
  imageUrls: ["https://example.com/image.jpg"],
  targetWidth: 1024,
  targetHeight: 1536,
});

console.log("成功！", result);
```

## 常见问题

### Q1：仍然看到云函数错误

**原因**：可能是以下几种情况：
1. 代码没有重新编译
2. 浏览器缓存了旧代码
3. 前端直调模式没有启用

**解决**：
```bash
# 清除构建产物
rm -rf dist/

# 重新构建
npm run build

# 或者开发模式下清除缓存
npm run dev -- --force
```

### Q2：API Key 配置了但仍然报错

**原因**：API Key 可能：
1. 格式不正确
2. 已过期
3. 没有权限调用 QS API

**解决**：
1. 检查 API Key 是否正确复制（没有多余空格）
2. 确认 API Key 仍然有效
3. 检查 API Key 的权限设置

### Q3：看到 "无法获取图片" 错误

**原因**：参考图片 URL 无法访问

**解决**：
1. 确认图片 URL 可以在浏览器中打开
2. 检查图片是否支持 CORS
3. 确认图片大小不超过 4MB

### Q4：看到 "API 返回 HTTP 错误" 

**原因**：QS API 返回了错误响应

**解决**：
1. 检查浏览器控制台中的完整错误信息
2. 查看 QS API 的文档，了解错误代码含义
3. 确认 API Key 有权限调用该端点

## 调试技巧

### 启用详细日志

在 `src/lib/modelClient.ts` 中，日志已经默认在开发模式启用：

```typescript
const DEBUG_ENABLED = import.meta.env.DEV;
```

### 查看完整请求体

在浏览器控制台中查找：
```
[QS GPT Image 2] === 完整请求体 (multipart/form-data) ===
```

### 查看完整响应体

在浏览器控制台中查找：
```
[QS GPT Image 2] === 完整响应体 ===
```

### 使用 curl 测试 API

从浏览器控制台复制 curl 命令，在终端中运行：

```bash
curl -sS -X POST "https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview" \
  -H "api-key: your_api_key" \
  -F "image=@/path/to/image.jpg" \
  -F "prompt=your_prompt" \
  -F "quality=low" \
  -F "n=1" \
  -F "size=1024x1536"
```

## 快速检查清单

- [ ] 前端直调模式已启用（`isCloudbaseModelProxyEnabled()` 返回 true）
- [ ] QS API Key 已配置（环境变量、API 面板或本地文件）
- [ ] 代码已重新编译（`npm run build` 或 `npm run dev`）
- [ ] 浏览器缓存已清除（F12 → 应用 → 清除存储）
- [ ] 浏览器控制台显示 `[QS GPT Image 2]` 日志（不是云函数日志）
- [ ] API Key 格式正确（没有多余空格）
- [ ] 参考图片 URL 可以访问
- [ ] 参考图片大小不超过 4MB

## 获取帮助

如果问题仍未解决，请提供以下信息：

1. **浏览器控制台的完整错误日志**
2. **`[QS GPT Image 2]` 的完整请求日志**
3. **`[QS GPT Image 2]` 的完整响应日志**
4. **你的 API Key 配置方式**（环境变量/API 面板/本地文件）
5. **参考图片的 URL**（可以隐藏敏感信息）

## 相关文档

- [`FRONTEND_DIRECT_CALL_FIX.md`](FRONTEND_DIRECT_CALL_FIX.md) - 前端直调模式修复总结
- [`API_KEY_SECURITY_STRATEGY.md`](API_KEY_SECURITY_STRATEGY.md) - API Key 安全性策略
- [`ALL_MODELS_FRONTEND_DIRECT_CALL_SUMMARY.md`](ALL_MODELS_FRONTEND_DIRECT_CALL_SUMMARY.md) - 全面改造总结
