# QS GPT Image 2 /images/edits 测试指南

## 快速测试步骤

### 第一步：配置 API Key

选择以下任意一种方式配置 API Key：

#### 方式 1：环境变量（推荐）

在项目根目录创建 `.env.local` 文件：

```env
VITE_QS_GPT_IMAGE_2_API_KEY=your_api_key_here
```

#### 方式 2：本地配置文件

编辑 `src/lib/api-keys.local.ts`：

```typescript
export const API_KEYS = {
  VITE_QS_GPT_IMAGE_2_API_KEY: "your_api_key_here",
};
```

#### 方式 3：UI 配置面板

1. 启动开发服务器：`npm run dev`
2. 打开应用
3. 找到 API 配置面板
4. 输入 QS GPT Image 2 的 API Key

### 第二步：启动开发服务器

```bash
npm run dev
```

### 第三步：打开浏览器控制台

按 `F12` 打开开发者工具，切换到 **Console** 标签

### 第四步：触发 QS GPT Image 2 API 调用

在你的应用中使用 QS GPT Image 2 模型生成图片。

### 第五步：查看日志

在控制台中搜索 `[QS GPT Image 2]`，你会看到详细的请求和响应日志。

## 详细日志解读

### 请求日志示例

```
[QS GPT Image 2] request → https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview
[QS GPT Image 2]   model: gpt-image-2
[QS GPT Image 2]   prompt: High Contrast, hyper detailed photo, 2k UHD...
[QS GPT Image 2]   size: 1024x1024
[QS GPT Image 2]   quality: low
[QS GPT Image 2]   n: 1
[QS GPT Image 2] ✓ 参考图片 1: https://example.com/image.jpg...
[QS GPT Image 2] ✓ 图片 1 已转换为 Blob 对象 (123.5KB, image/jpeg)
```

**解读：**
- ✅ 端点正确
- ✅ 参数正确
- ✅ 图片成功转换为 Blob

### 完整请求体日志

```
[QS GPT Image 2] === 完整请求体 (multipart/form-data) ===
[QS GPT Image 2]   images: 1 张
[QS GPT Image 2]   prompt 长度: 45 字符
[QS GPT Image 2]   size: 1024x1024
[QS GPT Image 2]   quality: low
[QS GPT Image 2]   n: 1
```

### 实际发送的请求信息

```
[QS GPT Image 2] === 实际发送的请求信息 ===
[QS GPT Image 2]   URL: https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview
[QS GPT Image 2]   Method: POST
[QS GPT Image 2]   Headers:
[QS GPT Image 2]     api-key: xxx...xxx
[QS GPT Image 2]     Content-Type: multipart/form-data (自动设置)
[QS GPT Image 2]   Body 字段:
[QS GPT Image 2]     - image[1]: https://example.com/image.jpg...
[QS GPT Image 2]     - prompt: 45 字符
[QS GPT Image 2]     - size: 1024x1024
[QS GPT Image 2]     - quality: low
[QS GPT Image 2]     - n: 1
```

### 生成的 curl 命令

```
[QS GPT Image 2] === 完整 curl 命令 ===
curl -sS -X POST "https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview" \
  -H "api-key: xxx..." \
  -F "image=@/path/to/image.jpg" \
  -F "prompt=High Contrast, hyper detailed photo, 2k UHD" \
  -F "quality=low" \
  -F "n=1" \
  -F "size=1024x1024"
```

**用途：** 可以复制这个命令在终端直接测试 API

### 响应日志

```
[QS GPT Image 2] === 完整响应体 ===
{
  "created": 1234567890,
  "data": [
    {
      "url": "https://..."
    }
  ]
}

[QS GPT Image 2] === 响应格式分析 ===
[QS GPT Image 2]   created: 1234567890
[QS GPT Image 2]   data 数组长度: 1
[QS GPT Image 2]   data[0] 字段: url
[QS GPT Image 2]   data[0].url: https://...
[QS GPT Image 2] ✓ 生成成功，图片 URL: https://...
```

## 手动 curl 测试

如果你想在终端直接测试 API，可以使用以下命令：

### 基础测试

```bash
curl -sS -X POST "https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview" \
  -H "api-key: your_api_key" \
  -F "image=@./test_image.jpg" \
  -F "prompt=High Contrast, hyper detailed photo, 2k UHD" \
  -F "quality=low" \
  -F "n=1" \
  -F "size=1024x1024"
```

### 带详细输出的测试

```bash
curl -v -X POST "https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview" \
  -H "api-key: your_api_key" \
  -F "image=@./test_image.jpg" \
  -F "prompt=High Contrast, hyper detailed photo, 2k UHD" \
  -F "quality=low" \
  -F "n=1" \
  -F "size=1024x1024"
```

### 保存响应到文件

```bash
curl -sS -X POST "https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview" \
  -H "api-key: your_api_key" \
  -F "image=@./test_image.jpg" \
  -F "prompt=High Contrast, hyper detailed photo, 2k UHD" \
  -F "quality=low" \
  -F "n=1" \
  -F "size=1024x1024" \
  > response.json

cat response.json | jq .
```

