# 登录注册修复 - 快速测试指南

## 修复内容总结

已修复 CloudBase 认证系统中的会话混乱问题。现在：
- ✅ 注册新用户时会清理旧会话
- ✅ 登录时会清理旧会话
- ✅ 登出时会彻底清理所有会话数据
- ✅ 多个用户可以正确地轮流登录

## 快速测试（5分钟）

### 准备工作
1. 打开浏览器开发者工具（F12）
2. 进入 **Application** 标签
3. 展开 **Local Storage**，找到你的应用域名

### 测试 1：新用户注册（2分钟）

**步骤：**
1. 刷新页面，确保处于登出状态
2. 点击"注册"标签
3. 选择"密码注册"
4. 填写表单：
   - 用户名：`testuser_` + 当前时间戳（如 `testuser_1234567890`）
   - 邮箱：`test_` + 时间戳 + `@example.com`
   - 密码：`Test@123456`
   - 确认密码：`Test@123456`
5. 点击"立即注册"

**预期结果：**
- ✅ 注册成功，页面跳转到主应用
- ✅ 用户信息栏显示新注册的用户名
- ✅ 浏览器控制台显示：`[Auth] Cleared local auth storage`
- ✅ LocalStorage 中有新的 `cloudbase_session` 和 `cloudbase_user` 键

### 测试 2：登出并用新账号重新登录（2分钟）

**步骤：**
1. 点击右上角"登出"按钮
2. 确认登出成功（返回登录页面）
3. 选择"密码登录"
4. 输入刚才注册的用户名和密码
5. 点击"登录"

**预期结果：**
- ✅ 登出成功，LocalStorage 中的 `cloudbase_*` 键被删除
- ✅ 登录成功，显示正确的用户信息
- ✅ 浏览器控制台显示：`[Auth] Cleared local auth storage`
- ✅ 浏览器控制台显示：`[Auth] password login success, user=<用户ID>`

### 测试 3：验证旧账号无法登录（1分钟）

**步骤：**
1. 点击"登出"
2. 尝试用旧账号（`1104349906@qq.com`）登录
3. 输入错误的密码

**预期结果：**
- ✅ 显示"用户名或密码不正确"错误
- ✅ 不会自动登录到任何账号

## 详细测试（10分钟）

### 测试 4：邮箱 OTP 注册

**步骤：**
1. 登出（如果已登录）
2. 进入注册页面
3. 选择"邮箱注册"
4. 输入新邮箱地址
5. 点击"发送验证码"
6. 输入验证码（如果有测试邮箱）
7. 完成注册

**预期结果：**
- ✅ 注册成功，自动登录
- ✅ 显示新邮箱地址

### 测试 5：多用户轮流登录

**步骤：**
1. 用用户 A 登录
2. 记录显示的用户信息
3. 登出
4. 用用户 B 登录
5. 记录显示的用户信息
6. 登出
7. 用用户 A 重新登录
8. 验证显示的是用户 A 的信息

**预期结果：**
- ✅ 每次登录都显示正确的用户信息
- ✅ 不会出现用户混乱的情况

## 浏览器控制台日志检查

打开浏览器控制台（F12 → Console），查看以下日志：

### 注册时应该看到：
```
[Auth] Cleared local auth storage
[Auth] signUpWithUsername params: { username: 'testuser_xxx', password: '***', email: 'test_xxx@example.com', nickname: undefined }
[Auth] signUpWithUsername result - error: null
[Auth] checkAuthStatus: user=<新用户ID> email=test_xxx@example.com
```

### 登录时应该看到：
```
[Auth] Cleared local auth storage
[Auth] signInWithPassword, using username
[Auth] signInWithPassword result - data: {...} error: undefined
[Auth] password login success, user=<用户ID>
```

### 登出时应该看到：
```
[Auth] signed out
[Auth] Cleared local auth storage
```

## 常见问题排查

### 问题 1：注册后仍然显示旧账号
**解决方案：**
1. 清理浏览器缓存（Ctrl+Shift+Delete）
2. 关闭所有浏览器标签页
3. 重新打开应用
4. 重新注册

### 问题 2：登出后 LocalStorage 中仍有 cloudbase 键
**解决方案：**
1. 打开开发者工具
2. 进入 Application → Local Storage
3. 手动删除所有 `cloudbase_*` 键
4. 刷新页面
5. 重新测试

### 问题 3：登录时显示"用户名或密码不正确"
**解决方案：**
1. 确认用户名/邮箱和密码输入正确
2. 检查大小写（用户名通常区分大小写）
3. 确认该用户确实已注册
4. 尝试用邮箱登录而不是用户名

### 问题 4：多标签页中出现会话冲突
**解决方案：**
1. 关闭其他标签页
2. 在单个标签页中完成登录/注册流程
3. 如果需要多标签页，建议在不同浏览器中打开

## 修复验证清单

- [ ] 新用户注册成功
- [ ] 注册后自动登录为新用户
- [ ] 登出后无法用旧账号登录
- [ ] 用新账号可以成功登录
- [ ] 多个用户可以轮流登录
- [ ] 登出时 LocalStorage 被清理
- [ ] 浏览器控制台显示正确的日志
- [ ] 邮箱 OTP 注册正常工作

## 反馈

如果测试过程中发现任何问题，请：
1. 记录具体的步骤
2. 截图或录屏
3. 查看浏览器控制台的错误信息
4. 提供反馈给开发团队

---

**修复日期**：2026-06-08  
**修复文件**：`src/contexts/AuthContext.tsx`  
**修复方法**：添加 `clearLocalAuthStorage()` 函数，在关键认证操作前清理旧会话
