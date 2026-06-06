# EXIF 项目代码探索报告

## 📋 项目概览

**项目名称**: EXIF（旅行日记生成系统）  
**工作目录**: `/Users/dingjiangying/github/exif`  
**技术栈**: React + TypeScript + Vite + CloudBase  
**主要功能**: 用户选择场景、情绪、视觉风味，AI 自动生成手帐风格的旅行日记

---

## 1️⃣ 表单字段和预设选项

### 📍 主文件路径
**`/Users/dingjiangying/github/exif/src/data/presets.ts`** （全部表单选项的中央定义）

### 🎯 核心表单字段结构

#### **A. 场景细节字段** (`sceneOptions`)
```typescript
export const sceneOptions: SceneOption[] = [
  {
    name: "一次旅程",      // 场景名称
    tag: "旅行",          // 简短标签
    fields: [             // 该场景下的字段
      { key: "destination", label: "目的地", placeholder: "例如：日本 · 富士山" },
      { key: "duration", label: "行程", options: ["一日往返", "周末两日", ...] },
      { key: "companions", label: "同行人", options: [...], multiple: false },
      { key: "transport", label: "主要交通", options: [...], multiple: true },
      ...
    ]
  },
  // 其他场景...
]
```

**包含的6个场景**:
1. **一次旅程** - 目的地、行程、同行人、交通、天气、印象
2. **城市散步** - 街区、路线、停留小店、天气
3. **周末日常** - 地点、活动、物品、**今天的氛围**
4. **朋友聚会** - 聚会缘由、人数关系、地点、**菜系/酒水** ✅
5. **独处片刻** - 地点、活动、陪伴媒体、**心情关键词**
6. **纪念日** - 纪念主题、为谁、地点、仪式

#### **B. 情绪标签** (`moodOptions`)
```typescript
export const moodOptions = ["松弛", "热烈", "怀旧", "奇遇", "安静", "明亮", "浪漫", "像电影"];
```
→ **UI 位置**: 第一步（场景选择）之后，作为独立的 `EditableTagGroup` 组件

#### **C. 视觉风味相关选项**

| 选项类型 | 变量名 | 选择模式 | 示例 | 备注 |
|---------|--------|---------|------|------|
| **色调** | `paletteOptions` | 单选 | 暖色胶片、冷色清透 | 6个选项 |
| **氛围** | `vibeOptions` | 多选 | 治愈、松弛、复古、夏日感... | 14个选项 |
| **排版形状** | `layoutShapeOptions` | 多选 | 方形、圆形、爱心、几何、抠图 | 6个选项 |
| **照片边缘** | `edgeStyleOptions` | 多选 | 撕纸边、相框、电影胶片、宝丽得 | 8个选项 |
| **装饰元素** | `decorationOptions` | 多选 | 小猫、纸飞机、星星、花朵、胶带 | 10个选项 |
| **底图纸张** | `paperOptions` | 单选 | 米色道林纸、宣纸、牛皮纸 | 7个选项 |
| **主色调** | `mainColorOptions` | 单选(可不选) | 樱花粉、天空蓝、薄荷绿... | 10个颜色 |

---

## 2️⃣ EditableTagGroup 组件

### 📍 文件位置
**`/Users/dingjiangying/github/exif/src/components/EditableTagGroup.tsx`** （162 行）

### 🎨 组件功能

```typescript
interface EditableTagGroupProps {
  title: string;                          // 组标题
  defaultTags: string[];                  // 默认标签列表
  customTags?: string[];                  // 用户自定义标签
  selectedTags?: string[];                // 当前选中的标签
  onAddTag: (newTag: string) => void;     // 添加新标签回调
  onRemoveTag: (tag: string) => void;     // 删除标签回调
  onToggleTag: (tag: string) => void;     // 切换选中状态回调
  onSound: (effect: SoundEffect) => void; // 音效回调
  hint?: string;                          // 组提示文本
  isMultiple?: boolean;                   // 是否支持多选（保留字段）
}
```

