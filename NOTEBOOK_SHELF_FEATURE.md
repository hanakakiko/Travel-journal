# 手帐展示架功能实现文档

## 功能概述

该功能允许用户建立一个虚拟展示架来收藏和管理他们生成的手帐。用户可以：

1. **创建手帐本** - 输入名字、上传封面图
2. **查看手帐本** - 展示架上展示所有手帐本的封面和基本信息
3. **管理手帐页面** - 在每个手帐本中查看、删除、上传和排序页面
4. **快速保存** - 生成手帐后，可直接选择保存到某个手帐本

---

## 技术架构

### 数据结构

#### `JournalNotebook` (手帐本)

```typescript
{
  id: string;              // 唯一标识
  userId: string;          // 所属用户
  name: string;            // 手帐本名称
  coverImageUrl: string;   // 封面图 URL (COS 链接)
  pageCount: number;       // 页面数量
  createdAt: number;       // 创建时间戳
  updatedAt: number;       // 更新时间戳
}
```

#### `JournalPageEntry` (手帐页面)

```typescript
{
  id: string;              // 唯一标识
  notebookId: string;      // 所属手帐本 ID
  userId: string;          // 所属用户
  imageUrl: string;        // 页面图片 URL (COS 链接)
  title: string;           // 页面标题
  order: number;           // 排序序号 (0-based)
  createdAt: number;       // 创建时间戳
}
```

### CloudBase 集合

- **journals_notebooks** - 存储手帐本信息
- **journals_pages** - 存储手帐页面信息

---

## 文件结构

### 新增文件

```
src/
├── lib/
│   └── notebookManager.ts          # 后端 API 封装
├── components/
│   ├── NotebookShelf.tsx           # 展示架主页面
│   ├── NotebookCreateModal.tsx     # 创建手帐本弹窗
│   ├── NotebookDetailModal.tsx     # 手帐本详情弹窗
│   └── SaveToNotebookModal.tsx     # 保存到手帐本弹窗
```

### 修改的文件

- `src/types.ts` - 添加 `JournalNotebook` 和 `JournalPageEntry` 类型
- `src/App.tsx` - 集成手帐本功能到主应用

---

## 核心功能模块

### 1. `notebookManager.ts` - 数据库操作层

**手帐本操作:**
- `createNotebook(name, coverImageUrl)` - 创建新手帐本
- `getAllNotebooks()` - 获取当前用户的所有手帐本
- `getNotebookById(id)` - 获取指定手帐本
- `updateNotebook(id, updates)` - 更新手帐本
- `deleteNotebook(id)` - 删除手帐本及其所有页面

**页面操作:**
- `addPageToNotebook(notebookId, imageUrl, title)` - 添加页面
- `getPagesByNotebook(notebookId)` - 获取手帐本的所有页面
- `deletePage(pageId, notebookId)` - 删除指定页面
- `reorderPages(notebookId, pageIds)` - 调整页面顺序

### 2. `NotebookShelf.tsx` - 展示架主页面

**功能:**
- 显示所有手帐本网格
- 支持创建新手帐本
- 支持删除手帐本
- 点击手帐本打开详情页面

**UI 特点:**
- 响应式网格布局 (2-4 列)
- 封面图预览
- 页面计数显示
- 加载中状态提示
- 错误处理提示

### 3. `NotebookCreateModal.tsx` - 创建手帐本

**功能:**
- 输入手帐本名称
- 上传封面图
- 图片预览

