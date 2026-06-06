# CloudBase 认证快速测试指南

## 前置准备

### 1. CloudBase 环境配置

在开始测试之前，确保已完成以下配置：

1. **访问 CloudBase 控制台**
   ```
   https://tcb.cloud.tencent.com/dev?envId=my-travel-journal-d5d06m1a517f14#/identity/login-manage
   ```

2. **启用邮箱登录**
   - 进入 **身份认证 > 登录方式**
   - 开启 **邮箱登录（Email Login）**
   - 配置邮箱服务（SMTP 设置或使用默认）

3. **启用用户名密码登录**
   - 进入 **身份认证 > 登录方式**
   - 开启 **用户名密码登录（Username/Password）**

### 2. 获取 Publishable Key（可选但推荐）

如果需要使用 `accessKey` 来支持匿名会话：

1. 访问 **应用安全 > API 密钥**
2. 复制 **Publishable Key**
3. 在 `src/contexts/AuthContext.tsx` 中更新 `ACCESS_KEY`:
   ```tsx
   const ACCESS_KEY = 'your-publishable-key-here';
   ```

## 集成到应用

### 步骤 1：修改 main.tsx

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)
```

### 步骤 2：在 App.tsx 中添加测试路由

```tsx
import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import { AuthPage } from './components/AuthPage'

function App() {
  const { user, isLoading } = useAuth()
  const [showAuth, setShowAuth] = useState(!user)

  if (isLoading) {
    return <div className="p-4">加载中...</div>
  }

  if (!user || showAuth) {
    return <AuthPage onAuthSuccess={() => setShowAuth(false)} />
  }

  return (
    <div className="p-4">
      <h1>欢迎！</h1>
      <p>用户ID: {user.id}</p>
      <p>用户名: {user.username || user.email}</p>
      <button onClick={() => setShowAuth(true)}>
        重新登录
      </button>
    </div>
  )
}

export default App
```

## 测试流程

### 测试 1：邮箱验证码注册

**步骤：**

1. 启动开发服务器
   ```bash
   npm run dev
   ```

2. 打开浏览器访问 `http://localhost:5173`

3. 点击"注册"标签页

4. 输入测试邮箱（使用真实邮箱以接收验证码）
   ```
   test@example.com
   ```

5. 点击"发送验证码"按钮
   - 应该看到成功提示
   - 邮箱应该收到验证码

6. 输入验证码
   ```
   在邮箱中复制验证码，粘贴到验证码输入框
   ```

7. 输入密码（至少 6 位）
   ```
   MyPassword123
   ```

8. 输入昵称（可选）
   ```
   Test User
   ```

9. 点击"完成注册"
   - 应该看到注册成功提示
   - 页面应该自动跳转到首页

**预期结果：**
- ✅ 收到验证码邮件
- ✅ 验证码验证成功
- ✅ 账户创建成功
- ✅ 自动登录
- ✅ 用户信息显示在页面上

### 测试 2：账号密码登录

**步骤：**

1. 在首页点击"重新登录"或访问认证页面

2. 点击"登录"标签页

3. 输入在测试 1 中注册的用户名或邮箱
   ```
   test-user  (或 test@example.com)
   ```

4. 输入密码
   ```
   MyPassword123
   ```

5. 点击"登录"按钮
   - 应该看到登录成功
   - 自动跳转到首页

**预期结果：**
- ✅ 登录成功
- ✅ 用户信息显示
- ✅ 会话正确保存

### 测试 3：登出和重新登录

**步骤：**

1. 成功登录后，从 useAuth hook 调用 signOut
   ```tsx
   const { signOut } = useAuth()
   await signOut()
   ```

2. 应该看到认证页面出现

3. 重新使用相同的凭证登录

**预期结果：**
- ✅ 登出成功，回到认证页面
- ✅ 重新登录成功

### 测试 4：错误处理

**步骤：**

1. 尝试以下错误场景：

#### 场景 A：邮箱不存在
- 使用从未注册过的邮箱注册
- 完成验证码验证
- 应该成功（新用户注册）

