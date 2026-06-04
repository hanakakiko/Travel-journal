# 快速 API Key 配置指南

## 30 秒快速开始

### 步骤 1：获取 API Key

**选择 FLUX.2 [pro]（推荐）：**
1. 访问 https://replicate.com
2. 注册/登录
3. 点击 Account → API Tokens
4. 复制你的 API Token

**或选择 GPT-2 (Kratos)：**
- 获取你的 Kratos API Token

### 步骤 2：配置 API Key

1. 打开应用，点击左上角的 ⚙️ 按钮
2. 选择模型（FLUX.2 或 GPT-2）
3. 粘贴你的 API Key
4. 点击 "保存配置"

### 步骤 3：开始使用

现在你可以上传图片并生成手帐了！你的 API Key 会被保存在浏览器中。

## 常见问题速查

| 问题 | 答案 |
|------|------|
| API Key 会被上传到服务器吗？ | 不会，保存在你的浏览器本地 |
| 可以同时配置两个模型吗？ | 不可以，一次只能配置一个 |
| 如何更换 API Key？ | 打开配置面板，修改后保存 |
| 如何清除 API Key？ | 打开配置面板，点击"清除配置" |
| 忘记配置 API Key 会怎样？ | 生成时会报错，提示配置 API Key |

## 模型对比

| 特性 | GPT-2 | FLUX.2 |
|------|-------|--------|
| 参考图数量 | 1 张 | 最多 8 张 |
| 生成速度 | 快（~15s） | 较慢（~30s） |
| 质量 | 中等 | 高 |
| 适用场景 | 快速迭代 | 高质量输出 |

## 获取 API Key 的链接

- **FLUX.2 [pro]**: https://replicate.com/account/api-tokens
- **GPT-2 (Kratos)**: 由小红书内部提供

## 故障排除

### 生成失败：API Token 未配置
→ 打开 ⚙️ 配置面板，输入你的 API Key

### 生成失败：HTTP 401
→ 你的 API Key 无效或已过期，检查后重新输入

### 生成失败：网络异常
→ 检查网络连接，或尝试刷新页面

## 更多帮助

详细文档：[API_KEY_SETUP.md](./API_KEY_SETUP.md)
实现细节：[CUSTOM_API_KEY_IMPLEMENTATION.md](./CUSTOM_API_KEY_IMPLEMENTATION.md)
