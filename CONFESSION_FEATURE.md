# 倾诉记录功能说明

## 功能概述

在选完所有选项后，用户可以在"今天的倾诉"步骤中输入今天的感想、心情、发生的事情等内容。这段文字可以：

1. **作为个人记录**：仅保存在本地，不影响画面生成
2. **融入画面生成**：作为风格指导和关键词提取，帮助 AI 更好地理解用户的情绪，生成更贴切的画面
3. **在最终展示页面显示**：用户可以查看和复制这段话

## 使用流程

### 1. 输入倾诉记录

在 `InfoModal` 中，用户会看到"今天的倾诉"部分：

- **输入框**：一个 textarea，用户可以输入任意长度的文字
- **提示文本**：说明这段话的用途和可选性
- **复选框**：用户可以选择是否将这段话融入画面生成

### 2. 选择是否融入画面

用户可以通过复选框选择：
- **勾选**：这段话会被作为风格指导和关键词提取，融入 LLM 的 prompt 中
- **不勾选**：这段话仅作为个人记录，不影响画面生成

### 3. 最终展示

在生成完成后，如果用户输入了倾诉记录，最终展示页面会显示：

- **标题**：💭 今天的倾诉
- **内容**：用户输入的完整文字
- **复制按钮**：用户可以一键复制这段话到剪贴板

## 技术实现

### 数据结构

在 `UserAnswers` 类型中添加了两个新字段：

```typescript
/** 用户的倾诉记录：今天的感想、心情、发生的事情等 */
confessionText?: string;
/** 是否将倾诉记录添加到画面中（作为风格指导和关键词提取） */
includeConfessionInImage?: boolean;
```

### UI 组件

#### 输入界面（InfoModal）

```tsx
<div className="confession-section">
  <div className="confession-header">
    <p className="confession-title">
      <span className="confession-emoji">💭</span>
      今天的倾诉
      <span className="confession-optional">可选</span>
    </p>
    <small className="confession-hint">
      记录今天的感想、心情、发生的事情…
    </small>
  </div>
  <textarea
    className="confession-textarea"
    value={answers.confessionText ?? ""}
    onChange={(event) => onSetAnswers((current) => ({ ...current, confessionText: event.target.value }))}
    placeholder="比如：今天天气很好，和朋友去了海边…"
    rows={5}
  />
  <div className="confession-options">
    <label className="confession-checkbox">
      <input
        type="checkbox"
        checked={answers.includeConfessionInImage ?? false}
        onChange={(event) => onSetAnswers((current) => ({ ...current, includeConfessionInImage: event.target.checked }))}
      />
      <span>将这段话作为风格指导和关键词提取，融入画面生成</span>
    </label>
  </div>
</div>
```

#### 展示界面（GeneratedShowcase）

```tsx
{answers.confessionText && (
  <div className="confession-display">
    <div className="confession-display-header">
      <h4>💭 今天的倾诉</h4>
      <button
        type="button"
        className="confession-copy-btn"
        onClick={copyConfessionToClipboard}
        title="复制到剪贴板"
      >
        {copiedConfession ? "已复制 ✓" : "复制"}
      </button>
    </div>
    <p className="confession-display-text">{answers.confessionText}</p>
  </div>
)}
```

### Prompt 集成

在 `buildKratosPrompt` 函数中，如果用户选择了融入画面生成，倾诉记录会被添加到 prompt 中：

```typescript
const confessionPhrase = answers.includeConfessionInImage && answers.confessionText?.trim()
  ? `用户的倾诉记录（作为情绪和风格指导）：「${answers.confessionText.trim()}」。这段话反映了用户当下的心情和想法，请在生成画面时融入这种情绪氛围和关键词提示，但不要直接引用或写出这段话的内容。`
  : "";
```

### 样式

在 `styles.css` 中添加了完整的样式支持：

- `.confession-section`：输入区域的容器
- `.confession-textarea`：文本输入框
- `.confession-checkbox`：复选框
- `.confession-display`：展示区域
- `.confession-copy-btn`：复制按钮

## 用户体验

### 输入阶段

1. 用户在完成所有其他选项后，看到"今天的倾诉"部分
2. 可以选择输入或跳过（完全可选）
3. 如果输入，可以选择是否融入画面生成

### 生成阶段

- 如果用户选择了融入画面生成，这段话会被作为额外的上下文传给 LLM
- LLM 会根据这段话的情绪和关键词来调整生成的画面风格

### 展示阶段

- 最终页面会显示用户的倾诉记录
- 用户可以一键复制这段话
- 复制成功后会有视觉反馈（按钮显示"已复制 ✓"）

## 注意事项

1. **隐私保护**：倾诉记录仅在本地存储，不会被上传到服务器（除非用户选择融入画面生成）
2. **可选性**：这个功能完全可选，用户可以跳过
3. **长度限制**：没有硬性的长度限制，但建议不超过 500 字以获得最佳效果
4. **复制功能**：支持现代浏览器的 Clipboard API，并有降级方案支持旧浏览器

## 文件修改清单

- `src/types.ts`：添加 `confessionText` 和 `includeConfessionInImage` 字段
- `src/App.tsx`：
  - 初始化 `defaultAnswers`
  - 在 `InfoModal` 中添加输入界面
  - 在 `GeneratedShowcase` 中添加展示和复制功能
- `src/lib/modelClient.ts`：在 `buildKratosPrompt` 中集成倾诉记录
- `src/styles.css`：添加相关样式
