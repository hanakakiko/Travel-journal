# QS GPT Image 2 API Key 调试指南

## 问题症状

收到错误：
```json
{
  "Code": 10001,
  "Error": "invalid token, please check your token"
}
```

这说明 API Key 没有被正确传递到 QS API。

## 根本原因分析

### 问题 1：API Key 获取优先级

在 `callQsGptImage2Once()` 函数中，API Key 的获取优先级是：

```typescript
const apiKey = apiKeyOverride || userQsConfig?.apiKey || getApiKey("VITE_QS_GPT_IMAGE_2_API_KEY");
```

**优先级顺序**：
1. `apiKeyOverride` - 外部传入的 Key（目前路由层没有传递）
2. `userQsConfig?.apiKey` - 用户在 API 配置面板中保存的 Key
3. `getApiKey("VITE_QS_GPT_IMAGE_2_API_KEY")` - 环境变量或本地配置文件

### 问题 2：用户保存的 API Key 可能没有被正确加载

如果用户在 API 配置面板中输入并保存了 API Key，但代码仍然报错，可能是：

1. **配置没有被正确保存** - 检查浏览器本地存储
2. **配置没有被正确加载** - `loadUserApiConfig()` 函数可能有问题
3. **配置键名不匹配** - 应该是 `"qs-gpt-image-2"`

## 调试步骤

### 步骤 1：检查浏览器本地存储

打开浏览器开发者工具（F12），进入 **应用** → **本地存储**：

1. 查找键名：`userApiConfig` 或类似的键
2. 查看值中是否包含 `"qs-gpt-image-2"` 配置
3. 确认 API Key 是否正确保存

**示例**：
```json
{
  "qs-gpt-image-2": {
    "apiKey": "your_actual_api_key_here",
    "customEndpoint": "https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview"
  }
}
```

### 步骤 2：检查浏览器控制台日志

打开浏览器控制台（F12 → 控制台），查看 QS GPT Image 2 的日志：

```
[QS GPT Image 2] === 实际发送的请求信息 ===
[QS GPT Image 2]   URL: https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview
[QS GPT Image 2]   Method: POST
[QS GPT Image 2]   Headers:
[QS GPT Image 2]     api-key: your_key_first_10_chars...last_10_chars
```

**关键检查**：
- ✅ 应该看到 `api-key: xxx...xxx`
- ❌ 不应该看到 `api-key: undefined` 或 `api-key: null`

### 步骤 3：验证 API Key 格式

确认 API Key 的格式是否正确：

```bash
# 检查 API Key 长度（通常应该是 32+ 字符）
echo "your_api_key" | wc -c

# 检查是否包含特殊字符或空格
echo "your_api_key" | od -c
```

### 步骤 4：手动测试 API Key

在浏览器控制台中运行以下代码，测试 API Key 是否有效：

```javascript
// 获取用户配置
const userConfigs = JSON.parse(localStorage.getItem('userApiConfig') || '{}');
const qsConfig = userConfigs['qs-gpt-image-2'];
const apiKey = qsConfig?.apiKey;

console.log('API Key:', apiKey);
console.log('API Key 长度:', apiKey?.length);
console.log('API Key 前 10 字符:', apiKey?.slice(0, 10));

// 测试 API 调用
if (apiKey) {
  const formData = new FormData();
  formData.append('prompt', '测试');
  formData.append('size', '1024x1536');
  formData.append('quality', 'low');
  formData.append('n', '1');
  
  fetch('https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
    },
    body: formData,
  })
  .then(r => r.json())
  .then(data => console.log('API 响应:', data))
  .catch(err => console.error('API 错误:', err));
}
```

## 常见问题排查

### 问题 A：API Key 为 undefined

**症状**：
```
[QS GPT Image 2] api-key: undefined...undefined
```

**原因**：
1. 用户没有配置 API Key
2. 配置没有被正确保存
3. 配置键名不匹配

**解决**：
1. 打开 API 配置面板，重新输入 API Key
2. 确认保存成功（检查本地存储）
3. 刷新页面，重新尝试

### 问题 B：API Key 为空字符串

**症状**：
```
[QS GPT Image 2] api-key: ...
```

**原因**：
1. 用户输入了空值
2. 配置保存时被清空了

**解决**：
1. 检查 API 配置面板中的输入框是否为空
2. 重新输入 API Key
3. 确认保存

### 问题 C：API Key 格式不正确

**症状**：
```json
{
  "Code": 10001,
  "Error": "invalid token, please check your token"
}
```

**原因**：
1. API Key 包含多余的空格
2. API Key 被截断了
3. API Key 已过期

**解决**：
1. 复制 API Key 时，确保没有多余的空格
2. 检查 API Key 的完整性
3. 确认 API Key 仍然有效

## 代码流程图

```
用户调用 callModelAPI("qs-gpt-image-2", params)
    ↓
callModelAPI 检查 isCloudbaseModelProxyEnabled()
    ↓
调用 callQsGptImage2(params)
    ↓
callQsGptImage2 调用 callQsGptImage2Once(params)
    ↓
callQsGptImage2Once 获取 API Key：
    1. 检查 apiKeyOverride（目前为 undefined）
    2. 检查 userQsConfig?.apiKey（用户配置）
    3. 检查 getApiKey("VITE_QS_GPT_IMAGE_2_API_KEY")（环境变量）
    ↓
如果 API Key 存在，添加到请求头：
    headers: { "api-key": apiKey }
    ↓
发送 POST 请求到 QS API
    ↓
返回结果
```

## 修复建议

### 建议 1：在路由层传递 API Key（可选）

如果想在路由层预先获取 API Key，可以修改 `modelRouter.ts`：

```typescript
if (modelType === "qs-gpt-image-2") {
  // 从用户配置中获取 API Key
  const userConfigs = loadUserApiConfig();
  const userQsConfig = userConfigs?.["qs-gpt-image-2"];
  const apiKey = userQsConfig?.apiKey || getApiKey("VITE_QS_GPT_IMAGE_2_API_KEY");
  
  return await callQsGptImage2({
    ...params,
    apiKeyOverride: apiKey,
  });
}
```

但这不是必需的，因为 `callQsGptImage2Once` 已经会自动获取 API Key。

### 建议 2：添加更详细的错误日志

在 `callQsGptImage2Once` 中添加日志，帮助调试：

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

## 总结

如果你看到 `"invalid token"` 错误，最可能的原因是：

1. **API Key 没有被正确保存** - 检查浏览器本地存储
2. **API Key 没有被正确加载** - 检查浏览器控制台日志
3. **API Key 格式不正确** - 检查是否有多余空格或被截断

按照上面的调试步骤，应该能找到问题所在。
