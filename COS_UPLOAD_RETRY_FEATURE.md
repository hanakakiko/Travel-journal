# COS 图片上传失败重试功能

## 功能概述

当用户上传图片到 COS 失败时，错误提示弹窗现在会显示一个"重试上传"按钮，用户可以直接点击重试，而无需重新选择图片。

## 实现细节

### 1. 错误提示组件更新 (`src/lib/ErrorAlert.tsx`)

**新增属性：**
- `onRetry?: () => void` - 重试回调函数（可选）

**UI 变化：**
- 当提供 `onRetry` 回调时，显示"重试上传"按钮（黄色，突出显示）
- 关闭按钮文案根据是否有重试按钮动态变化：
  - 有重试按钮时：显示"关闭"
  - 无重试按钮时：显示"我知道了"

**样式：**
- 重试按钮使用 `error-alert-retry` 类，采用应用主色调（黄色）
- 按钮布局：重试按钮在左，关闭按钮在右

### 2. 主应用逻辑更新 (`src/App.tsx`)

**新增状态：**
```typescript
const [failedPhotosForRetry, setFailedPhotosForRetry] = useState<PhotoAsset[]>([]);
```
用于记录上传失败的图片，以便重试时使用。

**新增函数：`retryFailedPhotos()`**

功能流程：
1. 从失败的图片中提取原始 File 对象（通过 blob 重建）
2. 重新调用 `processImageFile()` 处理这些文件
3. 更新 `photos` 数组，用新的处理结果替换失败的图片
4. 检查是否还有失败的图片：
   - 如果全部成功：清空失败列表，播放成功音效
   - 如果仍有失败：显示新的错误提示，保留重试按钮

**错误处理流程更新：**
- `processFiles()` 中，当检测到上传失败时，将失败的图片保存到 `failedPhotosForRetry`
- 错误提示弹窗传入 `onRetry` 回调：`failedPhotosForRetry.length > 0 ? retryFailedPhotos : undefined`

### 3. 样式更新 (`src/styles.css`)

**新增 CSS 类：**
```css
.error-alert-retry {
  background: var(--accent-main);  /* 黄色 */
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

## 用户体验流程

1. **上传图片** → 如果 COS 上传失败
2. **显示错误弹窗** → 包含失败的图片列表和解决方案
3. **点击"重试上传"** → 自动重新上传失败的图片
4. **重试结果：**
   - ✅ 全部成功 → 关闭弹窗，播放成功音效
   - ⚠️ 仍有失败 → 显示新的错误提示，保留重试按钮

## 技术亮点

1. **无缝重试**：用户无需重新选择文件，直接点击重试
2. **智能状态管理**：通过 `failedPhotosForRetry` 状态精确跟踪失败的图片
3. **渐进式反馈**：重试失败时仍保留重试按钮，允许用户继续尝试
4. **一致的 UI 设计**：重试按钮与应用整体风格保持一致

## 相关文件

- [`src/lib/ErrorAlert.tsx`](src/lib/ErrorAlert.tsx) - 错误提示组件
- [`src/App.tsx`](src/App.tsx) - 主应用逻辑
- [`src/styles.css`](src/styles.css) - 样式定义
- [`src/lib/cosUploader.ts`](src/lib/cosUploader.ts) - COS 上传工具（无需修改）
- [`src/lib/imageTools.ts`](src/lib/imageTools.ts) - 图片处理工具（无需修改）
