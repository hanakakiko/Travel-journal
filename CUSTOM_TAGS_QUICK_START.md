# 自定义标签功能快速开始指南

## 5 分钟快速了解

### 什么是自定义标签？
自定义标签允许用户为表单选项添加自己的标签。例如，在"排版形状"中，用户可以添加"圆角方形"这样的自定义标签。

### 支持的选项
- 情绪（mood）
- 氛围（vibes）
- 排版形状（layoutShapes）
- 照片边缘风格（edgeStyles）
- 装饰元素（decorations）

### 核心特性
1. **添加**：用户可以添加新标签
2. **删除**：用户可以删除自己添加的标签
3. **选择**：用户可以选择/取消选择标签
4. **持久化**：标签被保存到 localStorage
5. **保护**：默认标签至少保留 2 个

## 代码修改概览

### 修改的文件
只修改了 `src/App.tsx` 一个文件。

### 修改的内容

#### 1. 添加辅助函数（第 312-335 行）
```typescript
const getDefaultTagsForField = (fieldKey: string): string[] => {
  switch (fieldKey) {
    case "vibes":
      return vibeOptions;
    case "layoutShapes":
      return layoutShapeOptions.map((opt) => opt.label);
    case "edgeStyles":
      return edgeStyleOptions.map((opt) => opt.label);
    case "decorations":
      return decorationOptions.map((opt) => opt.label);
    default:
      return [];
  }
};
```

#### 2. 在 VisualFlavorPanel 中添加 EditableTagGroup（第 1702-1733 行）
```typescript
// 排版形状
<EditableTagGroup
  title="排版形状（多选 · 仅控制照片轮廓）"
  defaultTags={layoutShapeLabels}
  customTags={answers.customTags?.layoutShapes}
  selectedTags={answers.layoutShapes}
  onAddTag={(newTag) => onAddCustomTag("layoutShapes", newTag)}
  onRemoveTag={(tag) => onRemoveCustomTag("layoutShapes", tag, layoutShapeLabels)}
  onToggleTag={(tag) => onToggleAnswerList("layoutShapes", tag)}
  onSound={onSound}
/>

// 照片边缘风格
<EditableTagGroup
  title="照片边缘风格（多选 · 与形状正交；带 🔒 的边缘自带固定形状会覆盖上方选择）"
  defaultTags={edgeStyleLabels}
  customTags={answers.customTags?.edgeStyles}
  selectedTags={answers.edgeStyles}
  onAddTag={(newTag) => onAddCustomTag("edgeStyles", newTag)}
  onRemoveTag={(tag) => onRemoveCustomTag("edgeStyles", tag, edgeStyleLabels)}
  onToggleTag={(tag) => onToggleAnswerList("edgeStyles", tag)}
  onSound={onSound}
/>

// 装饰元素
<EditableTagGroup
  title="装饰元素（多选）"
  defaultTags={decorationLabels}
  customTags={answers.customTags?.decorations}
  selectedTags={answers.decorations}
  onAddTag={(newTag) => onAddCustomTag("decorations", newTag)}
  onRemoveTag={(tag) => onRemoveCustomTag("decorations", tag, decorationLabels)}
  onToggleTag={(tag) => onToggleAnswerList("decorations", tag)}
  onSound={onSound}
/>
```

## 工作原理

### 数据流
```
用户输入 → EditableTagGroup → App.handleAddCustomTag() 
→ tagManager.addTag() → saveCustomTags() → localStorage
```

### 关键函数

#### handleAddCustomTag()
添加新标签到 `customTags` 并保存到 localStorage。

#### handleRemoveCustomTag()
从 `customTags` 中删除标签，并从 `selectedTags` 中移除（如果已选中）。

#### toggleAnswerList()
在 `selectedTags` 中添加或移除标签。

## 使用示例

### 添加自定义标签
```typescript
// 用户在 UI 中输入"圆角方形"并按 Enter
// 触发 onAddTag 回调
onAddCustomTag("layoutShapes", "圆角方形");

// 在 App 中处理
const handleAddCustomTag = (fieldKey: string, newTag: string) => {
  setAnswers((current) => {
    const customTags = current.customTags ?? {};
    const fieldTags = customTags[fieldKey] ?? [];
    const updated = addTag(newTag, fieldTags);
    const nextCustomTags = { ...customTags, [fieldKey]: updated };
    
    saveCustomTags(nextCustomTags);
    
    return {
      ...current,
      customTags: nextCustomTags,
    };
  });
};
```

