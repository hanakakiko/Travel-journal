# CloudBase V-API Key 自动获取功能

## 📋 概述

本功能实现了**当用户未提供 API Key 时**，自动从 CloudBase 云函数中获取 V-API Key。这样可以：

- ✅ **隐藏敏感信息**：API Key 不暴露在前端代码中
- ✅ **动态更新密钥**：修改环境变量即可，无需重新部署前端
- ✅ **保留备用方案**：支持多个 Key 来源，优先级明确
- ✅ **提高安全性**：服务端统一管理敏感信息

## 🚀 快速开始

### 只需 3 步部署！

1. **在 CloudBase 创建云函数 `getVApiKey`**
2. **复制 `getVApiKey.js` 的代码**
3. **配置环境变量 `V_API_KEY`**

详见：📖 [CLOUDBASE_QUICK_SETUP.md](./CLOUDBASE_QUICK_SETUP.md)

## 📊 API Key 获取优先级

```
优先级 1 (最高) ──→ 用户在 UI 中输入的 API Key
       ↓
优先级 2 ──────→ 环境变量 VITE_V_API_*_API_KEY
       ↓
优先级 3 ──────→ 本地配置文件 api-keys.local.ts
       ↓
优先级 4 (最低) ──→ CloudBase 云函数 getVApiKey
       ↓
都不可用 ──────→ 抛出错误
```

## 🔧 工作流程

### 调用模型时的流程

```
用户调用 V-API 模型
  ↓
检查用户提供的 API Key？
  ├─ 有 → 使用用户 Key ✓
  └─ 无 ↓
检查环境变量？
  ├─ 有 → 使用环境变量 Key ✓
  └─ 无 ↓
检查本地配置？
  ├─ 有 → 使用本地配置 Key ✓
  └─ 无 ↓
从 CloudBase 获取？
  ├─ 成功 → 使用 CloudBase Key ✓
  └─ 失败 ↓
抛出错误，提示用户配置 API Key ✗
```

## 📁 项目文件结构

```
exif/
├── src/
│   └── lib/
│       ├── cloudbase.ts          ✅ 修改：添加 getVApiKeyFromCloudFunction()
│       └── modelClient.ts        ✅ 修改：集成 CloudBase Key 获取
├── getVApiKey.js                 📄 新增：云函数代码示例
├── CLOUDBASE_V_API_KEY_SETUP.md   📄 新增：详细部署指南
├── CLOUDBASE_QUICK_SETUP.md       📄 新增：快速参考
├── IMPLEMENTATION_SUMMARY_CLOUDBASE_V_API.md  📄 新增：实现总结
└── CHANGES_SUMMARY_CLOUDBASE_V_API.txt  📄 新增：变更摘要
```

## 💻 代码变更摘要

### 1. `src/lib/cloudbase.ts`（第 84-115 行）

添加了新函数：
```typescript
export async function getVApiKeyFromCloudFunction(): Promise<string | null> {
  try {
    const app = getApp();
    await ensureAnonymousLogin();
    const result = await app.callFunction({
      name: "getVApiKey",
      data: {},
    });
    if (result?.result?.code === 0 && result.result?.data?.apiKey) {
      return result.result.data.apiKey;
    }
    return null;
  } catch (error) {
    console.error("从 CloudBase 获取 V-API Key 失败:", error);
    return null;
  }
}
```

### 2. `src/lib/modelClient.ts`

- **第 7 行**：添加导入
  ```typescript
  import { getVApiKeyFromCloudFunction } from "./cloudbase";
  ```

- **第 1360-1394 行**：修改 `callVApiGptImage2Once()`
  - 优化 API Key 获取逻辑
  - 支持从 CloudBase 自动获取
  - 添加日志记录

- **第 1663-1687 行**：修改 `callVApiSeedream4Once()`
  - 实现相同的逻辑
  - 支持 Seedream 4.5 模型

## 🔐 支持的模型

- ✅ **V-API GPT Image 2**
  - 环境变量：`VITE_V_API_GPT_IMAGE_2_API_KEY`
  - CloudBase Key：`V_API_KEY`

- ✅ **V-API Seedream 4.5**
  - 环境变量：`VITE_V_API_SEEDREAM_4_5_API_KEY`
  - CloudBase Key：`V_API_KEY`（共用）

## 📚 文档导航

