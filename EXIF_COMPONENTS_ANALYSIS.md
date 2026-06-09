# EXIF 项目 - 氛围标签与自定义选项组件分析报告

## 📁 项目整体结构

```
/Users/dingjiangying/github/exif/
├── src/
│   ├── App.tsx                          # 主应用程序（3273行）
│   ├── components/                      # 组件目录
│   │   ├── CustomizableChoiceGroup.tsx  # ✨ 可自定义单选按钮组（场景、叙述方式等）
│   │   ├── SingleSelectChipGroup.tsx    # ✨ 单选Chip组件（色调、纸张等）
│   │   ├── SingleSelectWithCustomOptions.tsx  # ✨ 支持自定义的单选Chip
│   │   ├── EditableTagGroup.tsx         # ✨ 可编辑多选标签组（情绪标签等）
│   │   └── [其他组件...]
│   ├── data/
│   │   └── presets.ts                   # 预设数据（氛围、心情、颜色等选项）
│   ├── styles/
│   │   └── notebook-*.css               # 笔记本样式
│   ├── styles.css                       # 全局样式（5501行）
│   └── types.ts                         # 类型定义
├── cloudfunctions/                      # 云函数
└── [配置文件...]
```

---

## 🎯 关键组件详解

### 1. **CustomizableChoiceGroup** - 可自定义单选按钮组
**用途**：场景、叙述方式、风格、模板等顶层单选字段

**文件位置**：`/Users/dingjiangying/github/exif/src/components/CustomizableChoiceGroup.tsx`

#### 核心代码片段（行号）

```tsx
// 第 10-21 行：接口定义
interface CustomizableChoiceGroupProps {
  title: string;
  icon?: React.ReactNode;
  defaultChoices: Array<{ id?: string; name: string; short?: string }>;
  customChoices?: string[];
  selectedValue?: string;
  onSelectValue: (value: string) => void;
  onAddCustomChoice?: (choice: string) => void;
  onRemoveCustomChoice?: (choice: string) => void;
  onSound?: (effect: SoundEffect) => void;
  className?: string;
}

// 第 48-70 行：添加自定义选项的逻辑
const handleAddCustom = () => {
  const trimmed = customInput.trim();
  if (!trimmed || !onAddCustomChoice) return;
  onSound?.("tap");
  onAddCustomChoice(trimmed);
  setCustomInput("");
  setIsAddingCustom(false);
  // 自动选中新添加的选项
  onSelectValue(trimmed);
};

// 第 60-70 行：删除自定义选项的逻辑
const handleRemoveCustom = (choice: string) => {
  if (!onRemoveCustomChoice) return;
  onSound?.("tap");
  onRemoveCustomChoice(choice);
  // 如果删除的是选中项，清除选中
  if (selectedValue === choice) {
    onSelectValue("");
  }
};

// 第 73-112 行：JSX 结构
return (
  <div className={`customizable-choice-group ${className || ""}`}>
    <div className="band-heading">
      {icon && <span className="icon-wrapper">{icon}</span>}
      <span>{title}</span>
    </div>

    <div className="choice-buttons">
      {allChoices.map((choice) => {
        const isSelected = selectedValue === choice.name;
        const isCustom = custom.includes(choice.name);

        return (
          <div key={choice.name} className={`choice-wrapper ${isCustom ? "is-custom" : ""}`}>
            <button
              type="button"
              className={`choice-button ${isSelected ? "is-active" : ""}`}
              onClick={() => {
                onSound?.("tap");
                onSelectValue(isSelected ? "" : choice.name);
              }}
              title={choice.short || choice.name}
            >
              {choice.name}
            </button>

            {isCustom && onRemoveCustomChoice && (
              <button
                type="button"
                className="choice-delete-btn"
                onClick={() => handleRemoveCustom(choice.name)}
                title="删除自定义选项"
              >
                <X size={12} />
              </button>
            )}
          </div>
        );
      })}

      {/* 第 115-169 行：添加自定义选项的输入框 */}
      {onAddCustomChoice && (
        <>
          {isAddingCustom ? (
            <div className="choice-input-wrapper">
              {/* ... 输入框、确认、取消按钮 ... */}
            </div>
          ) : (
            <button className="choice-add-button">
              <Plus size={16} />
            </button>
          )}
        </>
      )}
    </div>
  </div>
);
```

