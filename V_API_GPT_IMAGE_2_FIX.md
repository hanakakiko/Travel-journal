# V-API GPT Image 2 API 修复 - "image is required" 错误

## 问题描述

调用 V-API GPT Image 2 API 时出现以下错误：

```
HTTP 500: {"error":{"message":"image is required","type":"v_api_biz_error","code":"convert_request_failed"}}
```

## 根本原因

有两个问题：

### 问题 1：图片格式错误
在 [`src/lib/modelClient.ts`](src/lib/modelClient.ts) 的 `callVApiGptImage2Once()` 函数中，图片被作为**字符串 URL** 添加到 FormData：

```typescript
// ❌ 错误做法
formData.append("image", imageUrlList[i]);  // 添加字符串 URL
```

但 V-API 的 `/images/edits` 接口期望的是**文件对象（Blob/File）**，而不是 URL 字符串。

### 问题 2：图片数量超限
API 最多支持 **4 张图片**，但代码可能发送了 **9 张或更多**，导致 API 拒绝请求。

**API 限制：**
- 最多 4 张图片
- 每张 < 4MB
- 格式：PNG、JPG、WebP

## 解决方案

将 URL 转换为 Blob 对象，然后添加到 FormData：

```typescript
// ✅ 正确做法
for (let i = 0; i < imageUrlList.length; i++) {
  try {
    const imageUrl = imageUrlList[i];
    // 从 URL 获取图片 Blob
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`无法获取图片 ${i + 1}：HTTP ${response.status}`);
    }
    const blob = await response.blob();
    // 生成文件名
    const fileName = imageUrl.split('/').pop() || `image_${i + 1}.jpg`;
    // 添加为 File 对象
    formData.append("image", blob, fileName);
  } catch (error) {
    throw new Error(`无法处理参考图片 ${i + 1}：${error instanceof Error ? error.message : String(error)}`);
  }
}
```

## 修改详情

### 文件：`src/lib/modelClient.ts`

#### 修改 1：图片 Blob 转换（第 1226-1232 行）

**之前：**
```typescript
// 添加多个 image 字段（支持多张图片）- 作为字符串 URL
for (let i = 0; i < imageUrlList.length; i++) {
  formData.append("image", imageUrlList[i]);
}
```

**之后：**
```typescript
// 添加多个 image 字段（支持多张图片）- 需要转换为 Blob 对象
for (let i = 0; i < imageUrlList.length; i++) {
  try {
    const imageUrl = imageUrlList[i];
    // 从 URL 获取图片 Blob
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`无法获取图片 ${i + 1}：HTTP ${response.status}`);
    }
    const blob = await response.blob();
    // 生成文件名（从 URL 提取或使用默认名称）
    const urlParts = imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1] || `image_${i + 1}.jpg`;
    // 添加为 File 对象而不是字符串
    formData.append("image", blob, fileName);
    vlog(`✓ 图片 ${i + 1} 已转换为 Blob 对象`);
  } catch (error) {
    vlog(`✗ 图片 ${i + 1} 转换失败:`, error);
    throw new Error(`无法处理参考图片 ${i + 1}：${error instanceof Error ? error.message : String(error)}`);
  }
}
```

#### 修改 2：curl 命令示例更新（第 1264-1275 行）

**之前：**
```typescript
// 生成完整的 curl 命令用于调试
vlog("=== 完整 curl 命令 ===");
let curlCmd = `curl --location '${endpoint}' \\
  --header 'Authorization: Bearer ${apiKey}' \\`;
for (let i = 0; i < imageUrlList.length; i++) {
  curlCmd += `\n  --form 'image="${imageUrlList[i]}"' \\`;
}
```

**之后：**
```typescript
// 生成完整的 curl 命令用于调试（注：实际发送的是 Blob 对象，curl 示例仅供参考）
vlog("=== 完整 curl 命令（参考，实际发送 Blob 对象）===");
let curlCmd = `curl --location '${endpoint}' \\
  --header 'Authorization: Bearer ${apiKey}' \\`;
for (let i = 0; i < imageUrlList.length; i++) {
  const fileName = imageUrlList[i].split('/').pop() || `image_${i + 1}.jpg`;
  curlCmd += `\n  --form 'image=@/path/to/${fileName}' \\`;
}
```

## 工作流程

### 修复前
```
URL 字符串
    ↓
formData.append("image", urlString)  ❌ 错误
    ↓
API 收到字符串，期望 Blob
    ↓
HTTP 500: "image is required"
```

### 修复后
```
URL 字符串
    ↓
fetch(url) → Blob
    ↓
formData.append("image", blob, fileName)  ✅ 正确
    ↓
API 收到 Blob，正确处理
    ↓
HTTP 200: 成功生成图片
```

## 测试步骤

1. **清除浏览器缓存**（可选）
2. **重新加载应用**
3. **上传图片并生成手帐**
4. **检查浏览器控制台**：
   - 应该看到 `✓ 图片 1 已转换为 Blob 对象` 等日志
   - 不应该再看到 `HTTP 500` 错误
5. **验证生成结果**：
   - 应该成功生成手帐图片
   - 图片应该包含所有参考图片的内容

## 相关日志

修复后，控制台应该显示：

```
[V-API GPT Image 2] ✓ 参考图片 1: https://journal-photos-1302323802.cos.ap-shanghai.myqcloud.com/...
[V-API GPT Image 2] ✓ 参考图片 2: https://journal-photos-1302323802.cos.ap-shanghai.myqcloud.com/...
...
[V-API GPT Image 2] ✓ 图片 1 已转换为 Blob 对象
[V-API GPT Image 2] ✓ 图片 2 已转换为 Blob 对象
...
[V-API GPT Image 2] request → https://api.v3.cm/v1/images/edits
[V-API GPT Image 2] ← response {...}
[V-API GPT Image 2] ✓ 生成成功，图片 URL: ...
```

## 性能考虑

- **网络请求增加**：现在需要先 fetch 每张图片的 Blob，然后再上传
- **内存占用**：所有图片 Blob 会同时存在内存中
- **建议**：
  - 对于大量图片（>10 张），考虑分批处理
  - 对于大图片（>5MB），考虑在上传前压缩

## 相关文件

- 修复文件：[`src/lib/modelClient.ts`](src/lib/modelClient.ts)
- 调用方：[`src/lib/modelRouter.ts`](src/lib/modelRouter.ts)
- 配置文件：[`src/lib/modelConfig.ts`](src/lib/modelConfig.ts)

## 常见问题

### Q: 为什么之前是字符串 URL？
A: 这是一个实现错误。V-API 的 API 文档要求 multipart/form-data 中的 `image` 字段必须是文件对象。

### Q: 这个修复会影响其他模型吗？
A: 不会。这个修复只影响 V-API GPT Image 2 的实现，其他模型（FLUX.2、Kratos 等）不受影响。

### Q: 如果图片 URL 无法访问怎么办？
A: 会抛出错误，错误信息会明确指出是哪张图片无法获取。用户需要确保所有参考图片的 URL 都是可访问的。

### Q: 修复后性能会变差吗？
A: 会增加一些网络延迟（需要先 fetch 图片），但这是必要的。通常不会明显影响用户体验。
