# 画面主色调功能 - 快速指南

## 🎨 功能说明

在"补充信息"弹窗的"视觉风味"部分，新增了**画面主色调**选项。

### 位置
- 在"底图纸张"选项下方
- 标题：「画面主色调（单选 · 可不选）」

### 10 种手帐色彩

| 色彩名称 | 颜色代码 | 说明 |
|---------|---------|------|
| 樱花粉 | #FFB6D9 | 温柔甜蜜的粉色 |
| 天空蓝 | #87CEEB | 清爽明亮的蓝色 |
| 薄荷绿 | #98FF98 | 清新治愈的绿色 |
| 薰衣草紫 | #E6B3FF | 优雅神秘的紫色 |
| 蜜桃橙 | #FFCC99 | 温暖柔和的橙色 |
| 奶油黄 | #FFFACD | 温柔舒适的黄色 |
| 珊瑚红 | #FF7F7F | 活力热情的红色 |
| 鼠尾草绿 | #9DC183 | 沉静优雅的绿色 |
| 尘粉玫瑰 | #D8A8A8 | 复古温柔的玫瑰色 |
| 海洋青 | #5F9EA0 | 深邃宁静的青色 |

## 💡 使用方式

1. **选择色彩**：点击任意色彩 chip，该色彩会被高亮显示
2. **取消选择**：再次点击已选中的色彩，可以取消选择
3. **不选**：可以完全不选，此时主色调为空

## ⚙️ 技术细节

### 存储位置
- 字段名：`answers.mainColor`
- 类型：`string | undefined`
- 默认值：`undefined`

### 关键特性
- ✅ **单选**：最多只能选一个
- ✅ **可选**：可以不选
- ✅ **影响 Prompt**：会被加入到发送给 LLM 的 prompt，用于指导色彩搭配
- ✅ **模板支持**：保存/应用模板时会保留主色调选择

### 代码位置

| 文件 | 内容 |
|------|------|
| `src/types.ts` | `UserAnswers` 类型定义 |
| `src/data/presets.ts` | `mainColorOptions` 常量 |
| `src/App.tsx` | UI 组件和交互逻辑 |
| `src/styles.css` | `.chip-color` 样式 |

## 🔍 验证清单

- [x] 编译无错误
- [x] 10 种色彩都能显示
- [x] 单选逻辑正确
- [x] 不影响 prompt 生成
- [x] 模板保存/应用正常
- [x] UI 样式美观

## 📝 示例代码

### 获取用户选择的主色调
```typescript
const selectedColor = answers.mainColor; // 例如："樱花粉"
```

### 在 UI 中显示选中状态
```typescript
answers.mainColor === opt.label && "is-on"
```

### 切换主色调选择
```typescript
onSetAnswers((current) => ({
  ...current,
  mainColor: current.mainColor === opt.label ? undefined : opt.label,
}));
```

## 📌 重要原则

**每次新增选项时，都必须同步在 prompt 中加入相应修改。**

这样才能确保用户的选择真正影响最终的生成结果，而不仅仅是 UI 展示。
