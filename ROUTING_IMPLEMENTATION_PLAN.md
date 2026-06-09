# 🗺️ 路由实现计划

## 项目路由审计结果

本文档列出了项目中所有需要添加或改进的路由。

---

## 1. 已完成的路由

### ✅ 基础路由
- **路由**: `/`
- **页面**: 主页面（AppContent 主体）
- **状态**: ✅ 完成
- **说明**: 应用首页，显示照片上传和表单填写界面

### ✅ 表单配置页面
- **路由**: `/form-config`
- **页面**: FormConfigPage
- **状态**: ✅ 完成
- **说明**: 管理表单选项（情绪、视觉风味等）
- **实现**: 
  - AppContent 检查 `location.pathname === '/form-config'`
  - 点击"表单配置"按钮时调用 `navigate('/form-config')`
  - 返回按钮调用 `navigate('/')`

### ✅ 手帐本列表页面
- **路由**: `/notebook`
- **页面**: NotebookShelf
- **状态**: ✅ 完成
- **说明**: 显示所有手帐本列表
- **实现**:
  - AppContent 检查 `location.pathname === '/notebook'`
  - 点击"我的手帐本"按钮时调用 `navigate('/notebook')`
  - 返回按钮调用 `navigate('/')`

---

## 2. 进行中的路由

### 🔄 手帐本详情页面
- **路由**: `/notebook/:id`
- **页面**: NotebookShelf（显示具体手帐本详情）
- **状态**: 🔄 进行中
- **说明**: 点击具体手帐本卡片时显示该手帐本的详情
- **需要实现**:
  - [x] NotebookShelf 接收 `navigate` prop
  - [x] 点击手帐本卡片时调用 `navigate('/notebook/' + notebook.id)`
  - [x] AppContent 处理 `/notebook/:id` 路由
  - [ ] 测试功能

**实现代码**:
```typescript
// NotebookShelf.tsx
onClick={() => {
  setSelectedNotebook(notebook);
  if (navigate) {
    navigate(`/notebook/${notebook.id}`);
  }
}}

// App.tsx
if (location.pathname.startsWith('/notebook/')) {
  return <NotebookShelf onClose={() => navigate('/notebook')} navigate={navigate} />;
}
```

---

## 3. 待实现的路由

### 📋 手帐本页面详情
- **路由**: `/notebook/:id/page/:pageId`
- **页面**: NotebookDetailModal（显示具体页面）
- **优先级**: 高
- **说明**: 点击手帐本中的具体页面时显示该页面的详情
- **需要实现**:
  - [ ] NotebookDetailModal 接收 `navigate` prop
  - [ ] 点击页面时调用 `navigate('/notebook/' + notebookId + '/page/' + pageId)`
  - [ ] AppContent 处理 `/notebook/:id/page/:pageId` 路由
  - [ ] 测试功能

**预期实现**:
```typescript
// NotebookDetailModal.tsx
interface NotebookDetailModalProps {
  notebook: JournalNotebook;
  onClose: () => void;
  navigate?: (path: string) => void;
  onNotebookUpdated?: (notebook: JournalNotebook) => void;
}

// 点击页面时
onClick={() => {
  if (navigate) {
    navigate(`/notebook/${notebook.id}/page/${page.id}`);
  }
}}

// App.tsx
if (location.pathname.match(/^\/notebook\/[^/]+\/page\/[^/]+$/)) {
  // 解析 URL 获取 notebookId 和 pageId
  // 显示对应的页面详情
}
```

### 📋 保存到手帐本后的导航
- **路由**: `/notebook/:id`（保存成功后）
- **页面**: SaveToNotebookModal
- **优先级**: 中
- **说明**: 用户保存生成的图片到手帐本后，可以导航到该手帐本
- **需要实现**:
  - [ ] SaveToNotebookModal 接收 `navigate` prop
  - [ ] 保存成功后调用 `navigate('/notebook/' + selectedNotebookId)`
  - [ ] 测试功能

**预期实现**:
```typescript
// SaveToNotebookModal.tsx
interface SaveToNotebookModalProps {
  imageUrl: string;
  imageTitle: string;
  onClose: () => void;
  onSuccess?: () => void;
  navigate?: (path: string) => void;
}

// 保存成功后
setTimeout(() => {
  if (navigate && savedTo) {
    navigate(`/notebook/${savedTo}`);
  }
  onSuccess?.();
  onClose();
}, 1000);
```

---

## 4. 其他需要检查的地方

### 📌 模态框和弹窗

| 组件 | 当前状态 | 需要添加路由 | 优先级 |
|------|--------|-----------|------|
| NotebookCreateModal | 仅使用状态 | 创建成功后导航到 `/notebook/:id` | 中 |
| NotebookDetailModal | 仅使用状态 | 点击页面时导航到 `/notebook/:id/page/:pageId` | 高 |
| SaveToNotebookModal | 仅使用状态 | 保存成功后导航到 `/notebook/:id` | 中 |
| PhotoManagerModal | 仅使用状态 | 不需要路由（模态框） | - |
| InfoModal | 仅使用状态 | 不需要路由（模态框） | - |
| ErrorAlert | 仅使用状态 | 不需要路由（提示框） | - |

