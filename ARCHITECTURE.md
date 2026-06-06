# EXIF 项目架构图

## 🏗️ 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户浏览器 (Frontend)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   React App (App.tsx)                    │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │                                                            │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐   │  │
│  │  │  场景选择   │  │  情绪标签    │  │  视觉风味    │   │  │
│  │  │  (Scene)    │  │  (Mood)      │  │  (Flavor)    │   │  │
│  │  └─────────────┘  └──────────────┘  └──────────────┘   │  │
│  │                                                            │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │      EditableTagGroup × 5                         │  │  │
│  │  │  ✅ 情绪 (mood)                                     │  │  │
│  │  │  ✅ 氛围 (vibes)                                    │  │  │
│  │  │  ✅ 排版形状 (layoutShapes)                        │  │  │
│  │  │  ✅ 照片边缘 (edgeStyles)                          │  │  │
│  │  │  ✅ 装饰元素 (decorations)                         │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│           ↓ user interaction                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              State Management (React useState)           │  │
│  │  • answers (UserAnswers)                               │  │
│  │  • photos (PhotoAsset[])                               │  │
│  │  • customTags (Record<fieldKey, string[]>)             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
         ↓ save/load                        ↓ get
┌─────────────────────────────────────────────────────────────────┐
│                      LocalStorage (快速存取)                      │
├─────────────────────────────────────────────────────────────────┤
│  "journal-custom-tags"   → { mood: [], vibes: [], ... }        │
│  "exif-user-api-config"  → { ... }                             │
│  "journal-sound"         → "on" | "off"                        │
└─────────────────────────────────────────────────────────────────┘
         ↓ sync (async)
┌─────────────────────────────────────────────────────────────────┐
│                   腾讯云 CloudBase (持久化)                      │
├─────────────────────────────────────────────────────────────────┤
│  环境 ID: my-travel-journal-d5d06m1a517f14                     │
│  集合: user_settings                                           │
│  ├─ 文档 ID: {uid (匿名用户 ID)}                              │
│  └─ 字段:                                                       │
│     ├─ customTags: { mood: [], vibes: [], ... }              │
│     ├─ apiConfigs: { ... }                                    │
│     ├─ soundEnabled: boolean                                   │
│     └─ updatedAt: number                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 模块依赖关系

```
App.tsx (主应用)
├── 导入 EditableTagGroup 组件
│   └─ components/EditableTagGroup.tsx
│       ├─ lib/tagManager.ts (标签管理逻辑)
│       │   └─ addTag, removeTag, canRemoveTag
│       └─ lib/soundEffects.ts (音效)
│
├── 导入预设数据
│   └─ data/presets.ts
│       ├─ sceneOptions (场景细节字段)
│       ├─ moodOptions (情绪标签)
│       ├─ vibeOptions (氛围)
│       ├─ layoutShapeOptions (排版形状)
│       ├─ edgeStyleOptions (照片边缘)
│       ├─ decorationOptions (装饰元素)
│       ├─ paletteOptions (色调)
│       ├─ paperOptions (底图纸张)
│       └─ mainColorOptions (主色调)
│
├── 导入自定义标签存储
│   └─ lib/customTagsStorage.ts (兼容层)
│       └─ lib/userSettings.ts (核心实现)
│           ├─ getCustomTags()
│           ├─ saveCustomTags()
│           ├─ addCustomTagToField()
│           ├─ removeCustomTagFromField()
│           └─ clearAllCustomTags()
│               └─ lib/cloudbase.ts (云端操作)
│                   ├─ getApp()
│                   ├─ ensureAnonymousLogin()
│                   ├─ getCurrentUserId()
│                   ├─ getDb()
│                   └─ getVApiKeyFromCloudFunction()
│
├── 导入类型
│   └─ types.ts
│       ├─ UserAnswers (包含 customTags 字段)
│       └─ SceneDetailField
│
├── AI 模型相关
│   ├─ lib/modelClient.ts (生成图片)
│   ├─ lib/visionClient.ts (图像识别)
│   ├─ lib/modelRouter.ts (模型路由)
│   └─ lib/modelConfig.ts (模型配置)
│
├── 数据持久化
│   ├─ lib/templateManager.ts (模板管理 - 云端同步)
│   └─ lib/cosUploader.ts (图片上传到 COS)
│
└── 其他
    ├─ hooks/useAuthFlow.ts (认证)
    └─ contexts/AuthContext.tsx (认证上下文)
```

