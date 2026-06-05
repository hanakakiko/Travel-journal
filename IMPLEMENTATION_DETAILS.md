# 实现细节技术文档

## 文件修改概览

### 修改的文件
1. **`src/lib/modelClient.ts`** - 核心逻辑修改
2. **`src/App.tsx`** - UI 文案更新

### 未修改的文件
- `src/lib/templateManager.ts` - 已有完整功能
- `src/types.ts` - 数据结构无需改动
- `src/data/presets.ts` - 选项数据无需改动

---

## 详细实现

### 1. 随机化实现

#### 1.1 随机选择函数
```typescript
// src/lib/modelClient.ts, 第 9 行
const randomPick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
```

**特点：**
- 泛型函数，支持任何类型的数组
- 使用 `Math.random()` 生成 0-1 的随机数
- 乘以数组长度后取整，得到随机索引

#### 1.2 导入所有选项数据
```typescript
// src/lib/modelClient.ts, 第 1 行
import { 
  edgeStyleOptions, 
  sceneOptions, 
  stylePresets, 
  templatePresets, 
  moodOptions,           // 新增
  narratorOptions,       // 新增
  paletteOptions,        // 新增
  vibeOptions,           // 新增
  layoutShapeOptions,    // 新增
  decorationOptions,     // 新增
  paperOptions           // 新增
} from "../data/presets";
```

#### 1.3 情绪和叙述方式的随机化
```typescript
// src/lib/modelClient.ts, 第 529-532 行
const moodPart = answers.mood.length ? answers.mood.join("、") : randomPick(moodOptions);
const narratorPart = answers.narrator || randomPick(narratorOptions);
```

**逻辑：**
- 如果用户选择了情绪，使用用户选择的情绪
- 否则，从 `moodOptions` 中随机选一个
- 叙述方式同理

#### 1.4 视觉风味的随机化
```typescript
// src/lib/modelClient.ts, 第 389-468 行
const buildVisualFlavorPhrase = (answers: UserAnswers): string => {
  const parts: string[] = [];
  
  // 色调：如果用户没选，随机选一个
  const selectedPalette = answers.palette || randomPick(paletteOptions).label;
  parts.push(`整体色调倾向于「${selectedPalette}」的视觉氛围`);
  
  // 氛围标签：如果用户没选，随机选 1-2 个
  const selectedVibes = answers.vibes?.length ? answers.vibes : [randomPick(vibeOptions), randomPick(vibeOptions)];
  
  // ... 其他选项类似处理
};
```

**特点：**
- 色调、纸张等单选项：随机选 1 个
- 氛围、形状、装饰等多选项：随机选 1-2 个
- 保留了完整的描述映射表，确保生成的 prompt 质量

#### 1.5 边缘风格的随机化
```typescript
// src/lib/modelClient.ts, 第 481-511 行
const buildPipelinePhrase = (answers: UserAnswers): string => {
  const { fixed, decorative } = splitEdgeStyles(answers);

  let edgeSegment: string;
  if (fixed.length && decorative.length) {
    // 用户同时选了固定形状和装饰性边缘
    edgeSegment = `④ 照片边缘处理：采用「${fixed.join("、")}」...`;
  } else if (fixed.length) {
    // 用户只选了固定形状
    edgeSegment = `④ 照片边缘处理：按「${fixed.join("、")}」...`;
  } else if (decorative.length) {
    // 用户只选了装饰性边缘
    edgeSegment = `④ 照片边缘处理：保持排版形状不变...`;
  } else {
    // 用户没选，随机选一个
    const randomEdgeStyle = randomPick(edgeStyleOptions);
    if (randomEdgeStyle.isFixedShape) {
      edgeSegment = `④ 照片边缘处理：按「${randomEdgeStyle.label}」...`;
    } else {
      edgeSegment = `④ 照片边缘处理：保持排版形状不变...`;
    }
  }
  
  return [...].join(" ");
};
```

**特点：**
- 考虑了边缘风格的两种类型（固定形状 vs 装饰性）
- 随机选择后，根据类型生成相应的 prompt 指导
- 确保生成的 prompt 逻辑一致

