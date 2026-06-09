# QS API Key 快速检查清单

## 🔍 快速诊断（5 分钟）

### 步骤 1：检查 API Key 是否被保存

打开浏览器开发者工具（F12），在控制台中运行：

```javascript
// 检查本地存储
const stored = localStorage.getItem('userSettings');
const config = JSON.parse(stored || '{}');
const qsConfig = config['qs-gpt-image-2'];

console.log('QS 配置:', qsConfig);
console.log('API Key:', qsConfig?.apiKey);
console.log('API Key 长度:', qsConfig?.apiKey?.length);
```

**预期结果**：
```
QS 配置: { apiKey: "your_actual_key_here", ... }
API Key: your_actual_key_here
API Key 长度: 32 (或其他正数)
```

**如果看到 undefined**：
- ❌ API Key 没有被保存
- ✅ 解决：打开 API 配置面板，重新输入并保存 API Key

### 步骤 2：检查 API Key 是否被正确传递

调用 QS GPT Image 2，在控制台中查看日志：

```
[QS GPT Image 2] === 实际发送的请求信息 ===
[QS GPT Image 2]   Headers:
[QS GPT Image 2]     api-key: your_key_first_10_chars...last_10_chars
```

**预期结果**：
- ✅ 看到 `api-key: xxx...xxx`

**如果看到**：
- ❌ `api-key: undefined...undefined` → API Key 没有被获取
- ❌ `api-key: null...null` → API Key 为 null
- ❌ 没有 `api-key` 字段 → 请求头没有包含 API Key

### 步骤 3：检查 API Key 格式

在控制台中运行：

```javascript
const config = JSON.parse(localStorage.getItem('userSettings') || '{}');
const apiKey = config['qs-gpt-image-2']?.apiKey;

console.log('API Key:', apiKey);
console.log('长度:', apiKey?.length);
console.log('前 10 字符:', apiKey?.slice(0, 10));
console.log('后 10 字符:', apiKey?.slice(-10));
console.log('包含空格:', apiKey?.includes(' '));
console.log('包含特殊字符:', !/^[a-zA-Z0-9\-_]+$/.test(apiKey?.trim() || ''));
```

**预期结果**：
- ✅ 长度 > 20
- ✅ 包含空格：false
- ✅ 包含特殊字符：false

## 🛠️ 常见问题快速修复

### 问题 1：API Key 为 undefined

```javascript
// 手动保存 API Key
const config = JSON.parse(localStorage.getItem('userSettings') || '{}');
config['qs-gpt-image-2'] = { 
  apiKey: 'your_actual_api_key_here',
  customEndpoint: 'https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview'
};
localStorage.setItem('userSettings', JSON.stringify(config));
console.log('✓ API Key 已保存，请刷新页面');
```

### 问题 2：API Key 包含空格

```javascript
// 清除空格
const config = JSON.parse(localStorage.getItem('userSettings') || '{}');
const apiKey = config['qs-gpt-image-2']?.apiKey;
const cleanedKey = apiKey?.trim();

if (cleanedKey !== apiKey) {
  config['qs-gpt-image-2'].apiKey = cleanedKey;
  localStorage.setItem('userSettings', JSON.stringify(config));
  console.log('✓ 空格已清除，请刷新页面');
} else {
  console.log('✓ API Key 没有空格');
}
```

### 问题 3：API Key 被截断

```javascript
// 检查完整的 API Key
const config = JSON.parse(localStorage.getItem('userSettings') || '{}');
const apiKey = config['qs-gpt-image-2']?.apiKey;
console.log('完整 API Key:', apiKey);
console.log('长度:', apiKey?.length);

// 如果长度 < 20，说明 API Key 不完整
if (!apiKey || apiKey.length < 20) {
  console.log('❌ API Key 不完整，请重新输入');
}
```

## 📋 完整检查清单

- [ ] 打开 API 配置面板
- [ ] 确认 QS GPT Image 2 的 API Key 已输入
- [ ] 确认 API Key 没有前后空格
- [ ] 点击保存按钮
- [ ] 刷新页面
- [ ] 打开浏览器控制台（F12）
- [ ] 调用 QS GPT Image 2
- [ ] 查看日志中是否有 `api-key: xxx...xxx`
- [ ] 如果没有，运行上面的诊断代码
- [ ] 根据诊断结果，应用相应的修复

## 🚀 快速测试

在浏览器控制台中运行以下代码，测试 API Key 是否有效：

```javascript
// 获取 API Key
const config = JSON.parse(localStorage.getItem('userSettings') || '{}');
const apiKey = config['qs-gpt-image-2']?.apiKey;

if (!apiKey) {
  console.error('❌ API Key 未配置');
} else {
  console.log('✓ API Key 已配置');
  
  // 测试 API 调用
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
  .then(data => {
    if (data.Code === 10001) {
      console.error('❌ API Key 无效:', data.Error);
    } else if (data.Code === 0) {
      console.log('✓ API Key 有效');
    } else {
      console.log('API 响应:', data);
    }
  })
  .catch(err => console.error('❌ 请求失败:', err));
}
```

## 📞 获取帮助

如果问题仍未解决，请提供以下信息：

1. 浏览器控制台中的完整错误日志
2. `[QS GPT Image 2]` 的完整请求日志
3. 本地存储中的 QS 配置（运行 `JSON.stringify(JSON.parse(localStorage.getItem('userSettings') || '{}')['qs-gpt-image-2'])` 获取）
4. API Key 的长度和前 10 字符（用于验证格式）

## 相关文档

- [`API_KEY_TRANSMISSION_FIX.md`](API_KEY_TRANSMISSION_FIX.md) - 详细的修复说明
- [`QS_API_KEY_DEBUG.md`](QS_API_KEY_DEBUG.md) - 深度调试指南
- [`QS_API_TROUBLESHOOTING.md`](QS_API_TROUBLESHOOTING.md) - 故障排查指南