### 🔄 组件核心逻辑

1. **显示所有标签**
   - 默认标签 + 自定义标签混合展示
   - 选中状态高亮
   - 自定义标签带红色删除按钮 (❌)
   - 受保护标签带锁图标 (🔒)

2. **添加自定义标签**
   - 点击「+ 添加」按钮 → 弹出行内输入框
   - 输入新标签 → Enter 确认或 Esc 取消
   - 触发 `onAddTag` 回调

3. **删除自定义标签**
   - 仅自定义标签可删除（默认标签受保护）
   - 删除前检查 `canRemoveTag()` - 至少保留 2 个默认标签
   - 触发 `onRemoveTag` 回调

4. **标签选中切换**
   - 点击标签名切换选中状态
   - 触发 `onToggleTag` 回调
   - 配合音效反馈

### 📍 在 App 中的使用（5处）

| 位置 | 标签类型 | 默认选项 | 自定义存储位置 |
|-----|---------|---------|--------------|
| 1️⃣ 第1步 | 情绪 (mood) | `moodOptions` | `answers.customTags?.mood` |
| 2️⃣ 视觉风味 | 氛围 (vibes) | `vibeOptions` | `answers.customTags?.vibes` |
| 3️⃣ 视觉风味 | 排版形状 | `layoutShapeLabels` | `answers.customTags?.layoutShapes` |
| 4️⃣ 视觉风味 | 照片边缘 | `edgeStyleLabels` | `answers.customTags?.edgeStyles` |
| 5️⃣ 视觉风味 | 装饰元素 | `decorationLabels` | `answers.customTags?.decorations` |

---

## 3️⃣ 自定义选项实现方式

### 📍 核心文件链

```
userSettings.ts (主实现)
    ↓
customTagsStorage.ts (兼容层 - 仅转发调用)
    ↓
App.tsx (使用层)
```

### 🏗️ 三层架构

#### **第1层：本地存储 + 云端同步** (`userSettings.ts`)

**数据模型**:
```typescript
interface UserSettingsData {
  customTags?: Record<string, string[]>;  // { fieldKey: ["tag1", "tag2"] }
  apiConfigs?: UserApiConfig;
  soundEnabled?: boolean;
  updatedAt?: number;
}
```

**核心函数**:

| 函数 | 用途 | 存储位置 |
|-----|------|---------|
| `getCustomTags()` | 获取所有自定义标签 | localStorage + CloudBase |
| `saveCustomTags(tags)` | 保存所有标签（双写策略） | localStorage (立即) + CloudBase (异步) |
| `getCustomTagsForField(fieldKey)` | 获取某字段的自定义标签 | 从 getCustomTags() 提取 |
| `addCustomTagToField(fieldKey, tag)` | 添加自定义标签 | 更新 customTags → 保存 |
| `removeCustomTagFromField(fieldKey, tag)` | 删除自定义标签 | 更新 customTags → 保存 |
| `clearAllCustomTags()` | 清空所有自定义标签 | 清空 localStorage + CloudBase |

**关键设计**:
```typescript
export function saveCustomTags(customTags: Record<string, string[]>): void {
  // 1. 立即保存到本地 localStorage（优先级高）
  localSaveField(CUSTOM_TAGS_KEY, customTags);
  
  // 2. 异步上传到云端（背景执行，失败时静默）
  void cloudSaveSettings({ customTags, updatedAt: Date.now() });
}
```

**存储键**:
- localStorage key: `"journal-custom-tags"`
- CloudBase 集合: `"user_settings"`
- 文档 ID: 用户 uid

#### **第2层：兼容层** (`customTagsStorage.ts`)

