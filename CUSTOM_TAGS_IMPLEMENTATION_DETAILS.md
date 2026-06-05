# 自定义标签功能实现细节

## 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                      App.tsx (主组件)                        │
│  - 管理 answers 状态                                         │
│  - 处理 customTags 的添加/删除                              │
│  - 调用 saveCustomTags() 持久化                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  VisualFlavorPanel 组件                      │
│  - 渲染各个选项的 EditableTagGroup                          │
│  - 传递 defaultTags, customTags, selectedTags              │
│  - 处理 onAddTag, onRemoveTag, onToggleTag 事件            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              EditableTagGroup 组件                           │
│  - 显示默认标签和自定义标签                                 │
│  - 提供添加/删除/选择标签的 UI                              │
│  - 调用 tagManager 中的函数进行验证                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   tagManager.ts 工具库                       │
│  - addTag()：添加新标签                                     │
│  - removeTag()：删除标签                                    │
│  - canRemoveTag()：检查是否可删除                           │
│  - isCustomTag()：检查是否为自定义标签                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              customTagsStorage.ts 工具库                     │
│  - getAllCustomTags()：从 localStorage 读取                 │
│  - saveCustomTags()：保存到 localStorage                    │
│  - getCustomTagsForField()：获取特定字段的标签              │
│  - addCustomTagToField()：添加标签到特定字段                │
│  - removeCustomTagFromField()：从特定字段删除标签           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  localStorage (浏览器存储)                   │
│  - 键：journal-custom-tags                                  │
│  - 值：JSON 格式的自定义标签对象                            │
└─────────────────────────────────────────────────────────────┘
```

## 数据流详解

### 1. 初始化流程

```typescript
// App.tsx 中的初始化
const defaultAnswers: UserAnswers = {
  // ...
  customTags: getAllCustomTags(), // 从 localStorage 读取
  // ...
};

const [answers, setAnswers] = useState<UserAnswers>(defaultAnswers);
```

### 2. 添加标签流程

```
用户点击"添加"按钮
    ↓
EditableTagGroup 显示输入框
    ↓
用户输入标签名称并按 Enter
    ↓
EditableTagGroup.handleAddTag() 被调用
    ↓
onAddTag() 回调被触发（传入新标签）
    ↓
App.handleAddCustomTag() 被调用
    ↓
tagManager.addTag() 验证标签
    ↓
setAnswers() 更新 answers.customTags
    ↓
saveCustomTags() 保存到 localStorage
    ↓
UI 更新，显示新标签
```

### 3. 删除标签流程

```
用户点击标签上的 × 按钮
    ↓
EditableTagGroup.handleRemoveTag() 被调用
    ↓
canRemoveTag() 检查是否可删除
    ↓
onRemoveTag() 回调被触发（传入标签）
    ↓
App.handleRemoveCustomTag() 被调用
    ↓
tagManager.removeTag() 处理删除逻辑
    ↓
setAnswers() 更新 answers.customTags 和 answers[fieldKey]
    ↓
saveCustomTags() 保存到 localStorage
    ↓
UI 更新，标签消失
```

### 4. 选择标签流程

```
用户点击标签
    ↓
EditableTagGroup.handleToggleTag() 被调用
    ↓
onToggleTag() 回调被触发（传入标签）
    ↓
App.toggleAnswerList() 被调用
    ↓
setAnswers() 更新 answers[fieldKey]（如 answers.layoutShapes）
    ↓
