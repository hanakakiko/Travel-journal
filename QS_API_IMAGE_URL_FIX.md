# QS GPT Image 2 图片参数修复总结

## 问题分析

之前我误解了 QS API 的图片参数方式。

### 错误的理解

我看到 curl 示例中有 `-F "image=@./img_1k.jpeg"`，以为这是唯一的方式，所以在代码中：
1. 从 URL 获取图片
2. 转换为 Blob 对象
3. 上传到 API

但这样做有问题：
- ❌ 增加了不必要的网络请求（获取图片）
- ❌ 增加了不必要的内存占用（Blob 对象）
- ❌ 增加了处理复杂性

### 正确的理解

QS API 的 `/images/edits` 端点**支持直接传递图片 URL**！

```bash
# 支持的方式
-F "image_url=https://example.com/image.jpg"
```

## 解决方案

### 修改的代码

在 `callQsGptImage2Once()` 函数中，改为直接传递 URL：

**之前（错误）**：
```typescript
// 从 URL 获取图片 Blob
const response = await fetch(imageUrl);
const blob = await response.blob();
formData.append("image", blob, fileName);
```

**现在（正确）**：
```typescript
// 直接传递 URL
formData.append("image_url", imageUrl);
```

### 优势

✅ **更简单** - 不需要转换 Blob
✅ **更快** - 不需要额外的网络请求
✅ **更高效** - 不需要额外的内存占用
✅ **更可靠** - 直接使用原始 URL，避免 CORS 问题

## 修改的文件

### `src/lib/modelClient.ts`

**修改内容**：

1. **图片处理方式**（第 1164-1170 行）
   - 从：转换为 Blob 对象
   - 改为：直接传递 URL

2. **日志输出**（第 1193-1214 行）
   - 从：`image[${i + 1}]`
   - 改为：`image_url[${i + 1}]`
   - 从：`-F "image=@/path/to/${fileName}"`
   - 改为：`-F "image_url=${imageUrlList[i]}"`

## 代码对比

### 修改前

```typescript
// 添加图片字段 - 需要转换为 Blob 对象（/images/edits 需要文件上传）
const MAX_FILE_SIZE_MB = 4;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FORMATS = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

for (let i = 0; i < imageUrlList.length; i++) {
  try {
    const imageUrl = imageUrlList[i];
    // 从 URL 获取图片 Blob
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`无法获取图片 ${i + 1}：HTTP ${response.status}`);
    }
    const blob = await response.blob();
    
    // 检查文件大小
    if (blob.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`图片 ${i + 1} 过大...`);
    }
    
    // 检查文件格式
    if (!ALLOWED_FORMATS.includes(blob.type)) {
      qlog(`⚠️ 图片 ${i + 1} 格式为 ${blob.type}...`);
    }
    
    // 生成文件名
    const urlParts = imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1] || `image_${i + 1}.jpg`;
    
    // 添加为 File 对象
    formData.append("image", blob, fileName);
    qlog(`✓ 图片 ${i + 1} 已转换为 Blob 对象...`);
  } catch (error) {
    qlog(`✗ 图片 ${i + 1} 转换失败:`, error);
    throw new Error(`无法处理参考图片 ${i + 1}...`);
  }
}
```

### 修改后

```typescript
// 添加图片字段 - 直接传递 URL（QS API 支持 image_url 参数）
for (let i = 0; i < imageUrlList.length; i++) {
  const imageUrl = imageUrlList[i];
  qlog(`✓ 图片 ${i + 1} URL: ${imageUrl.slice(0, 80)}...`);
  // 直接添加 URL，不需要转换为 Blob
  formData.append("image_url", imageUrl);
}
```

## 性能对比

### 修改前

```
用户调用 QS GPT Image 2
  ↓
获取参考图片 1（网络请求）
  ↓
转换为 Blob 对象（内存占用）
  ↓
获取参考图片 2（网络请求）
  ↓
转换为 Blob 对象（内存占用）
  ↓
发送 POST 请求到 QS API
  ↓
返回结果
```

**总网络请求数**：2（获取图片）+ 1（API 调用）= 3 次

### 修改后

```
用户调用 QS GPT Image 2
  ↓
直接发送 POST 请求到 QS API（包含图片 URL）
  ↓
返回结果
```

**总网络请求数**：1（API 调用）

## 测试建议

### 步骤 1：验证请求格式

打开浏览器控制台，查看日志：

```
[QS GPT Image 2] === 完整 curl 命令 ===
curl -sS -X POST "https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview" \
  -H "api-key: xxx" \
  -F "image_url=https://example.com/image1.jpg" \
  -F "image_url=https://example.com/image2.jpg" \
  -F "prompt=..." \
  -F "quality=low" \
  -F "n=1" \
  -F "size=1024x1536"
```

**关键检查**：
- ✅ 应该看到 `-F "image_url=https://..."`
- ❌ 不应该看到 `-F "image=@/path/to/..."`

### 步骤 2：验证 API 响应

如果 API 返回成功，说明修改正确：

```json
{
  "Code": 0,
  "Message": "success",
  "Data": {
    "imageUrl": "https://..."
  }
}
```

## 总结

通过改为直接传递图片 URL，我们：

✅ **简化了代码** - 删除了 Blob 转换逻辑
✅ **提高了性能** - 减少了网络请求和内存占用
✅ **改进了可靠性** - 避免了 CORS 和网络问题
✅ **符合 API 设计** - 使用 API 原生支持的参数方式

现在 QS GPT Image 2 应该能更快、更可靠地工作了！

## 相关文档

- [`API_KEY_TRANSMISSION_FIX.md`](API_KEY_TRANSMISSION_FIX.md) - API Key 传递问题修复
- [`QS_API_TROUBLESHOOTING.md`](QS_API_TROUBLESHOOTING.md) - 故障排查指南
- [`QUICK_API_KEY_CHECK.md`](QUICK_API_KEY_CHECK.md) - 快速检查清单