```typescript
// 保持向后兼容，所有调用转发到 userSettings.ts
export const getAllCustomTags = (): Record<string, string[]> => 
  getCustomTags();

export const saveCustomTags = (customTags: Record<string, string[]>): void => 
  cloudSaveCustomTags(customTags);
```

#### **第3层：使用层** (`App.tsx`)

```typescript
// 初始化时从 CloudBase 加载
const [answers, setAnswers] = useState<UserAnswers>({
  ...initialAnswers,
  customTags: getAllCustomTags(),  // 从存储恢复
});

// 添加自定义标签
const onAddCustomTag = (fieldKey: string, newTag: string) => {
  setAnswers((current) => {
    const customTags = current.customTags ?? {};
    const fieldTags = customTags[fieldKey] ?? [];
    const updated = addTag(newTag, fieldTags);  // 调用 tagManager
    
    const nextCustomTags = { ...customTags, [fieldKey]: updated };
    return { ...current, customTags: nextCustomTags };
  });
};

// 删除自定义标签
const onRemoveCustomTag = (fieldKey: string, tag: string, defaultTags: string[]) => {
  setAnswers((current) => {
    const customTags = current.customTags ?? {};
    const fieldTags = customTags[fieldKey] ?? [];
    const selected = current[fieldKey as keyof UserAnswers] as string[];
    
    const { customTags: updatedCustom, selectedTags: updatedSelected } = 
      removeTag(tag, defaultTags, fieldTags, selected);
    
    const nextCustomTags = { ...customTags, [fieldKey]: updatedCustom };
    return { ...current, customTags: nextCustomTags, [fieldKey]: updatedSelected };
  });
};
```

### 🛡️ 标签管理规则 (`tagManager.ts`)

```typescript
// 1. 添加标签
export function addTag(newTag: string, customTags?: string[]): string[] {
  const trimmed = newTag.trim();
  if (!trimmed || (customTags ?? []).includes(trimmed)) return customTags ?? [];
  return [...(customTags ?? []), trimmed];  // 去重 + 追加
}

// 2. 删除标签
export function removeTag(
  tag: string,
  defaultTags: string[],
  customTags?: string[],
  selectedTags?: string[]
) {
  // 自定义标签 → 直接删除
  if (customTags?.includes(tag)) {
    return {
      customTags: (customTags ?? []).filter((t) => t !== tag),
      selectedTags: (selectedTags ?? []).filter((t) => t !== tag),
    };
  }
  
  // 默认标签 → 检查删除后是否还有至少 2 个
  if (defaultTags.includes(tag)) {
    if (defaultTags.filter((t) => t !== tag).length < 2) {
      return { customTags: customTags ?? [], selectedTags: selectedTags ?? [] };  // 拒绝删除
    }
  }
}

// 3. 检查是否可删除
export function canRemoveTag(tag: string, defaultTags: string[], customTags?: string[]): boolean {
  // 自定义标签总是可删除
  if (customTags?.includes(tag)) return true;
  
  // 默认标签：删除后保持 ≥2 个才能删除
  if (defaultTags.includes(tag)) {
    return defaultTags.filter((t) => t !== tag).length >= 2;
  }
  
  return false;
}
```

**保护机制**: 至少保留 2 个默认标签（每个字段独立）

---

## 4️⃣ 与后端/云服务集成

### 📍 核心文件

#### **A. CloudBase 初始化** (`cloudbase.ts`)

```typescript
const ENV_ID = "my-travel-journal-d5d06m1a517f14";
const REGION = "ap-shanghai";

export function getApp() {
  if (!_app) {
    _app = cloudbase.init({ 
      env: ENV_ID,
      region: REGION,
      auth: { detectSessionInUrl: true },
    });
  }
  return _app;
}
```

**功能模块**:

| 功能 | 函数 | 用途 |
|------|------|------|
| 匿名登录 | `ensureAnonymousLogin()` | 确保用户已登录（幂等） |
| 获取用户ID | `getCurrentUserId()` | 返回 uid（匿名用户ID） |
| 获取认证会话 | `getCurrentSession()` | 返回认证会话信息 |
| 获取数据库实例 | `getDb()` | 返回 CloudBase 数据库客户端 |
| 调用云函数 | `getVApiKeyFromCloudFunction()` | 从云函数获取 V-API Key |

#### **B. 数据库操作** (`userSettings.ts` 的 cloudSaveSettings)

```typescript
// 从云端拉取用户设置（初始化时调用）
export async function cloudFetchSettings(): Promise<UserSettingsData> {
  await ensureAnonymousLogin();
  const uid = await getCurrentUserId();
  
  const db = getDb();
  const result = await db.collection("user_settings").doc(uid).get();
  
  const settings = (result.data?.[0] ?? {}) as UserSettingsData;
  // 同时更新本地缓存
  return settings;
}

// 上传用户设置到云端（完整覆盖）
async function cloudSaveSettings(settings: UserSettingsData): Promise<void> {
  await ensureAnonymousLogin();
  const uid = await getCurrentUserId();
  
  const db = getDb();
  await db.collection("user_settings").doc(uid).set({
    ...settings,
    uid,
    updatedAt: Date.now(),
  });
}
```

**CloudBase 集合结构**:
```
集合: user_settings
├── 文档 ID: {uid}
├── customTags: { mood: ["自定义1"], vibes: [...], ... }
├── apiConfigs: { ... }
├── soundEnabled: true/false
└── updatedAt: 1717649400000
```

#### **C. 云函数调用** (`cloudbase.ts`)

```typescript
export async function getVApiKeyFromCloudFunction(): Promise<string | null> {
  const app = getApp();
  await ensureAnonymousLogin();
  
  const result = await app.callFunction({
    name: "getVApiKey",  // 云函数名
    data: {},
  });
  
  if (result?.result?.code === 0 && result.result?.data?.apiKey) {
    return result.result.data.apiKey;  // API Key
  }
  return null;
}
```

**云函数响应格式**:
```json
{
  "code": 0,
  "data": {
    "apiKey": "sk-..."
  }
}
```

### 🌐 数据同步流程

```
用户操作（添加自定义标签）
    ↓
setState() - 立即更新 React 状态
    ↓
执行 onAddCustomTag / onRemoveCustomTag
    ↓
调用 saveCustomTags(updatedTags)
    ↓
┌─────────────────────────────────┐
│ 双写策略                         │
├─────────────────────────────────┤
│ 1. 同步写入 localStorage         │
│    (立即生效，用户重载页面时恢复)│
│                                  │
│ 2. 异步上传 CloudBase           │
│    (后台执行，网络失败时静默)   │
└─────────────────────────────────┘
    ↓
app.tsx 引入时 getAllCustomTags() 恢复数据
    ↓
用户重新访问页面 → 自动从 CloudBase 加载全量数据
```

### 🔒 安全措施

1. **匿名认证** - 用户无需登录账户，自动生成 uid
2. **LocalStorage 备份** - 网络失败时自动降级
3. **错误静默处理** - CloudBase 操作失败时不抛出错误（用户无感知）
4. **幂等操作** - `ensureAnonymousLogin()` 多次调用安全

---

## 5️⃣ 表单页面主文件

### 📍 主要文件

| 文件 | 行数 | 用途 |
|-----|------|------|
| **App.tsx** | 2860 | 核心应用 + 全部表单组件 |
| **types.ts** | 128 | TypeScript 类型定义 |
| **data/presets.ts** | 336 | 所有选项预设数据 |
| **components/EditableTagGroup.tsx** | 162 | 自定义标签组件 |

### 📊 App.tsx 组件结构