**样式名称**：
- `.customizable-choice-group` - 容器
- `.band-heading` - 标题区域
- `.choice-buttons` - 按钮行
- `.choice-wrapper` - 单个按钮包装器
- `.choice-wrapper.is-custom` - 自定义选项标记
- `.choice-button` - 按钮本身
- `.choice-button.is-active` - 选中状态
- `.choice-delete-btn` - 删除按钮（红色X）
- `.choice-add-button` - 添加按钮（+）
- `.choice-input-wrapper` - 输入框容器
- `.choice-input` - 输入框
- `.choice-input-confirm` / `.choice-input-cancel` - 确认/取消按钮

---

### 2. **EditableTagGroup** - 可编辑多选标签组
**用途**：情绪标签、日常标签等多选标签

**文件位置**：`/Users/dingjiangying/github/exif/src/components/EditableTagGroup.tsx`

#### 核心代码片段（行号）

```tsx
// 第 6-17 行：接口定义
interface EditableTagGroupProps {
  title: string;
  defaultTags: string[];
  customTags?: string[];
  selectedTags?: string[];
  onAddTag: (newTag: string) => void;
  onRemoveTag: (tag: string) => void;
  onToggleTag: (tag: string) => void;
  onSound: (effect: SoundEffect) => void;
  hint?: string;
  isMultiple?: boolean;
}

// 第 37-45 行：添加标签逻辑
const handleAddTag = () => {
  const trimmed = newTagInput.trim();
  if (!trimmed) return;
  onSound("tap");
  onAddTag(trimmed);
  setNewTagInput("");
  setIsAddingTag(false);
};

// 第 47-54 行：删除标签逻辑
const handleRemoveTag = (tag: string) => {
  if (!canRemoveTag(tag, defaultTags, customTags)) {
    return;  // 无法删除时不播放声音
  }
  onSound("tap");
  onRemoveTag(tag);
};

// 第 56-59 行：切换标签选择
const handleToggleTag = (tag: string) => {
  onSound("tap");
  onToggleTag(tag);
};

// 第 68-105 行：JSX 结构
<div className="tag-row">
  {allTags.map((tag) => {
    const isSelected = selected.includes(tag);
    const isCustom = customTags?.includes(tag);
    const canRemove = canRemoveTag(tag, defaultTags, customTags);

    return (
      <div key={tag} className={`tag-chip ${isSelected ? "is-selected" : ""} ${isCustom ? "is-custom" : ""}`}>
        <button
          type="button"
          className="tag-chip-button"
          onClick={() => handleToggleTag(tag)}
          title={isSelected ? "取消选择" : "选择"}
        >
          {tag}
        </button>
        
        {isCustom && (
          <button
            type="button"
            className="tag-chip-delete"
            onClick={() => handleRemoveTag(tag)}
            title="删除自定义标签"
          >
            <X size={14} />
          </button>
        )}
        
        {!isCustom && !canRemove && (
          <span className="tag-chip-lock" title="至少需要保留两个默认标签">
            🔒
          </span>
        )}
      </div>
    );
  })}

  {/* 第 107-158 行：添加新标签的输入框 */}
  {isAddingTag ? (
    <div className="tag-input-wrapper">
      {/* ... 输入框和确认/取消按钮 ... */}
    </div>
  ) : (
    <button className="tag-add-button" onClick={() => {
      onSound("tap");
      setIsAddingTag(true);
    }}>
      <Plus size={16} />
      <span>添加</span>
    </button>
  )}
</div>
```