---

### 2. 文字框空白处理

#### 2.1 标题处理逻辑
```typescript
// src/lib/modelClient.ts, 第 523-526 行
const userTitle = answers.titleSeed.trim();
const title = userTitle || `${answers.scene}手帐`;
const hasUserTitle = Boolean(userTitle);
```

**逻辑：**
- `userTitle`：用户填写的标题（去除首尾空格）
- `title`：最终使用的标题（用户填写或默认值）
- `hasUserTitle`：标志位，表示用户是否填写了标题

#### 2.2 事实清单中的条件包含
```typescript
// src/lib/modelClient.ts, 第 544-552 行
const factSummary = [
  `主题场景：${answers.scene}`,
  `叙述者口吻：${narratorPart}`,
  `情绪关键词：${moodPart}`,
  hasUserTitle ? `标题文案：${title}` : null,  // 条件包含
  hasUserDetails ? `用户补充的场景细节：...` : null,
]
  .filter(Boolean)  // 过滤掉 null 值
  .join("；");
```

**特点：**
- 使用三元运算符实现条件包含
- 使用 `.filter(Boolean)` 过滤掉 null 值
- 确保最终的 prompt 中不包含空的块

#### 2.3 任务描述中的条件包含
```typescript
// src/lib/modelClient.ts, 第 569-583 行
return [
  hasUserTitle 
    ? `任务：基于 ${photoCount} 张参考图片，创作一张「${title}」主题的手帐拼贴。` 
    : `任务：基于 ${photoCount} 张参考图片，创作一张手帐拼贴。`,
  // ... 其他块
  hasUserTitle ? `标题必须且仅使用：「${title}」。` : null,
]
  .filter(Boolean)
  .join(" ");
```

**特点：**
- 任务描述根据是否有标题，生成不同的文本
- 标题约束块只在用户填写标题时包含
- 确保 prompt 的完整性和逻辑一致性

---

### 3. 保存选项功能

#### 3.1 UI 更新
```typescript
// src/App.tsx, 第 742-806 行
function GeneratedShowcase({
  draft,
  onDownload,
  onSaveTemplate,
  onSound,
}: {
  draft: JournalDraft;
  onDownload: () => void;
  onSaveTemplate?: (name: string) => void;
  onSound?: (effect: SoundEffect) => void;
}) {
  // ...
  return (
    <section className={classNames("generated-hero", ...)}>
      <header className="generated-hero-head">
        <div>
          {/* 标题和信息 */}
        </div>
        <div style={{ display: "flex", gap: "0.5em", flexWrap: "wrap", justifyContent: "flex-end" }}>
          {hasImage && (
            <button type="button" className="generated-hero-download" onClick={onDownload}>
              <ImageDown size={16} />
              <span>下载图</span>
            </button>
          )}
          {onSaveTemplate && (
            <button
              type="button"
              className="generated-hero-download"
              onClick={() => {
                const name = window.prompt("请输入模板名称（保存本次的选项配置）：");
                if (name?.trim()) {
                  onSaveTemplate(name.trim());
                  onSound?.("success");
                }
              }}
              title="保存当前配置为模板，下次可快速应用"
            >
              <Save size={16} />
              <span>保存选项</span>
            </button>
          )}
        </div>
      </header>
      {/* ... */}
    </section>
  );
}
```

**修改点：**
- 按钮文案从"保存模板"改为"保存选项"
- 提示文案更新为"保存本次的选项配置"
- 按钮容器添加 `flexWrap: "wrap"` 支持换行
- 按钮容器添加 `justifyContent: "flex-end"` 右对齐

#### 3.2 保存流程（已有，无需修改）
```typescript
// src/lib/templateManager.ts
export const saveTemplate = (
  name: string,
  answers: UserAnswers,
  styleId: StyleId,
  templateId: TemplateId
): SavedTemplate => {
  const templates = getAllTemplates();
  
  const newTemplate: SavedTemplate = {
    id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    createdAt: Date.now(),
    answers,
    styleId,
    templateId,
  };
  
  templates.push(newTemplate);
  
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch {
    // Local storage is optional
  }
  
  return newTemplate;
};
```

