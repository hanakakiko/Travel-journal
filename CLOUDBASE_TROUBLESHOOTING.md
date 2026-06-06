# 🔧 CloudBase 问题诊断和解决

## 错误：数据库集合不存在

### 症状
```
加载手帐本错误: Error: 获取手帐本列表失败: undefined
```

或者看到提示信息：
```
❌ CloudBase 集合未创建。请按以下步骤操作:
1. 打开 CloudBase 控制台
2. 创建集合: journals_notebooks
3. 创建集合: journals_pages
4. 刷新页面
```

### 原因
CloudBase 中还没有创建 `journals_notebooks` 或 `journals_pages` 集合。

### 解决方案

#### ✅ 快速修复（3分钟）

1. **打开 CloudBase 控制台**
   ```
   https://console.cloud.tencent.com/tcb
   ```

2. **选择你的环境**
   - 查找：`my-travel-journal-d5d06m1a517f14`
   - 点击进入

3. **创建第一个集合**
   - 点击"新建集合"
   - 输入名称：`journals_notebooks`
   - 点击"确定"
   - ✓ 完成！

4. **创建第二个集合**
   - 点击"新建集合"
   - 输入名称：`journals_pages`
   - 点击"确定"
   - ✓ 完成！

5. **刷新浏览器**
   ```
   Ctrl + F5  (或 Cmd + Shift + R)
   ```

6. **再次点击"我的手帐本"**
   - 应该看到"还没有手帐本"的提示 ✓

#### 详细指南
参考：`CLOUDBASE_SETUP.md`

---

## 错误：其他数据库错误

### 症状
```
获取手帐本失败: [其他错误信息]
```

### 可能的原因和解决方案

| 错误信息 | 原因 | 解决方案 |
|---------|------|--------|
| `permission denied` | 权限问题 | 检查数据库安全规则配置 |
| `connection timeout` | 网络问题 | 检查网络连接，刷新页面 |
| `invalid operation` | 操作错误 | 检查集合是否创建正确 |
| `authentication failed` | 认证失败 | 清除 localStorage，重新登录 |

### 调试步骤

1. **打开浏览器开发者工具**
   ```
   按 F12 或右键 → 检查
   ```

2. **查看 Console 标签页**
   - 查看完整的错误信息
   - 查看网络请求

3. **查看错误详情**
   - 包含 `CloudBase 查询错误详情` 的信息
   - 复制完整的错误对象

4. **检查集合是否存在**
   - 打开 CloudBase 控制台
   - 点击你的环境
   - 在"集合列表"中查看
   - 应该看到：
     ```
     ✓ journals_notebooks
     ✓ journals_pages
     ```

---

## 验证清单

### 集合创建检查
- [ ] `journals_notebooks` 集合存在
- [ ] `journals_pages` 集合存在
- [ ] 两个集合都是空的（没有数据也没关系）

### CloudBase 环境检查
- [ ] 环境 ID 正确：`my-travel-journal-d5d06m1a517f14`
- [ ] 环境已启用
- [ ] 数据库服务已启用

### 应用检查
- [ ] 已刷新浏览器（Ctrl+F5）
- [ ] 已清除缓存
- [ ] 使用最新的 Chrome/Safari/Firefox 浏览器

### 网络检查
- [ ] 网络连接正常
- [ ] 无代理或防火墙阻止
- [ ] 能访问 CloudBase 控制台

---

## 高级调试

### 查看原始错误对象

在浏览器 Console 中，你会看到类似：
```javascript
{
  code: "DATABASE_COLLECTION_NOT_EXIST",
  message: "Db or Table not exist: journals_notebooks",
  requestId: "...",
  request_id: "..."
}
```

### 常见错误代码

| code | 含义 | 解决方案 |
|------|------|--------|
| `DATABASE_COLLECTION_NOT_EXIST` | 集合不存在 | 创建集合 |
| `PERMISSION_DENIED` | 没有权限 | 检查安全规则 |
| `AUTHENTICATION_FAILED` | 认证失败 | 重新登录 |
| `INVALID_PARAM` | 参数错误 | 检查代码 |

---

## 完整的故障排除流程

```
1. 看到错误
   ↓
2. 打开浏览器开发者工具 (F12)
   ↓
3. 查看完整的错误信息
   ↓
4. 打开 CloudBase 控制台
   ↓
5. 检查集合是否存在
   ↓
   ├─ 存在 → 检查权限或网络
   └─ 不存在 → 创建集合
   ↓
6. 刷新页面 (Ctrl+F5)
   ↓
7. 再次尝试
```

---

## 如何获取帮助

1. **查看错误信息**
   - 完整的错误信息包含诊断信息
   - 复制 console 中的完整错误

2. **参考文档**
   - `CLOUDBASE_QUICK_SETUP.md` - 快速设置
   - `CLOUDBASE_SETUP.md` - 详细设置
   - CloudBase 官方文档：https://docs.cloudbase.net/

3. **检查网络请求**
   - 打开 Network 标签
   - 查看 CloudBase 请求
   - 查看响应状态码

---

## 常见问题 FAQ

**Q: 创建了集合但还是报错？**
A: 刷新浏览器（Ctrl+F5）清除缓存，然后重试。

**Q: 集合创建了但看不到？**
A: 在 CloudBase 控制台的"集合列表"中查看，可能需要刷新控制台。

**Q: 能创建手帐本，但上传页面失败？**
A: 检查 `journals_pages` 集合是否存在。

**Q: 删除了集合后如何恢复？**
A: 数据已删除，需要重新创建集合。

**Q: 权限错误怎么办？**
A: 检查 CloudBase 安全规则配置（参考 CLOUDBASE_SETUP.md）。

---

## 环境信息

### 你的环境
- **环境 ID**：`my-travel-journal-d5d06m1a517f14`
- **地区**：上海 (ap-shanghai)
- **所在文件**：`src/lib/cloudbase.ts` (第 10-11 行)

### 需要创建的集合
- `journals_notebooks` - 手帐本信息
- `journals_pages` - 手帐页面信息

### 相关代码位置
- 数据库操作：`src/lib/notebookManager.ts`
- UI 组件：`src/components/NotebookShelf.tsx`

---

## 更新日志

**2024-06-06**: 
- 添加更详细的错误信息
- 添加集合不存在时的友好提示
- 改进错误日志输出

---

## 联系与反馈

如果问题仍未解决，请：
1. 提供完整的错误信息（包括 console 日志）
2. 截图显示 CloudBase 控制台状态
3. 描述你的操作步骤

