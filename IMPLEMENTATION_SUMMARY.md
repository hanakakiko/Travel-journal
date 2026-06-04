# COS 图片上传失败重试功能 - 实现总结

## 需求
第一步图片上传 COS 失败的弹窗，直接放一个重试按钮，把这些失败的再传一遍。

## 实现方案

### 核心思路
1. **记录失败图片**：当上传失败时，将失败的图片保存到状态中
2. **显示重试按钮**：在错误提示弹窗中显示重试按钮
3. **重新处理失败图片**：点击重试时，重新调用图片处理流程
4. **更新图片列表**：用新的处理结果替换失败的图片

### 修改的文件

#### 1. `src/lib/ErrorAlert.tsx`
**变更：**
- 添加 `onRetry?: () => void` 属性到 `ErrorAlertProps` 类型
- 在 footer 中条件渲染重试按钮
- 关闭按钮文案根据是否有重试按钮动态变化

**代码片段：**
```typescript
export type ErrorAlertProps = {
  message: string;
  onClose: () => void;
  autoCloseDuration?: number;
  onRetry?: () => void;  // 新增
};

// 在 footer 中
<div className="error-alert-footer">
  {onRetry && (
    <button className="error-alert-action error-alert-retry" onClick={onRetry}>
      重试上传
    </button>
  )}
  <button className="error-alert-action" onClick={handleClose}>
    {onRetry ? "关闭" : "我知道了"}
  </button>
</div>
```

#### 2. `src/App.tsx`
**变更：**
- 添加 `failedPhotosForRetry` 状态来记录失败的图片
- 在 `processFiles()` 中，当检测到上传失败时，保存失败的图片
- 添加 `retryFailedPhotos()` 函数实现重试逻辑
- 在错误提示弹窗中传入 `onRetry` 回调

**新增状态：**
```typescript
const [failedPhotosForRetry, setFailedPhotosForRetry] = useState<PhotoAsset[]>([]);
```

**新增函数：`retryFailedPhotos()`**
```typescript
const retryFailedPhotos = async () => {
  if (!failedPhotosForRetry.length) return;
  setError("");
  setIsErrorAlertOpen(false);
  setIsProcessing(true);
  try {
    // 1. 从失败的图片中提取原始 File 对象（通过 blob 重建）
    const retryFiles = await Promise.all(
      failedPhotosForRetry.map(async (photo) => {
        const response = await fetch(photo.url);
        const blob = await response.blob();
        return new File([blob], photo.fileName, { type: blob.type });
      })
    );

    // 2. 重新处理这些文件
    const reprocessed = await Promise.all(retryFiles.map(processImageFile));

    // 3. 更新 photos 数组：用新的处理结果替换对应的失败图片
    setPhotos((current) => {
      const next = [...current];
      reprocessed.forEach((newPhoto) => {
        const index = next.findIndex((p) => p.fileName === newPhoto.fileName);
        if (index >= 0) {
          next[index] = newPhoto;
        }
      });
      return next;
    });

    // 4. 检查是否还有失败的
    const stillFailed = reprocessed.filter((photo) => !photo.remoteUrl);
    if (stillFailed.length > 0) {
      // 仍有失败，显示新的错误提示，保留重试按钮
      setError(...);
      setFailedPhotosForRetry(stillFailed);
      setIsErrorAlertOpen(true);
    } else {
      // 全部成功
      setFailedPhotosForRetry([]);
      play("success");
    }
  } catch (reason) {
    setError(reason instanceof Error ? reason.message : "重试失败");
    setIsErrorAlertOpen(true);
  } finally {
    setIsProcessing(false);
  }
};
```

**错误提示弹窗调用：**
```typescript
<ErrorAlert 
  message={error} 
  onClose={() => setIsErrorAlertOpen(false)}
  onRetry={failedPhotosForRetry.length > 0 ? retryFailedPhotos : undefined}
/>
```

#### 3. `src/styles.css`
**变更：**
- 添加 `.error-alert-retry` 类定义重试按钮样式
- 使用应用主色调（黄色）作为背景色
- 添加悬停和点击状态的样式

**新增样式：**
```css
.error-alert-retry {
  background: var(--accent-main);
  color: var(--ink);
  border-color: var(--ink);
}

.error-alert-retry:hover {
  background: #ffc700;
  transform: translateY(-2px);
  box-shadow: 6px 7px 0 rgba(23, 18, 15, 0.12);
}

.error-alert-retry:active {
  transform: translateY(0);
  box-shadow: 2px 3px 0 rgba(23, 18, 15, 0.1);
}
```

## 功能流程

```
用户上传图片
    ↓
processFiles() 处理图片
    ↓
检测到上传失败
    ↓
保存失败图片到 failedPhotosForRetry
    ↓
显示错误提示弹窗（包含重试按钮）
    ↓
用户点击"重试上传"
    ↓
retryFailedPhotos() 执行
    ├─ 从 blob 重建 File 对象
    ├─ 重新调用 processImageFile()
    ├─ 更新 photos 数组
    └─ 检查是否还有失败
        ├─ 全部成功 → 关闭弹窗，播放成功音效
        └─ 仍有失败 → 显示新的错误提示，保留重试按钮
```

## 用户体验

### 成功场景
1. 用户上传图片
2. 如果 COS 上传失败，显示错误弹窗
3. 用户点击"重试上传"
4. 图片重新上传成功
5. 弹窗关闭，播放成功音效

### 失败场景
1. 用户上传图片
2. COS 上传失败，显示错误弹窗
3. 用户点击"重试上传"
4. 重试仍然失败
5. 显示新的错误提示，保留重试按钮
6. 用户可以继续重试或关闭弹窗，手动填入图片链接

## 技术亮点

1. **无缝重试**：用户无需重新选择文件，直接点击重试
2. **智能状态管理**：通过 `failedPhotosForRetry` 精确跟踪失败的图片
3. **渐进式反馈**：重试失败时仍保留重试按钮，允许用户继续尝试
4. **一致的 UI 设计**：重试按钮与应用整体风格保持一致
5. **完整的错误处理**：支持网络错误、CORS 错误、超时等各种失败场景

## 测试建议

1. **正常上传**：验证无错误时的正常流程
2. **单张图片失败**：验证单张图片失败时的重试流程
3. **多张图片部分失败**：验证部分失败时只重试失败的图片
4. **重试失败**：验证重试仍然失败时的处理
5. **网络恢复**：验证网络恢复后重试成功的场景

## 相关文档

- [`COS_UPLOAD_RETRY_FEATURE.md`](COS_UPLOAD_RETRY_FEATURE.md) - 功能详细说明
- [`RETRY_FEATURE_TEST_GUIDE.md`](RETRY_FEATURE_TEST_GUIDE.md) - 测试指南