**样式名称**：
- `.editable-tag-group` - 容器
- `.tag-group-header` / `.tag-group-title` - 标题
- `.tag-row` - 标签行
- `.tag-chip` - 单个标签
- `.tag-chip.is-selected` - 选中状态（黄色背景）
- `.tag-chip.is-custom` - 自定义标签标记（浅黄背景）
- `.tag-chip-button` - 标签文本按钮
- `.tag-chip-delete` - 删除按钮（红色X）
- `.tag-chip-lock` - 锁定状态锁头（🔒）
- `.tag-add-button` - 添加按钮

---

### 3. **SingleSelectChipGroup** - 单选Chip组件
**用途**：色调、底图纸张等单选字段

**文件位置**：`/Users/dingjiangying/github/exif/src/components/SingleSelectChipGroup.tsx`

#### 核心代码片段（行号）

```tsx
// 第 6-16 行：接口定义
interface SingleSelectChipGroupProps {
  title: string;
  hint?: string;
  defaultOptions: Array<{ id?: string; label: string; short?: string }>;
  customOptions?: string[];
  selectedValue?: string;
  onSelectValue: (value: string) => void;
  onAddCustomOption?: (option: string) => void;
  onRemoveCustomOption?: (option: string) => void;
  onSound?: (effect: SoundEffect) => void;
}

// 第 72-108 行：Chip 渲染逻辑
<div className="chip-row">
  {allOptions.map((opt) => {
    const isSelected = selectedValue === opt.label;
    const isCustom = custom.includes(opt.label);
    const canRemove = onRemoveCustomOption && isCustom;

    return (
      <div key={opt.label} className={`chip-wrapper ${isCustom ? "is-custom" : ""}`}>
        <button
          type="button"
          className={`chip chip-with-hint ${isSelected ? "is-on" : ""}`}
          onClick={() => {
            onSound?.("tap");
            onSelectValue(isSelected ? "" : opt.label);
          }}
          title={opt.short || opt.label}
        >
          <b>{opt.label}</b>
          {opt.short && <em>{opt.short}</em>}
        </button>

        {canRemove && (
          <button
            type="button"
            className="chip-delete-btn"
            onClick={() => handleRemoveCustom(opt.label)}
            title="删除自定义选项"
          >
            <X size={12} />
          </button>
        )}
      </div>
    );
  })}

  {/* 第 110-164 行：自定义选项输入框 */}
  {onAddCustomOption && (
    <>
      {isAddingCustom ? (
        <div className="chip-input-wrapper">
          {/* ... 输入框和确认/取消按钮 ... */}
        </div>
      ) : (
        <button className="chip-add-button" onClick={() => {
          onSound?.("tap");
          setIsAddingCustom(true);
        }}>
          +
        </button>
      )}
    </>
  )}
</div>
```

**样式名称**：
- `.chip-row` - Chip 行容器
- `.chip-wrapper` - 单个 Chip 包装器
- `.chip-wrapper.is-custom` - 自定义 Chip 标记
- `.chip` - Chip 按钮基础样式
- `.chip-with-hint` - 带副标题的 Chip（色调、纸张等）
- `.chip-with-hint b` - 主标题（粗体）
- `.chip-with-hint em` - 副标题（细体灰字）
- `.chip.is-on` - Chip 选中状态
- `.chip-delete-btn` - 删除按钮（圆形红色X）
- `.chip-add-button` - 添加按钮（圆形+）
- `.chip-input-wrapper` - 输入框包装器
- `.chip-input` - 输入框
- `.chip-input-confirm` / `.chip-input-cancel` - 确认/取消按钮

---

### 4. **SingleSelectWithCustomOptions** - 支持自定义的单选Chip
**用途**：类似 SingleSelectChipGroup，针对主色调等有特殊渲染需求的字段

**文件位置**：`/Users/dingjiangying/github/exif/src/components/SingleSelectWithCustomOptions.tsx`

#### 核心特性（第 103-126 行）：
- 支持有颜色的选项（主色调等）
- 渲染带颜色圆点的 Chip
- 自动选中新添加的选项
- 完整的删除和自定义流程

---

## 🎨 样式代码详解

