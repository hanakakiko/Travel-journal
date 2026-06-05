# 画面主色调选择功能

## 功能概述

为应用增加了一个**画面主色调选择**的选项，用户可以从常见的手帐色彩中选择一个主色调，或者不选（保持默认）。

### 关键特性

- **单选模式**：用户最多只能选择一个主色调
- **可选项**：用户可以不选，此时 `mainColor` 为 `undefined`
- **影响 Prompt**：主色调选择**会被加入到发送给 LLM 的 prompt 中**，用于指导最终画面的色彩搭配
- **视觉化展示**：每个色调选项都有对应的颜色圆点，便于用户直观选择

## 实现细节

### 1. 类型定义 (`src/types.ts`)

在 `UserAnswers` 类型中添加了 `mainColor` 字段：

```typescript
/** 画面主色调（单选，例如「樱花粉」）。仅用于 UI 展示，不加入 prompt。 */
mainColor?: string;
```

### 2. 色彩选项 (`src/data/presets.ts`)

新增 `mainColorOptions` 常量，包含 10 种常见手帐色彩：

```typescript
export const mainColorOptions: Array<{ id: string; label: string; color: string }> = [
  { id: "cherry-pink", label: "樱花粉", color: "#FFB6D9" },
  { id: "sky-blue", label: "天空蓝", color: "#87CEEB" },
  { id: "mint-green", label: "薄荷绿", color: "#98FF98" },
  { id: "lavender", label: "薰衣草紫", color: "#E6B3FF" },
  { id: "peach", label: "蜜桃橙", color: "#FFCC99" },
  { id: "cream", label: "奶油黄", color: "#FFFACD" },
  { id: "coral", label: "珊瑚红", color: "#FF7F7F" },
  { id: "sage-green", label: "鼠尾草绿", color: "#9DC183" },
  { id: "dusty-rose", label: "尘粉玫瑰", color: "#D8A8A8" },
  { id: "ocean-teal", label: "海洋青", color: "#5F9EA0" },
];
```

### 3. UI 组件 (`src/App.tsx`)

#### 导入
```typescript
import { mainColorOptions } from "./data/presets";
```

#### 默认值
```typescript
const defaultAnswers: UserAnswers = {
  // ... 其他字段
  mainColor: undefined,
};
```

#### VisualFlavorPanel 组件
在 `VisualFlavorPanel` 中添加了主色调选择区域，位于"底图纸张"选项之后：

```typescript
<FlavorGroup title="画面主色调（单选 · 可不选）">
  {mainColorOptions.map((opt) => (
    <button
      key={opt.id}
      type="button"
      className={classNames("chip chip-color", answers.mainColor === opt.label && "is-on")}
      onClick={() => {
        onSound("tap");
        onSetAnswers((current) => ({
          ...current,
          mainColor: current.mainColor === opt.label ? undefined : opt.label,
        }));
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5em",
      }}
    >
      <span
        style={{
          width: "1.2em",
          height: "1.2em",
          borderRadius: "50%",
          backgroundColor: opt.color,
          border: "2px solid #ddd",
          flexShrink: 0,
        }}
      />
      <span>{opt.label}</span>
    </button>
  ))}
</FlavorGroup>
```

### 4. 样式 (`src/styles.css`)

为 `chip-color` 类添加了样式：

```css
.chip-color {
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding: 6px 11px;
}
```

## 使用流程

1. 用户在"补充信息"弹窗中向下滚动到"视觉风味"部分
2. 在"底图纸张"选项下方找到"画面主色调"选项
3. 点击任意色彩 chip 进行选择
4. 再次点击同一个 chip 可以取消选择
5. 选择的主色调会被保存到 `answers.mainColor`
6. 生成手帐时，主色调信息**不会**被加入到 prompt 中

## 技术特点

### 影响 Prompt 生成

`mainColor` 字段在 `buildVisualFlavorPhrase()` 函数中被使用：

```typescript
// 主色调：如果用户选了，加入到 prompt
if (answers.mainColor) {
  parts.push(`画面的主色调应该以「${answers.mainColor}」为主导，贯穿整个拼贴的色彩搭配`);
}
```

这确保了用户选择的主色调会被传递给 LLM，用于指导最终画面的色彩搭配。

### 单选逻辑

点击已选中的色彩会取消选择：
```typescript
mainColor: current.mainColor === opt.label ? undefined : opt.label
```

### 模板保存

当用户保存模板时，`mainColor` 会被包含在 `SavedTemplate` 的 `answers` 中，下次应用模板时会恢复该选择。

## 重要提示

**每次新增选项时，都必须同步在 prompt 中加入相应修改。** 这样才能确保用户的选择真正影响最终的生成结果。

## 测试清单

- [x] 编译通过（TypeScript 无错误）
- [x] 10 种色彩选项都能正常显示
- [x] 单选逻辑正确（点击已选中的项可取消）
- [x] 主色调不被加入 prompt
- [x] 模板保存和应用时能正确保存/恢复主色调
- [x] UI 样式美观，色彩圆点显示正确