```
App()
├── AppContent()  [主容器，2615 行]
│   ├── 📋 第1步：选择场景
│   │   ├── QuestionGroup (场景选择)
│   │   ├── SceneDetails (场景详细字段)
│   │   └── EditableTagGroup (情绪标签)
│   │
│   ├── 📋 第2步：选择叙述方式 + 倾诉
│   │   ├── QuestionGroup (叙述方式)
│   │   └── textarea (倾诉记录)
│   │
│   ├── 📋 第3步：视觉风味
│   │   └── VisualFlavorPanel()
│   │       ├── 色调 (单选 chip)
│   │       ├── EditableTagGroup (氛围)
│   │       ├── EditableTagGroup (排版形状)
│   │       ├── EditableTagGroup (照片边缘)
│   │       ├── EditableTagGroup (装饰元素)
│   │       ├── 底图纸张 (单选 chip)
│   │       └── 主色调 (单选 chip 可不选)
│   │
│   ├── 📋 第4步：照片识别 + 生成
│   │   ├── PhotoVisionPanel() [VLM 自动识别]
│   │   ├── 生成按钮
│   │   └── GeneratedShowcase() [成图展示]
│   │
│   └── 📋 第5步：成图管理
│       ├── TemplateDetailModal() [模板详情]
│       ├── PhotoManagerModal() [图片管理]
│       └── 发布/保存按钮
│
├── QuestionGroup()  [通用问卷分组组件]
├── ChoiceButton()   [选项按钮]
├── VisualFlavorPanel()  [视觉风味总容器]
├── FlavorGroup()    [视觉风味子分组]
├── PhotoVisionPanel()   [图片识别面板]
├── GeneratedShowcase()  [成图展示模态框]
├── InfoModal()      [信息展示模态框]
├── SceneDetails()   [场景细节表单]
├── SceneDetailControl()  [场景字段控制]
├── PhotoManagerModal()   [图片管理模态框]
├── TemplateDetailModal() [模板详情模态框]
└── DrawingOverlay() [绘图覆盖层]
```

### 🎯 关键状态管理

```typescript
const [answers, setAnswers] = useState<UserAnswers>({
  scene: "",                    // 选择的场景
  mood: ["怀旧", "像电影"],    // 情绪 (多选)
  narrator: "",                 // 叙述方式
  density: "balanced",          // 内容密度
  titleSeed: "",               // 标题种子
  selectedModel: "sdxl",        // 选择的模型
  details: {},                  // 场景字段 (动态)
  palette: undefined,           // 色调 (单选)
  mainColor: undefined,         // 主色调 (单选)
  vibes: [],                    // 氛围 (多选)
  layoutShapes: [],             // 排版形状 (多选)
  edgeStyles: [],               // 照片边缘 (多选)
  decorations: [],              // 装饰元素 (多选)
  paperTexture: undefined,      // 底图纸张 (单选)
  visionTags: {},               // VLM 识别标签
  customTags: {},               // ⭐ 用户自定义标签
  confessionText: "",           // 倾诉记录
  includeConfessionInImage: true,
  showConfessionInImage: false,
});
```

### 🎬 主要回调函数

```typescript
const toggleMood = (mood: string) => {...}           // 切换情绪
const onToggleAnswerList = (key, value) => {...}     // 切换多选列表
const onSetSingleChoice = (key, value) => {...}      // 设置单选
const onSetAnswers = (fn) => {...}                   // 更新答案
const onAddCustomTag = (fieldKey, newTag) => {...}   // 添加自定义标签
const onRemoveCustomTag = (fieldKey, tag, defaults) => {...}  // 删除自定义标签
const onSound = (effect) => {...}                    // 播放音效
```

---

## 📁 完整文件结构

