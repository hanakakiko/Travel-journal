# EXIF 项目代码探索 - 完整索引

本文档是对 `/Users/dingjiangying/github/exif` 项目的全面代码探索总结。

---

## 📚 已生成文档

### 1. **PROJECT_EXPLORATION_REPORT.md** (626 行)
   **完整的详细探索报告**
   - 项目概览
   - 表单字段和预设选项详解
   - EditableTagGroup 组件完整分析
   - 自定义选项三层架构实现
   - CloudBase 云端集成详解
   - App.tsx 主文件结构分析
   - 完整文件目录树
   
   **适合**: 需要深度理解项目架构的开发者

---

### 2. **QUICK_REFERENCE.md** (233 行)
   **快速查询手册**
   - 文件快速查找表
   - 表单字段清单
   - 关键函数速查
   - 标签保护规则
   - 认证流程简图
   - UI 交互流程
   - 常见问题排查
   
   **适合**: 需要快速查找信息的开发者

---

### 3. **ARCHITECTURE.md** (304 行)
   **系统架构和数据流**
   - 整体架构图
   - 模块依赖关系
   - 初始化流程详解
   - 添加/删除标签完整流程
   - 数据保护机制 (双写策略)
   - 认证架构
   - 存储分层图
   - 生成流程完整链路
   
   **适合**: 需要理解系统运行流程的架构师/高级开发者

---

## 🎯 快速导航

### 想要...请看

| 目标 | 文档 | 位置 |
|------|------|------|
| 查看所有表单选项 | PROJECT_EXPLORATION_REPORT | 第1️⃣章 |
| 理解 EditableTagGroup | PROJECT_EXPLORATION_REPORT | 第2️⃣章 |
| 学习自定义标签实现 | PROJECT_EXPLORATION_REPORT | 第3️⃣章 |
| 了解云端同步 | PROJECT_EXPLORATION_REPORT + ARCHITECTURE | 第4️⃣章 + 数据流向 |
| 找到特定文件 | QUICK_REFERENCE | 文件快速查找表 |
| 复制代码片段 | QUICK_REFERENCE | 💻关键函数速查 |
| 理解数据流 | ARCHITECTURE | 🔄数据流向详解 |
| 调试问题 | QUICK_REFERENCE | 🚨常见问题排查 |

---

## 🗂️ 核心文件速查

### 表单相关
```
/src/data/presets.ts          ← 所有表单选项的中央定义
/src/App.tsx                   ← 表单 UI + 逻辑
/src/types.ts                  ← UserAnswers 类型定义
```

### 自定义标签相关
```
/src/components/EditableTagGroup.tsx    ← 组件实现 (162 行)
/src/lib/userSettings.ts                ← 云端同步核心 (248 行)
/src/lib/customTagsStorage.ts           ← 兼容层 (57 行)
/src/lib/tagManager.ts                  ← 标签管理工具 (106 行)
```

### 云服务相关
```
/src/lib/cloudbase.ts                   ← CloudBase 初始化与 API
/src/lib/templateManager.ts             ← 模板云端存储
/src/lib/userApiConfig.ts               ← API 配置管理
```

### AI/生成相关
```
/src/lib/modelClient.ts                 ← 图生图 API 调用
/src/lib/visionClient.ts                ← VLM 图像识别
/src/lib/modelRouter.ts                 ← 模型路由
/src/lib/cosUploader.ts                 ← 图片上传到 COS
```

---

## 📊 项目数据模型

### 核心数据结构
```typescript
UserAnswers {
  // 场景相关
  scene: string                           // 选择的场景名
  details: Record<string, string>         // 动态场景字段
  
  // 表达相关
  mood: string[]                          // 情绪标签（多选）
  narrator: string                        // 叙述方式
  density: "rich" | "balanced"            // 内容密度
  confessionText: string                  // 倾诉记录
  
  // 视觉相关
  palette: string                         // 色调（单选）
  mainColor: string                       // 主色调（单选）
  vibes: string[]                         // 氛围（多选）
  layoutShapes: string[]                  // 排版形状（多选）
  edgeStyles: string[]                    // 照片边缘（多选）
  decorations: string[]                   // 装饰元素（多选）
  paperTexture: string                    // 底图纸张（单选）
  
  // AI 识别相关
  visionTags: Record<photoId, string[]>   // VLM 自动识别标签
  selectedModel: ModelType                 // 选择的 AI 模型
  
  // ⭐ 自定义标签
  customTags: {
    mood?: string[]
    vibes?: string[]
    layoutShapes?: string[]
    edgeStyles?: string[]
    decorations?: string[]
    [fieldKey]?: string[]
  }
}
```

### CloudBase 数据模型
```typescript
UserSettingsData {
  uid: string                              // 用户 ID
  customTags: {                            // 自定义标签
    mood?: ["自定义1", "自定义2"]
    vibes?: [...]
    layoutShapes?: [...]
    edgeStyles?: [...]
    decorations?: [...]
  }
  apiConfigs?: {                           // API 配置
    [modelType]: { apiKey, customEndpoint }
  }
  soundEnabled?: boolean                   // 声音设置
  updatedAt: number                        // 最后更新时间
}
```

---

## 🔑 关键概念