#### 场景 B：验证码错误
- 进行邮箱注册
- 输入错误的验证码
- 应该显示"验证码错误"

#### 场景 C：密码不匹配
- 进行邮箱注册
- 两次输入的密码不一致
- 应该显示"密码不一致"提示

#### 场景 D：登录失败
- 输入错误的密码
- 点击登录
- 应该显示"用户名或密码错误"

**预期结果：**
- ✅ 所有错误都有相应的提示
- ✅ 用户知道问题所在
- ✅ 可以重新尝试

## 浏览器开发工具调试

### 检查本地存储

打开浏览器开发工具 → Application → Local Storage：

应该看到：
- `journal-custom-tags` - 自定义标签
- `exif-user-api-config` - API 配置
- `journal-sound` - 音效设置

### 检查网络请求

在 Network 标签中，应该能看到对 CloudBase 的请求：

- POST 请求到 CloudBase 认证端点
- 返回 200 或 201 状态码

### 控制台日志

如果有问题，可以在组件中添加调试日志：

```tsx
import { useAuth } from './contexts/AuthContext'

function DebugComponent() {
  const auth = useAuth()
  
  useEffect(() => {
    console.log('Auth state:', {
      user: auth.user,
      session: auth.session,
      isLoading: auth.isLoading,
    })
  }, [auth.user, auth.session, auth.isLoading])

  return <div>检查控制台输出</div>
}
```

## 常见问题排查

### 问题 1：验证码收不到

**原因：**
- CloudBase 邮箱服务未正确配置
- 邮箱地址拼写错误
- 邮箱被标记为垃圾邮件

**解决：**
1. 检查 CloudBase 控制台邮箱配置
2. 确认邮箱地址正确
3. 检查垃圾邮件文件夹
4. 等待 2-3 分钟后重试

### 问题 2：登录显示"用户不存在"

**原因：**
- 用户名/邮箱在此环境中从未注册过
- 在不同的 CloudBase 环境中注册和登录

**解决：**
1. 先进行邮箱验证码注册
2. 确保登录使用的用户名与注册时一致
3. 检查 CloudBase 环境 ID 是否正确

### 问题 3：页面无法加载用户状态

**原因：**
- AuthProvider 未正确包裹应用
- CloudBase SDK 初始化失败

**解决：**
1. 确认 main.tsx 中 AuthProvider 正确包装
2. 检查浏览器控制台是否有错误
3. 确认 CloudBase 环境 ID 是否正确
4. 检查网络连接

## 性能测试

### 测试首页加载时间

```tsx
useEffect(() => {
  const start = performance.now()
  const end = performance.now()
  console.log(`Auth 检查耗时: ${end - start}ms`)
}, [])
```

预期：
- ✅ 认证状态检查应在 100-500ms 内完成
- ✅ UI 响应应在 50ms 内

## 下一步

测试成功后，可以：

1. **自定义样式** - 根据品牌修改 CSS
2. **添加更多认证方法** - 支持手机号、OAuth 等
3. **实现密码重置** - 添加"忘记密码"流程
4. **添加用户资料页面** - 让用户编辑个人信息
5. **集成用户数据** - 将用户信息与应用数据关联

## 测试清单

- [ ] 邮箱验证码注册成功
- [ ] 邮箱验证码正确验证
- [ ] 用户可以设置密码
- [ ] 注册后自动登录
- [ ] 账号密码登录成功
- [ ] 错误提示正确显示
- [ ] 登出功能工作正常
- [ ] 页面刷新后保持登录状态
- [ ] 浏览器关闭后登录状态保留
- [ ] 所有组件都使用了 useAuth hook

## 获取帮助

遇到问题时：

1. **检查 CloudBase 控制台**
   - https://tcb.cloud.tencent.com/

2. **查看 CloudBase 官方文档**
   - https://docs.cloudbase.net/

3. **查看集成指南**
   - 查看 `CLOUDBASE_AUTH_INTEGRATION.md`

4. **检查浏览器控制台错误**
   - F12 打开开发者工具
   - 查看 Console 标签中的错误信息
