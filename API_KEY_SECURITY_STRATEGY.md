# API Key 安全性策略与建议

## 问题分析

当前的前端直调模式存在一个安全性权衡：

### 优势
- ✅ 绕过云函数 3 秒超时限制
- ✅ 更快的响应速度
- ✅ 更好的错误处理

### 劣势
- ❌ API Key 在前端代码中暴露（虽然通过云函数获取，但最终还是在浏览器中）
- ❌ 用户担心自配 API Key 会被保存

## 当前解决方案

### 1. 云函数获取 + 内存缓存

```typescript
// 通过云函数快速获取 API Key（< 1s）
const key = await getVApiKeyFromCloudFunction();

// 缓存在内存中，避免频繁调用云函数
let _cachedVApiKey: string | null = null;
if (_cachedVApiKey) return _cachedVApiKey;
_cachedVApiKey = key;
```

**优点：**
- API Key 不暴露在构建产物中
- 不需要用户手动配置
- 云函数可以集中管理 Key

**缺点：**
- 需要云函数支持
- 内存缓存在页面刷新后丢失

### 2. 用户自配 + 本地存储

```typescript
// 用户通过 UI 配置面板输入 API Key
const userConfigs = loadUserApiConfig();
const apiKey = userConfigs?.["model-name"]?.apiKey;
```

**优点：**
- 用户完全控制自己的 Key
- 不依赖云函数

**缺点：**
- 需要用户手动配置
- 用户担心 Key 被保存

## 推荐的多层安全策略

### 第一层：云函数模式（推荐用于生产环境）

**适用场景：** 你有自己的云函数，可以安全地存储 API Key

```typescript
// 优先级 1：云函数获取（最安全）
const key = await getVApiKeyFromCloudFunction();

// 优先级 2：环境变量（仅开发环境）
const key = process.env.VITE_API_KEY;

// 优先级 3：用户自配（备选）
const key = userConfigs?.apiKey;
```

**实现方式：**
```typescript
const getApiKeyWithCache = async (): Promise<string> => {
  // 1. 检查缓存
  if (_cachedKey) return _cachedKey;
  
  // 2. 尝试从云函数获取
  try {
    const key = await getVApiKeyFromCloudFunction();
    if (key) {
      _cachedKey = key;
      return key;
    }
  } catch {
    // 云函数失败，继续尝试其他方式
  }
  
  // 3. 尝试用户自配
  const userKey = loadUserApiConfig()?.apiKey;
  if (userKey) return userKey;
  
  // 4. 都失败了，抛出错误
  throw new Error("无法获取 API Key");
};
```

### 第二层：环境变量模式（开发环境）

**适用场景：** 本地开发，需要快速测试

```env
# .env.local
VITE_API_KEY=your_key_here
```

**优点：**
- 简单快速
- 不需要云函数

**缺点：**
- Key 在代码中（需要 .gitignore）
- 仅适合开发环境

### 第三层：用户自配模式（备选）

**适用场景：** 用户有自己的 API Key，想要完全控制

**关键问题：用户担心 Key 被保存**

#### 解决方案 A：IndexedDB + 加密存储

```typescript
// 使用 IndexedDB 存储加密的 API Key
import { encrypt, decrypt } from 'crypto-js';

const saveApiKeySecurely = async (key: string) => {
  // 1. 使用用户的浏览器指纹作为加密密钥
  const fingerprint = await generateBrowserFingerprint();
  
  // 2. 加密 API Key
  const encrypted = encrypt(key, fingerprint);
  
  // 3. 存储到 IndexedDB（不是 localStorage）
  await db.apiKeys.put({
    modelType: 'v-api-gpt-image-2',
    encrypted,
    timestamp: Date.now(),
  });
};

const loadApiKeySecurely = async () => {
  const stored = await db.apiKeys.get('v-api-gpt-image-2');
  if (!stored) return null;
  
  const fingerprint = await generateBrowserFingerprint();
  return decrypt(stored.encrypted, fingerprint);
};
```

**优点：**
- Key 被加密存储
- 只有当前浏览器可以解密
- 用户可以随时删除

**缺点：**
- 实现复杂
- 需要额外的加密库

#### 解决方案 B：内存存储 + 会话级别

```typescript
// 只在当前会话中存储 API Key，刷新页面后丢失
let _sessionApiKey: string | null = null;

const setSessionApiKey = (key: string) => {
  _sessionApiKey = key;
  // 显示提示：Key 仅在当前会话中保存，刷新页面后需要重新输入
};

const getSessionApiKey = () => {
  return _sessionApiKey;
};
```

**优点：**
- 最安全（刷新后丢失）
- 用户不用担心持久化
- 实现简单

**缺点：**
- 用户体验差（每次刷新都要重新输入）

#### 解决方案 C：透明的安全说明

```typescript
// 在 UI 中清楚地说明：
// 1. Key 如何存储
// 2. Key 如何使用
// 3. 用户可以随时删除
// 4. 提供删除按钮

const ApiKeyConfigPanel = () => {
  return (
    <div>
      <h3>API Key 配置</h3>
      
      <div className="security-notice">
        <h4>🔒 安全说明</h4>
        <ul>
          <li>✅ API Key 存储在浏览器本地（IndexedDB）</li>
          <li>✅ API Key 被加密存储，只有你的浏览器可以解密</li>
          <li>✅ API Key 不会上传到服务器</li>
          <li>✅ 你可以随时删除 API Key</li>
          <li>⚠️ 如果你在公共电脑上使用，请务必删除 API Key</li>
        </ul>
      </div>
      
      <input 
        type="password" 
        placeholder="输入你的 API Key"
        onChange={(e) => setSessionApiKey(e.target.value)}
      />
      
      <button onClick={() => deleteApiKey()}>
        删除保存的 API Key
      </button>
    </div>
  );
};
```