### 1. 双写策略 (Dual-Write)
```
用户操作 → localStorage (同步, <1ms)
        → CloudBase (异步, 100-500ms)
```
- **优点**: 离线可用 + 云端备份 + 跨设备同步
- **特点**: 写入立即生效, 网络失败自动降级

### 2. EditableTagGroup 组件
```
默认标签 (不可删) + 自定义标签 (可删)
           ↓
     用户可以添加新标签
           ↓
     每个字段至少保留 2 个默认标签
```

### 3. 匿名认证
```
第一次访问 → signInAnonymously() → 生成 uid
            ↓ 存储到 localStorage
后续访问 → 读取 uid → 自动登录
            ↓ 数据以 uid 为 ID 存储
跨设备 → 同一 uid → 自动同步
```

### 4. 三层架构
```
App.tsx (使用层)
   ↓
customTagsStorage.ts (兼容层)
   ↓
userSettings.ts (核心实现)
   ↓
cloudbase.ts (云端操作)
```

---

## 🚀 常见任务

### 添加新的自定义标签字段
1. 在 `App.tsx` 中找到对应的回调函数
2. 在 `EditableTagGroup` 中传入 fieldKey
3. 自动保存到 `answers.customTags[fieldKey]`
4. CloudBase 会自动同步

### 修改默认标签
1. 编辑 `/src/data/presets.ts` 中的选项
2. 例如修改 `moodOptions` 数组
3. EditableTagGroup 会自动显示新选项
4. 保护机制仍然生效 (≥2 个默认标签)

### 调试数据同步
```typescript
// 在浏览器控制台
localStorage.getItem("journal-custom-tags")  // 查看本地数据
getAllCustomTags()                           // 调用 API 查看
cloudFetchSettings()                         // 从云端拉取
```

### 清空用户数据
```typescript
clearAllCustomTags()      // 清空自定义标签
clearAllApiConfigs()      // 清空 API 配置
clearModelApiConfig(type) // 清空特定模型配置
```

---

## 🔐 数据安全

### LocalStorage 密钥
```
"journal-custom-tags"      → 自定义标签
"exif-user-api-config"     → API 配置
"journal-sound"            → 声音设置
```

### CloudBase 集合
```
环境 ID: my-travel-journal-d5d06m1a517f14
集合: user_settings
文档 ID: {uid}
```

### 删除策略
- ❌ 默认标签: 仅当 >2 个时可删
- ✅ 自定义标签: 随时可删
- 🔒 受保护: 最后 2 个默认标签不能删

---

## 📈 统计信息

| 指标 | 数值 |
|------|------|
| 总代码行数 | ~31 个 TypeScript 文件 |
| App.tsx | 2860 行 |
| 表单选项总数 | 60+ 个选项 |
| EditableTagGroup 使用次数 | 5 处 |
| CloudBase 集合 | user_settings + templates + ... |
| LocalStorage 键 | 3 个 |
| 支持的自定义标签字段 | 5+ 个 |

---

## 🎓 学习路径

### 初级 (了解基本概念)
1. ✅ 阅读 QUICK_REFERENCE (快速参考表)
2. ✅ 查看 PROJECT_EXPLORATION_REPORT 的第 1-2 章
3. ✅ 浏览 /src/data/presets.ts

### 中级 (理解实现细节)
1. ✅ 阅读 PROJECT_EXPLORATION_REPORT 的第 3-4 章
2. ✅ 研究 EditableTagGroup.tsx 源码
3. ✅ 研究 userSettings.ts 源码
4. ✅ 阅读 ARCHITECTURE 的数据流部分

### 高级 (掌握全系统)
1. ✅ 完整阅读所有 3 份文档
2. ✅ 追踪 App.tsx 中的回调函数链
3. ✅ 理解 CloudBase 的双写策略
4. ✅ 熟悉标签保护机制的所有边界情况

---

## 🐛 常见问题

### Q: 自定义标签在哪儿保存？
**A**: 双写策略：
- 本地: localStorage 的 "journal-custom-tags" key
- 云端: CloudBase "user_settings" 集合的 customTags 字段

### Q: 如何确保跨设备同步？
**A**: 使用匿名 uid 作为文档 ID：
- 同一 uid → 同一用户 → 自动同步
- 不同 uid → 不同用户 → 隔离数据

### Q: 为什么至少要保留 2 个默认标签？
**A**: 业务规则 - 每个字段必须有 ≥2 个基础选项，由 `canRemoveTag()` 检查

### Q: 网络失败时会怎样？
**A**: 静默处理：
- localStorage 本地数据不丢
- CloudBase 操作失败不抛出错误
- 用户无感知，重新加载时自动修复

---

## 📞 相关资源

- **CloudBase 官方文档**: https://docs.cloudbase.net/
- **项目根目录**: /Users/dingjiangying/github/exif
- **源代码目录**: /Users/dingjiangying/github/exif/src
- **生成日期**: 2026-06-06
- **最后更新**: PROJECT_EXPLORATION_REPORT.md

---

## 💡 提示

- 所有 3 份文档都在项目根目录保存为 .md 文件
- 使用 Markdown 查看器或 GitHub 查看最佳效果
- 文档中的代码片段可直接复制使用
- 遇到问题时先查看 QUICK_REFERENCE 的常见问题部分

