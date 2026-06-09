# 🛣️ 路由开发准则

## 概述

本文档规定了应用中所有页面导航和路由的标准做法。**每当用户点击按钮跳转到新页面时，都必须更新 URL**，以确保：
- ✅ URL 反映应用的当前状态
- ✅ 用户可以通过浏览器后退/前进按钮导航
- ✅ 刷新页面后能保持在原来的页面
- ✅ 用户可以分享当前页面的 URL

---

## 核心原则

### 1. **Hooks 调用顺序**
⚠️ **重要**：React Hooks 必须在组件的顶层调用，不能在条件语句或循环中调用。

❌ **错误做法**：
```typescript
function AppContent({ location, navigate }) {
  // 在条件语句之前调用 hooks
  if (location.pathname === '/form-config') {
    return <FormConfigPage />;  // ❌ 提前返回，后面的 hooks 不会被调用
  }
  
  const [state, setState] = useState(false);  // ❌ 这会导致 "Rendered fewer hooks than expected" 错误
  useEffect(() => { ... }, []);
}
```

✅ **正确做法**：
```typescript
function AppContent({ location, navigate }) {
  // 先调用所有 hooks
  const [state, setState] = useState(false);
  useEffect(() => { ... }, []);
  
  // 然后再检查路由并返回
  if (location.pathname === '/form-config') {
    return <FormConfigPage />;  // ✅ 所有 hooks 都已调用
  }
  
  return <MainPage />;
}
```

### 2. **路由命名规范**

| 页面 | 路由路径 | 说明 |
|------|--------|------|
| 主页 | `/` | 应用首页 |
| 表单配置 | `/form-config` | 管理表单选项 |
| 手帐本列表 | `/notebook` | 查看所有手帐本 |
| 手帐本详情 | `/notebook/:id` | 查看具体手帐本的详情 |
| 手帐本页面 | `/notebook/:id/page/:pageId` | 查看手帐本中的具体页面 |

### 3. **导航函数传递**

所有需要导航的组件都应该接收 `navigate` 函数作为 prop：

```typescript
interface ComponentProps {
  onClose: () => void;
  navigate?: (path: string) => void;  // 可选，用于导航
}

export function MyComponent({ onClose, navigate }: ComponentProps) {
  const handleClick = () => {
    if (navigate) {
      navigate('/new-page');
    }
  };
  
  return <button onClick={handleClick}>Go to New Page</button>;
}
```

---

## 实现步骤

### 步骤 1: 在 AppContent 中添加路由处理

在 `src/App.tsx` 的 `AppContent` 函数中：

```typescript
function AppContent({
  navigate,
  location,
  // ... 其他 props
}: AppContentProps) {
  // 1. 先调用所有 hooks
  const [state, setState] = useState(false);
  useEffect(() => { ... }, []);
  // ... 更多 hooks
  
  // 2. 然后检查路由（在所有 hooks 之后）
  if (location.pathname === '/form-config') {
    return <FormConfigPage onBack={() => navigate('/')} onSound={play} />;
  }
  
  if (location.pathname === '/notebook') {
    return <NotebookShelf onClose={() => navigate('/')} navigate={navigate} />;
  }
  
  if (location.pathname.startsWith('/notebook/')) {
    return <NotebookShelf onClose={() => navigate('/notebook')} navigate={navigate} />;
  }
  
  // 3. 最后返回主页面
  return (
    <main>
      {/* 主页面内容 */}
    </main>
  );
}
```

### 步骤 2: 更新组件接收 navigate

修改组件的 Props 类型定义：

```typescript
interface NotebookShelfProps {
  onClose: () => void;
  navigate?: (path: string) => void;  // 添加这一行
}

export function NotebookShelf({ onClose, navigate }: NotebookShelfProps) {
  // ...
}
```

### 步骤 3: 在点击事件中调用 navigate

```typescript
<div
  onClick={() => {
    setSelectedNotebook(notebook);
    if (navigate) {
      navigate(`/notebook/${notebook.id}`);
    }
  }}
>
  {/* 内容 */}
</div>
```

### 步骤 4: 在 AppContent 中传递 navigate

```typescript
return <NotebookShelf 
  onClose={() => navigate('/')} 
  navigate={navigate}  // 添加这一行
/>;
```

---

## 当前项目中需要添加路由的地方

### ✅ 已完成

