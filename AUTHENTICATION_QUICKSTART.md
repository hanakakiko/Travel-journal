# 邮箱验证码注册和账号密码登录 - 快速启动指南

## 现在支持的认证功能

✅ **邮箱验证码注册** - 用户通过邮箱验证码注册新账户  
✅ **账号密码登录** - 用户使用用户名/邮箱和密码登录  
✅ **用户会话管理** - 自动保存登录状态  
✅ **登出功能** - 用户可以安全登出  

## 项目现状

### 已完成集成

- ✅ 认证上下文（AuthContext）
- ✅ 邮箱注册组件（EmailSignUp）
- ✅ 密码登录组件（PasswordLogin）
- ✅ 完整认证页面（AuthPage）
- ✅ 应用入口集成（App.tsx 和 main.tsx）
- ✅ 用户信息栏显示
- ✅ 登出按钮

### 工作流程

```
用户打开应用
    ↓
[检查登录状态]
    ↓
未登录? → 显示认证页面 (邮箱注册/账号登录)
    ↓ 用户注册或登录
    ↓
[登录成功] → 显示主应用 + 用户信息栏
    ↓
点击"登出" → 返回认证页面
```

## 立即开始

### 1. 启动开发服务器

```bash
cd /Users/dingjiangying/github/exif
npm run dev
```

应该输出：
```
VITE v6.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  press h to show help
```

### 2. 打开浏览器

访问 `http://localhost:5173/`

你应该看到：
- **认证页面** 包含两个标签：
  - 📧 **注册** - 邮箱验证码注册
  - 🔐 **登录** - 账号密码登录

## 测试流程

### 场景 1：邮箱验证码注册

1. **点击"注册"标签**

2. **输入邮箱地址**
   ```
   example@gmail.com
   ```

3. **点击"发送验证码"**
   - 等待 2-3 秒
   - 应看到成功提示
   - 邮箱应收到验证码

4. **输入验证码**
   - 从邮件中复制 6 位数字验证码
   - 粘贴到验证码输入框

5. **设置密码和昵称**
   ```
   密码: MySecurePassword123
   昵称: John Doe (可选)
   ```

6. **点击"完成注册"**
   - 应看到注册成功提示
   - 自动登录
   - 页面显示主应用和用户信息栏

### 场景 2：账号密码登录

1. **点击"登录"标签**

2. **输入凭证**
   ```
   用户名/邮箱: example@gmail.com (或注册时设置的用户名)
   密码: MySecurePassword123
   ```

3. **点击"登录"**
   - 应看到登录成功
   - 页面显示主应用

### 场景 3：登出

1. **在应用顶部找到用户信息栏**
   ```
   欢迎，John Doe  [登出]
   ```

2. **点击"登出"按钮**
   - 用户被登出
   - 返回认证页面
   - 可以再次登录

## CloudBase 环境配置

在测试前，确保已配置 CloudBase 环境：

### 步骤 1：访问 CloudBase 控制台

```
https://tcb.cloud.tencent.com/dev?envId=my-travel-journal-d5d06m1a517f14#/identity/login-manage
```

### 步骤 2：启用邮箱登录

- 进入 **身份认证 > 登录方式**
- 找到 **邮箱登录**
- 点击 **启用** 或 **编辑**
- 配置邮件发送服务（SMTP）

### 步骤 3：启用用户名密码登录

- 在同一页面找到 **用户名密码登录**
- 点击 **启用**

### 步骤 4：（可选）配置 Publishable Key

如需要高级功能：
1. 进入 **应用安全 > API 密钥**
2. 复制 **Publishable Key**
3. 在 `src/contexts/AuthContext.tsx` 中更新 `ACCESS_KEY`

## 文件位置

### 组件

| 文件 | 位置 | 说明 |
|-----|------|------|
| AuthPage | `src/components/AuthPage.tsx` | 登录/注册切换页面 |
| EmailSignUp | `src/components/EmailSignUp.tsx` | 邮箱验证码注册 |
| PasswordLogin | `src/components/PasswordLogin.tsx` | 账号密码登录 |

### 核心模块

| 文件 | 位置 | 说明 |
|-----|------|------|
| AuthContext | `src/contexts/AuthContext.tsx` | 全局认证状态 |
| useAuthFlow | `src/hooks/useAuthFlow.ts` | 简化认证流程 |
| cloudbase | `src/lib/cloudbase.ts` | SDK 初始化 |

### 主应用

