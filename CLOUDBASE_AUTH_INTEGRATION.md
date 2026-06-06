# CloudBase 邮箱验证码注册和账号密码登录集成指南

## 概述

本项目已经完整集成了腾讯云 CloudBase 的身份认证功能，包括：
- ✅ 邮箱验证码注册
- ✅ 账号密码登录
- ✅ 用户会话管理
- ✅ 认证状态管理

## 核心文件结构

```
src/
├── contexts/
│   └── AuthContext.tsx           # 认证上下文，管理全局认证状态
├── hooks/
│   └── useAuthFlow.ts            # 认证流程 Hook
├── components/
│   ├── EmailSignUp.tsx           # 邮箱验证码注册组件
│   ├── PasswordLogin.tsx          # 账号密码登录组件
│   └── AuthPage.tsx              # 完整认证页面（包含切换选项卡）
└── lib/
    ├── cloudbase.ts              # CloudBase SDK 初始化
    └── userSettings.ts           # 用户设置存储（本地 + 云端同步）
```

## 使用步骤

### 1. 在应用入口包裹 AuthProvider

在 `src/main.tsx` 或 `src/App.tsx` 中：

```tsx
import { AuthProvider } from './contexts/AuthContext';
import { YourAppComponent } from './YourApp';

function App() {
  return (
    <AuthProvider>
      <YourAppComponent />
    </AuthProvider>
  );
}

export default App;
```

### 2. 添加认证页面路由

如果你有路由系统，添加认证页面：

```tsx
import { AuthPage } from './components/AuthPage';

// 在你的路由配置中
<Route path="/auth" element={<AuthPage />} />
<Route path="/login" element={<AuthPage initialMode="login" />} />
<Route path="/signup" element={<AuthPage initialMode="signup" />} />
```

### 3. 使用认证 Hook

在任何组件中使用 `useAuth` hook：

```tsx
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, session, isLoading, signOut } = useAuth();

  if (isLoading) return <div>加载中...</div>;

  if (!user) return <div>请登录</div>;

  return (
    <div>
      <p>欢迎，{user.email || user.username}</p>
      <button onClick={signOut}>登出</button>
    </div>
  );
}
```

### 4. 使用 useAuthFlow Hook（简化版）

对于常见的认证流程，使用 `useAuthFlow`：

```tsx
import { useAuthFlow } from '../hooks/useAuthFlow';

function LoginForm() {
  const { login, isLoading, error } = useAuthFlow({
    onSuccess: () => {
      console.log('登录成功');
      // 导航到首页等
    },
    onError: (err) => {
      console.error('登录失败:', err);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login('username', 'password');
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="error">{error}</p>}
      <input type="text" placeholder="用户名" required />
      <input type="password" placeholder="密码" required />
      <button disabled={isLoading}>
        {isLoading ? '登录中...' : '登录'}
      </button>
    </form>
  );
}
```

## 邮箱验证码注册流程详解

### 第 1 步：发送验证码

```typescript
const { data, error } = await auth.signUp({ email: 'user@example.com' });

if (error) {
  // 处理错误
  console.error('发送失败:', error.message);
} else {
  // 验证码已发送
  // data.verifyOtp 是一个函数，后续用于验证码验证
}
```

### 第 2 步：验证码验证 + 完成注册

```typescript
const { data, error } = await auth.signUp({
  email: 'user@example.com',
  password: 'newPassword123',
  name: '昵称',  // 可选
});

// 验证验证码
if (data?.verifyOtp) {
  const verifyResult = await data.verifyOtp({ token: '123456' });
  if (verifyResult?.error) {
    console.error('验证失败:', verifyResult.error);
  } else {
    console.log('注册成功！');
  }
}
```

**EmailSignUp 组件已经封装了这两个步骤，你可以直接使用。**

## 账号密码登录流程详解

```typescript
const { data, error } = await auth.signInWithPassword({
  username: 'myusername',      // 或使用 email / phone
  password: 'mypassword',
});

if (error) {
  console.error('登录失败:', error.message);
} else {
  // 登录成功
  const user = data.user;      // 用户信息
  const session = data.session; // 会话信息
  console.log('用户ID:', user.id);
}
```

**PasswordLogin 组件已经完全实现了这个流程。**

## CloudBase 环境配置

### 必要的配置步骤

1. **访问 CloudBase 控制台**：https://tcb.cloud.tencent.com/

2. **创建或使用已有环境**：
   - 环境 ID: `my-travel-journal-d5d06m1a517f14`
   - 地域: `上海`