**特点：**
- 使用时间戳和随机字符串生成唯一 ID
- 保存完整的 `answers`、`styleId`、`templateId`
- 使用 localStorage 持久化存储
- 异常处理确保应用稳定性

---

## 数据流

### 随机化流程
```
用户不选择选项
    ↓
buildKratosPrompt 检查选项是否为空
    ↓
如果为空，调用 randomPick 随机选择
    ↓
将随机选择的值纳入 prompt
    ↓
发送给 LLM 生成
```

### 文字框处理流程
```
用户填写/不填写标题
    ↓
buildKratosPrompt 检查 titleSeed 是否为空
    ↓
设置 hasUserTitle 标志位
    ↓
根据标志位条件包含 prompt 块
    ↓
过滤掉 null 值
    ↓
生成最终 prompt
```

### 保存选项流程
```
用户点击"保存选项"按钮
    ↓
弹出输入框要求输入模板名称
    ↓
调用 saveTemplate 函数
    ↓
保存 answers、styleId、templateId 到 localStorage
    ↓
播放成功音效
    ↓
下次打开应用时，模板选择界面显示已保存的模板
```

---

## 性能考虑

### 随机化
- `randomPick` 函数非常轻量，只涉及一次数组访问
- 随机化只在 prompt 生成时执行，不影响 UI 响应速度
- 没有额外的网络请求或存储操作

### 文字框处理
- 条件包含使用简单的三元运算符，性能开销极小
- `.filter(Boolean)` 是标准的数组操作，性能良好
- 没有额外的计算或存储操作

### 保存选项
- 使用 localStorage，读写速度快
- 保存的数据量小（JSON 序列化的 answers 对象）
- 异常处理确保即使 localStorage 不可用也不会崩溃

---

## 兼容性

### 浏览器兼容性
- `Math.random()`：所有浏览器支持
- `localStorage`：IE8+、所有现代浏览器支持
- 三元运算符和 `.filter()`：所有 JavaScript 环境支持

### 向后兼容性
- 所有修改都是增强性的，不破坏现有功能
- 如果用户选择了选项，行为与之前完全相同
- 如果用户填写了标题，行为与之前完全相同

---

## 测试覆盖

### 单元测试建议
```typescript
// 测试 randomPick 函数
describe('randomPick', () => {
  it('should return an element from the array', () => {
    const arr = [1, 2, 3];
    const result = randomPick(arr);
    expect(arr).toContain(result);
  });
  
  it('should handle single element array', () => {
    const arr = [42];
    expect(randomPick(arr)).toBe(42);
  });
});

// 测试 buildKratosPrompt 函数
describe('buildKratosPrompt', () => {
  it('should include title when user provides one', () => {
    const answers = { titleSeed: '我的手帐', ... };
    const prompt = buildKratosPrompt(answers, ...);
    expect(prompt).toContain('我的手帐');
  });
  
  it('should not include title constraint when user does not provide one', () => {
    const answers = { titleSeed: '', ... };
    const prompt = buildKratosPrompt(answers, ...);
    expect(prompt).not.toContain('标题必须且仅使用');
  });
});
```

### 集成测试建议
- 生成多个手帐，验证随机化的多样性
- 保存模板，刷新页面，验证模板是否被正确加载
- 不填标题生成，验证 prompt 中是否包含标题相关块

---

## 调试技巧

### 查看生成的 Prompt
1. 在补充信息面板中，展开"预览本次发给 LLM 的 prompt"
2. 查看完整的 prompt 内容
3. 验证随机化和文字框处理是否符合预期

### 查看保存的模板
1. 打开浏览器开发者工具（F12）
2. 进入 Console 标签
3. 执行：`JSON.parse(localStorage.getItem('journal-templates'))`
4. 查看所有保存的模板

### 调试随机化
1. 在 `randomPick` 函数中添加 console.log
2. 多次生成，观察控制台输出
3. 验证随机选择的多样性

