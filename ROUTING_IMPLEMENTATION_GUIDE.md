# 路由系统实现指南 - 详细步骤

## 🚀 快速开始

### 第一步：安装 React Router

```bash
npm install react-router-dom
```

### 第二步：创建路由配置文件

创建 `src/routes/index.tsx`：

```typescript
import { createBrowserRouter } from 'react-router-dom';
import App from '../App';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
]);
```

### 第三步：修改 main.tsx

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { router } from './routes'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>,
)
```

### 第四步：修改 App.tsx

在 App 组件中添加路由导航逻辑：

```typescript
import { useNavigate, useLocation } from 'react-router-dom';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // ... 其他代码 ...
  
  // 根据 URL 路径显示对应的页面
  useEffect(() => {
    const path = location.pathname;
    if (path === '/form-config') {
      setShowFormConfig(true);
    } else if (path === '/notebook') {
      setShowNotebookShelf(true);
    } else if (path === '/edit-info') {
      setIsInfoOpen(true);
    } else if (path === '/manage-photos') {
      setIsPhotoManagerOpen(true);
    } else {
      // 返回主页
      setShowFormConfig(false);
      setShowNotebookShelf(false);
      setIsInfoOpen(false);
      setIsPhotoManagerOpen(false);
    }
  }, [location.pathname]);
  
  // 修改按钮点击处理函数
  const handleShowFormConfig = (show: boolean) => {
    setShowFormConfig(show);
    navigate(show ? '/form-config' : '/');
  };
  
  const handleShowNotebook = (show: boolean) => {
    setShowNotebookShelf(show);
    navigate(show ? '/notebook' : '/');
  };
  
  // ... 其他代码 ...
}
```

---

## 📝 详细修改说明

### 修改 1：App.tsx - 添加路由导航

#### 在导入部分添加：
```typescript
import { useNavigate, useLocation } from 'react-router-dom';
```

#### 在 App 函数开始处添加：
```typescript
const navigate = useNavigate();
const location = useLocation();
```

#### 在 useEffect 中添加路由监听：
```typescript
useEffect(() => {
  const path = location.pathname;
  if (path === '/form-config') {
    setShowFormConfig(true);
  } else if (path === '/notebook') {
    setShowNotebookShelf(true);
  } else if (path === '/edit-info') {
    setIsInfoOpen(true);
  } else if (path === '/manage-photos') {
    setIsPhotoManagerOpen(true);
  } else {
    setShowFormConfig(false);
    setShowNotebookShelf(false);
    setIsInfoOpen(false);
    setIsPhotoManagerOpen(false);
  }
}, [location.pathname]);
```

#### 修改按钮点击处理：

**表单配置按钮**：
```typescript
// 修改前
onClick={() => setShowFormConfig(true)}

// 修改后
onClick={() => handleShowFormConfig(true)}
```

**我的手帐本按钮**：
```typescript
// 修改前
onClick={() => setShowNotebookShelf(true)}

// 修改后
onClick={() => handleShowNotebook(true)}
```

**返回按钮**：
```typescript
// 修改前
onBack={() => setShowFormConfig(false)}

// 修改后
onBack={() => handleShowFormConfig(false)}
```

---

## 🔄 页面状态持久化

### 创建状态管理文件

创建 `src/lib/pageStateManager.ts`：

```typescript
export interface PageState {
  photos: any[];
  answers: any;
  styleId: string;
  templateId: string;
  currentPath: string;
  timestamp: number;
}

const PAGE_STATE_KEY = 'app_page_state';
const STATE_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 小时