| 文件 | 位置 | 说明 |
|-----|------|------|
| App.tsx | `src/App.tsx` | 认证检查 + 用户信息栏 |
| main.tsx | `src/main.tsx` | AuthProvider 包装 |

## 代码示例

### 在任何组件中使用认证

```tsx
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, session, signOut } = useAuth();

  if (!user) {
    return <div>请登录</div>;
  }

  return (
    <div>
      <p>欢迎，{user.username || user.email}</p>
      <button onClick={signOut}>登出</button>
    </div>
  );
}
```

### 使用简化 Hook

```tsx
import { useAuthFlow } from '../hooks/useAuthFlow';

function LoginForm() {
  const { login, isLoading, error } = useAuthFlow({
    onSuccess: () => {
      console.log('登录成功！');
      // 导航到首页等
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login('username', 'password');
    if (!success) {
      console.error('登录失败');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <p>{error}</p>}
      <input placeholder="用户名" required />
      <input type="password" placeholder="密码" required />
      <button disabled={isLoading}>
        {isLoading ? '登录中...' : '登录'}
      </button>
    </form>
  );
}
```

## 常见问题

### Q: 没有收到验证码邮件？

A: 
1. 检查垃圾邮件文件夹
2. 等待 2-3 分钟
3. 确认 CloudBase 邮件服务已配置
4. 尝试使用其他邮箱地址

### Q: 登录时说"用户不存在"？

A:
1. 确认输入的用户名/邮箱是否正确
2. 先进行邮箱注册创建账户
3. 注册后使用相同的邮箱或用户名登录

### Q: 页面刷新后需要重新登录？

A: 这表示 localStorage 未正确保存会话。这在某些浏览器隐私模式下会发生。

### Q: 如何修改密码？

A: 当前版本不支持密码修改。可在 CloudBase 控制台或后续版本中添加。

### Q: 可以使用手机号登录吗？

A: 当前版本支持邮箱和用户名。可在后续版本中添加手机号登录。

## 故障排查

### 问题：认证页面不显示

**检查清单：**
- [ ] `src/main.tsx` 中是否包装了 `AuthProvider`
- [ ] `src/App.tsx` 中是否导入了 `AuthPage` 和 `useAuth`
- [ ] 浏览器控制台是否有错误信息
- [ ] 开发服务器是否正常运行

**解决方法：**
```bash
# 停止服务器
Ctrl + C

# 清除缓存和重新启动
npm run dev
```

### 问题：验证码提交失败

**检查清单：**
- [ ] CloudBase 环境 ID 是否正确
- [ ] 邮箱登录是否已启用
- [ ] 验证码是否正确
- [ ] 网络连接是否正常

**解决方法：**
1. 打开浏览器开发者工具 (F12)
2. 检查 Network 标签中的请求
3. 查看 Console 中的错误信息

### 问题：用户信息栏不显示

**原因可能：**
- 用户未成功登录
- `useAuth` hook 返回 null

**解决方法：**
```tsx
// 在 App.tsx 中添加调试日志
console.log('User:', user);
console.log('Auth Loading:', authLoading);
```

## 下一步

### 立即可做

1. ✅ **启动应用并测试**
   - 运行 `npm run dev`
   - 测试注册和登录流程

2. ✅ **配置 CloudBase 环境**
   - 启用邮箱和用户名密码登录

3. ✅ **集成到现有功能**
   - 在其他组件中使用 `useAuth` hook
   - 保护需要登录的功能

### 后续优化

- [ ] 添加密码重置功能
- [ ] 添加手机号登录
- [ ] 添加社交登录（Google、微信）
- [ ] 自定义样式
- [ ] 响应式设计改进
- [ ] 用户资料编辑页面
- [ ] 邮件验证确认
- [ ] 两步验证（2FA）

## 相关文档

- 📖 [完整集成指南](./CLOUDBASE_AUTH_INTEGRATION.md)
- 🧪 [详细测试指南](./CLOUDBASE_QUICK_TEST.md)
- 📋 [实现总结](./CLOUDBASE_IMPLEMENTATION_SUMMARY.md)

## 支持和反馈

遇到问题？

1. 查看浏览器控制台错误 (F12)
2. 检查 CloudBase 控制台配置
3. 查看上述文档中的常见问题
4. 检查网络请求 (Network 标签)

---

**现在就开始使用身份认证吧！** 🚀

```bash
npm run dev
```

然后访问 http://localhost:5173 看看吧！