### 全局选项样式定义

#### 数据预设文件
**文件位置**：`/Users/dingjiangying/github/exif/src/data/presets.ts`

```ts
// 第 220 行：情绪（多选）
export const moodOptions = ["松弛", "热烈", "怀旧", "奇遇", "安静", "明亮", "浪漫", "像电影"];

// 第 258-273 行：氛围标签（多选）
export const vibeOptions: string[] = [
  "治愈",        // 主要的"今天的氛围"选项
  "松弛",
  "复古",
  "夏日感",
  "冬日感",
  "晨间",
  "深夜",
  "公路片",
  "日系小清新",
  "ins 极简",
  "胶片颗粒",
  "童话感",
  "都市感",
  "野外感",
];

// 第 234-241 行：色调调色板（单选）
export const paletteOptions: Array<{ id: string; label: string; short: string }> = [
  { id: "warm-film", label: "暖色胶片", short: "黄昏 / 木质 / 复古" },
  { id: "cool-clean", label: "冷色清透", short: "海雾 / 冰川 / 极简" },
  { id: "pastel-soft", label: "马卡龙柔色", short: "奶油 / 樱花 / 治愈" },
  // ...
];

// 第 244-255 行：画面主色调（单选，带颜色）
export const mainColorOptions: Array<{ id: string; label: string; color: string }> = [
  { id: "cherry-pink", label: "樱花粉", color: "#FFB6D9" },
  { id: "sky-blue", label: "天空蓝", color: "#87CEEB" },
  { id: "mint-green", label: "薄荷绿", color: "#98FF98" },
  { id: "lavender", label: "薰衣草紫", color: "#E6B3FF" },
  // ...
];

// 第 131-134 行："周末日常"场景中的"今天的氛围"字段
fields: [
  {
    key: "mood",
    label: "今天的氛围",  // ✨ 这就是"今天的氛围"字段
    options: ["慢节奏", "被治愈", "小确幸", "稍微忙", "宅得舒服"],
  },
];
```

### CSS 样式详解

#### 1. **通用 Chip 样式** （lines 3865-3950）

```css
/* 行 3865-3869：Chip 行容器 */
.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
}

/* 行 3871-3905：Chip 基础样式 */
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  border: 1.5px solid rgba(23, 18, 15, 0.22);
  border-radius: 999px;
  background: #fffdf6;
  color: var(--ink);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.14s ease, border-color 0.14s ease, 
              color 0.14s ease, box-shadow 0.14s ease, transform 0.12s ease;
}

.chip:hover {
  border-color: var(--ink);
  background: #fff7d6;  /* 浅黄色 */
}

/* 行 3896-3901：Chip 选中状态（is-on）*/
.chip.is-on {
  background: #ffe27a;  /* ✨ 亮黄色 */
  border-color: var(--ink);
  color: var(--ink);
  box-shadow: 1.5px 2px 0 rgba(38, 29, 26, 0.18);
}

.chip:active {
  transform: translateY(1px);
}
```

#### 2. **带提示的 Chip 样式** （lines 3908-3932）

```css
/* 行 3908-3914：带副标题的 Chip（色调、纸张等） */
.chip-with-hint {
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 7px 12px;
  border-radius: 14px;
}

/* 行 3916-3920：主标题 */
.chip-with-hint b {
  font-size: 12.5px;
  font-weight: 800;
  font-style: normal;
}

/* 行 3922-3928：副标题（灰色小字） */
.chip-with-hint em {
  color: rgba(23, 18, 15, 0.5);
  font-size: 10.5px;
  font-weight: 600;
  font-style: normal;
  letter-spacing: 0.2px;
}

/* 行 3930-3931：选中时副标题颜色加深 */
.chip-with-hint.is-on em {
  color: rgba(23, 18, 15, 0.7);
}
```

#### 3. **自定义选项样式** （lines 5371-5500）

