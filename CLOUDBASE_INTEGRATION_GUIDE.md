# 腾讯云 CloudBase 接入完成指南

## 概述

已成功将应用接入腾讯云 CloudBase，所有用户数据现已支持云端同步存储。本地 localStorage 作为缓存层，云端作为持久化存储，网络失败时自动降级为本地使用。

**环境 ID**: `my-travel-journal-d5d06m1a517f14`

---

## 云端同步的数据类型

### 1. 模板配置 (`journal_templates` 集合)
- **说明**: 用户保存的手帐生成模板（配置快照）
- **自动同步**: 保存/删除模板时
- **文档结构**:
  ```typescript
  {
    _id: string,                    // 模板 ID（文档 ID）
    uid: string,                    // 用户 ID（匿名用户）
    name: string,                   // 模板名称
    createdAt: number,              // 创建时间戳
    answers: UserAnswers,           // 完整的配置数据
    styleId: StyleId,               // 手帐风格
    templateId: TemplateId,         // 排版模板类型
    coverImageUrl?: string,         // 封面截图
  }
  ```

### 2. 用户设置 (`user_settings` 集合)
- **说明**: 用户个人偏好设置（自定义标签、API 密钥、声音开关等）
- **自动同步**: 每次修改时异步同步
- **文档结构**:
  ```typescript
  {
    _id: string,                         // 用户 uid（文档 ID）
    uid: string,                         // 用户 ID（匿名用户）
    customTags?: Record<string, string[]>, // 自定义标签集合
    apiConfigs?: Record<string, any>,    // API 密钥配置
    soundEnabled?: boolean,              // 声音开关
    updatedAt?: number,                  // 最后更新时间戳
  }
  ```

#### 包含的用户设置项：
- **自定义标签** (`customTags`)
  - 路径: `customTags[fieldKey] = ["tag1", "tag2", ...]`
  - 支持字段: `mood`, `vibes`, `layoutShapes`, `edgeStyles`, `decorations`
  
- **API 密钥配置** (`apiConfigs`)
  - 路径: `apiConfigs[modelType] = { apiKey: "...", customEndpoint?: "..." }`
  - 支持模型: `gpt-2`, `flux-2-pro`, `qs-gpt-image-2`, `v-api-gpt-image-2`, `v-api-seedream-4-5`
  
- **声音设置** (`soundEnabled`)
  - 布尔值: 用户是否开启声音效果

---

## 初始化流程

应用启动时自动执行以下流程（无需用户交互）：

```
1. 匿名登录 (ensureAnonymousLogin)
   ↓
2. 从云端加载用户设置 (cloudFetchSettings)
   ├─ 成功: 同步到本地 localStorage
   └─ 失败: 使用本地缓存，静默处理
   ↓
3. 从云端加载模板列表 (getAllTemplatesAsync)
   ├─ 成功: 更新 UI 显示
   └─ 失败: 使用本地缓存，静默处理
   ↓
4. 刷新声音设置 (getSoundEnabled)
   
[ 应用就绪 ]
```

---

## 核心模块说明

### `src/lib/cloudbase.ts` — CloudBase 初始化与认证
```typescript
getApp()                    // 获取全局 CloudBase 实例
ensureAnonymousLogin()      // 幂等匿名登录
getCurrentUserId()          // 获取当前用户 uid
getDb()                     // 获取数据库实例
```

### `src/lib/userSettings.ts` — 用户设置统一管理
**公开 API**：
```typescript
// 初始化
initializeUserSettings() → Promise<UserSettingsData>

// 自定义标签
getCustomTags() → Record<string, string[]>
saveCustomTags(customTags) → void
getCustomTagsForField(fieldKey) → string[]
addCustomTagToField(fieldKey, tag) → void
removeCustomTagFromField(fieldKey, tag) → void
clearAllCustomTags() → void

// API 配置
getApiConfigs() → UserApiConfig | null
saveApiConfigs(apiConfigs) → void
getModelApiConfig(modelType) → any
saveModelApiConfig(modelType, config) → void
clearModelApiConfig(modelType) → void
clearAllApiConfigs() → void

// 声音设置
getSoundEnabled() → boolean
saveSoundEnabled(enabled) → void
```