## 常见问题排查

### 问题 1：API Key 未配置

**错误信息：**
```
QS GPT Image 2 API Key 未配置。请在 src/lib/api-keys.local.ts 中配置...
```

**解决方案：**
1. 检查 `.env.local` 文件是否存在
2. 检查 `VITE_QS_GPT_IMAGE_2_API_KEY` 是否正确设置
3. 重启开发服务器

### 问题 2：HTTP 401 错误

**错误信息：**
```
QS GPT Image 2 API 返回 HTTP 401
```

**原因：** API Key 无效或过期

**解决方案：**
1. 确认 API Key 是否正确
2. 检查 API Key 是否过期
3. 从官方平台重新获取 API Key

### 问题 3：HTTP 400 错误

**错误信息：**
```
QS GPT Image 2 API 返回 HTTP 400
```

**原因：** 请求参数错误

**解决方案：**
1. 查看控制台的完整请求体日志
2. 检查参数是否符合 API 规范
3. 复制生成的 curl 命令在终端测试

### 问题 4：图片转换失败

**错误信息：**
```
无法处理参考图片 1：无法获取图片 1：HTTP 404
```

**原因：** 图片 URL 无效或无法访问

**解决方案：**
1. 检查图片 URL 是否有效
2. 检查 CORS 设置
3. 尝试使用本地图片

### 问题 5：图片过大

**错误信息：**
```
图片 1 过大：5.2MB，API 限制最大 4MB
```

**原因：** 图片文件超过 4MB 限制

**解决方案：**
1. 压缩图片
2. 使用更小的图片
3. 使用在线图片压缩工具

### 问题 6：超时错误

**错误信息：**
```
QS GPT Image 2 API 调用失败（已重试 2 次仍失败）
```

**原因：** 网络超时或 API 响应缓慢

**解决方案：**
1. 检查网络连接
2. 增加超时时间：`timeoutMs: 600_000`
3. 检查 API 服务状态

## 验证清单

使用以下清单验证改动是否正确：

- [ ] API Key 已配置
- [ ] 开发服务器已启动
- [ ] 浏览器控制台可见日志
- [ ] 日志中显示正确的端点 URL
- [ ] 日志中显示 `api-key` header（不是 `Authorization`）
- [ ] 日志中显示 `quality: low` 和 `n: 1`
- [ ] 日志中显示图片已转换为 Blob 对象
- [ ] 生成的 curl 命令与官方示例格式一致
- [ ] API 返回成功响应（HTTP 200）
- [ ] 响应中包含 `data[0].url` 或 `data[0].b64_json`

## 性能测试

### 测试 1：单张图片编辑

```typescript
const startTime = performance.now();

const result = await callQsGptImage2({
  prompt: "High Contrast, hyper detailed photo, 2k UHD",
  imageUrls: ["https://example.com/image.jpg"],
  targetWidth: 1024,
  targetHeight: 1024,
});

const endTime = performance.now();
console.log(`总耗时：${(endTime - startTime) / 1000}秒`);
```

**预期结果：** 约 20-30 秒

### 测试 2：重试机制

```typescript
const result = await callQsGptImage2({
  prompt: "test",
  imageUrls: ["https://example.com/image.jpg"],
  maxAttempts: 3,
  retryDelayMs: 1500,
  onAttempt: (info) => {
    console.log(`尝试 ${info.attempt}/${info.totalAttempts}`);
    if (info.lastError) {
      console.log(`上次错误：${info.lastError.message}`);
    }
  },
});
```

**预期结果：** 如果首次失败，会自动重试

## 调试技巧

### 技巧 1：过滤日志

在控制台搜索框输入 `[QS GPT Image 2]` 只显示相关日志

### 技巧 2：导出日志

```javascript
// 在控制台执行
copy(document.body.innerText)
```

然后粘贴到文本编辑器保存

### 技巧 3：监控网络请求

1. 打开 DevTools
2. 切换到 **Network** 标签
3. 刷新页面
4. 搜索 `images/edits`
5. 查看请求和响应详情

### 技巧 4：检查 FormData

```javascript
// 在 callQsGptImage2Once 中添加
console.log("FormData 内容：");
for (let [key, value] of formData.entries()) {
  console.log(`  ${key}:`, value);
}
```

## 下一步

1. ✅ 配置 API Key
2. ✅ 启动开发服务器
3. ✅ 触发 API 调用
4. ✅ 查看控制台日志
5. ✅ 验证请求和响应
6. ✅ 根据需要调整参数

## 相关文档

- 📄 [`QS_GPT_IMAGE_2_EDITS_MIGRATION.md`](QS_GPT_IMAGE_2_EDITS_MIGRATION.md) - 详细改造指南
- 📄 [`QS_GPT_IMAGE_2_QUICK_REFERENCE.md`](QS_GPT_IMAGE_2_QUICK_REFERENCE.md) - 快速参考
- 📄 [`src/lib/modelClient.ts`](src/lib/modelClient.ts) - 实现代码

祝测试顺利！🚀
