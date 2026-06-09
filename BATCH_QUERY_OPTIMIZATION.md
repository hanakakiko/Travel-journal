# 手帐本分批查询优化方案

## 问题描述

当手帐本中的页面数量较多（如 13 张）时，在"我的手帐本"列表中点进某个具体手帐本会发生四个失败调用，错误信息如下：

```
{
  "code": "DATABASE_REQUEST_FAILED",
  "message": "(OperationFailed) Executor error during find command :: caused by :: Sort operation used more than the maximum 33554432 bytes of RAM. Add an index, or specify a smaller limit.",
  "request_id": "22478869-06ac-4d10-bf2c-27370020cdac"
}

{
  "code": "DATABASE_REQUEST_FAILED",
  "message": "查询结果超过单次回包大小限制，请缩小查询范围或添加查询条件",
  "request_id": "bc0bf86e-6ed7-4517-fe1f-96b3baeb0b8e"
}
```

## 根本原因

CloudBase 数据库对单次查询的返回体大小有限制（约 33MB）。当手帐本中的页面数量过多时，一次性查询所有页面会导致返回体超过限制，从而触发数据库错误。

## 解决方案

实现了分批查询机制，将大量数据的查询分解为多个小批次的查询，然后在客户端组装结果。

### 核心改进

#### 1. `getPagesByNotebook()` 函数优化

**改进前：** 一次性查询所有页面
```typescript
export async function getPagesByNotebook(notebookId: string): Promise<JournalPageEntry[]> {
  // 直接查询所有页面，可能导致返回体过大
  result = await db
    .collection(PAGES_COLLECTION)
    .where({ notebookId, userId })
    .orderBy("order", "asc")
    .get();
}
```

**改进后：** 分批查询所有页面
```typescript
export async function getPagesByNotebook(notebookId: string): Promise<JournalPageEntry[]> {
  const BATCH_SIZE = 5; // 每批查询 5 个页面
  
  // 1. 首先获取总页数
  const countResult = await db
    .collection(PAGES_COLLECTION)
    .where({ notebookId, userId })
    .count();
  
  const totalPages = countResult.total || 0;
  
  // 2. 分批查询所有页面
  const allPages: StoredJournalPageEntry[] = [];
  const batchCount = Math.ceil(totalPages / BATCH_SIZE);
  
  for (let batch = 0; batch < batchCount; batch++) {
    const skip = batch * BATCH_SIZE;
    
    // 尝试使用 orderBy + skip + limit
    result = await db
      .collection(PAGES_COLLECTION)
      .where({ notebookId, userId })
      .orderBy("order", "asc")
      .skip(skip)
      .limit(BATCH_SIZE)
      .get();
    
    // 如果失败，回退到不带 orderBy 的查询
    // 如果还是失败，回退到全量查询后客户端分页
    
    allPages.push(...batchPages);
  }
  
  // 3. 确保最终结果按 order 排序
  return sortPagesByOrder(allPages);
}
```

**关键特性：**
- ✅ 分批查询：每批 5 个页面，避免单次返回体过大
- ✅ 多层回退：支持 orderBy + skip + limit → skip + limit → 全量查询
- ✅ 客户端排序：在 orderBy 失败时，在客户端进行排序
- ✅ 详细日志：记录每批查询的进度和结果
- ✅ 自动组装：将多批结果自动组装为完整列表

#### 2. `deletePage()` 函数优化

**改进：** 使用分批查询获取所有页面，而不是直接查询
```typescript
// 改进前
const pagesResult = await pagesCollection.where({ notebookId, userId }).get();
const existingPages = toPages(pagesResult);

// 改进后
const existingPages = await getPagesByNotebook(notebookId);
```

#### 3. `reorderPages()` 函数优化

**改进：** 使用分批查询获取所有页面，而不是直接查询
```typescript
// 改进前
const pagesResult = await pagesCollection.where({ notebookId, userId }).get();
return toPages(pagesResult);

// 改进后
return await getPagesByNotebook(notebookId);
```

## 性能影响

### 查询次数增加

- **改进前：** 1 次查询（可能失败）
- **改进后：** 1 次 count 查询 + N 次分批查询（N = ⌈总页数 / 5⌉）

例如，对于 13 个页面：
- 改进前：1 次查询（失败）
- 改进后：1 次 count 查询 + 3 次分批查询 = 4 次查询（全部成功）

### 响应时间

- 由于分批查询需要多次网络往返，总响应时间可能会增加
- 但这是必要的权衡，以避免数据库错误

### 内存占用

- 改进后的内存占用基本相同（最终都是返回完整的页面列表）
- 但单次查询的内存占用更小

## 配置参数

### BATCH_SIZE

当前设置为 5，可根据实际情况调整：

```typescript
const BATCH_SIZE = 5; // 每批查询 5 个页面
```

**调整建议：**
- 如果页面包含大量数据（如高分辨率图片 URL），可以减小 BATCH_SIZE（如 3）
- 如果页面数据较小，可以增大 BATCH_SIZE（如 10）
- 建议不超过 10，以避免单次返回体过大

## 测试建议

1. **小数据量测试（1-5 个页面）**
   - 验证分批查询的正确性
   - 确保最终结果与改进前相同

2. **中等数据量测试（6-15 个页面）**
   - 验证分批查询的性能
   - 确保没有遗漏或重复的页面

3. **大数据量测试（20+ 个页面）**
   - 验证多批查询的正确性
   - 测试网络中断时的恢复能力

4. **边界情况测试**
   - 0 个页面
   - 恰好是 BATCH_SIZE 的倍数的页面数（如 5、10）
   - 不是 BATCH_SIZE 的倍数的页面数（如 13）

## 日志输出

改进后的代码会输出详细的日志，便于调试：

```
[getPagesByNotebook] 手帐本 notebook_xxx 共有 13 个页面，将分 3 批查询
[getPagesByNotebook] 查询第 1/3 批（跳过 0 条，查询 5 条）
[getPagesByNotebook] 第 1/3 批获取了 5 个页面
[getPagesByNotebook] 查询第 2/3 批（跳过 5 条，查询 5 条）
[getPagesByNotebook] 第 2/3 批获取了 5 个页面
[getPagesByNotebook] 查询第 3/3 批（跳过 10 条，查询 5 条）
[getPagesByNotebook] 第 3/3 批获取了 3 个页面
```

## 相关文件

- [`src/lib/notebookManager.ts`](src/lib/notebookManager.ts) - 核心实现
- [`src/components/NotebookDetailModal.tsx`](src/components/NotebookDetailModal.tsx) - 使用该函数的组件

## 后续优化方向

1. **虚拟滚动**：对于大量页面，可以使用虚拟滚动只渲染可见的页面
2. **缓存机制**：使用 React Query 或 SWR 缓存查询结果，避免重复查询
3. **搜索功能**：添加按名称搜索页面的功能
4. **排序选项**：支持按创建时间、修改时间等多种排序方式
5. **数据库索引**：在 CloudBase 中为 `order` 字段添加索引，提高排序性能
