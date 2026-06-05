# 开发原则与记忆

## 🎯 核心原则

### 新增选项必须同步到 Prompt

**每次新增选项（UI 控件）时，都必须同步在 prompt 中加入相应修改。**

这是确保用户选择真正影响最终生成结果的关键原则。不要仅仅把选项加到 UI 中，而是要让这些选择被传递给 LLM，用于指导生成过程。

#### 示例：画面主色调功能

❌ **错误做法**：
- 只在 UI 中添加主色调选择器
- 将主色调存储在 `answers.mainColor`
- 但不在 `buildVisualFlavorPhrase()` 中使用它
- 结果：用户的选择被忽略，不影响生成

✅ **正确做法**：
- 在 UI 中添加主色调选择器
- 将主色调存储在 `answers.mainColor`
- **在 `buildVisualFlavorPhrase()` 中添加逻辑**：
  ```typescript
  if (answers.mainColor) {
    parts.push(`画面的主色调应该以「${answers.mainColor}」为主导，贯穿整个拼贴的色彩搭配`);
  }
  ```
- 结果：用户的选择被传递给 LLM，真正影响生成结果

## 📋 新增选项的完整清单

每次新增选项时，需要完成以下步骤：

### 1. 类型定义
- [ ] 在 `src/types.ts` 的 `UserAnswers` 中添加字段

### 2. 选项数据
- [ ] 在 `src/data/presets.ts` 中定义选项常量（如 `mainColorOptions`）

### 3. UI 组件
- [ ] 在 `src/App.tsx` 中导入选项
- [ ] 在 `defaultAnswers` 中添加默认值
- [ ] 在相应的 UI 组件中添加选择器

### 4. 样式
- [ ] 在 `src/styles.css` 中添加必要的样式

### 5. **Prompt 集成** ⭐ 最重要
- [ ] 在 `src/lib/modelClient.ts` 的 `buildVisualFlavorPhrase()` 或其他 prompt 构建函数中添加逻辑
- [ ] 确保用户的选择被包含在发送给 LLM 的 prompt 中

### 6. 文档
- [ ] 更新相关文档说明新功能

## 🔍 Prompt 构建函数位置

主要的 prompt 构建函数位于 `src/lib/modelClient.ts`：

- `buildVisualFlavorPhrase()` - 视觉风味（色调、氛围、排版、装饰、纸张、**主色调**等）
- `buildSceneDetailPhrase()` - 场景细节
- `buildVisionFactsPhrase()` - 视觉识别结果
- `buildKratosPrompt()` - 完整 prompt 组装

## 💾 记忆要点

> **"主色调仅用于 UI 展示，不会被加入到发送给 LLM 的 prompt"** ❌ 错误
>
> **"每次新增选项都要同步在 prompt 中加入相应修改"** ✅ 正确

这个原则适用于所有新增的选项和功能。
