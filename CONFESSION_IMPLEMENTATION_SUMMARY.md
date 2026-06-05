# 倾诉记录功能 - 实现总结

## 功能需求

在选完所有选项后，添加一个新步骤让用户输入今天的感想、心情、发生的事情等倾诉记录。这段文字可以：

1. **可选输入**：用户可以选择不填
2. **两种用途**：
   - 仅作为个人记录（不影响画面生成）
   - 融入画面生成（作为风格指导和关键词提取）
3. **最终展示**：在展示页面显示这段话，并支持复制

## 实现方案

### 1. 数据结构扩展

**文件**: `src/types.ts`

在 `UserAnswers` 类型中添加两个新字段：

```typescript
/** 用户的倾诉记录：今天的感想、心情、发生的事情等 */
confessionText?: string;
/** 是否将倾诉记录添加到画面中（作为风格指导和关键词提取） */
includeConfessionInImage?: boolean;
```

### 2. 状态初始化

**文件**: `src/App.tsx`

在 `defaultAnswers` 中初始化新字段：

```typescript
const defaultAnswers: UserAnswers = {
  // ... 其他字段
  confessionText: "",
  includeConfessionInImage: false,
};
```

### 3. 输入界面

**文件**: `src/App.tsx` - `InfoModal` 组件

在"叙述方式"之后添加"今天的倾诉"部分：

```tsx
<div className="confession-section">
  <div className="confession-header">
    <p className="confession-title">
      <span className="confession-emoji">💭</span>
      今天的倾诉
      <span className="confession-optional">可选</span>
    </p>
    <small className="confession-hint">
      记录今天的感想、心情、发生的事情…这段话可以帮助 AI 更好地理解你的情绪，
      也可以只作为个人记录。
    </small>
  </div>
  <textarea
    className="confession-textarea"
    value={answers.confessionText ?? ""}
    onChange={(event) => onSetAnswers((current) => ({ ...current, confessionText: event.target.value }))}
    placeholder="比如：今天天气很好，和朋友去了海边，虽然有点累但很开心。希望能把这份美好记录下来…"
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

### 4. 展示界面

**文件**: `src/App.tsx` - `GeneratedShowcase` 组件

#### 4.1 组件签名更新

添加 `answers` 参数和复制状态：

```typescript
function GeneratedShowcase({
  draft,
  answers,  // 新增
  onDownload,
  onSaveTemplate,
  onSound,
}: {
  draft: JournalDraft;
  answers: UserAnswers;  // 新增
  onDownload: () => void;
  onSaveTemplate?: (name: string, coverImageUrl?: string) => void;
  onSound?: (effect: SoundEffect) => void;
}) {
  const [copiedConfession, setCopiedConfession] = useState(false);  // 新增
  // ...
}
```

#### 4.2 复制功能实现

```typescript
const copyConfessionToClipboard = async () => {
  if (!answers.confessionText) return;
  try {
    await navigator.clipboard.writeText(answers.confessionText);
    setCopiedConfession(true);
    onSound?.("success");
    setTimeout(() => setCopiedConfession(false), 2000);
  } catch {
    // 降级方案：使用 execCommand
    const textarea = document.createElement("textarea");
    textarea.value = answers.confessionText;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    setCopiedConfession(true);
    onSound?.("success");
    setTimeout(() => setCopiedConfession(false), 2000);
  }
};
```

#### 4.3 展示 JSX

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

#### 4.4 组件调用更新

在 `App` 组件中传入 `answers`：

```tsx
<GeneratedShowcase
  draft={draft}
  answers={answers}  // 新增
  onDownload={downloadGeneratedImage}
  onSaveTemplate={handleSaveTemplate}
  onSound={play}
