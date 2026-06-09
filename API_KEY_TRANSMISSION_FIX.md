# API Key 传递问题修复总结

## 问题描述

用户在 API 配置面板中输入并保存了 QS GPT Image 2 的 API Key，但调用时仍然收到错误：

```json
{
  "Code": 10001,
  "Error": "invalid token, please check your token"
}
```

这说明 API Key 没有被正确传递到 QS API。

## 根本原因

### 问题 1：API Key 获取流程

在 `callQsGptImage2Once()` 函数中，API Key 的获取优先级是：

```typescript
const apiKey = apiKeyOverride || userQsConfig?.apiKey || getApiKey("VITE_QS_GPT_IMAGE_2_API_KEY");
```

**流程**：
1. 检查 `apiKeyOverride`（外部传入，目前为 undefined）
2. 检查 `userQsConfig?.apiKey`（用户在 API 配置面板中保存的 Key）
3. 检查环境变量或本地配置文件

### 问题 2：用户配置的加载

用户保存的 API Key 存储在浏览器 localStorage 中，通过以下流程加载：

```
loadUserApiConfig()
  ↓
getApiConfigs()
  ↓
window.localStorage.getItem(API_CONFIG_KEY)
  ↓
返回 { "qs-gpt-image-2": { apiKey: "xxx", ... } }
```

## 解决方案

### 1. 确保 API Key 被正确保存

**检查步骤**：

1. 打开浏览器开发者工具（F12）
2. 进入 **应用** → **本地存储**
3. 查找键名 `userSettings` 或 `apiConfigs`
4. 确认值中包含 `"qs-gpt-image-2"` 配置

**示例**：
```json
{
  "qs-gpt-image-2": {
    "apiKey": "your_actual_api_key_here",
    "customEndpoint": "https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview"
  }
}
```

### 2. 验证 API Key 被正确传递

**检查步骤**：

1. 打开浏览器控制台（F12 → 控制台）
2. 调用 QS GPT Image 2
3. 查看日志中的请求信息

**正确的日志**：
```
[QS GPT Image 2] === 实际发送的请求信息 ===
[QS GPT Image 2]   URL: https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview
[QS GPT Image 2]   Method: POST
[QS GPT Image 2]   Headers:
[QS GPT Image 2]     api-key: your_key_first_10_chars...last_10_chars
```

**错误的日志**（API Key 为 undefined）：
```
[QS GPT Image 2]     api-key: undefined...undefined
```

### 3. 调试 API Key 获取过程

在浏览器控制台中运行以下代码：

```javascript
// 检查本地存储中的配置
const stored = localStorage.getItem('userSettings');
console.log('本地存储数据:', stored);

// 解析配置
const config = JSON.parse(stored || '{}');
console.log('QS 配置:', config['qs-gpt-image-2']);

// 检查 API Key
const apiKey = config['qs-gpt-image-2']?.apiKey;
console.log('API Key:', apiKey);
console.log('API Key 长度:', apiKey?.length);
console.log('API Key 是否为空:', !apiKey || apiKey.trim() === '');
```

## 代码流程

### 当前流程（正确）

```
用户在 API 配置面板中输入 API Key
  ↓
点击保存
  ↓
saveModelApiConfig("qs-gpt-image-2", { apiKey: "xxx" })
  ↓
保存到 localStorage
  ↓
用户调用 callModelAPI("qs-gpt-image-2", params)
  ↓
callQsGptImage2(params)
  ↓
callQsGptImage2Once(params)
  ↓
loadUserApiConfig() 从 localStorage 读取配置
  ↓
获取 userQsConfig?.apiKey
  ↓
添加到请求头：headers: { "api-key": apiKey }
  ↓
发送 POST 请求到 QS API
```

## 常见问题排查

### 问题 A：API Key 为 undefined

**症状**：
```
[QS GPT Image 2]     api-key: undefined...undefined
```

**原因**：
1. 用户没有在 API 配置面板中输入 API Key
2. 配置没有被正确保存到 localStorage
3. 配置键名不匹配（应该是 `"qs-gpt-image-2"`）