```css
/* 行 5371-5376：Chip 包装器（包含 Chip + 删除按钮） */
.chip-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

/* 行 5395-5418：删除按钮（红色圆形X） */
.chip-delete-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  background: rgba(255, 100, 80, 0.15);  /* 浅红色背景 */
  color: rgb(255, 80, 60);                /* 红色 X */
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
  flex-shrink: 0;
}

.chip-delete-btn:hover {
  background: rgba(255, 100, 80, 0.3);   /* Hover 加深红色 */
  color: rgb(255, 60, 40);
}

.chip-delete-btn:active {
  transform: scale(0.95);
}

/* 行 5421-5446：Chip 添加按钮（圆形+） */
.chip-add-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1.5px solid rgba(23, 18, 15, 0.22);
  border-radius: 999px;
  background: #fffdf6;
  color: var(--ink);
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.14s ease, border-color 0.14s ease;
  flex-shrink: 0;
}

.chip-add-button:hover {
  border-color: var(--ink);
  background: #fff7d6;
}

.chip-add-button:active {
  transform: translateY(1px);
}

/* 行 5449-5474：Chip 输入框包装器 */
.chip-input-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px;
  border: 1.5px solid rgba(23, 18, 15, 0.3);
  border-radius: 6px;
  background: #fffdf6;
}

.chip-input {
  flex: 1;
  min-width: 80px;
  max-width: 150px;
  padding: 4px 6px;
  border: none;
  background: transparent;
  color: var(--ink);
  font-size: 12.5px;
  font-weight: 700;
  outline: none;
}

/* 行 5476-5500：确认/取消按钮 */
.chip-input-confirm,
.chip-input-cancel {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 1px solid transparent;
  background: transparent;
  color: var(--ink);
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.12s ease;
  flex-shrink: 0;
}

.chip-input-confirm:hover {
  background: rgba(0, 150, 100, 0.15);  /* 绿色提示 */
  color: rgb(0, 130, 90);
}

.chip-input-cancel:hover {
  background: rgba(200, 50, 50, 0.15);  /* 红色提示 */
  color: rgb(180, 40, 40);
}
```

#### 4. **多选标签样式** （lines 5035-5206）

```css
/* 行 5068-5092：标签 Chip（tag-chip） */
.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 11px;
  border: 1.5px solid rgba(23, 18, 15, 0.22);
  border-radius: 999px;
  background: #fffdf6;
  transition: background 0.14s ease, border-color 0.14s ease, color 0.14s ease;
}

/* 行 5082-5085：自定义标签样式 */
.tag-chip.is-custom {
  border-color: rgba(23, 18, 15, 0.35);
  background: #fff9e6;  /* 比默认标签略黄 */
}

/* 行 5087-5092：选中状态（is-selected） */
.tag-chip.is-selected {
  background: #ffe27a;  /* ✨ 亮黄色，与 .chip.is-on 相同 */
  border-color: var(--ink);
  color: var(--ink);
  box-shadow: 1.5px 2px 0 rgba(38, 29, 26, 0.18);
}

/* 行 5110-5124：标签删除按钮（与 Chip 删除按钮样式相同） */
.tag-chip-delete {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border: none;
  background: none;
  color: rgba(23, 18, 15, 0.6);
  cursor: pointer;
  transition: color 0.14s ease;
}

.tag-chip-delete:hover {
  color: #d32f2f;
}

/* 行 5178-5200：标签添加按钮（tag-add-button） */
.tag-add-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 11px;
  border: 1.5px dashed rgba(23, 18, 15, 0.22);
  border-radius: 999px;
  background: transparent;
  color: rgba(23, 18, 15, 0.6);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.14s ease, border-color 0.14s ease, color 0.14s ease;
}

.tag-add-button:hover {
  border-color: var(--ink);
  background: #fff9e6;
  color: var(--ink);
}
```

#### 5. **单选按钮组样式** （lines 1948-1979）