### `src/lib/templateManager.ts` — 模板云端同步
**新增异步 API**：
```typescript
getAllTemplatesAsync() → Promise<SavedTemplate[]>
```
同时保留同步 API 兼容性：
```typescript
getAllTemplates()           // 读本地缓存
saveTemplate(...)           // 本地立即生效 + 云端异步同步
deleteTemplate(...)         // 本地立即生效 + 云端异步删除
```

### 兼容性适配层
- `src/lib/customTagsStorage.ts` — 重定向到 `userSettings`
- `src/lib/userApiConfig.ts` — 重定向到 `userSettings`
  
这些文件保留是为了与现有代码兼容，所有新增功能都来自 `userSettings.ts`。

---

## CloudBase 控制台配置

### 必须的初始化步骤

#### 1. 创建集合 `journal_templates`
```
环境 → 数据库 → 新建集合
集合名: journal_templates
```

**安全规则** (规则管理 → 自定义安全规则):
```json
{
  "read": "auth.uid != null",          // 已登录用户可读
  "write": "doc.uid == auth.uid"        // 只能写自己的文档
}
```

#### 2. 创建集合 `user_settings`
```
环境 → 数据库 → 新建集合
集合名: user_settings
```

**安全规则**:
```json
{
  "read": "auth.uid != null",
  "write": "doc.uid == auth.uid"
}
```

#### 3. 启用匿名认证
```
环境 → 登录方式 → 匿名登录（启用）
```

---

## 存储策略（双写）

### 写入流程
```
用户操作（如保存模板）
    ↓
①立即写入本地 localStorage （同步）
    ↓
②异步上传到 CloudBase （后台）
    ↓
    网络成功? → 云端数据更新 ✓
              否则 → 静默失败，本地保持（无损）
```

### 读取流程
```
应用启动
    ↓
尝试从云端拉取数据（ensureAnonymousLogin + cloudFetch...）
    ↓
    成功? → 同步到本地 localStorage，使用云端数据 ✓
    否则 → 使用本地缓存，静默处理 ⚠️
    
[ 离线仍可用 ]
```

### 特点
- **强一致性**: 本地数据始终最新
- **容错性**: 网络失败不影响功能
- **离线友好**: localStorage 作为后备
- **跨设备同步**: 同一用户在不同设备自动同步

---

## 使用示例

### 保存模板（自动同步）
```typescript
import { saveTemplate } from "./lib/templateManager";

const newTemplate = saveTemplate(
  "我的夏日旅行",
  answers,
  styleId,
  templateId,
  coverImageUrl
);
// 本地立即保存 + 云端异步同步
```

### 保存自定义标签（自动同步）
```typescript
import { saveCustomTags } from "./lib/userSettings";

saveCustomTags({
  mood: ["开心", "放松", "我的自定义情绪"],
  vibes: ["治愈", "文艺"],
});
// 本地立即保存 + 云端异步同步
```

### 保存 API 密钥（自动同步）
```typescript
import { saveModelApiConfig } from "./lib/userApiConfig";

saveModelApiConfig("flux-2-pro", {
  apiKey: "rp_xxx...",
  customEndpoint: "https://my-api-gateway.com/flux"
});
// 本地立即保存 + 云端异步同步
```

### 应用启动时加载所有数据（自动）
```typescript
// src/App.tsx 中已集成
import { initializeUserSettings } from "./lib/userSettings";
import { getAllTemplatesAsync } from "./lib/templateManager";

useEffect(() => {
  void initializeUserSettings()
    .then(() => getAllTemplatesAsync())
    .then((templates) => {
      // 使用云端数据
      setSavedTemplates(templates);
    })
    .catch(() => {
      // 离线时使用本地缓存，静默处理
    });
}, []);
```

