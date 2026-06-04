# COS 上传失败重试功能 - 快速参考

## 一句话总结
当图片上传 COS 失败时，错误弹窗会显示"重试上传"按钮，用户可以直接点击重试，无需重新选择图片。

## 关键改动

| 文件 | 改动 | 说明 |
|------|------|------|
| `src/lib/ErrorAlert.tsx` | 添加 `onRetry` 属性 | 支持重试回调 |
| `src/App.tsx` | 添加 `failedPhotosForRetry` 状态 | 记录失败的图片 |
| `src/App.tsx` | 添加 `retryFailedPhotos()` 函数 | 实现重试逻辑 |
| `src/styles.css` | 添加 `.error-alert-retry` 样式 | 重试按钮样式 |

## 按钮布局

```
错误提示弹窗
├─ 标题：N 张图片上传失败
├─ 失败列表：
│  ├─ 1. photo1.jpg — 错误原因
│  ├─ 2. photo2.jpg — 错误原因
│  └─ ...
├─ 解决方案：
│  ├─ 1. 手动填入链接
│  ├─ 2. 删除后重新上传
│  └─ 3. 继续生成
└─ 按钮：
   ├─ [重试上传] ← 黄色，左侧
   └─ [关闭] ← 黑色，右侧
```

## 重试流程

```
点击"重试上传"
    ↓
从 blob 重建 File 对象
    ↓
重新调用 processImageFile()
    ├─ 重新压缩图片
    ├─ 重新解析 EXIF
    └─ 重新上传到 COS
    ↓
更新 photos 数组
    ↓
检查是否还有失败
    ├─ 全部成功 → 关闭弹窗 + 成功音效
    └─ 仍有失败 → 显示新错误 + 保留重试按钮
```

## 代码位置

### 状态定义
```typescript
// src/App.tsx, 第 86 行
const [failedPhotosForRetry, setFailedPhotosForRetry] = useState<PhotoAsset[]>([]);
```

### 重试函数
```typescript
// src/App.tsx, 第 189-246 行
const retryFailedPhotos = async () => { ... }
```

### 错误提示调用
```typescript
// src/App.tsx, 第 610-616 行
<ErrorAlert 
  message={error} 
  onClose={() => setIsErrorAlertOpen(false)}
  onRetry={failedPhotosForRetry.length > 0 ? retryFailedPhotos : undefined}
/>
```

### 样式定义
```css
/* src/styles.css, 第 4230-4252 行 */
.error-alert-retry { ... }
.error-alert-retry:hover { ... }
.error-alert-retry:active { ... }
```

## 常见场景

### 场景 1：单张图片失败
```
上传 photo.jpg → 失败
显示错误弹窗 + 重试按钮
点击重试 → 重新上传 photo.jpg
成功 → 关闭弹窗
```

### 场景 2：多张图片部分失败
```
上传 [photo1.jpg, photo2.jpg, photo3.jpg]
photo1.jpg ✓ 成功
photo2.jpg ✗ 失败
photo3.jpg ✓ 成功

显示错误弹窗（只列出 photo2.jpg）+ 重试按钮
点击重试 → 只重新上传 photo2.jpg
成功 → 关闭弹窗
```

### 场景 3：重试仍然失败
```
上传 photo.jpg → 失败
显示错误弹窗 + 重试按钮
点击重试 → 仍然失败
显示新的错误弹窗 + 保留重试按钮
用户可以继续重试或关闭弹窗
```

## 调试技巧

### 查看日志
```javascript
// 浏览器控制台
[COS] PUT → https://...
[COS] × upload failed photo.jpg Error: ...
```

### 模拟失败
1. 修改 `.env` 中的 `VITE_COS_PUT_BASE` 为错误的地址
2. 或使用浏览器开发者工具的网络限流功能

### 检查状态
```javascript
// 在 React DevTools 中查看
failedPhotosForRetry: PhotoAsset[]
```

## 性能考虑

- 重试时会重新压缩图片，可能需要几秒钟
- 大量图片重试时，建议分批处理
- 网络不稳定时，可能需要多次重试

## 相关文件

- 完整说明：[`COS_UPLOAD_RETRY_FEATURE.md`](COS_UPLOAD_RETRY_FEATURE.md)
- 测试指南：[`RETRY_FEATURE_TEST_GUIDE.md`](RETRY_FEATURE_TEST_GUIDE.md)
- 实现总结：[`IMPLEMENTATION_SUMMARY.md`](IMPLEMENTATION_SUMMARY.md)

## 快速检查清单

- [ ] 错误弹窗显示重试按钮
- [ ] 重试按钮是黄色的
- [ ] 点击重试后，失败的图片重新上传
- [ ] 重试成功后，弹窗关闭
- [ ] 重试失败后，仍然显示重试按钮
- [ ] 只重试失败的图片，不重复上传成功的图片