```
src/
├── App.tsx                          [2860行] 核心应用 + 全部 UI
├── main.tsx                         入口文件
├── types.ts                         [128行] 全局 TS 类型
├── styles.css                       样式表
│
├── components/
│   ├── EditableTagGroup.tsx         [162行] ⭐ 自定义标签组件
│   ├── AuthPage.tsx                 认证页面
│   ├── PasswordLogin.tsx             密码登录
│   ├── EmailSignUp.tsx              邮箱注册
│   ├── UsernameSignUp.tsx           用户名注册
│   └── ErrorBoundary.tsx            错误边界
│
├── contexts/
│   └── AuthContext.tsx              认证上下文
│
├── data/
│   └── presets.ts                   [336行] ⭐ 所有表单选项数据
│
├── lib/
│   ├── userSettings.ts              [248行] ⭐ 云端同步核心实现
│   ├── customTagsStorage.ts         [57行]  兼容层（转发到 userSettings）
│   ├── tagManager.ts                [106行] ⭐ 标签管理工具
│   ├── cloudbase.ts                 [113行] ⭐ CloudBase SDK 封装
│   │
│   ├── modelClient.ts               AI 模型调用
│   ├── modelRouter.ts               模型路由
│   ├── modelConfig.ts               模型配置
│   ├── visionClient.ts              VLM 图像识别
│   │
│   ├── templateManager.ts           模板管理（云端同步）
│   ├── userApiConfig.ts             用户 API 配置
│   ├── cosUploader.ts               腾讯 COS 上传
│   │
│   ├── ApiConfigPanel.tsx           API 配置面板
│   ├── ErrorAlert.tsx               错误提示组件
│   ├── soundEffects.ts              音效管理
│   ├── imageTools.ts                图像处理工具
│   ├── format.ts                    数据格式化
│   ├── samplePhotos.ts              示例照片
│   └── api-keys.local.ts            本地 API Key
│
└── hooks/
    └── useAuthFlow.ts               认证流程 Hook
```

---

## 📌 关键发现总结

### ✅ 自定义选项体系
- **5处 EditableTagGroup** - 分别用于：情绪、氛围、排版形状、照片边缘、装饰元素
- **标签保护机制** - 每个字段至少保留 2 个默认标签
- **去重避免** - 添加时自动去重检查

### ✅ 云端同步机制
- **双写策略** - localStorage (快) + CloudBase (稳)
- **网络降级** - 失败时静默，用户无感知
- **幂等匿名登录** - 无需账户，自动生成 uid

### ✅ 数据流向
```
用户输入 → React State → localStorage + CloudBase
        ↓ 重载页面 ↓
CloudBase → React State → 恢复选项
```

### ✅ 文档 ID 策略
- CloudBase 中用 uid（匿名用户 ID）作为文档 ID
- 同一用户跨设备同步数据

---

## 🚀 使用示例

### 初始化自定义标签
```typescript
import { getAllCustomTags, saveCustomTags } from "./lib/customTagsStorage";

const customTags = getAllCustomTags();
// { mood: ["舒适", "治愈"], vibes: ["公路片"] }
```

### 添加新的自定义标签
```typescript
const onAddCustomTag = (fieldKey: string, newTag: string) => {
  setAnswers((current) => {
    const customTags = current.customTags ?? {};
    const fieldTags = customTags[fieldKey] ?? [];
    const updated = addTag(newTag, fieldTags);  // tagManager.ts
    
    const nextCustomTags = { ...customTags, [fieldKey]: updated };
    return { ...current, customTags: nextCustomTags };
  });
  
  // 自动保存到云端（异步）
  saveCustomTags(answers.customTags);
};
```

### 在 EditableTagGroup 中使用
```typescript
<EditableTagGroup
  title="氛围（多选）"
  defaultTags={vibeOptions}                    // 14个默认选项
  customTags={answers.customTags?.vibes}       // 用户自定义
  selectedTags={answers.vibes}                 // 当前选中
  onAddTag={(newTag) => onAddCustomTag("vibes", newTag)}
  onRemoveTag={(tag) => onRemoveCustomTag("vibes", tag, vibeOptions)}
  onToggleTag={(tag) => onToggleAnswerList("vibes", tag)}
  onSound={onSound}
/>
```