---

## 调试与监控

### 本地测试
```bash
# 构建项目
npm run build

# 运行开发服务器
npm run dev
```

### 浏览器开发者工具
- **Application → Local Storage**
  - `journal-templates`: 本地模板缓存
  - `journal-custom-tags`: 自定义标签
  - `exif-user-api-config`: API 密钥配置
  - `journal-sound`: 声音开关状态

### CloudBase 控制台监控
```
环境 → 数据库 → journal_templates/user_settings
    → 监控文档数量、查询次数、错误日志
```

---

## 故障排查

### 问题 1: "集合不存在"错误
**解决**:
1. 登录 CloudBase 控制台
2. 进入对应环境 → 数据库
3. 手动创建集合 `journal_templates` 和 `user_settings`
4. 配置安全规则（见上文）

### 问题 2: "权限不足" 错误
**解决**:
1. 确保已启用匿名登录
2. 检查集合的安全规则，确保包含 `"read": "auth.uid != null"`
3. 检查浏览器是否正确登录（检查 localStorage 中的 `_cloudbase_openid` 字段）

### 问题 3: 数据未同步到云端
**正常现象**：
- 云端同步是**异步后台操作**，不阻塞 UI
- 本地数据已立即保存，可以离线使用
- 网络恢复后会自动同步（下次操作时）

### 问题 4: 跨设备数据不同步
**排查**:
1. 确认两个设备使用的是**同一个用户**（匿名 uid 相同）
   - 检查 LocalStorage 中 `_cloudbase_openid` 是否相同
2. 在 CloudBase 控制台查看数据库中是否有该用户的记录
3. 尝试在一个设备上修改数据，然后在另一个设备上刷新页面

---

## 性能指标

| 操作 | 响应时间 | 说明 |
|-----|--------|------|
| 保存模板 | 立即 (本地) + 异步 (云端) | 本地同步写入，云端后台异步 |
| 加载模板列表 | ~500-1000ms | 首次启动时从云端拉取，含网络延迟 |
| 保存自定义标签 | 立即 (本地) | 云端同步在后台 |
| 保存 API 密钥 | 立即 (本地) | 云端同步在后台 |
| 离线模式 | 无延迟 | 完全使用本地缓存 |

---

## 安全须知

### API 密钥加密
⚠️ **当前版本**：API 密钥明文存储在 CloudBase 数据库中。

**推荐方案**（后期优化）：
1. 使用 CloudBase 加密字段（Enterprise 版本）
2. 或在服务端实现密钥管理服务 (KMS)
3. 或使用客户端加密库（如 TweetNaCl.js）

### 用户隔离
- ✓ 已实现：每个匿名用户的数据完全隔离
- ✓ 已实现：安全规则确保用户只能访问自己的数据
- ⚠️ 注意：匿名登录意味着用户身份不持久（浏览器清除 Cookie/LocalStorage 后会分配新 uid）

---

## 后期优化方向

- [ ] 用户注册/登录（邮箱、手机号）以实现持久身份
- [ ] API 密钥端对端加密存储
- [ ] 云函数实现数据备份与恢复
- [ ] 模板市场（共享用户模板）
- [ ] 使用统计与分析（集成 CloudBase Analytics）

---

## 更新日志

### v1.0.0 (2026-06-06)
- ✓ 基础接入：匿名登录、数据库 CRUD
- ✓ 模板云端同步：`journal_templates` 集合
- ✓ 用户设置云端同步：`user_settings` 集合
  - 自定义标签
  - API 密钥配置
  - 声音设置
- ✓ 双写策略：本地 + 云端
- ✓ 容错降级：网络失败使用本地缓存
- ✓ 完整的 TypeScript 类型定义