3. **启用身份认证**：
   - 进入 **身份认证 > 登录方式** 
   - 启用以下选项：
     - ✅ 邮箱登录（Email Login）
     - ✅ 用户名密码登录（Username/Password Login）

4. **获取 Publishable Key**（如果需要）：
   - 进入 **应用安全 > API 密钥**
   - 复制 **Publishable Key**
   - 将其设置到 `AuthContext.tsx` 的 `ACCESS_KEY` 变量中

5. **配置用户数据库**（可选）：
   - 创建 `user_settings` 集合用于存储用户设置
   - 这是为了支持云端同步用户偏好

### CloudBase 控制台链接

- **身份认证配置**: https://tcb.cloud.tencent.com/dev?envId=my-travel-journal-d5d06m1a517f14#/identity/login-manage
- **API 密钥**: https://tcb.cloud.tencent.com/dev?envId=my-travel-journal-d5d06m1a517f14#/env/apikey
- **数据库管理**: https://tcb.cloud.tencent.com/dev?envId=my-travel-journal-d5d06m1a517f14#/db/doc

## API 参考

### useAuth Hook

```typescript
interface AuthContextType {
  // 状态
  user: User | null;              // 当前用户信息
  session: Session | null;         // 当前会话
  isLoading: boolean;              // 是否加载中

  // 方法
  signUpWithEmail(
    email: string,
    verificationCode?: string,
    password?: string,
    nickname?: string
  ): Promise<{ data?: any; error?: any }>;

  signInWithPassword(
    username: string,
    password: string
  ): Promise<{ data?: any; error?: any }>;

  signOut(): Promise<void>;

  getSession(): Promise<{ data?: any; error?: any }>;
}
```

### useAuthFlow Hook

```typescript
interface UseAuthFlowReturn {
  isLoading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  
  login(username: string, password: string): Promise<boolean>;
  signup(email: string, password: string, nickname?: string): Promise<boolean>;
  verifyAndSignup(
    email: string,
    verificationCode: string,
    password: string,
    nickname?: string
  ): Promise<boolean>;
  logout(): Promise<void>;
  
  user: User | null;
  session: Session | null;
}
```

## 最佳实践

### 1. 保护路由

```tsx
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" />;

  return children;
}
```

### 2. 检查用户登录状态

```tsx
// ✅ 推荐方式：使用 getSession()
const { data } = await auth.getSession();
if (data?.session) {
  // 用户已登录
}

// ❌ 不推荐：使用 getLoginState()（已弃用）
// getLoginState() 即使没有实际登录也会返回 uid（当设置了 accessKey 时）
```

### 3. 错误处理

```tsx
try {
  const result = await signInWithPassword(username, password);
  if (result.error) {
    // CloudBase SDK 错误
    console.error('SDK Error:', result.error.message);
  }
} catch (err) {
  // 网络或其他运行时错误
  console.error('Runtime Error:', err);
}
```

### 4. 用户注册后的流程

```tsx
// 注册成功后
if (registrationSuccess) {
  // 自动登录用户
  await signInWithPassword(username, password);
  
  // 重定向到首页
  navigate('/');
}
```

## 常见问题

### Q: 如何区分邮箱注册和用户名密码注册？
A: 邮箱注册会通过邮箱验证码完成身份验证，用户名密码注册则直接设置用户名和密码。CloudBase 支持使用邮箱或用户名登录。

### Q: 验证码的有效期是多久？
A: CloudBase 邮箱验证码默认有效期为 10 分钟。可在控制台调整。

### Q: 如何实现"记住我"功能？
A: AuthContext 已经使用 `persistence: 'local'` 来自动保存会话到 localStorage，重新加载页面时会自动恢复登录状态。

### Q: 如何重置用户密码？
A: 当前实现了邮箱和用户名密码登录。密码重置功能可以在 CloudBase 控制台或通过云函数实现。

### Q: 支持社交登录（Google、微信等）吗？
A: CloudBase 支持 OAuth 登录，可在 `AuthContext.tsx` 中添加 `signInWithOAuth` 方法。

## 下一步

1. **在 App 中集成 AuthProvider**
2. **配置 CloudBase 环境（启用邮箱和用户名密码登录）**
3. **将 AuthPage 或 EmailSignUp/PasswordLogin 添加到你的路由**
4. **测试注册和登录流程**
5. **使用 useAuth hook 在应用中访问用户信息**

## 文档链接

- [CloudBase 官方文档](https://docs.cloudbase.net/)
- [CloudBase 认证文档](https://docs.cloudbase.net/authentication-v2/)
- [CloudBase Web SDK 文档](https://docs.cloudbase.net/quick-start)