---

## 🔄 数据流向详解

### 1️⃣ 初始化流程

```
应用启动
  ↓
App() 组件 mount
  ↓
useState(initialAnswers)
  ↓
getAllCustomTags() ← 从 localStorage 读取
  ↓
设置 answers.customTags
  ↓
ensureAnonymousLogin() ← 确保已登录
  ↓
cloudFetchSettings() ← 从 CloudBase 拉取全量数据
  ↓
同步 localStorage（如果云端数据更新）
  ↓
UI 渲染完成
```

### 2️⃣ 添加自定义标签流程

```
用户点击 [+ 添加]
  ↓
EditableTagGroup 显示输入框
  ↓
用户输入 + Enter
  ↓
onAddTag 回调触发
  ↓
onAddCustomTag(fieldKey, newTag)
  ↓
setState((current) => {
  customTags[fieldKey].push(newTag)  // 用户立即看到
})
  ↓
React 重新渲染
  ↓
setState 完成后触发 saveCustomTags()
  ↓
┌─ 同步: localStorage.setItem("journal-custom-tags", JSON.stringify(...))
└─ 异步: cloudSaveSettings({ customTags, ... })
    ↓
    ensureAnonymousLogin()
    ↓
    getDb().collection("user_settings").doc(uid).set(...)
    ↓
    静默成功（用户无需关心）
```

### 3️⃣ 删除自定义标签流程

```
用户点击自定义标签上的 ❌
  ↓
onRemoveTag 回调触发
  ↓
canRemoveTag() 检查
  ├─ 如果是自定义标签 → 直接删除 ✅
  └─ 如果是默认标签 → 检查是否 ≥2 个
      ├─ 是 → 允许删除
      └─ 否 → 拒绝 (显示 🔒)
  ↓
onRemoveCustomTag(fieldKey, tag, defaultTags)
  ↓
setState((current) => {
  customTags[fieldKey] = customTags[fieldKey].filter(t => t !== tag)
  selectedTags = selectedTags.filter(t => t !== tag)  // 同时移除选中
})
  ↓
React 重新渲染
  ↓
saveCustomTags(updated)
  ↓
同步到 localStorage + 异步到 CloudBase
```

### 4️⃣ 页面重新加载时的恢复

```
用户关闭浏览器
  ↓
用户重新打开页面
  ↓
App() 重新 mount
  ↓
getAllCustomTags()
  ├─ 首先从 localStorage 读取（快速响应）
  └─ 返回用户上次保存的标签
  ↓
同时异步：ensureAnonymousLogin() + cloudFetchSettings()
  ↓
如果 CloudBase 有更新的数据
  ├─ 用云端数据覆盖本地 localStorage
  └─ 通知 UI 更新（如果有差异）
  ↓
用户看到完整的自定义标签列表
```

---

## 🛡️ 数据保护机制

### 双写策略 (Dual-Write)

```
用户操作 (写入)
  ↓
  ┌─────────────────────────────────┐
  │ 立即写入 localStorage            │
  │ (优先级高，立即生效)            │
  │ latency: <1ms                   │
  │ failure: 用户离线时可用         │
  └─────────────────────────────────┘
  ↓
  ┌─────────────────────────────────┐
  │ 后台异步上传 CloudBase           │
  │ (优先级中，确保持久化)           │
  │ latency: 100-500ms               │
  │ failure: 静默失败，本地数据不丢  │
  └─────────────────────────────────┘
  ↓
用户读取 (读出)
  ↓
  优先使用 localStorage (最新)
  如需同步跨设备 → 从 CloudBase 拉取
```

### 备份恢复

```
场景 1: 网络故障
用户编辑标签 → localStorage 保存成功 ✅
CloudBase 上传失败 ⚠️
→ 用户重载页面 → 从 localStorage 恢复 ✅

场景 2: 跨设备同步
设备 A: 添加标签 → localStorage + CloudBase
设备 B: 重新加载 → cloudFetchSettings() → 获取最新数据 ✅

场景 3: localStorage 损坏
尝试恢复 → cloudFetchSettings() 从 CloudBase 拉取 ✅
```