```css
/* 行 1948-1966：Choice 按钮（用于 CustomizableChoiceGroup） */
.choice {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 38px;
  max-width: 100%;
  padding: 8px 13px;
  border-radius: 999px;
  background: #fffcf7;
  color: var(--ink);
  font-size: 13px;
  font-weight: 900;
  box-shadow: 3px 4px 0 rgba(38, 29, 26, 0.08);
  transition: transform 0.14s ease, box-shadow 0.14s ease, background 0.14s ease;
}

/* 行 1973-1979：Choice 选中状态（is-active） */
.choice.is-active {
  border-color: var(--ink);
  background: var(--ink);  /* ✨ 黑色背景 */
  color: #fff7eb;          /* 白色文字 */
  box-shadow: 3px 4px 0 rgba(38, 29, 26, 0.16);
}
```

---

## 📊 "今天的氛围"、"情绪"字段映射

### 数据流向

```
presets.ts
  ↓
  ├─ moodOptions: ["松弛", "热烈", "怀旧", "奇遇", "安静", "明亮", "浪漫", "像电影"]
  │   └─ 用于场景"周末日常"中的字段："今天的氛围"
  │
  └─ vibeOptions: ["治愈", "松弛", "复古", ..., "野外感"]
      └─ 用于全局"视觉风味"面板的"氛围标签"（多选）
         
App.tsx
  ├─ state.answers.mood: 当前选中的心情/氛围
  ├─ state.answers.vibes: 当前选中的多个氛围标签
  └─ 通过 CustomizableChoiceGroup、EditableTagGroup 等组件渲染
```

### 组件选择逻辑

| 字段类型 | 选项数量 | 自定义 | 组件 | 样式 |
|---------|--------|------|------|------|
| 场景、叙述方式、风格、模板 | 固定少数 | 可选 | **CustomizableChoiceGroup** | `.choice` / `.choice-button` / `.choice-delete-btn` |
| 色调、纸张 | 固定少数 | 可选 | **SingleSelectChipGroup** | `.chip` / `.chip-with-hint` / `.chip-delete-btn` |
| 主色调 | 固定少数带颜色 | 可选 | **SingleSelectWithCustomOptions** | `.chip` / `.chip-color` / `.chip-delete-btn` |
| 情绪标签（多选） | 可变 | 可选 | **EditableTagGroup** | `.tag-chip` / `.tag-chip-delete` / `.tag-add-button` |
| 场景细节（单选/多选） | 可变 | 可选 | 同上任一 | 同上任一 |

---

## 🎯 选中状态（is-selected / is-on / is-active）

| CSS 类 | 组件 | 背景色 | 边框 | 文字颜色 | 阴影 |
|---------|------|-------|------|---------|------|
| `.chip.is-on` | SingleSelectChipGroup | `#ffe27a`（亮黄） | `var(--ink)` | `var(--ink)` | `1.5px 2px 0 rgba(38, 29, 26, 0.18)` |
| `.tag-chip.is-selected` | EditableTagGroup | `#ffe27a`（亮黄） | `var(--ink)` | `var(--ink)` | `1.5px 2px 0 rgba(38, 29, 26, 0.18)` |
| `.choice.is-active` | CustomizableChoiceGroup | `var(--ink)`（黑） | `var(--ink)` | `#fff7eb`（白） | `3px 4px 0 rgba(38, 29, 26, 0.16)` |
| `.chip-with-hint.is-on em` | SingleSelectChipGroup | 同`.chip.is-on` | 同上 | `rgba(23, 18, 15, 0.7)` | 同上 |

**设计规律**：
- **Chip 组件**（tag、option）：选中时 **黄色背景 #ffe27a**
- **Choice 组件**（按钮组）：选中时 **黑色背景 var(--ink)**

---

## 🗑️ 删除按钮样式详解

### 1. **Chip 删除按钮**（`.chip-delete-btn`）
- 位置：自定义选项右侧
- 形状：16x16px 圆形
- 背景：`rgba(255, 100, 80, 0.15)` - 浅红色
- 图标：红色 X（`<X size={12} />`）
- Hover：背景变深 `rgba(255, 100, 80, 0.3)`
- Active：缩放 `scale(0.95)`