**技术细节:**
- 图片大小限制：10MB
- 文件类型：image/*
- 上传到 COS（当前为本地 DataURL，需要实现真实 COS 上传）

### 4. `NotebookDetailModal.tsx` - 手帐本详情

**功能:**
- 显示手帐本中的所有页面（网格布局）
- 上传新页面
- 删除页面
- 拖动排序页面
- 点击图片查看大图预览

**交互特性:**
- 拖放排序：直观的拖动操作调整页面顺序
- 悬停显示：鼠标悬停时显示操作按钮
- 图片预览：全屏预览生成的页面图片
- 实时反馈：操作成功后立即更新列表

### 5. `SaveToNotebookModal.tsx` - 生成后保存

**功能:**
- 列出所有可用的手帐本
- 选择保存到某个手帐本
- 支持临时创建新手帐本并直接保存

**流程:**
1. 用户点击"保存到手帐本"按钮
2. 弹窗列出所有手帐本
3. 选择目标手帐本
4. 点击保存，页面自动添加到选中的手帐本
5. 成功提示后自动关闭

---

## 使用流程

### 用户使用步骤

#### 1. 创建手帐本

```
1. 点击顶部菜单 "我的手帐本" → 打开展示架
2. 点击 "新建手帐本" → 弹窗出现
3. 输入手帐本名称
4. 上传封面图
5. 点击 "创建" → 新手帐本加入展示架
```

#### 2. 查看手帐本

```
1. 在展示架中点击手帐本封面
2. 打开手帐本详情页面，显示所有页面
3. 点击页面图片查看大图
```

#### 3. 管理页面

```
添加页面：
1. 打开手帐本详情
2. 点击 "上传新页面"
3. 选择图片 → 自动添加为最后一页

删除页面：
1. 悬停在页面上
2. 点击删除按钮 → 确认后删除

调整顺序：
1. 拖动页面到新位置
2. 松开鼠标 → 自动保存
```

#### 4. 保存生成的手帐

```
1. 生成手帐后，在结果上点击 "保存到手帐本"
2. 弹窗列出所有手帐本
3. 选择目标手帐本
4. 点击 "保存" → 页面自动添加到手帐本中
```

---

## 后续开发任务

### 高优先级

1. **实现真实的 COS 上传**
   - 当前 `uploadImageToCOS()` 返回 DataURL
   - 需要实现真实的腾讯云 COS 上传逻辑
   - 获取 COS 临时凭证
   - 上传文件后返回真实 URL

2. **性能优化**
   - 图片懒加载（特别是列表中的封面和页面）
   - 分页加载（手帐本数量很多时）
   - 虚拟列表优化（页面数量很多时）

3. **UI 完善**
   - 添加动画过渡效果
   - 优化移动端显示
   - 添加骨架屏加载动画

### 中等优先级

4. **功能扩展**
   - 手帐本重命名
   - 修改手帐本封面
   - 批量删除页面
   - 页面内容编辑（title、description）

5. **用户体验**
   - 操作撤销/重做
   - 拖放进度条
   - 快捷键支持 (Delete 删除、 Ctrl+Z 撤销等)
   - 暗黑模式支持

### 低优先级

6. **数据功能**
   - 手帐本搜索/筛选
   - 日期范围筛选
   - 标签分类
   - 导出为 PDF

7. **社交功能**
   - 分享手帐本链接
   - 手帐本评论/点赞
   - 公开/私密设置

---

## 问题排查

### 常见问题

**Q: 创建手帐本后没有显示?**
- A: 检查 CloudBase 数据库连接是否正常
- 检查 localStorage 中 CloudBase 认证信息是否存在
- 查看浏览器控制台是否有错误信息

**Q: 上传页面后图片显示不正常?**
- A: 由于当前使用 DataURL，刷新后数据会丢失
- 需要实现真实 COS 上传以持久化存储

**Q: 拖放排序后没有保存?**
- A: 拖放完成后，`handleDrop` 函数会自动调用 `reorderPages()`
- 如果失败，检查网络连接和 CloudBase 权限

---

## 开发建议

### 代码风格

- 使用 TypeScript 确保类型安全
- 所有异步操作都需要错误处理
- UI 组件使用 Lucide React 图标
- Tailwind CSS 用于样式（某些部分使用内联样式）

### 测试建议

1. **单元测试**
   - 测试 `notebookManager.ts` 中的所有函数
   - 模拟 CloudBase 返回值

2. **集成测试**
   - 完整的创建→上传→删除→排序流程
   - 网络异常情况下的行为

3. **UI 测试**
   - 响应式布局在不同屏幕大小上的表现
   - 拖放操作的准确性
   - 模态框的打开关闭

---

## 依赖和兼容性

- **React**: ^19.0.0
- **TypeScript**: ^5.7.2
- **Lucide React**: ^0.468.0 (图标库)
- **Cloudbase SDK**: ^3.3.13
- **浏览器支持**: 现代浏览器 (Chrome, Firefox, Safari, Edge)

---

## 数据迁移注意事项

如果未来需要修改数据库表结构：

1. 创建新的集合（向后兼容）
2. 编写迁移脚本转移数据
3. 逐步弃用旧集合
4. 务必备份用户数据

---

## 安全考虑

- ✅ 所有操作都验证 `userId`，防止用户访问他人数据
- ✅ 敏感操作（删除）都需要用户确认
- ⚠️ 图片上传需要验证文件类型和大小（已实现）
- ⚠️ 生产环境中应使用 COS 上传令牌，不存储长期凭证

---

## 参考资源

- CloudBase 数据库文档: https://docs.cloudbase.net/database/
- TypeScript 最佳实践: https://www.typescriptlang.org/docs/
- React 18+ Hooks: https://react.dev/reference/react
