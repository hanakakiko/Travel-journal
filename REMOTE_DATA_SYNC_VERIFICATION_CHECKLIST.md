# 远端数据同步 - 验证清单

## 代码修改验证

### ✅ `src/lib/templateManager.ts`
- [x] 添加了 `localClear()` 函数
- [x] 添加了 `cloudRename()` 函数
- [x] 添加了 `clearLocalCache()` 公开 API
- [x] 更新了文件头注释说明存储策略
- [x] 保持了现有 API 的兼容性

### ✅ `src/lib/userSettings.ts`
- [x] 添加了 `clearAllLocalSettings()` 函数
- [x] 函数清理了所有三个本地缓存键：
  - [x] CUSTOM_TAGS_KEY
  - [x] API_CONFIG_KEY
  - [x] SOUND_ENABLED_KEY
- [x] 添加了日志输出
- [x] 保持了现有 API 的兼容性

### ✅ `src/contexts/AuthContext.tsx`
- [x] 导入了 `initializeUserSettings` 和 `clearAllLocalSettings`
- [x] 导入了 `getAllTemplatesAsync` 和 `clearTemplateCache`
- [x] 在 `verifyEmailSignUpCode()` 中添加了数据同步
- [x] 在 `verifyEmailLoginCode()` 中添加了数据同步
- [x] 在 `signInWithPassword()` 中添加了数据同步
- [x] 在 `signOut()` 中添加了本地缓存清理
- [x] 所有异步操作都有 try-catch 和错误日志
- [x] 网络失败时不阻断登录流程

### ✅ `src/App.tsx`
- [x] 添加了监听用户变化的 `useEffect`
- [x] 依赖数组正确设置为 `[user?.id]`
- [x] 登录后调用 `initializeUserSettings()` 和 `getAllTemplatesAsync()`
- [x] 更新了 `setSavedTemplates` 状态
- [x] 添加了日志输出
- [x] 网络失败时有错误处理

---

## 功能验证

### 登录流程
- [ ] **邮箱 OTP 注册**
  - [ ] 用户输入邮箱和昵称
  - [ ] 收到验证码
  - [ ] 输入验证码后登录成功
  - [ ] 自动拉取云端数据
  - [ ] 模板列表显示正确
  - [ ] 自定义选项显示正确

- [ ] **邮箱 OTP 登录**
  - [ ] 用户输入邮箱
  - [ ] 收到验证码
  - [ ] 输入验证码后登录成功
  - [ ] 自动拉取云端数据
  - [ ] 模板列表显示正确
  - [ ] 自定义选项显示正确

- [ ] **用户名密码登录**
  - [ ] 用户输入用户名和密码
  - [ ] 登录成功
  - [ ] 自动拉取云端数据
  - [ ] 模板列表显示正确
  - [ ] 自定义选项显示正确

### 数据同步
- [ ] **保存模板**
  - [ ] 用户保存新模板
  - [ ] 模板立即显示在列表中
  - [ ] 刷新页面后模板仍然存在
  - [ ] 在另一个浏览器标签页也能看到

- [ ] **添加自定义选项**
  - [ ] 用户添加新的自定义选项
  - [ ] 选项立即显示在表单中
  - [ ] 刷新页面后选项仍然存在
  - [ ] 在另一个浏览器标签页也能看到

- [ ] **修改模板名称**
  - [ ] 用户修改模板名称
  - [ ] 名称立即更新
  - [ ] 刷新页面后名称仍然是新的
  - [ ] 在另一个浏览器标签页也能看到

- [ ] **删除模板**
  - [ ] 用户删除模板
  - [ ] 模板立即从列表中消失
  - [ ] 刷新页面后模板仍然不存在
  - [ ] 在另一个浏览器标签页也看不到

### 登出流程
- [ ] **登出操作**
  - [ ] 用户点击登出按钮
  - [ ] 显示认证页面
  - [ ] 本地 localStorage 中的模板缓存被清理
  - [ ] 本地 localStorage 中的自定义选项被清理
  - [ ] 本地 localStorage 中的 API 配置被清理
  - [ ] 本地 localStorage 中的声音设置被清理

- [ ] **验证本地缓存清理**
  - [ ] 打开浏览器开发者工具
  - [ ] 进入 Application → Local Storage
  - [ ] 检查 `journal-templates` 键已被删除
  - [ ] 检查 `journal-custom-tags` 键已被删除
  - [ ] 检查 `exif-user-api-config` 键已被删除
  - [ ] 检查 `journal-sound` 键已被删除

### 账号切换
- [ ] **用户 A 登出，用户 B 登录**
  - [ ] 用户 A 保存了模板 A
  - [ ] 用户 A 添加了自定义选项 A
  - [ ] 用户 A 登出
  - [ ] 用户 B 登录
  - [ ] 用户 B 看不到模板 A
  - [ ] 用户 B 看不到自定义选项 A
  - [ ] 用户 B 的模板列表为空（或显示用户 B 的模板）
  - [ ] 用户 B 的自定义选项为空（或显示用户 B 的选项）

