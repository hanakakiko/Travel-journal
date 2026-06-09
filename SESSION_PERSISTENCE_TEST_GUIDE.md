# 会话持久化测试指南

## 快速测试

### 测试 1：基本刷新测试（最重要）
**目标**：验证刷新页面后保持登录状态

**步骤**：
1. 打开应用，进入登录页面
2. 使用邮箱或用户名登录
3. 成功登录后，应该看到主应用界面
4. **按 F5 或 Cmd+R 刷新页面**
5. **验证**：
   - ✅ 页面刷新后，用户仍然保持登录状态
   - ✅ 页面停留在刷新前的位置（不是返回登录页）
   - ✅ 用户信息（昵称/邮箱）仍然显示在顶部

**预期结果**：
```
刷新前：已登录，显示用户信息
刷新后：仍然已登录，显示相同的用户信息，页面位置不变
```

---

### 测试 2：浏览器关闭和重新打开
**目标**：验证关闭浏览器后重新打开仍保持登录

**步骤**：
1. 登录应用
2. 记住当前 URL（例如：`http://localhost:5173/`）
3. **完全关闭浏览器**（不是最小化）
4. 重新打开浏览器
5. 访问应用 URL
6. **验证**：
   - ✅ 应用自动显示已登录状态
   - ✅ 无需重新输入凭证

---

### 测试 3：多标签页同步
**目标**：验证多个标签页之间的会话同步

**步骤**：
1. 在标签页 A 中登录应用
2. **在新标签页 B 中打开应用**
3. **验证**：
   - ✅ 标签页 B 自动显示已登录状态
   - ✅ 两个标签页显示相同的用户信息

---

### 测试 4：登出清理
**目标**：验证登出后会话被完全清理

**步骤**：
1. 登录应用
2. 点击顶部的**登出按钮**
3. **验证**：
   - ✅ 页面重定向到登录页面
   - ✅ 用户信息消失
4. **刷新页面**
5. **验证**：
   - ✅ 仍然显示登录页面（不会自动登录）

---

### 测试 5：浏览器开发者工具检查
**目标**：验证会话备份正确保存

**步骤**：
1. 登录应用
2. **打开浏览器开发者工具**（F12）
3. 进入 **Application** 或 **Storage** 标签
4. 点击 **Local Storage**
5. 选择应用的域名
6. **验证**：
   - ✅ 存在 `cloudbase_session_backup` 键
   - ✅ 存在 `cloudbase_user_backup` 键
   - ✅ 这两个键包含有效的 JSON 数据

**查看备份内容**：
```javascript
// 在浏览器控制台运行
console.log('Session:', JSON.parse(localStorage.getItem('cloudbase_session_backup')));
console.log('User:', JSON.parse(localStorage.getItem('cloudbase_user_backup')));
```

---

### 测试 6：清除缓存后的行为
**目标**：验证清除缓存后的恢复能力

**步骤**：
1. 登录应用
2. **打开浏览器开发者工具**（F12）
3. 进入 **Application** 标签
4. 点击 **Clear site data** 或 **Clear all**
5. **刷新页面**
6. **验证**：
   - ✅ 页面显示登录页面（因为缓存被清除）
   - ✅ 需要重新登录

---

## 控制台日志检查

### 登录时的日志
打开浏览器控制台（F12），登录时应该看到：
```
[Auth] sendEmailLoginCode email: user@example.com
[Auth] sendEmailLoginCode result - data keys: [...]
[Auth] verifyEmailLoginCode token: 123456
[Auth] email login success, user=xxx email=user@example.com
[Auth] Successfully synced user data after email login
```

### 刷新时的日志
刷新页面时应该看到：
```
[Auth] checkAuthStatus: session found from CloudBase, user=xxx
```
或
```
[Auth] checkAuthStatus: restored session from localStorage, user=xxx
```

### 登出时的日志
点击登出时应该看到：
```
[Auth] signed out and cleared all local user data
```

---

## 常见问题排查

### 问题 1：刷新后仍然需要重新登录
**可能原因**：
- localStorage 被禁用
- 浏览器隐私模式
- CloudBase 会话过期

**解决方案**：
1. 检查浏览器是否启用了 localStorage
2. 尝试在普通模式（非隐私模式）下测试
3. 检查浏览器控制台是否有错误信息

### 问题 2：登出后仍然保持登录状态
**可能原因**：
- 备份没有被清理
- 缓存问题

**解决方案**：
1. 手动清除 localStorage：
   ```javascript
   localStorage.removeItem('cloudbase_session_backup');
   localStorage.removeItem('cloudbase_user_backup');
   ```
2. 清除浏览器缓存并重新加载

### 问题 3：多标签页不同步
**可能原因**：
- localStorage 事件监听器未正确设置
- 浏览器不支持跨标签页通信

**解决方案**：
1. 检查浏览器是否支持 localStorage
2. 尝试在不同浏览器中测试

---

## 性能检查

### 检查会话恢复时间
```javascript
// 在浏览器控制台运行
console.time('Session Recovery');
// 刷新页面
console.timeEnd('Session Recovery');
```

**预期**：会话恢复应该在 100ms 以内完成

---

## 安全检查

### 验证敏感信息不被泄露
1. 登录应用
2. 打开浏览器开发者工具
3. 检查 localStorage 中的备份数据
4. **验证**：
   - ✅ 不包含密码
   - ✅ 不包含 API Key
   - ✅ 只包含用户 ID 和基本信息

---

## 自动化测试脚本

### 快速测试脚本
```javascript
// 在浏览器控制台运行此脚本进行快速测试

async function testSessionPersistence() {
  console.log('=== 会话持久化测试开始 ===');
  
  // 检查备份
  const sessionBackup = localStorage.getItem('cloudbase_session_backup');
  const userBackup = localStorage.getItem('cloudbase_user_backup');
  
  console.log('✓ 会话备份存在:', !!sessionBackup);
  console.log('✓ 用户备份存在:', !!userBackup);
  
  if (sessionBackup) {
    try {
      const session = JSON.parse(sessionBackup);
      console.log('✓ 会话备份有效，用户ID:', session.user?.id);
    } catch (e) {
      console.error('✗ 会话备份无效:', e);
    }
  }
  
  console.log('=== 测试完成 ===');
}

testSessionPersistence();
```

---

## 测试检查清单

- [ ] 刷新页面后保持登录状态
- [ ] 关闭浏览器后重新打开仍保持登录
- [ ] 多标签页自动同步登录状态
- [ ] 登出后完全清理会话
- [ ] localStorage 中有正确的备份数据
- [ ] 浏览器控制台没有错误信息
- [ ] 会话恢复时间在 100ms 以内
- [ ] 备份数据不包含敏感信息

---

## 反馈和报告

如果测试中发现问题，请记录：
1. 浏览器类型和版本
2. 操作系统
3. 具体步骤
4. 浏览器控制台的错误信息
5. localStorage 中的数据内容