### 📌 按钮和链接

| 位置 | 当前行为 | 需要改进 | 优先级 |
|------|--------|--------|------|
| 用户信息栏 - 表单配置 | ✅ 已导航 | - | - |
| 用户信息栏 - 我的手帐本 | ✅ 已导航 | - | - |
| NotebookShelf - 手帐本卡片 | 🔄 进行中 | 导航到 `/notebook/:id` | 高 |
| NotebookDetailModal - 页面卡片 | ❌ 未实现 | 导航到 `/notebook/:id/page/:pageId` | 高 |
| SaveToNotebookModal - 保存按钮 | ❌ 未实现 | 保存后导航到 `/notebook/:id` | 中 |

---

## 5. 实现优先级

### 🔴 高优先级（本周完成）
1. `/notebook/:id` - 手帐本详情页面
2. `/notebook/:id/page/:pageId` - 手帐本页面详情

### 🟡 中优先级（下周完成）
1. SaveToNotebookModal 的导航
2. NotebookCreateModal 的导航

### 🟢 低优先级（后续完成）
1. 其他模态框的优化

---

## 6. 实现步骤

### 第 1 步：完成 `/notebook/:id` 路由（已进行中）

**文件**: `src/components/NotebookShelf.tsx`, `src/App.tsx`

**检查清单**:
- [x] NotebookShelf 接收 `navigate` prop
- [x] 点击手帐本卡片时调用 `navigate()`
- [x] AppContent 处理 `/notebook/:id` 路由
- [ ] 测试功能

**测试步骤**:
1. 点击"我的手帐本"按钮
2. 点击某个具体的手帐本卡片
3. 验证 URL 是否变为 `/notebook/xxx`
4. 验证手帐本详情是否正确显示
5. 刷新页面，验证是否保持在该手帐本页面

### 第 2 步：实现 `/notebook/:id/page/:pageId` 路由

**文件**: `src/components/NotebookDetailModal.tsx`, `src/App.tsx`

**步骤**:
1. 修改 NotebookDetailModal 接收 `navigate` prop
2. 点击页面时调用 `navigate('/notebook/:id/page/:pageId')`
3. 在 AppContent 中处理该路由
4. 测试功能

### 第 3 步：改进 SaveToNotebookModal 的导航

**文件**: `src/components/SaveToNotebookModal.tsx`, `src/App.tsx`

**步骤**:
1. 修改 SaveToNotebookModal 接收 `navigate` prop
2. 保存成功后调用 `navigate('/notebook/:id')`
3. 在 AppContent 中传递 `navigate` prop
4. 测试功能

---

## 7. 路由参数提取

### 从 URL 中提取参数

```typescript
// 方法 1: 使用正则表达式
const match = location.pathname.match(/^\/notebook\/([^/]+)$/);
if (match) {
  const notebookId = match[1];
}

// 方法 2: 使用 useParams Hook（推荐）
import { useParams } from 'react-router-dom';

function NotebookDetail() {
  const { id } = useParams<{ id: string }>();
  // 使用 id
}

// 方法 3: 手动解析
const parts = location.pathname.split('/');
const notebookId = parts[2];  // /notebook/123 -> 123
const pageId = parts[4];      // /notebook/123/page/456 -> 456
```

---

## 8. 常见问题

### Q: 为什么要添加路由？
A: 添加路由可以：
- 让 URL 反映应用状态
- 支持浏览器后退/前进
- 支持页面刷新后保持状态
- 支持分享 URL

### Q: 模态框需要添加路由吗？
A: 取决于模态框的用途：
- **需要**: 如果模态框显示的是主要内容（如手帐本详情）
- **不需要**: 如果模态框只是辅助功能（如确认对话框）

### Q: 如何处理嵌套路由？
A: 使用 URL 参数：
- `/notebook/:id` - 手帐本详情
- `/notebook/:id/page/:pageId` - 页面详情

### Q: 如何在 AppContent 中处理多个路由？
A: 按照优先级从具体到通用排列：
```typescript
// 先检查具体的路由
if (location.pathname.match(/^\/notebook\/[^/]+\/page\/[^/]+$/)) {
  // 处理页面详情
}

// 再检查通用的路由
if (location.pathname.startsWith('/notebook/')) {
  // 处理手帐本详情
}

if (location.pathname === '/notebook') {
  // 处理手帐本列表
}
```

---

## 9. 下一步行动

1. **立即完成**:
   - [ ] 测试 `/notebook/:id` 路由是否正常工作
   - [ ] 验证 URL 更新和页面显示是否同步

2. **本周完成**:
   - [ ] 实现 `/notebook/:id/page/:pageId` 路由
   - [ ] 测试嵌套路由功能

3. **下周完成**:
   - [ ] 改进 SaveToNotebookModal 的导航
   - [ ] 改进 NotebookCreateModal 的导航

4. **持续改进**:
   - [ ] 定期检查新添加的功能是否遵循路由规范
   - [ ] 更新本文档以反映最新的路由结构

---

## 10. 相关文档

- [ROUTING_GUIDELINES.md](./ROUTING_GUIDELINES.md) - 路由开发准则
- [React Router 官方文档](https://reactrouter.com/)