UI 更新，显示选中状态
```

## 关键函数详解

### App.tsx 中的关键函数

#### handleAddCustomTag()
```typescript
const handleAddCustomTag = (fieldKey: string, newTag: string) => {
  setAnswers((current) => {
    const customTags = current.customTags ?? {};
    const fieldTags = customTags[fieldKey] ?? [];
    const updated = addTag(newTag, fieldTags);
    const nextCustomTags = { ...customTags, [fieldKey]: updated };
    
    // 保存到 localStorage
    saveCustomTags(nextCustomTags);
    
    return {
      ...current,
      customTags: nextCustomTags,
    };
  });
};
```

#### handleRemoveCustomTag()
```typescript
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
    
    // 保存到 localStorage
    saveCustomTags(nextCustomTags);
    
    return {
      ...current,
      customTags: nextCustomTags,
      [fieldKey]: updatedSelected,
    };
  });
};
```

### tagManager.ts 中的关键函数

#### addTag()
```typescript
export function addTag(newTag: string, customTags?: string[]): string[] {
  const trimmed = newTag.trim();
  if (!trimmed) return customTags ?? [];
  
  const current = customTags ?? [];
  // 避免重复
  if (current.includes(trimmed)) return current;
  
  return [...current, trimmed];
}
```

#### removeTag()
```typescript
export function removeTag(
  tag: string,
  defaultTags: string[],
  customTags?: string[],
  selectedTags?: string[]
): { customTags: string[]; selectedTags: string[] } {
  const custom = customTags ?? [];
  const selected = selectedTags ?? [];
  
  // 如果是默认标签，检查是否可以删除
  if (defaultTags.includes(tag)) {
    const remainingDefaults = defaultTags.filter((t) => t !== tag);
    if (remainingDefaults.length < 2) {
      return { customTags: custom, selectedTags: selected };
    }
    return {
      customTags: custom,
      selectedTags: selected.filter((t) => t !== tag),
    };
  }
  
  // 如果是自定义标签，直接删除
  const updatedCustom = custom.filter((t) => t !== tag);
  const updatedSelected = selected.filter((t) => t !== tag);
  
  return {
    customTags: updatedCustom,
    selectedTags: updatedSelected,
  };
}
```

#### canRemoveTag()
```typescript
export function canRemoveTag(
  tag: string,
  defaultTags: string[],
  customTags?: string[]
): boolean {
  // 自定义标签总是可以删除
  if (customTags?.includes(tag)) {
    return true;
  }
  
  // 默认标签只有在删除后仍有至少 2 个时才能删除
  if (defaultTags.includes(tag)) {
    const remainingDefaults = defaultTags.filter((t) => t !== tag);
    return remainingDefaults.length >= 2;
  }
  
  return false;
}
```

### customTagsStorage.ts 中的关键函数

#### getAllCustomTags()
```typescript
export const getAllCustomTags = (): Record<string, string[]> => {
  try {
    const data = window.localStorage.getItem(CUSTOM_TAGS_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};
```

#### saveCustomTags()
```typescript
export const saveCustomTags = (customTags: Record<string, string[]>): void => {
  try {
    window.localStorage.setItem(CUSTOM_TAGS_STORAGE_KEY, JSON.stringify(customTags));
  } catch {
    // Local storage is optional
  }
};
```

## 类型定义

### UserAnswers 类型
```typescript
export type UserAnswers = {
  // ... 其他字段 ...
  
  /** 用户自定义的标签选项：存储用户添加的新标签。 */
  customTags?: Record<string, string[]>;
  
  // ... 其他字段 ...
};
```

### EditableTagGroupProps 接口
```typescript
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
```

## localStorage 数据结构

### 存储键
```
journal-custom-tags
```

### 数据格式
```json
{
  "mood": ["自定义情绪1", "自定义情绪2"],
  "vibes": ["自定义氛围1", "自定义氛围2"],
  "layoutShapes": ["自定义形状1"],
  "edgeStyles": ["自定义边缘风格1"],
  "decorations": ["自定义装饰元素1", "自定义装饰元素2"]
}
```

## 支持的字段

| 字段名 | 默认标签来源 | 位置 |
|--------|------------|------|
| `mood` | `moodOptions` | 故事纸条 - 情绪 |
| `vibes` | `vibeOptions` | 视觉风味 - 氛围 |
| `layoutShapes` | `layoutShapeOptions.map(opt => opt.label)` | 视觉风味 - 排版形状 |
| `edgeStyles` | `edgeStyleOptions.map(opt => opt.label)` | 视觉风味 - 照片边缘风格 |
| `decorations` | `decorationOptions.map(opt => opt.label)` | 视觉风味 - 装饰元素 |

## 错误处理

### localStorage 不可用
```typescript
try {
  window.localStorage.setItem(key, value);
} catch {
  // localStorage 不可用时，静默失败
  // 用户仍然可以在当前会话中使用自定义标签
}
```

### 无效的标签
```typescript
// 空标签被过滤
const trimmed = newTag.trim();
if (!trimmed) return customTags ?? [];

// 重复标签被检查
if (current.includes(trimmed)) return current;
```

### 默认标签保护
```typescript
// 至少保留 2 个默认标签
const remainingDefaults = defaultTags.filter((t) => t !== tag);
if (remainingDefaults.length < 2) {
  return { customTags: custom, selectedTags: selected };
}
```

## 性能考虑

### 优化点
1. **本地状态管理**：自定义标签存储在 React 状态中，避免频繁的 localStorage 访问
2. **批量更新**：使用 `setAnswers()` 的函数形式，确保状态更新的原子性
3. **选择性保存**：只在标签实际改变时才保存到 localStorage

### 潜在瓶颈
1. **大量标签**：如果用户添加了数百个标签，可能会影响性能
2. **频繁保存**：每次添加/删除标签都会触发 localStorage 写入

## 扩展建议

### 1. 标签搜索
```typescript
const [searchQuery, setSearchQuery] = useState("");
const filteredTags = allTags.filter(tag => 
  tag.toLowerCase().includes(searchQuery.toLowerCase())
);
```

### 2. 标签分类
```typescript
type TagCategory = "default" | "custom" | "recent";
const categorizedTags = groupBy(allTags, (tag) => {
  if (defaultTags.includes(tag)) return "default";
  if (customTags?.includes(tag)) return "custom";
  return "recent";
});
```

### 3. 标签使用统计
```typescript
type TagStats = Record<string, {
  count: number;
  lastUsed: number;
}>;
```

### 4. 标签导出/导入
```typescript
// 导出
const exportTags = () => {
  const data = JSON.stringify(getAllCustomTags());
  downloadAsJSON(data, "custom-tags.json");
};

// 导入
const importTags = (file: File) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = JSON.parse(e.target?.result as string);
    saveCustomTags(data);
  };
};
```

## 测试建议

### 单元测试
```typescript
describe("tagManager", () => {
  describe("addTag", () => {
    it("should add a new tag", () => {
      const result = addTag("新标签", ["标签1"]);
      expect(result).toEqual(["标签1", "新标签"]);
    });
    
    it("should not add duplicate tags", () => {
      const result = addTag("标签1", ["标签1"]);
      expect(result).toEqual(["标签1"]);
    });
  });
  
  describe("removeTag", () => {
    it("should remove custom tags", () => {
      const result = removeTag("自定义", ["默认1", "默认2"], ["自定义"]);
      expect(result.customTags).toEqual([]);
    });
    
    it("should protect default tags", () => {
      const result = removeTag("默认1", ["默认1"], []);
      expect(result.customTags).toEqual([]);
    });
  });
});
```

### 集成测试
```typescript
describe("Custom Tags Integration", () => {
  it("should add and persist custom tags", async () => {
    // 1. 添加标签
    // 2. 验证 localStorage
    // 3. 刷新页面
    // 4. 验证标签仍然存在
  });
  
  it("should handle template save/load with custom tags", async () => {
    // 1. 添加自定义标签
    // 2. 保存模板
    // 3. 加载模板
    // 4. 验证自定义标签被恢复
  });
});
```

## 总结

自定义标签功能通过以下关键组件实现：
1. **EditableTagGroup 组件**：提供用户界面
2. **tagManager 工具库**：处理业务逻辑
3. **customTagsStorage 工具库**：管理持久化存储
4. **App 组件**：协调状态管理

这个架构确保了代码的可维护性、可扩展性和用户体验的一致性。
