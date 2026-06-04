# API Key 配置指南

## 概述

本项目支持多个 AI 模型，需要配置相应的 API Key 才能使用。为了避免硬编码敏感信息，我们实现了灵活的 API Key 管理系统。

## 配置方式（优先级从高到低）

### 1. 本地配置文件（推荐开发时使用）

**文件位置**：`src/lib/api-keys.local.ts`

**特点**：
- 已在 `.gitignore` 中，不会被提交到版本控制
- 开发时最方便，可以快速切换不同的 API Key
- 支持所有模型的 API Key 配置

**使用方法**：

```typescript
// src/lib/api-keys.local.ts
export const API_KEYS_CONFIG = {
  VITE_KRATOS_API_TOKEN: "your-kratos-api-key",
  VITE_REPLICATE_API_TOKEN: "your-replicate-api-token",
  VITE_QS_GPT_IMAGE_2_API_KEY: "your-qs-gpt-image-2-api-key",
  VITE_MAAS_API_KEY: "your-maas-api-key",
  VITE_MAAS_USER_EMAIL: "your-email@xiaohongshu.com",
  VITE_MAAS_APP_ID: "qs-api",
  VITE_MAAS_BASE: "https://maas.devops.xiaohongshu.com",
  VITE_KRATOS_ACTION_URL: "http://kratos-sunyihao.sl.beta.xiaohongshu.com/ads/materialcenter/doaction",
};
```

### 2. 环境变量（推荐生产环境使用）

**文件位置**：`.env` 或 `.env.local`

**特点**：
- 更安全，不会被意外提交
- 适合生产环境和 CI/CD 流程
- 可以在启动时动态传入

**使用方法**：

```bash
# .env.local
VITE_KRATOS_API_TOKEN=your-kratos-api-key
VITE_REPLICATE_API_TOKEN=your-replicate-api-token
VITE_QS_GPT_IMAGE_2_API_KEY=your-qs-gpt-image-2-api-key
VITE_MAAS_API_KEY=your-maas-api-key
```

或在启动时传入：

```bash
VITE_KRATOS_API_TOKEN=xxx VITE_REPLICATE_API_TOKEN=yyy npm run dev
```

### 3. UI 配置面板

**特点**：
- 运行时配置，无需重启应用
- 配置存储在浏览器 localStorage 中
- 仅对当前浏览器有效

**使用方法**：
1. 点击应用右上角的 API 配置按钮
2. 选择要配置的模型
3. 输入 API Key
4. 保存配置

## 支持的模型

| 模型 | 环境变量 | 获取方式 |
|---|---|---|
| GPT-2 (Kratos) | `VITE_KRATOS_API_TOKEN` | 联系管理员 叶瑄（丁江颖） |
| FLUX.2 Pro (Replicate) | `VITE_REPLICATE_API_TOKEN` | https://replicate.com/account/api-tokens |
| QS GPT Image 2 | `VITE_QS_GPT_IMAGE_2_API_KEY` | 联系管理员 叶瑄（丁江颖） |
| 视觉大模型 (qwen3-vl-32b-instruct) | `VITE_MAAS_API_KEY` | 联系管理员 叶瑄（丁江颖） |

## 模型可用性

- **只有配置了 API Key 的模型才会在「生成模型」下拉菜单中显示**
- 如果没有配置任何模型的 API Key，应用会显示提示信息，要求用户先配置或联系管理员

## 实现细节

### 核心文件

1. **`src/lib/api-keys.local.ts`**
   - 定义本地 API Key 配置
   - 提供 `getApiKey()` 函数用于获取 API Key

2. **`src/lib/modelConfig.ts`**
   - 定义模型配置
   - 提供 `hasApiKeyForModel()` 函数检查模型是否有可用的 API Key
   - 提供 `getAvailableModels()` 函数获取已配置的模型列表

3. **`src/lib/modelClient.ts`**
   - 调用各个模型的 API
   - 使用 `getApiKey()` 获取 API Key

4. **`src/lib/visionClient.ts`**
   - 调用视觉大模型 API
   - 使用 `getApiKey()` 获取 MAAS API Key

### 优先级逻辑

对于每个模型，API Key 的获取优先级如下：

1. **用户在 UI 中配置的 API Key**（存储在 localStorage）
2. **环境变量**（.env 文件或启动时传入）
3. **本地配置文件**（src/lib/api-keys.local.ts）

这样设计的好处是：
- 开发时可以在本地配置文件中快速切换 API Key
- 生产环境可以通过环境变量安全地传入 API Key
- 用户可以在 UI 中临时覆盖配置

## 常见问题

### Q: 为什么我的模型没有出现在下拉菜单中？

A: 这说明该模型的 API Key 还没有配置。请按照上面的配置方式之一配置 API Key。

### Q: 我可以同时配置多个模型吗？

A: 可以。你可以在本地配置文件或环境变量中配置多个模型的 API Key，所有已配置的模型都会出现在下拉菜单中。

### Q: 如果我既在本地配置文件中配置了 API Key，又在环境变量中配置了，会使用哪一个？

A: 会使用环境变量中的 API Key，因为环境变量的优先级更高。

### Q: 我可以在 UI 中修改 API Key 吗？

A: 可以。在 UI 中修改的 API Key 会存储在浏览器的 localStorage 中，优先级最高。但这只对当前浏览器有效，其他设备或浏览器不会有这个配置。

### Q: 如何获取试用 API Key？

A: 请联系管理员 **叶瑄（丁江颖）** 获取试用 API Key。

## 安全建议

1. **不要在代码中硬编码 API Key**
2. **不要将 `api-keys.local.ts` 提交到版本控制**（已在 .gitignore 中）
3. **在生产环境中使用环境变量配置 API Key**
4. **定期轮换 API Key**
5. **不要在公开的地方分享 API Key**

## 相关文件

- [README.md](README.md) - 项目主文档
- [.env.example](.env.example) - 环境变量示例
- [.gitignore](.gitignore) - Git 忽略规则