**优点：**
- 用户了解风险
- 用户可以做出知情决定
- 建立信任

## 推荐方案

### 对于你的项目

**分阶段实施：**

#### 阶段 1：现在（短期）
- ✅ 使用云函数 + 内存缓存（已实现）
- ✅ 支持环境变量配置（开发环境）
- ✅ 支持用户自配（备选）
- ✅ 在 UI 中清楚说明安全性

#### 阶段 2：未来（中期）
- 如果用户反馈需要持久化存储
- 实现 IndexedDB + 加密存储
- 添加详细的安全说明

#### 阶段 3：升级（长期）
- 如果升级云函数超时时长
- 改回 `callCloudbaseModelProxy` 模式
- 只需改动 `modelRouter.ts` 中的路由逻辑

## 代码示例

### 完整的 API Key 获取流程

```typescript
// src/lib/modelRouter.ts

/**
 * 获取 API Key 的完整流程
 * 
 * 优先级：
 * 1. 云函数获取（最安全，生产环境推荐）
 * 2. 用户自配（用户完全控制）
 * 3. 环境变量（开发环境）
 */
const getApiKeyWithCache = async (
  modelType: string,
  cloudFunctionGetter: () => Promise<string | null>,
  envVarName: string,
): Promise<string> => {
  // 1. 检查缓存
  const cached = _apiKeyCache[modelType];
  if (cached) return cached;
  
  // 2. 尝试从云函数获取
  try {
    const key = await cloudFunctionGetter();
    if (key) {
      _apiKeyCache[modelType] = key;
      return key;
    }
  } catch (error) {
    console.warn(`从云函数获取 ${modelType} API Key 失败:`, error);
  }
  
  // 3. 尝试用户自配
  const userConfigs = loadUserApiConfig();
  const userKey = userConfigs?.[modelType]?.apiKey;
  if (userKey) {
    _apiKeyCache[modelType] = userKey;
    return userKey;
  }
  
  // 4. 尝试环境变量
  const envKey = getApiKey(envVarName);
  if (envKey) {
    _apiKeyCache[modelType] = envKey;
    return envKey;
  }
  
  // 5. 都失败了
  throw new Error(
    `无法获取 ${modelType} API Key。请尝试以下方式之一：\n` +
    `1. 在云函数环境变量中设置 ${envVarName}\n` +
    `2. 在 API 配置面板中输入 API Key\n` +
    `3. 在 .env 文件中设置 ${envVarName}`
  );
};
```

### UI 中的安全说明

```typescript
// src/components/ApiConfigPanel.tsx

const SecurityNotice = ({ modelType }: { modelType: string }) => {
  return (
    <div className="security-notice">
      <h4>🔒 API Key 安全说明</h4>
      
      <div className="notice-item">
        <span className="icon">✅</span>
        <span>API Key 存储在你的浏览器本地（IndexedDB）</span>
      </div>
      
      <div className="notice-item">
        <span className="icon">✅</span>
        <span>API Key 被加密存储，只有你的浏览器可以解密</span>
      </div>
      
      <div className="notice-item">
        <span className="icon">✅</span>
        <span>API Key 不会上传到我们的服务器</span>
      </div>
      
      <div className="notice-item">
        <span className="icon">✅</span>
        <span>你可以随时删除保存的 API Key</span>
      </div>
      
      <div className="notice-item warning">
        <span className="icon">⚠️</span>
        <span>如果你在公共电脑上使用，请务必删除 API Key</span>
      </div>
      
      <div className="notice-item info">
        <span className="icon">ℹ️</span>
        <span>
          我们推荐使用云函数模式（自动获取 API Key），
          这样你不需要手动配置 API Key
        </span>
      </div>
    </div>
  );
};
```

## 总结

### 当前方案（已实现）
- ✅ 云函数 + 内存缓存（最安全）
- ✅ 环境变量（开发环境）
- ✅ 用户自配（备选）

### 用户担心的问题
- "我的 API Key 会被保存吗？" → 只在内存中，刷新后丢失
- "我的 API Key 会被上传到服务器吗？" → 不会，直接调用 API
- "我的 API Key 安全吗？" → 通过云函数获取，不暴露在代码中

### 建议
1. **现在：** 在 UI 中清楚说明安全性，建立用户信任
2. **未来：** 如果需要，实现 IndexedDB + 加密存储
3. **升级：** 如果云函数超时时长升级，改回云函数代理模式

## 相关文件

- [`src/lib/modelRouter.ts`](src/lib/modelRouter.ts) - 路由逻辑
- [`src/lib/modelClient.ts`](src/lib/modelClient.ts) - API 实现
- [`src/lib/userApiConfig.ts`](src/lib/userApiConfig.ts) - 用户配置管理
- [`src/lib/ApiConfigPanel.tsx`](src/lib/ApiConfigPanel.tsx) - API 配置 UI

## 参考资源

- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
