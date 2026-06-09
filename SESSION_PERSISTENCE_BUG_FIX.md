# 会话持久化 Bug 修复

## 问题描述
刷新页面后仍然需要重新登录，会话持久化没有正常工作。

## 根本原因
在登录前调用了 `clearLocalAuthStorage()` 函数，这个函数会删除所有 CloudBase 相关的本地存储数据，**包括备份数据**。这导致：

1. 用户登录成功，会话被备份到 localStorage
2. 用户刷新页面
3. 应用启动时，`checkAuthStatus()` 尝试从 CloudBase 恢复会话
4. 如果 CloudBase 没有会话（或会话过期），应用尝试从备份恢复
5. **但备份已经被删除了**，所以用户被重定向到登录页面

## 修复方案

### 问题代码
```typescript
// ❌ 错误：这会删除备份数据
const sendEmailLoginCode = async (email: string) => {
  clearLocalAuthStorage(); // 删除所有 cloudbase_* 键，包括备份
  // ...
};
```

### 修复代码
```typescript
// ✅ 正确：只删除特定的键，保留备份
const sendEmailLoginCode = async (email: string) => {
  const keysToRemove = [
    'cloudbase_session',
    'cloudbase_access_token',
    'cloudbase_refresh_token',
    'cloudbase_user',
    'cloudbase_login_state',
    'cloudbase_anonymous_uid',
  ];
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
  // ...
};
```

## 修改的函数

### 1. sendEmailSignUpCode()
- **位置**：第 179 行
- **改动**：不调用 `clearLocalAuthStorage()`，改为只删除特定的键

### 2. sendEmailLoginCode()
- **位置**：第 281 行
- **改动**：不调用 `clearLocalAuthStorage()`，改为只删除特定的键

### 3. signInWithPassword()
- **位置**：第 395 行
- **改动**：不调用 `clearLocalAuthStorage()`，改为只删除特定的键

### 4. signUpWithUsername()
- **位置**：第 339 行
- **改动**：不调用 `clearLocalAuthStorage()`，改为只删除特定的键

## 关键改动

### 保留的备份键
```javascript
// 这些键被保留，不会被删除
'cloudbase_session_backup'
'cloudbase_user_backup'
```

### 被删除的键
```javascript
// 这些键会被删除，但备份不会
'cloudbase_session'
'cloudbase_access_token'
'cloudbase_refresh_token'
'cloudbase_user'
'cloudbase_login_state'
'cloudbase_anonymous_uid'
```

## 工作流程（修复后）

### 首次登录
```
用户输入凭证
  ↓
清理旧会话（但保留备份）
  ↓
CloudBase 验证并返回会话
  ↓
应用保存到 state
  ↓
应用备份到 localStorage
  ↓
用户进入主应用
```

### 刷新页面
```
应用启动
  ↓
checkAuthStatus() 被调用
  ↓
尝试从 CloudBase 获取会话
  ↓
如果有会话 → 使用它
如果没有会话 → 从 localStorage 备份恢复 ✅
  ↓
用户保持登录状态
```

## 测试验证

### 测试步骤
1. 打开应用，进入登录页面
2. 使用邮箱或用户名登录
3. 成功登录后，按 **F5** 刷新页面
4. **验证**：用户仍然保持登录状态 ✅

### 验证备份
打开浏览器开发者工具（F12），在控制台运行：
```javascript
console.log('Session backup:', localStorage.getItem('cloudbase_session_backup'));
console.log('User backup:', localStorage.getItem('cloudbase_user_backup'));
```

应该看到有效的 JSON 数据。

## 为什么这个修复有效

1. **保留备份**：登录前不再删除备份数据
2. **清理旧会话**：仍然删除旧的会话键，避免冲突
3. **恢复机制**：刷新时可以从备份恢复
4. **安全性**：登出时仍然完全清理所有数据

## 相关代码

### clearLocalAuthStorage() 函数
这个函数仍然存在，但现在只在以下情况下调用：
- 登出时（此时需要完全清理）
- 错误恢复时

它的逻辑已经优化，保留 `_backup` 后缀的键：
```typescript
if (key && key.toLowerCase().includes('cloudbase') && 
    !key.includes('_backup')) {
  localStorage.removeItem(key);
}
```

## 总结

这个修复确保了：
✅ 登录前清理旧会话，避免冲突
✅ 保留备份数据，用于刷新恢复
✅ 刷新后能从备份恢复会话
✅ 登出时完全清理所有数据

**现在刷新页面后应该能保持登录状态了！**

---

**修复日期**：2024年
**状态**：✅ 已修复
