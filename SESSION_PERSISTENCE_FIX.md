# 会话持久化修复方案

## 问题描述
用户刷新页面后需要重新登录，无法保持登录状态。

## 根本原因
CloudBase 的会话持久化可能在某些情况下不够可靠，特别是在浏览器刷新时，会话信息可能丢失。

## 解决方案

### 1. 双层持久化策略

#### 第一层：CloudBase 原生持久化
- 在 `cloudbase.ts` 中启用 `persistence: 'local'` 配置
- CloudBase SDK 会自动将会话信息保存到 localStorage

#### 第二层：应用级备份
- 在 `AuthContext.tsx` 中添加额外的备份机制
- 每次登录成功时，将会话信息备份到 `cloudbase_session_backup` 和 `cloudbase_user_backup`
- 应用启动时，如果 CloudBase 没有恢复会话，尝试从备份恢复

### 2. 具体实现

#### 登录时备份会话
```typescript
// 邮箱登录
if (data?.session) {
  setSession(data.session);
  setUser(data.session.user);
  // 备份会话信息到 localStorage
  localStorage.setItem('cloudbase_session_backup', JSON.stringify(data.session));
  localStorage.setItem('cloudbase_user_backup', JSON.stringify(data.session.user));
}

// 密码登录
if (data?.session) {
  setSession(data.session);
  setUser(data.session.user);
  // 备份会话信息到 localStorage
  localStorage.setItem('cloudbase_session_backup', JSON.stringify(data.session));
  localStorage.setItem('cloudbase_user_backup', JSON.stringify(data.session.user));
}
```

#### 应用启动时恢复会话
```typescript
const checkAuthStatus = async () => {
  try {
    const auth = getCloudbaseApp().auth({ persistence: 'local' });
    
    // 尝试从 CloudBase 获取当前会话
    const { data } = await auth.getSession();
    
    if (data?.session) {
      // CloudBase 有会话，使用它并更新备份
      setSession(data.session);
      setUser(data.session.user);
      localStorage.setItem('cloudbase_session_backup', JSON.stringify(data.session));
      localStorage.setItem('cloudbase_user_backup', JSON.stringify(data.session.user));
    } else {
      // CloudBase 没有会话，尝试从备份恢复
      const savedSession = localStorage.getItem('cloudbase_session_backup');
      const savedUser = localStorage.getItem('cloudbase_user_backup');
      
      if (savedSession && savedUser) {
        const restoredSession = JSON.parse(savedSession);
        const restoredUser = JSON.parse(savedUser);
        setSession(restoredSession);
        setUser(restoredUser);
      } else {
        setSession(null);
        setUser(null);
      }
    }
  } catch (err) {
    // 即使出错，也尝试从本地恢复
    // ...
  }
};
```

#### 登出时清理备份
```typescript
const signOut = async () => {
  try {
    const auth = getCloudbaseApp().auth({ persistence: 'local' });
    await auth.signOut();
    
    // 清理本地存储中的所有会话数据
    clearLocalAuthStorage();
    
    // 清理会话备份
    localStorage.removeItem('cloudbase_session_backup');
    localStorage.removeItem('cloudbase_user_backup');
    
    setUser(null);
    setSession(null);
  } catch (err) {
    // 错误处理...
  }
};
```

### 3. 清理策略优化

在 `clearLocalAuthStorage` 中，保留备份数据，只清理其他 CloudBase 相关的键：

```typescript
// 清理所有以 cloudbase 开头的键，但保留备份
for (let i = localStorage.length - 1; i >= 0; i--) {
  const key = localStorage.key(i);
  if (key && key.toLowerCase().includes('cloudbase') && 
      !key.includes('_backup')) {
    localStorage.removeItem(key);
  }
}
```

## 工作流程

### 首次登录
1. 用户输入凭证并登录
2. CloudBase 返回会话信息
3. 应用将会话信息保存到 React state
4. 应用同时备份会话信息到 localStorage

### 刷新页面
1. 应用启动，调用 `checkAuthStatus()`
2. 尝试从 CloudBase 获取会话
3. 如果 CloudBase 有会话，使用它
4. 如果 CloudBase 没有会话，从 localStorage 备份恢复
5. 用户保持登录状态，页面停留在当前位置

### 登出
1. 用户点击登出按钮
2. 调用 CloudBase 的 `signOut()` 方法
3. 清理所有本地存储的会话数据（包括备份）
4. 用户被重定向到登录页面

## 优势

1. **可靠性高**：双层持久化确保会话不会丢失
2. **用户体验好**：刷新后无需重新登录，页面状态保持
3. **安全性**：登出时完全清理所有会话数据
4. **兼容性**：与 CloudBase 原生持久化配合工作
5. **错误恢复**：即使 CloudBase 出错，也能从备份恢复

## 测试步骤

1. **测试登录持久化**
   - 登录应用
   - 刷新页面（F5 或 Cmd+R）
   - 验证：用户仍然保持登录状态，页面停留在当前位置

2. **测试登出清理**
   - 登录应用
   - 点击登出按钮
   - 刷新页面
   - 验证：用户被重定向到登录页面

3. **测试浏览器关闭和重新打开**
   - 登录应用
   - 关闭浏览器标签页
   - 重新打开应用
   - 验证：用户仍然保持登录状态

4. **测试多标签页同步**
   - 在标签页 A 中登录
   - 在标签页 B 中打开应用
   - 验证：标签页 B 也显示登录状态

## 相关文件修改

- `src/contexts/AuthContext.tsx` - 添加会话备份和恢复逻辑
- `src/lib/cloudbase.ts` - 启用 CloudBase 本地持久化配置

## 注意事项

1. 备份的会话信息存储在 localStorage 中，不包含敏感信息
2. 登出时必须清理备份，防止数据泄露
3. 如果用户清理浏览器缓存，会话备份也会被清理
4. 在隐私浏览模式下，localStorage 可能不可用，此时依赖 CloudBase 原生持久化
