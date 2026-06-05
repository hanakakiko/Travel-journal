# 模板功能更新 - 删除选项 & 刷新后消失 Bug 修复

## 问题描述

### 问题 1：模板没有删除选项
用户保存的模板无法删除，只能查看和使用。

### 问题 2：刷新后已保存的模板消失
用户保存的模板在页面刷新后会消失，虽然数据仍在 localStorage 中。

## 根本原因分析

### 问题 1 的原因
模板详情页面（`TemplateDetailModal`）和模板列表中都没有提供删除按钮。

### 问题 2 的根本原因
在 `src/App.tsx` 中，`defaultAnswers` 常量在模块加载时定义，其中 `customTags` 字段在模块加载时就调用了 `getAllCustomTags()`：

```typescript
const defaultAnswers: UserAnswers = {
  // ...
  customTags: getAllCustomTags(),  // ❌ 在模块加载时执行，只执行一次
  // ...
};
```

当页面刷新时：
1. 模块重新加载，`defaultAnswers` 被重新创建
2. 但 `getAllCustomTags()` 在这个时刻执行，可能读取到不完整的 localStorage 数据
3. React 的 `useState` 初始化器只在组件首次挂载时执行，导致 `answers` 状态中的 `customTags` 与实际 localStorage 数据不同步
4. 这种不同步可能导致模板列表的状态管理出现问题

此外，`savedTemplates` 的初始化也只在组件首次挂载时执行一次，如果 localStorage 在其他标签页被修改，当前标签页不会同步更新。

## 解决方案

### 修复 1：添加模板删除功能

#### 1.1 修改 `TemplateDetailModal` 函数签名
添加 `onDelete` 回调参数：

```typescript
function TemplateDetailModal({
  template,
  onClose,
  onApply,
  onDelete,  // ✅ 新增
  onSound,
}: {
  template: SavedTemplate;
  onClose: () => void;
  onApply: () => void;
  onDelete: () => void;  // ✅ 新增
  onSound: (effect: SoundEffect) => void;
})
```

#### 1.2 在模板详情页面的 footer 添加删除按钮
```typescript
<button
  className="secondary-action"
  type="button"
  onClick={() => {
    if (window.confirm(`确定要删除模板 "${template.name}" 吗？`)) {
      onSound("tap");
      onDelete();
    }
  }}
  title="删除此模板"
  style={{ color: "#d32f2f" }}
>
  <Trash2 size={19} />
  <span>删除</span>
</button>
```

#### 1.3 在模板列表中添加删除按钮
在模板列表的每个模板卡片中添加删除按钮，与"查看"和"使用"按钮并排显示。

#### 1.4 更新 TemplateDetailModal 的调用处
在 `InfoModal` 中调用 `TemplateDetailModal` 时，传入 `onDelete` 回调：

```typescript
<TemplateDetailModal
  template={selectedTemplateDetail}
  onClose={() => setSelectedTemplateDetail(null)}
  onApply={() => {
    onApplyTemplate(selectedTemplateDetail);
    setShowTemplateSelection(false);
    setSelectedTemplateDetail(null);
  }}
  onDelete={() => {
    onDeleteTemplate(selectedTemplateDetail.id);
    setSelectedTemplateDetail(null);
  }}
  onSound={onSound}
/>
```

### 修复 2：修复刷新后模板消失的 Bug

#### 2.1 修改 `defaultAnswers` 的初始化
将 `customTags` 从模块加载时的初始化改为空对象，在 `useState` 中动态获取：

```typescript
// ❌ 之前
const defaultAnswers: UserAnswers = {
  // ...
  customTags: getAllCustomTags(),
  // ...
};

// ✅ 之后
const defaultAnswers: UserAnswers = {
  // ...
  customTags: {},  // 不在这里初始化
  // ...
};
```

#### 2.2 修改 `useState` 的初始化器
使用初始化函数，在组件挂载时动态获取 `customTags`：

```typescript
// ❌ 之前
const [answers, setAnswers] = useState<UserAnswers>(defaultAnswers);

// ✅ 之后
const [answers, setAnswers] = useState<UserAnswers>(() => ({
  ...defaultAnswers,
  customTags: getAllCustomTags(),
}));
```

#### 2.3 添加 localStorage 变化监听
添加 `useEffect` 监听 `storage` 事件，确保当其他标签页修改 localStorage 时，当前标签页能同步更新模板列表：

```typescript
useEffect(() => {
  const handleStorageChange = () => {
    setSavedTemplates(getAllTemplates());
  };
  
  window.addEventListener("storage", handleStorageChange);
  return () => window.removeEventListener("storage", handleStorageChange);
}, []);
```

## 修改文件

- `src/App.tsx`
  - 修改 `defaultAnswers` 的初始化（第 52-72 行）
  - 修改 `useState` 初始化器（第 89-96 行）
  - 添加 localStorage 变化监听 useEffect（第 156-165 行）
  - 修改 `TemplateDetailModal` 函数签名（第 2206-2216 行）
  - 在 `TemplateDetailModal` footer 添加删除按钮（第 2455-2481 行）
  - 在 `InfoModal` 中调用 `TemplateDetailModal` 时传入 `onDelete` 回调（第 1020-1033 行）
  - 在模板列表中添加删除按钮（第 1108-1160 行）

## 测试步骤

### 测试删除功能
1. 保存一个模板
2. 在模板列表中点击"查看"进入模板详情页面
3. 在 footer 中应该看到"删除"按钮
4. 点击"删除"按钮，确认删除
5. 模板应该从列表中消失

### 测试刷新后模板不消失
1. 保存一个模板
2. 刷新页面（F5 或 Cmd+R）
3. 打开"开始画手帐"，应该看到模板选择界面
4. 之前保存的模板应该仍然存在
5. 点击"使用"应该能正确加载模板的配置

### 测试多标签页同步
1. 在标签页 A 中保存一个模板
2. 在标签页 B 中打开同一个应用
3. 在标签页 A 中删除模板
4. 切换到标签页 B，模板列表应该自动更新，模板应该消失

## 技术细节

### 为什么 `customTags` 需要动态初始化？
- `defaultAnswers` 是模块级别的常量，在模块加载时创建一次
- 如果在这里调用 `getAllCustomTags()`，只会在模块加载时执行一次
- 当页面刷新时，模块重新加载，但 `getAllCustomTags()` 的执行时机可能不对
- 通过在 `useState` 的初始化函数中调用，确保每次组件挂载时都能获取最新的 localStorage 数据

### 为什么需要监听 `storage` 事件？
- `storage` 事件在同一浏览器的其他标签页修改 localStorage 时触发
- 这确保了多标签页之间的数据同步
- 虽然单标签页内的修改不会触发 `storage` 事件，但我们已经通过 `setSavedTemplates` 在删除时同步更新了状态

## 向后兼容性

所有修改都是向后兼容的：
- 现有的模板数据格式不变
- 现有的 API 接口不变
- 只是添加了新的 UI 功能和修复了状态管理问题

## 相关文件

- [`src/lib/templateManager.ts`](src/lib/templateManager.ts) - 模板管理工具（无需修改）
- [`src/types.ts`](src/types.ts) - 类型定义（无需修改）
