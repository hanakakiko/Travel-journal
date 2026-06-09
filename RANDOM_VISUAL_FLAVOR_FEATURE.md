# 全局随机选项功能

## 功能概述

在"视觉风味"面板中添加了一个"🎲 随机选择"按钮，用户可以一键随机生成所有视觉风味偏好，而文字部分（标题、场景、情绪、叙述者等）保持不变。

## 实现细节

### 1. 后端函数：`generateRandomVisualFlavor()`

位置：[`src/lib/modelClient.ts`](src/lib/modelClient.ts:421-431)

```typescript
export const generateRandomVisualFlavor = (currentAnswers: UserAnswers): Partial<UserAnswers> => {
  return {
    palette: randomPick(paletteOptions).label,                                    // 随机选 1 个色调
    vibes: randomPickMultiple(vibeOptions, Math.floor(Math.random() * 3) + 1),   // 随机选 1-3 个氛围标签
    layoutShapes: randomPickMultiple(layoutShapeOptions, Math.floor(Math.random() * 2) + 1).map(opt => opt.label), // 随机选 1-2 个排版形状
    edgeStyles: randomPickMultiple(edgeStyleOptions, Math.floor(Math.random() * 2) + 1).map(opt => opt.label),     // 随机选 1-2 个边缘风格
    decorations: randomPickMultiple(decorationOptions, Math.floor(Math.random() * 3) + 1).map(opt => opt.label),   // 随机选 1-3 个装饰元素
    paperTexture: randomPick(paperOptions).label,                                 // 随机选 1 个纸张底色
    mainColor: Math.random() > 0.5 ? randomPick(mainColorOptions).label : undefined, // 50% 概率选择主色调
  };
};
```

### 2. 辅助函数

#### `randomPick<T>(items: T[]): T`
从数组中随机选择一个元素。

#### `randomPickMultiple<T>(items: T[], count: number): T[]`
从数组中随机选择 N 个不重复的元素。使用 Fisher-Yates 洗牌算法。

### 3. UI 按钮

位置：[`src/App.tsx`](src/App.tsx:2610-2630)

在"视觉风味"面板的头部添加了一个"🎲 随机选择"按钮，点击时：
1. 调用 `generateRandomVisualFlavor()` 生成随机偏好
2. 使用 `onSetAnswers()` 更新状态
3. 播放点击音效

## 随机规则

| 字段 | 随机规则 | 说明 |
|------|--------|------|
| 色调（palette） | 随机选 1 个 | 单选字段 |
| 氛围标签（vibes） | 随机选 1-3 个 | 多选字段，数量随机 |
| 排版形状（layoutShapes） | 随机选 1-2 个 | 多选字段，数量随机 |
| 边缘风格（edgeStyles） | 随机选 1-2 个 | 多选字段，数量随机 |
| 装饰元素（decorations） | 随机选 1-3 个 | 多选字段，数量随机 |
| 纸张底色（paperTexture） | 随机选 1 个 | 单选字段 |
| 主色调（mainColor） | 50% 概率选择 | 可选字段，可能为 undefined |

## 保持不变的字段

以下字段在随机选择时保持不变：
- 标题（titleSeed）
- 场景（scene）
- 情绪关键词（mood）
- 叙述者口吻（narrator）
- 密度（density）
- 场景细节（sceneDetails）
- 倾诉记录（confessionText）
- 自定义标签（customTags）

## 使用场景

1. **快速探索**：用户不确定选什么时，可以一键随机生成视觉风味，快速看到效果
2. **灵感激发**：随机组合可能会产生意想不到的视觉效果，激发创意
3. **对比测试**：用户可以多次点击随机按钮，对比不同的视觉风味组合

## 相关修复

同时修复了之前的 bug：
- 装饰元素（decorations）：现在只在用户主动选中时才会代入 prompt
- 氛围标签（vibes）：现在只在用户主动选中时才会代入 prompt
- 排版形状（layoutShapes）：现在只在用户主动选中时才会代入 prompt
- 色调（palette）：现在只在用户主动选中时才会代入 prompt
- 纸张底色（paperTexture）：现在只在用户主动选中时才会代入 prompt

详见：[`src/lib/modelClient.ts`](src/lib/modelClient.ts:434-532)