- [ ] **用户 B 登出，用户 A 重新登录**
  - [ ] 用户 B 保存了模板 B
  - [ ] 用户 B 添加了自定义选项 B
  - [ ] 用户 B 登出
  - [ ] 用户 A 重新登录
  - [ ] 用户 A 看到模板 A
  - [ ] 用户 A 看到自定义选项 A
  - [ ] 用户 A 看不到模板 B
  - [ ] 用户 A 看不到自定义选项 B

### 网络异常处理
- [ ] **登录时网络异常**
  - [ ] 模拟网络断开
  - [ ] 用户尝试登录
  - [ ] 登录失败或使用本地缓存
  - [ ] 恢复网络后重新登录
  - [ ] 数据正确同步

- [ ] **保存模板时网络异常**
  - [ ] 模拟网络断开
  - [ ] 用户保存新模板
  - [ ] 模板在本地立即显示
  - [ ] 恢复网络后数据自动同步到云端
  - [ ] 刷新页面后模板仍然存在

- [ ] **添加自定义选项时网络异常**
  - [ ] 模拟网络断开
  - [ ] 用户添加新的自定义选项
  - [ ] 选项在本地立即显示
  - [ ] 恢复网络后数据自动同步到云端
  - [ ] 刷新页面后选项仍然存在

- [ ] **登出时网络异常**
  - [ ] 模拟网络断开
  - [ ] 用户点击登出
  - [ ] 本地缓存仍然被清理
  - [ ] 显示认证页面
  - [ ] 恢复网络后重新登录

---

## 日志验证

### 登录成功后的日志
```
[Auth] Successfully synced user data after email login
[App] Successfully synced user data after login
```

### 登出成功后的日志
```
[Auth] signed out and cleared all local user data
[UserSettings] Cleared all local settings
```

### 网络异常时的日志
```
[Auth] Failed to sync user data after email login: ...
[App] Failed to sync user data after login: ...
```

---

## 浏览器开发者工具验证

### Application → Local Storage
- [ ] 登录前：检查是否有旧的用户数据
- [ ] 登录后：检查是否有新的用户数据
- [ ] 登出后：检查所有用户数据是否被清理

### Application → Cookies
- [ ] 登录后：检查是否有 CloudBase 会话 cookie
- [ ] 登出后：检查 CloudBase 会话 cookie 是否被清理

### Console
- [ ] 登录时：检查是否有相关的日志输出
- [ ] 登出时：检查是否有相关的日志输出
- [ ] 网络异常时：检查是否有错误日志

---

## 性能验证

### 登录时的性能
- [ ] 登录后数据拉取耗时 < 2 秒
- [ ] UI 不会卡顿
- [ ] 用户可以立即开始使用应用

### 日常使用的性能
- [ ] 保存模板时响应时间 < 100ms
- [ ] 添加自定义选项时响应时间 < 100ms
- [ ] 删除模板时响应时间 < 100ms
- [ ] 刷新页面时加载时间 < 1 秒

### 登出时的性能
- [ ] 登出操作耗时 < 500ms
- [ ] 显示认证页面无延迟

---

## 安全性验证

### 数据隐私
- [ ] 用户 A 的数据在用户 B 登录后完全不可见
- [ ] 登出后本地缓存被完全清理
- [ ] 没有任何用户数据泄露到其他用户

### 会话管理
- [ ] 登出后 CloudBase 会话被清理
- [ ] 登出后无法使用旧的 token 访问云端数据
- [ ] 重新登录时获得新的 token

### 数据一致性
- [ ] 本地缓存和云端数据保持一致
- [ ] 登录时从云端拉取最新数据
- [ ] 网络异常时使用本地缓存，恢复后同步

---

## 文档验证

- [ ] `REMOTE_DATA_SYNC_IMPLEMENTATION.md` 已创建
- [ ] `REMOTE_DATA_SYNC_QUICK_GUIDE.md` 已创建
- [ ] `CHANGES_SUMMARY_REMOTE_DATA_SYNC.md` 已创建
- [ ] `REMOTE_DATA_SYNC_VERIFICATION_CHECKLIST.md` 已创建

---

## 最终检查

- [ ] 所有代码修改都已完成
- [ ] 所有功能都已验证
- [ ] 所有日志都已检查
- [ ] 所有性能指标都符合预期
- [ ] 所有安全性检查都通过
- [ ] 所有文档都已创建
- [ ] 代码可以提交到版本控制系统

---

## 签名

- **修改者**：AI Assistant
- **修改日期**：2026-06-08
- **验证状态**：待验证
- **验证者**：（待填写）
- **验证日期**：（待填写）

---

## 备注

本清单用于验证远端数据同步功能的完整性和正确性。请按照清单逐一验证，并在完成后签名。
