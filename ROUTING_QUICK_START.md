# 路由系统 - 快速开始指南

## 🎯 目标

**实现路由系统，使得刷新页面后能停留在原来的页面**

### 当前问题
- 刷新页面后总是回到主页
- 无法保留页面状态

### 解决方案
- 使用 React Router 实现路由系统
- 为每个页面分配独立的 URL 路径
- 实现页面状态持久化

---

## 📋 应用页面列表

| 页面 | 路径 | 说明 |
|------|------|------|
| 主页 | `/` | 表单页面，上传照片和填写表单 |
| 表单配置 | `/form-config` | 管理表单选项和自定义标签 |
| 我的手帐本 | `/notebook` | 查看和管理已保存的手帐 |
| 信息编辑 | `/edit-info` | 编辑表单答案和生成手帐 |
| 照片管理 | `/manage-photos` | 增删照片和管理已上传的图片 |

---

## 🚀 快速实现（5 分钟）

### 步骤 1：安装 React Router

```bash
npm install react-router-dom
```

### 步骤 2：创建路由配置

创建文件 `src/routes/index.tsx`：

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

### 步骤 3：修改 main.tsx

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

### 步骤 4：修改 App.tsx

在 App 组件中添加以下代码：

```typescript
import { useNavigate, useLocation } from 'react-router-dom';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  
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
  
  // 修改按钮点击处理
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

### 步骤 5：更新按钮点击处理

**表单配置按钮**（第 999 行）：
```typescript
// 修改前
onClick={() => setShowFormConfig(true)}

// 修改后
onClick={() => handleShowFormConfig(true)}
```

**我的手帐本按钮**（第 1027 行）：
```typescript
// 修改前
onClick={() => setShowNotebookShelf(true)}

// 修改后
onClick={() => handleShowNotebook(true)}
```

**FormConfigPage 返回按钮**（第 349 行）：
```typescript
// 修改前
onBack={() => setShowFormConfig(false)}

// 修改后
onBack={() => handleShowFormConfig(false)}
```

---

## 🔄 页面状态持久化（可选但推荐）

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
    return saved ? JSON.parse(saved) : null;
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

### 在 App.tsx 中使用

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
}
```

---

## 🧪 测试

### 基础测试
1. 启动应用：`npm run dev`
2. 点击"表单配置"按钮
3. 查看 URL，应该变为 `http://localhost:5173/form-config`
4. 刷新页面（F5）
5. ✅ 应该停留在表单配置页面

### 完整测试
1. 上传照片
2. 填写表单
3. 点击"表单配置"按钮
4. 返回主页
5. 刷新页面
6. ✅ 照片和表单数据应该被保留

---

## 📚 详细文档

- **[ROUTING_IMPLEMENTATION_PLAN.md](ROUTING_IMPLEMENTATION_PLAN.md)** - 完整的实现方案
- **[ROUTING_IMPLEMENTATION_GUIDE.md](ROUTING_IMPLEMENTATION_GUIDE.md)** - 详细的实现指南

---

## 🎯 预期结果

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

## 📝 修改清单

### 需要创建的文件
- [ ] `src/routes/index.tsx` - 路由配置
- [ ] `src/lib/pageStateManager.ts` - 页面状态管理（可选）

### 需要修改的文件
- [ ] `src/main.tsx` - 使用 RouterProvider
- [ ] `src/App.tsx` - 添加路由导航逻辑

---

## 🔗 相关资源

- [React Router 官方文档](https://reactrouter.com/)
- [React Router 中文文档](https://reactrouter.com/zh-CN/)

---

## 💡 提示

### 如果遇到问题

1. **路由不工作**
   - 检查 `RouterProvider` 是否正确包装了应用
   - 检查 `useNavigate` 是否在路由上下文中使用

2. **页面状态没有被恢复**
   - 检查 localStorage 是否被清除
   - 检查 `savePageState` 是否被正确调用

3. **URL 没有更新**
   - 检查 `navigate` 函数是否被正确调用
   - 检查路径是否正确

---

## ✨ 总结

通过以上步骤，你可以：

✅ 为应用实现完整的路由系统
✅ 刷新页面后停留在原来的页面
✅ 自动保存和恢复页面状态
✅ 改进用户体验

---

**实现时间**：约 15-30 分钟
**难度**：⭐⭐ 中等
**推荐**：✅ 强烈推荐

---

**维护者**：Codewiz
**最后更新**：2024年
