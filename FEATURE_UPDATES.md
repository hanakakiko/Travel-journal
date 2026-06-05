# 手帐生成功能更新

## 概述
本次更新实现了三个重要功能改进，提升了用户体验和生成结果的多样性。

---

## 1. 未选择项随机化处理

### 功能说明
对于用户没有主动选择的单选或多选项，系统不再使用固定的默认值，而是**随机选择**一个可选项，增加生成结果的多样性。

### 实现细节

#### 1.1 核心随机函数
在 [`modelClient.ts`](src/lib/modelClient.ts) 中添加了通用的随机选择函数：
```typescript
const randomPick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
```

#### 1.2 随机化的字段

**情绪关键词（mood）**
- 如果用户未选择，从 `moodOptions` 中随机选一个
- 位置：[`buildKratosPrompt`](src/lib/modelClient.ts:529)

**叙述方式（narrator）**
- 如果用户未选择，从 `narratorOptions` 中随机选一个
- 位置：[`buildKratosPrompt`](src/lib/modelClient.ts:532)

**视觉风味选项**
- **色调（palette）**：未选择时随机选一个
- **氛围标签（vibes）**：未选择时随机选 1-2 个
- **排版形状（layoutShapes）**：未选择时随机选 1-2 个
- **装饰元素（decorations）**：未选择时随机选 1-2 个
- **纸张纹理（paperTexture）**：未选择时随机选一个
- 位置：[`buildVisualFlavorPhrase`](src/lib/modelClient.ts:389-468)

**边缘风格（edgeStyles）**
- 如果用户未选择任何边缘风格，随机选一个
- 根据选中的边缘风格是否有固定形状，生成相应的 prompt 指导
- 位置：[`buildPipelinePhrase`](src/lib/modelClient.ts:481-511)

---

## 2. 保存选项功能

### 功能说明
用户在生成手帐后，如果对本次的选项配置满意，可以**保存为模板**，下次可以快速应用相同的配置。

### 实现细节

#### 2.1 UI 更新
在 [`App.tsx`](src/App.tsx) 的 `GeneratedShowcase` 组件中：
- 添加了"保存选项"按钮（原"保存模板"按钮）
- 按钮文案更新为"保存选项"，更清晰地表达功能意图
- 提示文案：`保存当前配置为模板，下次可快速应用`

#### 2.2 保存流程
1. 用户点击"保存选项"按钮
2. 弹出输入框，要求输入模板名称
3. 点击确认后，当前的 `answers`、`styleId`、`templateId` 被保存到本地存储
4. 下次打开应用时，可以在模板选择界面快速应用该配置

#### 2.3 相关代码
- 保存逻辑：[`templateManager.ts`](src/lib/templateManager.ts) 中的 `saveTemplate` 函数
- 应用逻辑：[`App.tsx`](src/App.tsx) 中的 `handleApplyTemplate` 函数
- 模板选择界面：[`App.tsx`](src/App.tsx:892-979) 中的 `InfoModal` 组件

---

## 3. 文字框空白处理

### 功能说明
如果用户没有填写标题等文字框，系统不会在 prompt 中包含对应的块，让模型生成**无标题的手帐**。

### 实现细节

#### 3.1 标题处理
在 [`buildKratosPrompt`](src/lib/modelClient.ts:513-584) 中：

```typescript
// 处理标题：如果用户没填，则不包含标题块
const userTitle = answers.titleSeed.trim();
const title = userTitle || `${answers.scene}手帐`;
const hasUserTitle = Boolean(userTitle);
```

#### 3.2 Prompt 块的条件包含
- **任务描述**：根据 `hasUserTitle` 决定是否包含标题
  - 有标题：`任务：基于 N 张参考图片，创作一张「${title}」主题的手帐拼贴。`
  - 无标题：`任务：基于 N 张参考图片，创作一张手帐拼贴。`

- **事实清单**：标题文案块只在用户填写时包含
  ```typescript
  hasUserTitle ? `标题文案：${title}` : null,
  ```

- **标题约束**：标题必须且仅使用块只在用户填写时包含
  ```typescript
  hasUserTitle ? `标题必须且仅使用：「${title}」。` : null,
  ```

#### 3.3 效果
- 用户不填标题时，模型会根据场景和其他信息自由生成手帐
- 避免了强制使用默认标题（如"一次旅程手帐"）的限制
- 生成结果更加灵活多样

---

## 修改文件清单

### 核心修改
1. **[`src/lib/modelClient.ts`](src/lib/modelClient.ts)**
   - 添加 `randomPick` 函数
   - 修改 `buildKratosPrompt` 函数
   - 修改 `buildVisualFlavorPhrase` 函数
   - 修改 `buildPipelinePhrase` 函数
   - 导入所有必要的选项数据

2. **[`src/App.tsx`](src/App.tsx)**
   - 修改 `GeneratedShowcase` 组件的按钮文案和提示
   - 调整按钮容器的 flex 布局以支持换行

### 无需修改
- [`src/lib/templateManager.ts`](src/lib/templateManager.ts) - 已有完整的模板保存/加载功能
- [`src/types.ts`](src/types.ts) - 数据结构无需改动
- [`src/data/presets.ts`](src/data/presets.ts) - 选项数据无需改动

---

## 测试建议

### 1. 随机化测试
- [ ] 不选择情绪，多次生成，验证每次选择的情绪不同
- [ ] 不选择叙述方式，多次生成，验证每次选择的方式不同
- [ ] 不选择视觉风味选项，验证随机选择的多样性

### 2. 保存选项测试
- [ ] 生成手帐后，点击"保存选项"按钮
- [ ] 输入模板名称并保存
- [ ] 刷新页面，验证模板出现在模板选择界面
- [ ] 点击模板，验证所有配置被正确应用

### 3. 文字框处理测试
- [ ] 填写标题，生成手帐，验证 prompt 中包含标题相关块
- [ ] 不填写标题，生成手帐，验证 prompt 中不包含标题相关块
- [ ] 查看 prompt 预览，确认块的包含/排除符合预期

---

## 用户指南

### 如何使用随机化功能
1. 在补充信息面板中，**不选择**某些选项（如情绪、叙述方式等）
2. 点击"装订手帐本"或"重新装订"
3. 系统会自动为未选择的项随机选择一个，增加生成结果的多样性
4. 如果对结果满意，可以保存这个配置供下次使用

### 如何保存和应用模板
1. 生成满意的手帐后，点击"保存选项"按钮
2. 输入模板名称（如"旅行风格 v1"）
3. 下次打开应用时，会自动显示模板选择界面
4. 点击已保存的模板，所有配置会被快速应用
5. 可以在此基础上进行微调后再生成

### 如何生成无标题手帐
1. 在补充信息面板中，**不填写**"手帐标题"
2. 其他选项正常填写
3. 点击"装订手帐本"
4. 模型会根据场景和其他信息自由生成手帐，不受标题约束

---

## 技术亮点

1. **类型安全**：使用 TypeScript 泛型确保 `randomPick` 函数的类型安全
2. **条件渲染**：通过 `hasUserTitle` 标志位实现 prompt 块的条件包含
3. **向后兼容**：所有修改都是增强性的，不破坏现有功能
4. **用户友好**：随机化增加多样性，保存功能提升效率

---

## 后续优化建议

1. **随机种子**：可以添加用户可控的随机种子，便于复现结果
2. **预设组合**：可以预设一些常用的选项组合（如"旅行风格"、"日常风格"等）
3. **选项权重**：可以根据用户历史选择，调整随机选择的权重
4. **模板分享**：可以实现模板的导出/导入功能，便于用户分享