| 文档 | 说明 | 适合场景 |
|------|------|---------|
| [CLOUDBASE_QUICK_SETUP.md](./CLOUDBASE_QUICK_SETUP.md) | **快速开始**（3 步） | 想快速部署 |
| [CLOUDBASE_V_API_KEY_SETUP.md](./CLOUDBASE_V_API_KEY_SETUP.md) | **详细指南** | 想深入了解 |
| [IMPLEMENTATION_SUMMARY_CLOUDBASE_V_API.md](./IMPLEMENTATION_SUMMARY_CLOUDBASE_V_API.md) | **实现总结** | 想了解技术细节 |
| [CHANGES_SUMMARY_CLOUDBASE_V_API.txt](./CHANGES_SUMMARY_CLOUDBASE_V_API.txt) | **变更清单** | 想查看具体修改 |
| [getVApiKey.js](./getVApiKey.js) | **云函数代码** | 需要复制代码 |

## ✅ 编译验证

```
✓ TypeScript 编译：通过（无错误）
✓ Vite 构建：成功
✓ 输出大小：1,136.05 kB（gzip 326.41 kB）
✓ 构建耗时：1.34s
```

## 🔄 向后兼容性

✅ **完全向后兼容**
- 不使用 CloudBase 的用户不受影响
- 用户提供的 Key 优先级最高
- 环境变量和本地配置仍然有效
- 所有现有 API 保持不变
- 没有破坏性改动

## ⚡ 性能

- **首次调用延迟**：+100-500ms（取决于网络）
- **缓存策略**：不缓存（确保安全性）
- **可优化**：如需要，可添加短期缓存（5-10 分钟）

## 🔒 安全建议

### ✅ 推荐做法
- 在 CloudBase 存储敏感信息
- 定期轮换 API Key
- 监控云函数调用日志
- 限制云函数访问权限

### ❌ 不要做
- 在前端代码中硬编码 API Key
- 在 localStorage 中暴露敏感信息
- 共享云函数的环境变量配置
- 允许无限制的云函数访问

## 🐛 常见问题

**Q: 为什么需要从 CloudBase 获取 Key？**
A: 这样可以避免在前端代码中暴露敏感信息，同时支持动态更新密钥。

**Q: 如果 CloudBase 不可用怎么办？**
A: 系统会继续使用其他来源的 Key（用户输入、环境变量、本地配置）。

**Q: 如何定期轮换 API Key？**
A: 只需在 CloudBase 控制台更新环境变量 `V_API_KEY` 的值，无需修改前端应用。

**Q: 多个模型可以共用一个 Key 吗？**
A: 可以。两个 V-API 模型都使用同一个 CloudBase 环境变量 `V_API_KEY`。

更多问题见：[CLOUDBASE_V_API_KEY_SETUP.md](./CLOUDBASE_V_API_KEY_SETUP.md#常见问题faq)

## 📞 技术支持

- **CloudBase 文档**：https://docs.cloudbase.net/
- **云函数 API**：https://docs.cloudbase.net/api-reference/webv3/functions
- **权限控制**：https://docs.cloudbase.net/guide/start/auth

## 📋 部署检查清单

### ✅ 前端代码（已完成）
- [x] `cloudbase.ts` 修改完成
- [x] `modelClient.ts` 修改完成
- [x] 编译验证通过
- [x] 导入语句正确

### ⏳ CloudBase（需要在 CloudBase 完成）
- [ ] 创建 `getVApiKey` 云函数
- [ ] 复制 `getVApiKey.js` 代码
- [ ] 配置环境变量 `V_API_KEY`
- [ ] 验证权限控制配置
- [ ] 测试云函数调用

### ✅ 文档（已完成）
- [x] 快速设置指南
- [x] 详细部署指南
- [x] 云函数代码示例
- [x] 实现总结文档

## 🎯 下一步

1. **阅读快速指南**：[CLOUDBASE_QUICK_SETUP.md](./CLOUDBASE_QUICK_SETUP.md)
2. **在 CloudBase 部署云函数**
3. **配置环境变量**
4. **测试集成**

## 📅 版本信息

- **完成日期**：2026-06-06
- **环境 ID**：`my-travel-journal-d5d06m1a517f14`
- **云函数名**：`getVApiKey`
- **Node.js 版本**：16 或更新

---

**需要帮助？** 参考相关文档或查看源代码注释！
