# 图片压缩配置指南

## 概述

在 [`cosUploader.ts`](src/lib/cosUploader.ts) 中实现了自动图片压缩功能，在上传到 COS 前对图片进行压缩，以减少存储空间和 LLM token 消耗。

## 压缩配置

位置：[`src/lib/cosUploader.ts`](src/lib/cosUploader.ts) 第 114-119 行

```typescript
const IMAGE_COMPRESS_CONFIG = {
  maxWidth: 2048,        // 最大宽度（像素）
  maxHeight: 2048,       // 最大高度（像素）
  quality: 0.75,         // JPEG 质量（0-1，默认 0.75）
  maxSizeKB: 500,        // 目标最大文件大小（KB）
};
```

## 参数说明

### maxWidth / maxHeight
- **作用**：限制图片的最大尺寸
- **默认值**：2048 × 2048 像素
- **调整建议**：
  - 如果图片用于 LLM 分析，2048 已足够（LLM 通常能处理 2K 分辨率）
  - 如果需要更小的尺寸，可改为 1024 或 1536
  - 如果需要保留更多细节，可改为 4096（但会增加 token 消耗）

### quality
- **作用**：JPEG 压缩质量（仅对 JPEG 格式有效，PNG 不受影响）
- **默认值**：0.75（75%）
- **调整建议**：
  - 0.75 是较好的平衡点（质量与文件大小）
  - 降低到 0.6 可进一步减小文件（但可能影响细节）
  - 提高到 0.85+ 会显著增加文件大小

### maxSizeKB
- **作用**：如果压缩后仍超过此大小，会再次降低质量重试
- **默认值**：500 KB
- **调整建议**：
  - 500 KB 是合理的上限
  - 如果需要更激进的压缩，可改为 300 KB
  - 如果对质量要求高，可改为 800 KB

## 压缩流程

```
用户选择图片
    ↓
[compressImage] 函数处理
    ├─ 检查格式（SVG 不压缩）
    ├─ 加载图片到 canvas
    ├─ 计算缩放尺寸（如果超过 maxWidth/maxHeight）
    ├─ 绘制到 canvas
    ├─ 导出为 JPEG/PNG（根据原始格式）
    ├─ 检查文件大小
    └─ 如果过大，降低质量重试
    ↓
上传压缩后的 Blob 到 COS
    ↓
返回公网 URL 给 LLM
```

## 压缩效果示例

| 原始大小 | 压缩后 | 节省比例 | 说明 |
|---------|--------|---------|------|
| 5 MB | 300-400 KB | 92-94% | 高分辨率照片 |
| 2 MB | 150-200 KB | 85-92% | 中等分辨率 |
| 500 KB | 100-150 KB | 70-80% | 已压缩的图片 |

## 调试

在浏览器控制台可以看到压缩日志：

```
[COS] 图片压缩 {
  original: "2048.5KB",
  compressed: "245.3KB",
  ratio: "88.0%"
}
```

## 特殊情况处理

### 1. 压缩失败
- 如果压缩过程出错，会自动降级使用原始文件
- 控制台会输出警告：`⚠️ 图片压缩失败，使用原始文件`
- 不会中断上传流程

### 2. SVG 格式
- SVG 是矢量格式，不需要压缩
- 代码会自动跳过 SVG 的压缩步骤

### 3. PNG 格式
- PNG 是无损格式，不支持质量参数
- 只会进行尺寸缩放，不会降低质量

## 性能影响

- **压缩耗时**：通常 100-500ms（取决于图片大小和浏览器性能）
- **内存占用**：临时使用 canvas，完成后自动释放
- **用户体验**：压缩在后台进行，不阻塞 UI

## 推荐配置

### 场景 1：平衡方案（推荐）
```typescript
const IMAGE_COMPRESS_CONFIG = {
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 0.75,
  maxSizeKB: 500,
};
```

### 场景 2：激进压缩（最小化 token）
```typescript
const IMAGE_COMPRESS_CONFIG = {
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 0.65,
  maxSizeKB: 300,
};
```

### 场景 3：保留细节（高质量）
```typescript
const IMAGE_COMPRESS_CONFIG = {
  maxWidth: 2560,
  maxHeight: 2560,
  quality: 0.85,
  maxSizeKB: 800,
};
```

## 修改方法

1. 打开 [`src/lib/cosUploader.ts`](src/lib/cosUploader.ts)
2. 找到 `IMAGE_COMPRESS_CONFIG` 对象（第 114-119 行）
3. 修改相应参数
4. 保存文件，重启开发服务器

## 相关代码

- **压缩函数**：[`compressImage`](src/lib/cosUploader.ts:127-198)
- **上传函数**：[`uploadToCos`](src/lib/cosUploader.ts:208-280)
- **调用位置**：[`processImageFile`](src/lib/imageTools.ts:127-188)
