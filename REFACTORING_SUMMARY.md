# API Key 配置重构总结

## 改动概述

本次重构的目标是：
1. ✅ 移除硬编码的 API Key（特别是 MAAS API Key）
2. ✅ 创建统一的 API Key 配置管理系统
3. ✅ 支持多种配置方式（本地文件、环境变量、UI 配置）
4. ✅ 只显示已配置 API Key 的模型
5. ✅ 当没有任何模型配置时，提示用户需要配置或联系管理员

## 主要改动

### 1. 创建 API Key 配置文件

**文件**：`src/lib/api-keys.local.ts`

- 定义 `API_KEYS_CONFIG` 对象，包含所有模型的 API Key 配置
- 提供 `getApiKey()` 函数，支持从环境变量、本地配置文件、默认值中获取 API Key
- 文件已在 `.gitignore` 中，不会被提交到版本控制

### 2. 修改 visionClient.ts

**改动**：
- 移除硬编码的 MAAS API Key：`"QSTab73a13e3d1360627adca665ed407478"`
- 移除硬编码的 MAAS 用户邮箱：`"moenzhe@xiaohongshu.com"`
- 使用 `getApiKey()` 函数从配置文件或环境变量中获取 API Key
- 在 `recognizePhotoTags()` 函数中添加 API Key 检查，如果缺失则抛出有意义的错误信息

### 3. 修改 modelConfig.ts

**改动**：
- 添加 `hasApiKeyForModel()` 函数，检查模型是否有可用的 API Key
- 修改 `getAvailableModels()` 函数，只返回已配置 API Key 的模型
- 排除 "other" 模型（预留给未来扩展）

### 4. 修改 modelClient.ts

**改动**：
- 导入 `getApiKey()` 函数
- 修改 `callKratosUnifiedPic2PicOnce()` 函数，使用 `getApiKey()` 获取 Kratos API Key
- 修改 `callFlux2ProPic2PicOnce()` 函数，使用 `getApiKey()` 获取 Replicate API Token
- 修改 `callQsGptImage2Once()` 函数，使用 `getApiKey()` 获取 QS GPT Image 2 API Key
- 更新错误提示信息，指导用户如何配置 API Key

### 5. 修改 App.tsx

**改动**：
- 在 `generateJournal()` 函数中添加检查，确保至少有一个模型已配置
- 修改 `InfoModal` 组件，当没有可用模型时显示警告信息
- 警告信息包含配置文件位置和管理员联系方式

### 6. 更新 .gitignore

**改动**：
- 添加 `src/lib/api-keys.local.ts` 到忽略列表

### 7. 更新 .env.example

**改动**：
- 添加详细的 API Key 配置说明
- 列出所有支持的环境变量
- 说明三种配置方式的优先级

### 8. 更新 README.md

**改动**：
- 添加「API Key 配置」章节
- 说明三种配置方式
- 列出支持的模型和获取方式
- 说明模型可用性规则

### 9. 创建新文档

**文件**：`API_KEY_CONFIGURATION.md`

- 详细的 API Key 配置指南
- 常见问题解答
- 安全建议

## 配置优先级

对于每个 API Key，获取优先级如下（从高到低）：

1. **用户在 UI 中配置的 API Key**（存储在 localStorage）
2. **环境变量**（.env 文件或启动时传入）
3. **本地配置文件**（src/lib/api-keys.local.ts）

## 模型可用性规则

- 只有配置了 API Key 的模型才会在「生成模型」下拉菜单中显示
- 如果没有配置任何模型的 API Key，应用会显示警告信息
- 警告信息提示用户需要在 `src/lib/api-keys.local.ts` 中配置 API Key，或联系管理员 叶瑄（丁江颖）

## 使用示例

### 开发时配置（推荐）

```typescript
// src/lib/api-keys.local.ts
export const API_KEYS_CONFIG = {
  VITE_KRATOS_API_TOKEN: "your-kratos-api-key",
  VITE_REPLICATE_API_TOKEN: "your-replicate-api-token",
  VITE_QS_GPT_IMAGE_2_API_KEY: "your-qs-gpt-image-2-api-key",
  VITE_MAAS_API_KEY: "your-maas-api-key",
  VITE_MAAS_USER_EMAIL: "your-email@xiaohongshu.com",
  // ... 其他配置
};
```

### 生产环境配置

```bash
# 通过环境变量配置
VITE_KRATOS_API_TOKEN=xxx \
VITE_REPLICATE_API_TOKEN=yyy \
VITE_QS_GPT_IMAGE_2_API_KEY=zzz \
VITE_MAAS_API_KEY=aaa \
npm run build
```

### 运行时配置

在应用中点击右上角的 API 配置按钮，输入 API Key。

## 测试建议

1. **测试模型可用性**
   - 不配置任何 API Key，验证应用显示警告信息
   - 配置一个模型的 API Key，验证只有该模型出现在下拉菜单中
   - 配置多个模型的 API Key，验证所有模型都出现在下拉菜单中

2. **测试优先级**
   - 同时在本地配置文件和环境变量中配置 API Key，验证使用环境变量中的值
   - 在 UI 中修改 API Key，验证使用 UI 中的值

3. **测试错误处理**
   - 配置了 API Key 但值为空，验证应用显示有意义的错误信息
   - 使用无效的 API Key，验证应用显示 API 返回的错误信息

## 向后兼容性

- 现有的 UI 配置面板（ApiConfigPanel）继续工作
- 现有的环境变量配置继续支持
- 新增的本地配置文件是可选的，不会破坏现有功能

## 安全性改进

- ✅ 移除了硬编码的 API Key
- ✅ 本地配置文件已在 .gitignore 中
- ✅ 支持环境变量配置，适合生产环境
- ✅ 错误信息不会泄露 API Key（只显示前后 10 个字符）

## 相关文件

- `src/lib/api-keys.local.ts` - API Key 配置文件
- `src/lib/modelConfig.ts` - 模型配置和可用性检查
- `src/lib/modelClient.ts` - 模型 API 调用
- `src/lib/visionClient.ts` - 视觉大模型 API 调用
- `src/App.tsx` - 应用主组件
- `.env.example` - 环境变量示例
- `.gitignore` - Git 忽略规则
- `README.md` - 项目文档
- `API_KEY_CONFIGURATION.md` - API Key 配置指南