### 2. **标签删除按钮**（`.tag-chip-delete`）
- 位置：自定义标签右侧
- 形状：内联按钮（无背景）
- 默认颜色：`rgba(23, 18, 15, 0.6)` - 灰色
- 图标：灰色 X（`<X size={14} />`）
- Hover：`#d32f2f` - 深红色

### 3. **添加按钮**
- **Chip 添加按钮**（`.chip-add-button`）：28x28px 圆形，显示`+`符号
- **标签添加按钮**（`.tag-add-button`）：矩形，虚线边框，显示`+ 添加`文字

---

## 📝 完整使用示例

### 在 App.tsx 中的使用

```tsx
// 单选：场景（使用 CustomizableChoiceGroup）
<CustomizableChoiceGroup
  title="选择场景"
  defaultChoices={sceneOptions.map(s => ({ name: s.name }))}
  customChoices={answers.customTags?.scenes}
  selectedValue={answers.scene}
  onSelectValue={(v) => setAnswers({ ...answers, scene: v })}
  onAddCustomChoice={(c) => { /* 保存自定义场景 */ }}
  onRemoveCustomChoice={(c) => { /* 删除自定义场景 */ }}
  onSound={playSound}
/>

// 多选：情绪标签（使用 EditableTagGroup）
<EditableTagGroup
  title="选择情绪标签"
  defaultTags={moodOptions}
  customTags={answers.customTags?.moods}
  selectedTags={answers.mood}
  onAddTag={(t) => { /* 添加自定义情绪 */ }}
  onRemoveTag={(t) => { /* 删除自定义情绪 */ }}
  onToggleTag={(t) => { /* 切换情绪选择 */ }}
  onSound={playSound}
/>

// 单选：色调（使用 SingleSelectChipGroup）
<SingleSelectChipGroup
  title="色调"
  defaultOptions={paletteOptions}
  customOptions={answers.customTags?.palettes}
  selectedValue={answers.palette}
  onSelectValue={(v) => setAnswers({ ...answers, palette: v })}
  onAddCustomOption={(o) => { /* 添加自定义色调 */ }}
  onRemoveCustomOption={(o) => { /* 删除自定义色调 */ }}
  onSound={playSound}
/>
```

---

## 🔗 相关文件路径汇总

| 功能 | 文件路径 |
|-----|--------|
| 自定义选项组件 | `/Users/dingjiangying/github/exif/src/components/CustomizableChoiceGroup.tsx` |
| Chip 单选组件 | `/Users/dingjiangying/github/exif/src/components/SingleSelectChipGroup.tsx` |
| Chip 单选含颜色组件 | `/Users/dingjiangying/github/exif/src/components/SingleSelectWithCustomOptions.tsx` |
| 多选标签组件 | `/Users/dingjiangying/github/exif/src/components/EditableTagGroup.tsx` |
| 全局样式 | `/Users/dingjiangying/github/exif/src/styles.css` |
| 数据预设 | `/Users/dingjiangying/github/exif/src/data/presets.ts` |
| 主应用程序 | `/Users/dingjiangying/github/exif/src/App.tsx` |

---

## 📌 关键设计要点总结

1. **颜色体系**：
   - 默认：`#fffdf6`（淡米色）
   - Hover：`#fff7d6`（浅黄）
   - Selected（Chip）：`#ffe27a`（亮黄）
   - Selected（Choice）：`var(--ink)`（黑色）
   - Custom：`#fff9e6`（比默认略黄）
   - Delete：`rgba(255, 100, 80, ...)` （红色系）

2. **交互反馈**：
   - 所有按钮有 0.14s 的过渡动画
   - Active 状态有 3-4px 的投影或位移
   - Hover 有边框或背景色变化

3. **无障碍设计**：
   - 锁定标签用 🔒 emoji 提示
   - 删除按钮用 `<X>` 图标明确
   - 所有按钮都有 `title` 属性说明

4. **响应式**：
   - Chip 使用 flexbox wrap
   - 自定义输入框内联显示