- [x] `/` - 主页面
- [x] `/form-config` - 表单配置页面
- [x] `/notebook` - 手帐本列表页面

### 🔄 进行中

- [ ] `/notebook/:id` - 手帐本详情页面（点击具体手帐本时）
- [ ] `/notebook/:id/page/:pageId` - 手帐本页面详情（点击具体页面时）

### 📋 待实现

以下功能在点击时应该添加新的路由：

1. **SaveToNotebookModal** - 保存到手帐本
   - 当用户选择手帐本并保存后，可以导航到 `/notebook/:id`

2. **NotebookDetailModal** - 手帐本详情
   - 点击页面时应该导航到 `/notebook/:id/page/:pageId`

3. **其他模态框** - 如果有其他需要导航的模态框，都应该遵循这个规则

---

## 检查清单

在添加新的导航功能时，请检查以下项目：

- [ ] 组件接收了 `navigate` prop
- [ ] 在点击事件中调用了 `navigate()`
- [ ] 在 AppContent 中添加了对应的路由处理
- [ ] 路由检查在所有 hooks 调用之后
- [ ] 返回按钮调用 `navigate('/')` 或 `navigate('/notebook')`
- [ ] 测试了 URL 是否正确更新
- [ ] 测试了页面刷新后是否保持在原来的页面
- [ ] 测试了浏览器后退/前进按钮是否正常工作

---

## 常见错误

### ❌ 错误 1: 在条件语句之前调用 hooks

```typescript
// ❌ 错误
if (location.pathname === '/page') {
  return <Page />;
}
const [state, setState] = useState(false);  // 错误！
```

### ❌ 错误 2: 忘记传递 navigate prop

```typescript
// ❌ 错误
return <NotebookShelf onClose={() => navigate('/')} />;  // 缺少 navigate prop

// ✅ 正确
return <NotebookShelf onClose={() => navigate('/')} navigate={navigate} />;
```

### ❌ 错误 3: 在模态框中使用状态而不是路由

```typescript
// ❌ 错误 - 只使用状态，没有更新 URL
const [showDetail, setShowDetail] = useState(false);
onClick={() => setShowDetail(true)}

// ✅ 正确 - 同时更新 URL
onClick={() => {
  setShowDetail(true);
  navigate(`/notebook/${id}`);
}}
```

---

## 最佳实践

### 1. 保持 URL 和 UI 状态同步

```typescript
// 当 URL 变化时，更新 UI 状态
useEffect(() => {
  if (location.pathname === '/notebook') {
    setShowNotebookShelf(true);
  }
}, [location.pathname]);
```

### 2. 使用 useLocation 获取当前路由

```typescript
import { useLocation } from 'react-router-dom';

function MyComponent() {
  const location = useLocation();
  
  if (location.pathname === '/my-page') {
    // 当前在 /my-page
  }
}
```

### 3. 使用 useNavigate 进行导航

```typescript
import { useNavigate } from 'react-router-dom';

function MyComponent() {
  const navigate = useNavigate();
  
  const handleClick = () => {
    navigate('/new-page');
  };
}
```

### 4. 为返回按钮提供正确的导航路径

```typescript
// 从详情页返回到列表页
<button onClick={() => navigate('/notebook')}>返回</button>

// 从列表页返回到主页
<button onClick={() => navigate('/')}>返回</button>
```

---

## 测试路由功能

### 测试清单

1. **点击导航按钮**
   - [ ] URL 是否正确更新？
   - [ ] 页面内容是否正确显示？

2. **页面刷新**
   - [ ] 刷新后是否停留在原来的页面？
   - [ ] URL 是否保持不变？

3. **浏览器导航**
   - [ ] 后退按钮是否正常工作？
   - [ ] 前进按钮是否正常工作？

4. **深层链接**
   - [ ] 直接访问 `/notebook/123` 是否能正确显示该手帐本？
   - [ ] 直接访问 `/form-config` 是否能正确显示表单配置页面？

---

## 参考资源

- [React Router 官方文档](https://reactrouter.com/)
- [React Hooks 规则](https://react.dev/reference/rules/rules-of-hooks)
- [useNavigate Hook](https://reactrouter.com/en/main/hooks/use-navigate)
- [useLocation Hook](https://reactrouter.com/en/main/hooks/use-location)

---

## 更新历史

| 日期 | 版本 | 更新内容 |
|------|------|--------|
| 2026-06-09 | 1.0 | 初始版本，添加路由开发准则 |