### 删除自定义标签
```typescript
// 用户点击标签上的 × 按钮
// 触发 onRemoveTag 回调
onRemoveCustomTag("layoutShapes", "圆角方形", layoutShapeLabels);

// 在 App 中处理
const handleRemoveCustomTag = (fieldKey: string, tag: string, defaultTags: string[]) => {
  setAnswers((current) => {
    const customTags = current.customTags ?? {};
    const fieldTags = customTags[fieldKey] ?? [];
    const selectedTags = current[fieldKey as keyof UserAnswers] as string[] | undefined;
    
    const { customTags: updatedCustom, selectedTags: updatedSelected } = removeTag(
      tag,
      defaultTags,
      fieldTags,
      selectedTags
    );
    
    const nextCustomTags = { ...customTags, [fieldKey]: updatedCustom };
    saveCustomTags(nextCustomTags);
    
    return {
      ...current,
      customTags: nextCustomTags,
      [fieldKey]: updatedSelected,
    };
  });
};
```

## 关键概念

### defaultTags vs customTags vs selectedTags

| 变量 | 说明 | 示例 |
|------|------|------|
| `defaultTags` | 系统预设的标签 | `["经典方形", "圆形", "爱心"]` |
| `customTags` | 用户添加的标签 | `["圆角方形", "菱形"]` |
| `selectedTags` | 用户选中的标签 | `["经典方形", "圆角方形"]` |

### 标签的生命周期

```
1. 初始化
   ↓
2. 用户添加标签
   ↓
3. 标签保存到 customTags
   ↓
4. 标签保存到 localStorage
   ↓
5. 用户选择标签
   ↓
6. 标签添加到 selectedTags
   ↓
7. 用户删除标签
   ↓
8. 标签从 customTags 和 selectedTags 中移除
   ↓
9. 标签从 localStorage 中删除
```

## 常见问题

### Q: 如何添加新的可自定义的选项？
A: 在 `VisualFlavorPanel` 中添加一个新的 `EditableTagGroup` 组件，并配置相应的 props。

### Q: 如何修改默认标签？
A: 修改 `src/data/presets.ts` 中的相应选项数组（如 `layoutShapeOptions`）。

### Q: 如何清除所有自定义标签？
A: 调用 `clearAllCustomTags()` 函数（在 `customTagsStorage.ts` 中）。

### Q: 如何导出自定义标签？
A: 从 localStorage 中读取 `journal-custom-tags` 键的值，并导出为 JSON。

## 测试

### 快速测试
1. 打开应用
2. 进入"视觉风味"部分
3. 在"排版形状"中点击"添加"
4. 输入"测试标签"
5. 按 Enter 确认
6. 验证标签出现
7. 刷新页面
8. 验证标签仍然存在

### 验证 localStorage
```javascript
// 在浏览器控制台中运行
JSON.parse(localStorage.getItem('journal-custom-tags'))
```

## 相关文件

| 文件 | 说明 |
|------|------|
| `src/App.tsx` | 主应用组件，包含修改 |
| `src/components/EditableTagGroup.tsx` | 标签组件 |
| `src/lib/tagManager.ts` | 标签管理工具 |
| `src/lib/customTagsStorage.ts` | 存储工具 |
| `src/types.ts` | 类型定义 |

## 下一步

1. **阅读详细文档**：查看 `CUSTOM_TAGS_EXPANSION.md`
2. **了解实现细节**：查看 `CUSTOM_TAGS_IMPLEMENTATION_DETAILS.md`
3. **学习用户指南**：查看 `CUSTOM_TAGS_USER_GUIDE_EXPANDED.md`
4. **进行测试**：按照 `CUSTOM_TAGS_VERIFICATION_CHECKLIST.md` 进行测试

## 总结

自定义标签功能通过以下方式实现：
1. 使用 `EditableTagGroup` 组件提供 UI
2. 使用 `tagManager` 处理业务逻辑
3. 使用 `customTagsStorage` 管理持久化存储
4. 在 `App` 中协调状态管理

这个实现简洁、高效、易于扩展。

---

**需要帮助？** 查看完整文档或联系开发团队。