export const savePageState = (state: PageState) => {
  try {
    localStorage.setItem(PAGE_STATE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('[PageState] Failed to save page state:', err);
  }
};

export const loadPageState = (): PageState | null => {
  try {
    const saved = localStorage.getItem(PAGE_STATE_KEY);
    if (!saved) return null;
    
    const state: PageState = JSON.parse(saved);
    
    // 检查状态是否过期
    const now = Date.now();
    if (now - state.timestamp > STATE_EXPIRY_TIME) {
      localStorage.removeItem(PAGE_STATE_KEY);
      return null;
    }
    
    return state;
  } catch (err) {
    console.warn('[PageState] Failed to load page state:', err);
    return null;
  }
};

export const clearPageState = () => {
  try {
    localStorage.removeItem(PAGE_STATE_KEY);
  } catch (err) {
    console.warn('[PageState] Failed to clear page state:', err);
  }
};
```

### 在 App.tsx 中使用状态管理

```typescript
import { savePageState, loadPageState, clearPageState } from './lib/pageStateManager';

function App() {
  // ... 其他代码 ...
  
  // 应用启动时恢复页面状态
  useEffect(() => {
    const savedState = loadPageState();
    if (savedState) {
      setPhotos(savedState.photos);
      setAnswers(savedState.answers);
      setStyleId(savedState.styleId);
      setTemplateId(savedState.templateId);
      
      // 恢复到之前的页面
      navigate(savedState.currentPath);
    }
  }, []);
  
  // 监听页面状态变化，自动保存
  useEffect(() => {
    const pageState: PageState = {
      photos,
      answers,
      styleId,
      templateId,
      currentPath: location.pathname,
      timestamp: Date.now(),
    };
    savePageState(pageState);
  }, [photos, answers, styleId, templateId, location.pathname]);
  
  // 登出时清除页面状态
  const handleSignOut = async () => {
    await signOut();
    clearPageState();
    setShowAuthPage(true);
  };
}
```

---

## 🧪 测试清单

### 基础路由测试
- [ ] 点击"表单配置"按钮，URL 变为 `/form-config`
- [ ] 点击"我的手帐本"按钮，URL 变为 `/notebook`
- [ ] 点击返回按钮，URL 变为 `/`
- [ ] 直接访问 `/form-config`，显示表单配置页面
- [ ] 直接访问 `/notebook`，显示我的手帐本页面

### 页面刷新测试
- [ ] 在 `/form-config` 页面刷新，停留在该页面
- [ ] 在 `/notebook` 页面刷新，停留在该页面
- [ ] 在 `/` 页面刷新，停留在该页面

### 页面状态恢复测试
- [ ] 上传照片后导航到其他页面，返回主页，照片仍然存在
- [ ] 填写表单后刷新页面，表单数据被恢复
- [ ] 选择风格和模板后刷新页面，选择被保留

### 登出测试
- [ ] 登出后，页面状态被清除
- [ ] 登出后，URL 变为 `/`（登录页面）

---

## 📊 修改文件清单

### 需要创建的文件
1. `src/routes/index.tsx` - 路由配置
2. `src/lib/pageStateManager.ts` - 页面状态管理

### 需要修改的文件
1. `src/main.tsx` - 使用 RouterProvider
2. `src/App.tsx` - 添加路由导航逻辑

---

## 🎯 实现顺序

### 第一阶段：基础路由（必需）
1. ✅ 安装 React Router
2. ✅ 创建路由配置文件
3. ✅ 修改 main.tsx
4. ✅ 修改 App.tsx 添加路由导航
5. ✅ 测试基础路由功能

### 第二阶段：页面状态持久化（推荐）
1. ✅ 创建页面状态管理文件
2. ✅ 在 App.tsx 中集成状态管理
3. ✅ 测试页面状态恢复功能

### 第三阶段：优化和完善（可选）
1. ✅ 添加路由过渡动画
2. ✅ 实现路由守卫
3. ✅ 优化用户体验

---

## 🔗 代码片段

### 完整的 App.tsx 修改示例

```typescript
import { useNavigate, useLocation } from 'react-router-dom';
import { savePageState, loadPageState, clearPageState } from './lib/pageStateManager';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // ... 其他 state 声明 ...
  
  // 应用启动时恢复页面状态
  useEffect(() => {
    const savedState = loadPageState();
    if (savedState) {
      setPhotos(savedState.photos);
      setAnswers(savedState.answers);
      setStyleId(savedState.styleId);
      setTemplateId(savedState.templateId);
      navigate(savedState.currentPath);
    }
  }, []);
  
  // 根据 URL 路径显示对应的页面
  useEffect(() => {
    const path = location.pathname;
    if (path === '/form-config') {
      setShowFormConfig(true);
    } else if (path === '/notebook') {
      setShowNotebookShelf(true);
    } else if (path === '/edit-info') {
      setIsInfoOpen(true);
    } else if (path === '/manage-photos') {
      setIsPhotoManagerOpen(true);
    } else {
      setShowFormConfig(false);
      setShowNotebookShelf(false);
      setIsInfoOpen(false);
      setIsPhotoManagerOpen(false);
    }
  }, [location.pathname]);
  
  // 监听页面状态变化，自动保存
  useEffect(() => {
    const pageState = {
      photos,
      answers,
      styleId,
      templateId,
      currentPath: location.pathname,
      timestamp: Date.now(),
    };
    savePageState(pageState);
  }, [photos, answers, styleId, templateId, location.pathname]);
  
  // 处理页面导航
  const handleShowFormConfig = (show: boolean) => {
    setShowFormConfig(show);
    navigate(show ? '/form-config' : '/');
  };
  
  const handleShowNotebook = (show: boolean) => {
    setShowNotebookShelf(show);
    navigate(show ? '/notebook' : '/');
  };
  
  // 处理登出
  const handleSignOut = async () => {
    await signOut();
    clearPageState();
    setShowAuthPage(true);
  };
  
  // ... 其他代码 ...
}
```

---

## 📈 预期结果

### 实现前
```
用户在"表单配置"页面
  ↓
刷新页面
  ↓
回到主页 ❌
```

### 实现后
```
用户在"表单配置"页面（URL: /form-config）
  ↓
刷新页面
  ↓
停留在"表单配置"页面 ✅
  ↓
页面状态被恢复 ✅
```

---

## 🐛 常见问题

### Q1：刷新后页面状态没有被恢复
**A**：检查 localStorage 是否被清除，或者状态是否过期（24 小时）。

### Q2：路由导航不工作
**A**：确保 `RouterProvider` 正确包装了应用，并且 `useNavigate` 在路由上下文中使用。

### Q3：页面状态太大，localStorage 溢出
**A**：减少保存的数据量，或者使用 IndexedDB 替代 localStorage。

---

## ✨ 总结

通过以上步骤，你可以：

✅ 为应用实现完整的路由系统
✅ 刷新页面后停留在原来的页面
✅ 自动保存和恢复页面状态
✅ 改进用户体验

---

**实现状态**：📋 指南完成
**下一步**：按照步骤实现路由系统

---

**维护者**：Codewiz
**最后更新**：2024年
