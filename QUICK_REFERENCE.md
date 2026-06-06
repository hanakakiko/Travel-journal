# EXIF 项目快速参考表

## 🎯 文件快速查找

| 需求 | 文件位置 | 说明 |
|------|---------|------|
| 查看所有表单选项 | `/src/data/presets.ts` | mood、vibes、cuisine 等全部预设 |
| 自定义标签组件 | `/src/components/EditableTagGroup.tsx` | 支持添加、删除、选中标签 |
| 自定义标签保存 | `/src/lib/userSettings.ts` | 云端同步核心实现 |
| 标签管理工具 | `/src/lib/tagManager.ts` | addTag、removeTag、canRemoveTag |
| CloudBase 集成 | `/src/lib/cloudbase.ts` | 匿名登录、数据库、云函数 |
| 主应用程序 | `/src/App.tsx` | 所有表单 UI 组件 |

---

## 📋 表单字段清单

### 1️⃣ 场景选择 (sceneOptions)
```
- 一次旅程
- 城市散步
- 周末日常
- 朋友聚会 ⚡ 包含"菜系/酒水"
- 独处片刻
- 纪念日
```

### 2️⃣ 情绪标签 (moodOptions)
```
["松弛", "热烈", "怀旧", "奇遇", "安静", "明亮", "浪漫", "像电影"]
```

### 3️⃣ 视觉风味
| 字段 | 类型 | 变量名 | 个数 |
|------|------|--------|------|
| 色调 | 单选 | paletteOptions | 6 |
| 氛围 | 多选 | vibeOptions | 14 |
| 排版形状 | 多选 | layoutShapeOptions | 6 |
| 照片边缘 | 多选 | edgeStyleOptions | 8 |
| 装饰元素 | 多选 | decorationOptions | 10 |
| 底图纸张 | 单选 | paperOptions | 7 |
| 主色调 | 单选* | mainColorOptions | 10 |

*可不选

---

## 🔗 数据同步流程

### LocalStorage Key
```
"journal-custom-tags"      # 自定义标签
"exif-user-api-config"     # API 配置
"journal-sound"            # 声音设置
```

### CloudBase 结构
```
环境 ID: my-travel-journal-d5d06m1a517f14
集合: user_settings
├── mood: ["自定义1"]
├── vibes: ["自定义2"]
├── layoutShapes: [...]
├── edgeStyles: [...]
├── decorations: [...]
└── updatedAt: timestamp
```

### 双写策略
```
用户输入 → localStorage (同步立即保存)
        → CloudBase (异步后台上传)
        → 失败时静默（用户无感知）
```

---

## 💻 关键函数速查

### 获取/保存自定义标签
```typescript
// 获取所有自定义标签
const tags = getAllCustomTags();  // → { mood: [...], vibes: [...] }

// 保存自定义标签（自动同步到云端）
saveCustomTags(updatedTags);

// 为特定字段添加标签
addCustomTagToField("mood", "舒适");

// 删除特定字段的标签
removeCustomTagFromField("mood", "舒适");
```

### EditableTagGroup 组件使用
```typescript
<EditableTagGroup
  title="氛围（多选）"
  defaultTags={vibeOptions}
  customTags={answers.customTags?.vibes}
  selectedTags={answers.vibes}
  onAddTag={(newTag) => onAddCustomTag("vibes", newTag)}
  onRemoveTag={(tag) => onRemoveCustomTag("vibes", tag, vibeOptions)}
  onToggleTag={(tag) => onToggleAnswerList("vibes", tag)}
  onSound={onSound}
/>
```

### 标签管理工具
```typescript
import { addTag, removeTag, canRemoveTag } from "./lib/tagManager";

// 添加（自动去重）
const updated = addTag("新标签", customTags);

// 删除（检查保护）
const { customTags: newCustom, selectedTags: newSelected } 
  = removeTag(tag, defaultTags, customTags, selected);

// 检查是否可删除
if (canRemoveTag(tag, defaultTags, customTags)) {
  // 可以删除
}
```

### CloudBase 操作
```typescript
// 匿名登录（幂等）
await ensureAnonymousLogin();

// 获取当前用户 ID
const uid = await getCurrentUserId();

// 获取数据库实例
const db = getDb();
await db.collection("user_settings").doc(uid).get();

// 从云函数获取 API Key
const apiKey = await getVApiKeyFromCloudFunction();
```

---

## 🛡️ 标签保护规则

| 操作 | 默认标签 | 自定义标签 |
|------|---------|----------|
| 显示 | ✅ 显示 | ✅ 显示 + ❌ 删除按钮 |
| 选中 | ✅ 可选 | ✅ 可选 |
| 删除 | 🔒 保护*（≥2个） | ✅ 可删 |
| 编辑 | ❌ 不能 | ✅ 可删除整个 |

*必须保留至少 2 个默认标签

---

## 🔐 认证流程

```
用户访问页面
    ↓
ensureAnonymousLogin()
    ↓
生成匿名 uid
    ↓
以 uid 为 ID 存储用户数据
    ↓
跨设备登录时自动同步
```

**特点**：
- ✅ 无需注册/登录账户
- ✅ 匿名自动生成 uid
- ✅ localStorage 作为本地备份
- ✅ 网络失败自动降级

---

## 📱 UI 交互流程

### 添加自定义标签
```
用户点击 [+ 添加] 
  ↓
弹出行内输入框
  ↓
输入文本 + Enter 或点击✅
  ↓
onAddTag 回调触发
  ↓
setState + 保存到云端
  ↓
标签立即显示在列表中
```

### 删除自定义标签
```
鼠标悬停自定义标签（标签背景高亮）
  ↓
显示 ❌ 删除按钮
  ↓
用户点击 ❌
  ↓
检查 canRemoveTag()
  ↓
满足条件 → 删除 + 更新云端
不满足条件 → 显示锁定提示 (🔒)
```

---

## 🚨 常见问题排查

### Q: 自定义标签不保存？
**A**: 检查流程：
1. ❓ localStorage 是否可用？
2. ❓ CloudBase 环境 ID 是否正确？
3. ❓ 用户是否成功匿名登录？
4. ❓ 网络是否正常？

### Q: 如何恢复用户自定义标签？
**A**: 
```typescript
// 应用启动时自动调用
const settings = await cloudFetchSettings();
// 或手动调用
const tags = getAllCustomTags();
```

### Q: 删除标签时显示锁定 🔒？
**A**: 表示该字段只有 2 个默认标签，删除会违反保护规则。
需要先确保该字段有 ≥3 个默认标签。

---

## 📊 状态数据结构

```typescript
// UserAnswers 的自定义标签部分
customTags?: {
  mood?: ["舒适", "治愈"],           // 情绪
  vibes?: ["公路片"],                // 氛围
  layoutShapes?: ["圆形"],           // 排版形状
  edgeStyles?: ["撕纸边"],           // 照片边缘
  decorations?: ["小星星"],          // 装饰元素
  [fieldKey]: string[]               // 其他场景字段
}
```

---

## 🔗 相关文档

- API 集成：见 `modelClient.ts` 和 `visionClient.ts`
- 图片上传：见 `cosUploader.ts`
- 模板管理：见 `templateManager.ts`
- 认证流程：见 `contexts/AuthContext.tsx`