---

## 🔐 认证架构

```
┌─────────────────────────────────────────────────────┐
│          CloudBase 匿名认证流程                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  用户首次访问                                       │
│     ↓                                                │
│  ensureAnonymousLogin()                            │
│     ↓                                                │
│  auth.signInAnonymously()                          │
│     ↓                                                │
│  生成唯一 uid (用户标识)                           │
│     ↓                                                │
│  uid 存储在浏览器 LocalStorage                     │
│     ↓                                                │
│  后续访问时自动读取 uid，无需重新登录              │
│     ↓                                                │
│  用户删除 LocalStorage → uid 丢失 → 重新生成       │
│     ↓                                                │
│  新 uid ≠ 旧 uid → 自动创建新用户数据             │
│                                                      │
│  特点:                                              │
│  ✅ 无需账户密码                                    │
│  ✅ 完全自动化                                      │
│  ✅ 跨设备同步 (uid 相同时)                       │
│  ✅ 隐私友好 (无用户追踪)                         │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 📊 存储分层

```
┌──────────────────────────────────────────────────┐
│            速度 (Latency)                        │
├──────────────────────────────────────────────────┤
│                                                   │
│  React State (内存)              <1ms            │
│  ├─ answers (当前表单数据)                      │
│  ├─ customTags (自定义标签)                    │
│  └─ photos (已上传照片)                        │
│                                                   │
│  localStorage (本地浏览器存储)    <10ms          │
│  ├─ "journal-custom-tags"                      │
│  ├─ "exif-user-api-config"                     │
│  └─ "journal-sound"                            │
│                                                   │
│  CloudBase 数据库 (云端)          100-500ms      │
│  ├─ user_settings 集合                         │
│  │  └─ { uid, customTags, apiConfigs, ... }   │
│  └─ 自动备份、跨设备同步                        │
│                                                   │
│  COS (腾讯对象存储)               1-5s           │
│  └─ 用户上传的照片、生成的成图                  │
│                                                   │
└──────────────────────────────────────────────────┘
```

---

## 🚀 生成流程

```
┌─────────────────────────────────────────────────┐
│            用户点击「生成」按钮                   │
├─────────────────────────────────────────────────┤
│                                                  │
│  1️⃣ 收集用户输入                               │
│  answers = {                                    │
│    scene: "一次旅程",                           │
│    mood: ["松弛", "怀旧"],                      │
│    details: { destination: "日本" },            │
│    customTags: { mood: ["舒适"] },              │
│    vibes: ["治愈"],                             │
│    ...                                          │
│  }                                              │
│                                                  │
│  2️⃣ 调用 VLM 识别照片                          │
│  visionClient.analyzePhotosBatch()              │
│  ├─ qwen3-vl 模型                              │
│  ├─ 识别 scene、tone、mood、keywords           │
│  └─ 存储到 answers.visionTags                  │
│                                                  │
│  3️⃣ 合成 Prompt                               │
│  modelClient.buildPrompt(answers)              │
│  ├─ 拼接场景、情绪、视觉风味                   │
│  ├─ 融入 customTags                            │
│  └─ 生成复杂的 Prompt 字符串                   │
│                                                  │
│  4️⃣ 调用图生图 API                             │
│  ├─ SDXL / Flux / SeeDream (根据选择)         │
│  ├─ 传输 prompt + 照片                         │
│  └─ 返回生成的图片 URL                         │
│                                                  │
│  5️⃣ 保存成果                                   │
│  ├─ JournalDraft (页面数据)                    │
│  ├─ SavedTemplate (用户模板)                   │
│  └─ 自动上传到 CloudBase                      │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 🔗 API 调用链

```
App.tsx
  ↓
onGenerateClick()
  ├─ visionClient.analyzePhotosBatch() 
  │  └─ POST /qwen3-vl (图像识别)
  │
  ├─ modelClient.buildPrompt()
  │  └─ 本地拼接 Prompt
  │
  └─ modelClient.generateImage()
     ├─ POST /sdxl 或
     ├─ POST /flux 或
     └─ POST /seedream (图生图)
         ↓
         返回 { generatedImageUrl, ... }
         ↓
         保存到 CloudBase + COS
```

