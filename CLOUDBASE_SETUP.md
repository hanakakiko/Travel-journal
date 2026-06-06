# CloudBase 数据库设置指南

## 🚨 问题

当你点击"我的手帐本"时，会看到错误：
```
DATABASE_COLLECTION_NOT_EXIST: Db or Table not exist: journals_notebooks
```

这是因为需要在 CloudBase 数据库中创建两个集合。

---

## 📋 需要创建的集合

1. `journals_notebooks` - 存储手帐本信息
2. `journals_pages` - 存储手帐页面信息

---

## 🔧 创建步骤

### 第 1 步：访问 CloudBase 控制台

打开链接：
```
https://console.cloud.tencent.com/tcb
```

或按照以下步骤：
1. 登录腾讯云控制台
2. 搜索"CloudBase"
3. 点击"数据库"

### 第 2 步：选择环境

- 找到你的环境（通常是 `my-travel-journal-d5d06m1a517f14`）
- 点击进入

### 第 3 步：创建第一个集合 - `journals_notebooks`

#### 3a. 新建集合
1. 点击"新建集合"按钮
2. 输入集合名称：`journals_notebooks`
3. 点击"确定"创建

#### 3b. 添加字段和索引

在集合创建后，你可以看到 Schema 编辑页面。以下是推荐的字段结构：

| 字段名 | 类型 | 说明 | 索引 |
|--------|------|------|------|
| _id | String | MongoDB 自动生成 | ✓ 主键 |
| id | String | 唯一标识 (notebook_uid_timestamp) | ✓ |
| userId | String | 用户 ID | ✓ |
| name | String | 手帐本名称 | |
| coverImageUrl | String | 封面图 URL | |
| pageCount | Number | 页面数量 | |
| createdAt | Number | 创建时间戳 | ✓ |
| updatedAt | Number | 更新时间戳 | |

**索引配置：**
```javascript
// 复合索引（可选但推荐）
db.collection('journals_notebooks').createIndex({
  userId: 1,
  createdAt: -1  // 按创建时间倒序
});
```

### 第 4 步：创建第二个集合 - `journals_pages`

#### 4a. 新建集合
1. 点击"新建集合"按钮
2. 输入集合名称：`journals_pages`
3. 点击"确定"创建

#### 4b. 添加字段和索引

| 字段名 | 类型 | 说明 | 索引 |
|--------|------|------|------|
| _id | String | MongoDB 自动生成 | ✓ 主键 |
| id | String | 唯一标识 (page_notebookid_timestamp) | ✓ |
| notebookId | String | 所属手帐本 ID | ✓ |
| userId | String | 用户 ID | ✓ |
| imageUrl | String | 页面图片 URL (DataURL 或 COS URL) | |
| title | String | 页面标题 | |
| order | Number | 排序序号 | ✓ |
| createdAt | Number | 创建时间戳 | |

**索引配置：**
```javascript
// 复合索引（可选但推荐）
db.collection('journals_pages').createIndex({
  notebookId: 1,
  order: 1  // 按顺序号排序
});
```

### 第 5 步：配置安全规则（可选但推荐）

为了确保用户数据隐私，应该设置数据库权限规则。

#### 5a. 编辑 journals_notebooks 的权限

在集合设置中，找到"权限设置"或"安全规则"，设置为：

```javascript
// 读权限
doc.userId == auth.uid

// 写权限  
doc.userId == auth.uid
```

这样只有该用户才能读写自己的数据。

#### 5b. 编辑 journals_pages 的权限

同样配置：

```javascript
// 读权限
doc.userId == auth.uid

// 写权限
doc.userId == auth.uid
```

---

## 📊 完整的集合 Schema 参考

### journals_notebooks
```json
{
  "_id": "MongoDB自动生成的ID",
  "id": "notebook_uid_1717667400000",
  "userId": "cloudbase_uid",
  "name": "2024年秋季",
  "coverImageUrl": "https://... 或 data:image/png;base64,...",
  "pageCount": 5,
  "createdAt": 1717667400000,
  "updatedAt": 1717667400000
}
```

### journals_pages
```json
{
  "_id": "MongoDB自动生成的ID",
  "id": "page_notebook_id_1717667400000",
  "notebookId": "notebook_uid_1717667400000",
  "userId": "cloudbase_uid",
  "imageUrl": "data:image/png;base64,... 或 https://...",
  "title": "第 1 页",
  "order": 0,
  "createdAt": 1717667400000
}
```

---

## ✅ 验证创建成功

创建完成后：

1. **刷新浏览器**
   ```
   Ctrl + F5 (或 Cmd + Shift + R on Mac)
   ```

2. **重新点击"我的手帐本"**
   - 应该不再看到错误
   - 看到"还没有手帐本"的提示

3. **创建第一个手帐本**
   - 点击"新建手帐本"
   - 输入名称（如："测试本"）
   - 上传一张图片
   - 点击"创建"

---

## 🔍 如何检查集合是否存在

在 CloudBase 控制台的数据库页面：

1. 展开你的环境
2. 查看"集合列表"
3. 应该能看到：
   - ✅ `journals_notebooks`
   - ✅ `journals_pages`

如果看不到，说明还没有创建。

---

## 🆘 常见问题

### Q: 如何找到我的环境 ID？

A: 在 CloudBase 控制台的环境列表中，你应该能看到：
```
my-travel-journal-d5d06m1a517f14
```

这个 ID 在 `src/lib/cloudbase.ts` 中的 `ENV_ID` 变量中定义。

### Q: 集合创建后没有字段，可以吗？

A: 可以！CloudBase 支持无模式（NoSQL）的灵活结构。
- 字段会在首次插入数据时自动创建
- 不需要提前定义所有字段
- 但添加索引可以提升查询性能

### Q: 如何添加索引？

A: 在集合的"索引"标签页中：
1. 点击"新建索引"
2. 选择字段（如 `userId`, `createdAt`）
3. 选择排序方向（升序/降序）
4. 保存

### Q: 忘记了 CloudBase 环境 ID 怎么办？

A: 打开文件 `src/lib/cloudbase.ts`，查看第 10 行：
```typescript
const ENV_ID = "my-travel-journal-d5d06m1a517f14";
```

### Q: 能删除集合重新创建吗？

A: 可以，但要谨慎！
1. 删除集合会删除所有数据
2. 重新创建集合后需要重新配置权限和索引

---

## 🔐 安全建议

### 不要做的事
❌ 把集合权限设为公开（允许所有用户访问）
❌ 在代码中硬编码敏感信息
❌ 在集合中存储密码或 API Key

### 应该做的事
✅ 为每个集合配置严格的权限规则
✅ 使用 CloudBase 的认证系统（已集成）
✅ 定期检查权限设置
✅ 备份重要数据

---

## 📚 相关资源

- CloudBase 数据库文档：https://docs.cloudbase.net/database/
- CloudBase 权限规则：https://docs.cloudbase.net/database/security.html
- CloudBase 索引优化：https://docs.cloudbase.net/database/indexes.html

---

## ✨ 下一步

集合创建成功后：

1. ✅ 刷新浏览器
2. ✅ 点击"我的手帐本"
3. ✅ 创建第一个手帐本
4. ✅ 开始使用手帐展示架功能！

---

**需要帮助？**

如果在创建过程中遇到问题，请检查：
1. CloudBase 环境是否正确
2. 是否已登录腾讯云
3. 集合名称是否完全匹配（区分大小写）
4. 浏览器控制台是否有其他错误提示
