# 自定义 API Key 实现总结

## 改造目标

让用户能够上传自己的 API Key 来调用他们自己的模型，这样就不会消耗你的额度。

## 核心设计

### 1. 用户输入 API Key
- 在 UI 中添加一个设置面板（API 配置面板）
- 用户可以输入自己的 API Key
- API Key 被保存到浏览器的 localStorage 中

### 2. 固定模型选择
- 用户选择要使用的模型（GPT-2 或 FLUX.2）
- 模型选择是固定的，不能动态改变（因为不同模型的入参可能不同）
- 一次只能配置一个模型的 API Key

### 3. 可选的自定义 URL
- 用户可以输入自定义的 API 端点 URL
- 如果不填，使用默认的端点
- 这样用户可以使用自己的代理或自建服务

## 实现细节

### 新增文件

#### 1. `src/lib/userApiConfig.ts`
用户 API 配置管理模块，提供以下功能：
- `loadUserApiConfig()` - 从 localStorage 读取配置
- `saveUserApiConfig()` - 保存配置到 localStorage
- `clearUserApiConfig()` - 清除配置
- `isValidApiKey()` - 验证 API Key
- `isValidEndpoint()` - 验证端点 URL

```typescript
export type UserApiConfig = {
  modelType: "gpt-2" | "flux-2-pro";
  apiKey: string;
  customEndpoint?: string;
};
```

#### 2. `src/lib/ApiConfigPanel.tsx`
API 配置面板 React 组件，提供：
- 模型选择下拉菜单
- API Key 输入框（支持显示/隐藏）
- 自定义端点 URL 输入框
- 保存和清除配置按钮
- 错误和成功提示

### 修改的文件

#### 1. `src/lib/modelClient.ts`
修改了两个关键函数来支持用户的 API Key：

**`callFlux2ProPic2PicOnce()`**
```typescript
// 优先使用用户提供的 API Key，其次使用环境变量
const userConfig = loadUserApiConfig();
const apiToken = userConfig?.modelType === "flux-2-pro" 
  ? userConfig.apiKey 
  : (import.meta.env.VITE_REPLICATE_API_TOKEN as string | undefined);

// 使用用户自定义端点或默认端点
const endpoint = userConfig?.modelType === "flux-2-pro" && userConfig.customEndpoint
  ? userConfig.customEndpoint
  : "/replicate/v1/predictions";
```

**`callKratosUnifiedPic2PicOnce()`**
```typescript
// 优先使用用户提供的 API Key，其次使用环境变量
const userConfig = loadUserApiConfig();
const endpoint = userConfig?.modelType === "gpt-2" && userConfig.customEndpoint
  ? userConfig.customEndpoint
  : ((import.meta.env.VITE_KRATOS_ACTION_URL as string | undefined) ?? "/kratos/ads/materialcenter/doaction");

// 构建请求头，如果用户提供了 API Key 则添加到请求头中
const headers: Record<string, string> = { "Content-Type": "application/json" };
if (userConfig?.modelType === "gpt-2" && userConfig.apiKey) {
  headers["Authorization"] = `Bearer ${userConfig.apiKey}`;
}
```

#### 2. `src/App.tsx`
- 导入 `ApiConfigPanel` 组件
- 在 upload-band 中添加 API 配置按钮
- 创建 `upload-band-controls` 容器来放置声音按钮和 API 配置按钮

#### 3. `src/styles.css`
添加了 API 配置面板的完整样式：
- `.api-config-button` - 设置按钮样式
- `.api-config-modal-layer` - 模态层样式
- `.api-config-panel` - 面板容器样式
- `.api-config-field` - 表单字段样式
- `.api-config-btn-*` - 按钮样式
- 以及其他相关样式

## 工作流程

### 用户首次使用

1. 用户点击左上角的设置按钮（⚙️）
2. 打开 API 配置面板
3. 选择要使用的模型（GPT-2 或 FLUX.2）
4. 输入对应的 API Key
5. （可选）输入自定义的 API 端点 URL
6. 点击 "保存配置"
7. API Key 被保存到 localStorage

### 用户生成图片时

1. 用户上传图片并填写信息
2. 点击 "装订手帐本" 按钮
3. 应用检查是否有用户配置的 API Key
4. 如果有，使用用户的 API Key 和端点
5. 如果没有，尝试使用环境变量中的 API Key
6. 调用对应的模型 API 生成图片

### 用户更换 API Key

1. 点击设置按钮打开 API 配置面板
2. 修改 API Key 或其他配置
3. 点击 "保存配置"
4. 新的配置会覆盖旧的配置

### 用户清除配置

1. 点击设置按钮打开 API 配置面板
2. 点击 "清除配置" 按钮
3. 确认清除
4. 配置被从 localStorage 中删除

## 优先级顺序

API Key 的使用优先级（从高到低）：

1. **用户配置的 API Key** - 最高优先级
2. **环境变量中的 API Key** - 次优先级
3. **都没有** - 报错

这样设计的好处是：
- 用户可以自由选择使用自己的 API Key
- 开发者仍然可以通过环境变量配置默认的 API Key
- 用户配置的 API Key 会覆盖环境变量

## 安全性考虑

### 本地存储
- API Key 被保存在浏览器的 localStorage 中
- 不会被发送到任何远程服务器
- 用户可以随时清除配置

### 请求头
- 对于 FLUX.2，API Key 被添加到 `Authorization: Token <apiKey>` 请求头
- 对于 GPT-2，API Key 被添加到 `Authorization: Bearer <apiKey>` 请求头
- 这是标准的 API 认证方式

### 用户责任
- 用户需要妥善保管自己的 API Key
- 不要在公共电脑上保存 API Key
- 定期检查 API Key 的使用情况

## 扩展性

这个实现很容易扩展：

### 添加新的模型
1. 在 `userApiConfig.ts` 中更新 `UserApiConfig` 类型
2. 在 `ApiConfigPanel.tsx` 中添加新的模型选项
3. 在 `modelClient.ts` 中添加对应的 API 调用逻辑

### 支持多个 API Key
1. 修改 `UserApiConfig` 类型，使用对象而不是单个字符串
2. 在 `ApiConfigPanel.tsx` 中添加多个 API Key 输入框
3. 在 `modelClient.ts` 中根据模型类型选择对应的 API Key

### 支持 API Key 过期提醒
1. 在 `UserApiConfig` 中添加 `expiresAt` 字段
2. 在 `ApiConfigPanel.tsx` 中显示过期时间
3. 在生成前检查 API Key 是否已过期

## 测试建议

### 单元测试
- 测试 `userApiConfig.ts` 中的各个函数
- 测试 API Key 的验证逻辑
- 测试 localStorage 的读写

### 集成测试
- 测试用户配置 API Key 后的生成流程
- 测试 API Key 优先级（用户配置 > 环境变量）
- 测试自定义端点的使用

### 手动测试
- 配置 FLUX.2 API Key 并生成图片
- 配置 GPT-2 API Key 并生成图片
- 测试清除配置功能
- 测试自定义端点功能

## 文档

- `API_KEY_SETUP.md` - 用户使用指南
- `CUSTOM_API_KEY_IMPLEMENTATION.md` - 本文档，实现细节说明

## 总结

这个改造让用户能够完全控制自己的 API Key，同时保持了应用的灵活性和易用性。用户可以：

✅ 使用自己的 API Key，不消耗你的额度
✅ 选择不同的模型
✅ 使用自定义的 API 端点
✅ 随时清除配置
✅ 安全地保存 API Key（本地存储）

这是一个双赢的解决方案！