/>
```

### 5. Prompt 集成

**文件**: `src/lib/modelClient.ts` - `buildKratosPrompt` 函数

添加倾诉记录处理逻辑：

```typescript
// 处理倾诉记录：如果用户选择了融入画面生成
const confessionPhrase = answers.includeConfessionInImage && answers.confessionText?.trim()
  ? `用户的倾诉记录（作为情绪和风格指导）：「${answers.confessionText.trim()}」。这段话反映了用户当下的心情和想法，请在生成画面时融入这种情绪氛围和关键词提示，但不要直接引用或写出这段话的内容。`
  : "";
```

在 prompt 数组中添加倾诉记录短语：

```typescript
return [
  // ... 其他 prompt 部分
  confessionPhrase,  // 新增
  visionPhrase,
  // ... 其他部分
].filter(Boolean).join(" ");
```

### 6. 样式设计

**文件**: `src/styles.css`

添加完整的样式支持（约 150 行）：

#### 6.1 输入区域样式

```css
.confession-section {
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: 16px;
  background: #fffaf0;
  box-shadow: 4px 5px 0 rgba(38, 29, 26, 0.08);
}

.confession-textarea {
  width: 100%;
  min-height: 120px;
  padding: 12px;
  border: 1.5px solid var(--line);
  border-radius: 12px;
  background: #fffdf7;
  color: var(--ink);
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  line-height: 1.6;
  resize: vertical;
  transition: border-color 0.14s ease, box-shadow 0.14s ease;
}

.confession-textarea:focus {
  outline: none;
  border-color: var(--ink);
  box-shadow: 0 0 0 3px rgba(23, 18, 15, 0.08);
}
```

#### 6.2 展示区域样式

```css
.confession-display {
  margin-top: 24px;
  padding: 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, #fffaf0 0%, #fffdf7 100%);
  border: 1.5px solid rgba(255, 207, 56, 0.3);
  box-shadow: 0 4px 12px rgba(38, 29, 26, 0.08);
}

.confession-copy-btn {
  padding: 6px 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fffcf7;
  color: var(--ink);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.14s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.confession-copy-btn:hover {
  background: var(--ink);
  color: #fffcf7;
  box-shadow: 2px 3px 0 rgba(38, 29, 26, 0.12);
}
```

## 文件修改清单

| 文件 | 修改内容 | 行数 |
|------|---------|------|
| `src/types.ts` | 添加 `confessionText` 和 `includeConfessionInImage` 字段 | +2 |
| `src/App.tsx` | 初始化 defaultAnswers、添加输入界面、展示界面、复制功能 | +150 |
| `src/lib/modelClient.ts` | 在 buildKratosPrompt 中集成倾诉记录 | +10 |
| `src/styles.css` | 添加倾诉记录相关样式 | +150 |

## 功能特性

✅ **完全可选** - 用户可以跳过不填
✅ **灵活使用** - 可作为个人记录或生成指导
✅ **隐私保护** - 仅在本地存储，除非选择融入生成
✅ **易于分享** - 一键复制到剪贴板
✅ **情绪感知** - AI 可根据情绪调整画面风格
✅ **跨浏览器** - 支持现代浏览器和旧浏览器
✅ **视觉反馈** - 复制成功后显示"已复制 ✓"

## 测试清单

- [ ] 输入倾诉记录，不勾选融入生成 → 仅显示在最终页面
- [ ] 输入倾诉记录，勾选融入生成 → 影响 prompt 和生成结果
- [ ] 不输入倾诉记录 → 最终页面不显示倾诉部分
- [ ] 复制倾诉记录 → 成功复制到剪贴板
- [ ] 长文本输入 → 正确显示和复制
- [ ] 特殊字符输入 → 正确处理
- [ ] 响应式设计 → 在不同屏幕尺寸下正常显示

## 构建验证

✅ TypeScript 编译通过
✅ Vite 构建成功
✅ 无 ESLint 错误
✅ 无运行时错误

## 相关文档

- [CONFESSION_FEATURE.md](./CONFESSION_FEATURE.md) - 详细功能说明
- [CONFESSION_QUICK_START.md](./CONFESSION_QUICK_START.md) - 快速开始指南
