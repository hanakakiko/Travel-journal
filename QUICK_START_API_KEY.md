# API Key 快速开始指南

## 5 分钟快速配置

### 第一步：复制配置文件

```bash
# 如果还没有 api-keys.local.ts，会自动创建
# 文件位置：src/lib/api-keys.local.ts
```

### 第二步：填入你的 API Key

打开 `src/lib/api-keys.local.ts`，取消注释并填入你的 API Key：

```typescript
export const API_KEYS_CONFIG = {
  // 取消注释并填入你的 API Key
  VITE_KRATOS_API_TOKEN: "your-kratos-api-key",
  VITE_REPLICATE_API_TOKEN: "your-replicate-api-token",
  VITE_QS_GPT_IMAGE_2_API_KEY: "your-qs-gpt-image-2-api-key",
  VITE_MAAS_API_KEY: "your-maas-api-key",
  VITE_MAAS_USER_EMAIL: "your-email@xiaohongshu.com",
};
```

### 第三步：启动应用

```bash
npm install
npm run dev
```

### 第四步：验证配置

打开应用，点击「开始画手帐」，检查「生成模型」下拉菜单中是否显示了你配置的模型。

## 获取 API Key

### GPT-2 (Kratos)

联系管理员 **叶瑄（丁江颖）** 获取试用 API Key。

### FLUX.2 Pro (Replicate)

1. 访问 https://replicate.com/account/api-tokens
2. 登录或注册账户
3. 复制 API Token

### QS GPT Image 2

联系管理员 **叶瑄（丁江颖）** 获取试用 API Key。

### 视觉大模型 (MAAS)

联系管理员 **叶瑄（丁江颖）** 获取试用 API Key 和邮箱配置。

## 常见问题

### Q: 我配置了 API Key，但模型没有出现在下拉菜单中？

A: 请检查：
1. API Key 是否正确填入（没有多余空格）
2. 文件是否保存
3. 应用是否重新加载（刷新浏览器）

### Q: 我想使用环境变量而不是本地配置文件？

A: 创建 `.env.local` 文件：

```bash
VITE_KRATOS_API_TOKEN=your-api-key
VITE_REPLICATE_API_TOKEN=your-api-token
```

然后重启应用。

### Q: 我可以在 UI 中修改 API Key 吗？

A: 可以。点击右上角的 API 配置按钮，选择模型并输入 API Key。这会覆盖本地配置文件中的设置。

### Q: 我想同时使用多个 API Key？

A: 可以。在 `api-keys.local.ts` 中配置多个模型的 API Key，所有已配置的模型都会出现在下拉菜单中。

### Q: 我不小心把 API Key 提交到了 Git？

A: 不用担心，`api-keys.local.ts` 已在 `.gitignore` 中。但如果你已经提交了，请：
1. 立即更换 API Key
2. 从 Git 历史中删除敏感信息

## 下一步

- 查看 [API_KEY_CONFIGURATION.md](API_KEY_CONFIGURATION.md) 了解更多详细信息
- 查看 [README.md](README.md) 了解应用的其他功能
- 查看 [REFACTORING_SUMMARY.md](REFACTORING_SUMMARY.md) 了解本次重构的改动

## 需要帮助？

如果遇到问题，请：
1. 检查 [API_KEY_CONFIGURATION.md](API_KEY_CONFIGURATION.md) 中的常见问题
2. 查看浏览器控制台的错误信息
3. 联系管理员 **叶瑄（丁江颖）**
