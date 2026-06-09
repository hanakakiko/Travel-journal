# 登录注册会话混乱问题修复说明

## 问题描述

用户在注册新账号后，无论使用什么邮箱或用户名注册，登录后都会显示为 `1104349906@qq.com` 这个账号。登出后用新注册的邮箱/用户名登录时，会显示"用户名或密码不正确"。

## 根本原因

CloudBase 认证系统在本地存储中保存会话信息。问题的根源是：

1. **旧会话未清理**：注册新用户时，本地存储中可能仍然存在之前登录的用户会话信息
2. **会话覆盖冲突**：新注册的用户会话与旧会话在本地存储中产生冲突，导致 CloudBase SDK 返回错误的用户信息
3. **登出不彻底**：登出时没有完全清理本地存储中的所有 CloudBase 相关数据

## 修复方案

### 1. 添加会话清理函数

在 `AuthContext.tsx` 中添加 `clearLocalAuthStorage()` 函数，用于清理本地存储和 sessionStorage 中的所有 CloudBase 相关数据：

```typescript
const clearLocalAuthStorage = () => {
  try {
    // 清理已知的 CloudBase 键
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
    
    // 清理所有以 cloudbase 开头的键
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.toLowerCase().includes('cloudbase')) {
        localStorage.removeItem(key);
      }
    }
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && key.toLowerCase().includes('cloudbase')) {
        sessionStorage.removeItem(key);
      }
    }
    console.log('[Auth] Cleared local auth storage');
  } catch (err) {
    console.error('[Auth] Failed to clear local auth storage:', err);
  }
};
```

### 2. 在关键认证操作前清理会话

修改以下方法，在执行认证操作前调用 `clearLocalAuthStorage()`：

- **`signUpWithUsername()`** - 注册前清理
- **`signInWithPassword()`** - 登录前清理
- **`sendEmailSignUpCode()`** - 邮箱注册前清理
- **`sendEmailLoginCode()`** - 邮箱登录前清理

### 3. 在登出时彻底清理会话

修改 `signOut()` 方法：

```typescript
const signOut = async () => {
  try {
    const auth = getCloudbaseApp().auth({ persistence: 'local' });
    await auth.signOut();
    
    // 清理本地存储中的所有会话数据
    clearLocalAuthStorage();
    
    setUser(null);
    setSession(null);
    console.log('[Auth] signed out');
  } catch (err) {
    console.error('[Auth] signOut failed:', err);
    // 即使 signOut 失败，也要清理本地存储
    clearLocalAuthStorage();
    setUser(null);
    setSession(null);
    throw err;
  }
};
```

## 修复后的行为

### 注册流程
1. 用户点击"立即注册"
2. 系统清理本地存储中的旧会话
3. 调用 CloudBase 的 `signUp()` 方法
4. 注册成功后，新用户的会话被保存到本地存储
5. 用户自动登录为新注册的账号

### 登录流程
1. 用户输入用户名/邮箱和密码
2. 系统清理本地存储中的旧会话
3. 调用 CloudBase 的 `signInWithPassword()` 方法
4. 登录成功后，该用户的会话被保存到本地存储
5. 用户看到正确的账号信息

### 登出流程
1. 用户点击"登出"
2. 系统调用 CloudBase 的 `signOut()` 方法
3. 清理本地存储中的所有 CloudBase 相关数据
4. 清空 React 状态中的用户信息
5. 用户被重定向到登录页面

## 测试步骤

### 测试 1：新用户注册
1. 打开应用，进入注册页面
2. 选择"密码注册"
3. 输入新的用户名（如 `testuser123`）、邮箱（如 `test@example.com`）、密码
4. 点击"立即注册"
5. **预期结果**：注册成功，自动登录，显示新注册的用户名/邮箱

### 测试 2：用新账号登出后重新登录
1. 在已登录的状态下，点击"登出"
2. **预期结果**：成功登出，返回登录页面
3. 用刚才注册的用户名和密码登录
4. **预期结果**：登录成功，显示正确的用户信息

### 测试 3：多个用户轮流登录
1. 用用户 A 的凭据登录
2. 记录显示的用户信息
3. 登出
4. 用用户 B 的凭据登录
5. **预期结果**：显示用户 B 的信息，不会显示用户 A 的信息

### 测试 4：邮箱 OTP 注册
1. 选择"邮箱注册"
2. 输入新邮箱地址
3. 点击"发送验证码"
4. 输入验证码
5. **预期结果**：注册成功，自动登录，显示新邮箱

## 浏览器开发者工具验证

打开浏览器的开发者工具（F12），进入 Application 标签：

### 注册前
- 检查 localStorage 中是否存在旧的 `cloudbase_*` 键

### 注册后
- 应该看到新的 `cloudbase_session` 和 `cloudbase_user` 键
- 这些键应该包含新注册用户的信息

### 登出后
- 所有 `cloudbase_*` 键应该被删除
- localStorage 应该是干净的

## 控制台日志验证

打开浏览器控制台，查看以下日志：

```
[Auth] Cleared local auth storage
[Auth] signUpWithUsername params: { username: 'testuser123', password: '***', email: 'test@example.com', nickname: undefined }
[Auth] signUpWithUsername result - error: null
[Auth] checkAuthStatus: user=<新用户ID> email=test@example.com
```

## 相关文件修改

- `src/contexts/AuthContext.tsx` - 添加会话清理逻辑

## 注意事项

1. **浏览器缓存**：如果修复后仍然看到旧的行为，请清理浏览器缓存或使用隐私窗口测试
2. **多标签页**：如果在多个标签页中同时使用应用，可能会出现会话冲突。建议在一个标签页中完成登录/注册流程
3. **CloudBase 配置**：确保 CloudBase 环境中已启用"用户名密码登录"和"邮箱 OTP 登录"

## 后续改进建议

1. **添加会话验证**：在每次操作前验证会话的有效性
2. **实现会话刷新**：定期刷新会话令牌，防止过期
3. **添加错误恢复**：如果检测到会话冲突，自动清理并重新登录
4. **用户反馈**：在注册/登录过程中显示更详细的状态提示