**解决**：
```javascript
// 在控制台中检查
const config = JSON.parse(localStorage.getItem('userSettings') || '{}');
console.log('所有配置键:', Object.keys(config));
console.log('QS 配置:', config['qs-gpt-image-2']);

// 如果配置不存在，手动保存
if (!config['qs-gpt-image-2']) {
  config['qs-gpt-image-2'] = { apiKey: 'your_api_key_here' };
  localStorage.setItem('userSettings', JSON.stringify(config));
  console.log('配置已保存，请刷新页面');
}
```

### 问题 B：API Key 包含多余空格

**症状**：
```
[QS GPT Image 2]     api-key: " your_key_with_spaces "
```

**原因**：
用户在输入 API Key 时，不小心包含了前后空格

**解决**：
1. 打开 API 配置面板
2. 清除 API Key 输入框中的所有空格
3. 重新输入 API Key（确保没有前后空格）
4. 保存

### 问题 C：API Key 被截断

**症状**：
```
[QS GPT Image 2]     api-key: your_key_first_10_chars...
```

日志中显示的 API Key 被截断了（这是正常的，用于安全性），但实际发送的应该是完整的 Key。

**验证**：
在浏览器控制台中检查完整的 API Key：

```javascript
const config = JSON.parse(localStorage.getItem('userSettings') || '{}');
const apiKey = config['qs-gpt-image-2']?.apiKey;
console.log('完整 API Key:', apiKey);
console.log('API Key 长度:', apiKey?.length);
```

## 修复建议

### 建议 1：添加更详细的日志

在 `callQsGptImage2Once()` 中添加日志，帮助调试 API Key 获取过程：

```typescript
const userConfigs = loadUserApiConfig();
const userQsConfig = userConfigs?.["qs-gpt-image-2"];
const apiKey = apiKeyOverride || userQsConfig?.apiKey || getApiKey("VITE_QS_GPT_IMAGE_2_API_KEY");

qlog("=== API Key 获取过程 ===");
qlog(`  apiKeyOverride: ${apiKeyOverride ? "已提供" : "未提供"}`);
qlog(`  userQsConfig: ${userQsConfig ? "已找到" : "未找到"}`);
qlog(`  userQsConfig?.apiKey: ${userQsConfig?.apiKey ? "已配置" : "未配置"}`);
qlog(`  环境变量: ${getApiKey("VITE_QS_GPT_IMAGE_2_API_KEY") ? "已配置" : "未配置"}`);
qlog(`  最终 API Key: ${apiKey ? "✓ 已获取" : "✗ 未获取"}`);
```

### 建议 2：验证 API Key 格式

在保存 API Key 时，进行基本的格式验证：

```typescript
export const isValidApiKey = (apiKey: string): boolean => {
  // 检查是否为空
  if (!apiKey || apiKey.trim().length === 0) {
    return false;
  }
  
  // 检查长度（通常 API Key 应该至少 20 字符）
  if (apiKey.trim().length < 20) {
    return false;
  }
  
  // 检查是否包含非法字符
  if (!/^[a-zA-Z0-9\-_]+$/.test(apiKey.trim())) {
    return false;
  }
  
  return true;
};
```

### 建议 3：在 API 配置面板中显示 API Key 状态

在 API 配置面板中添加以下信息：

```
✓ API Key 已配置（长度：32 字符）
✓ 自定义端点已配置
✓ 配置已保存到本地存储
```

## 总结

如果你看到 `"invalid token"` 错误，最可能的原因是：

1. **API Key 没有被正确保存** - 检查浏览器本地存储
2. **API Key 包含多余空格** - 清除前后空格
3. **API Key 已过期** - 确认 API Key 仍然有效
4. **API Key 格式不正确** - 确认 API Key 的完整性

按照上面的调试步骤，应该能找到问题所在。

## 相关文档

- [`QS_API_KEY_DEBUG.md`](QS_API_KEY_DEBUG.md) - 详细的调试指南
- [`QS_API_TROUBLESHOOTING.md`](QS_API_TROUBLESHOOTING.md) - 故障排查指南
- [`FRONTEND_DIRECT_CALL_FIX.md`](FRONTEND_DIRECT_CALL_FIX.md) - 前端直调模式修复总结
