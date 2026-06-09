# 自定义选项完整流程验证文档

## 概述

本文档描述了自定义选项（customTags）的完整生命周期和预期行为，用于验证修复是否成功。

## 核心概念

### 三个层级的自定义选项

1. **用户维度的自定义选项**（User-level Custom Tags）
   - 存储位置：CloudBase `user_settings` 集合
   - 本地缓存：localStorage 的 `journal-custom-tags` 键
   - 生命周期：跟随用户账号，登录时拉取，登出时清除
   - 用途：用户个人保存的自定义标签库

2. **模板中的自定义选项**（Template Custom Tags）
   - 存储位置：CloudBase `saved_templates` 集合中的 `answers.customTags`
   - 生命周期：跟随模板，模板创建时保存，模板删除时清除
   - 用途：模板创建时的自定义标签快照

3. **当前表单中的自定义选项**（Current Form Custom Tags）
   - 存储位置：React state 中的 `answers.customTags`
   - 本地缓存：localStorage 的 `journal-form-draft` 键（作为表单草稿的一部分）
   - 生命周期：当前编辑会话
   - 用途：当前生图任务的自定义标签选择

## 预期行为

### 场景 1：用户增删自定义选项

**操作步骤：**
1. 用户在「情绪」、「视觉风味」等字段中添加自定义标签
2. 用户删除之前添加的自定义标签

**预期结果：**
- ✅ 新增的标签立即显示在当前表单中
- ✅ 新增的标签保存到用户维度（localStorage + CloudBase）
- ✅ 删除的标签从当前表单中移除
- ✅ 删除的标签从用户维度中移除（localStorage + CloudBase）
- ✅ 下一次打开应用时，用户维度的标签仍然存在

**相关代码：**
- `handleAddCustomTag()` - 添加标签时调用 `saveCustomTags()`
- `handleRemoveCustomTag()` - 删除标签时调用 `saveCustomTags()`
- `saveCustomTags()` - 同时保存到 localStorage 和 CloudBase

### 场景 2：使用已有的模板

**操作步骤：**
1. 用户点击「使用」按钮应用一个保存的模板
2. 模板中包含用户维度没有的自定义选项

**预期结果：**
- ✅ 模板中的所有选项（包括自定义选项）应用到当前表单
- ✅ 模板中有但用户维度没有的自定义选项也会显示
- ✅ 用户可以选择这些临时显示的选项
- ✅ 这些选项不会保存到用户维度
- ✅ 下一次创建新的生图任务时，这些临时选项消失，恢复为用户维度的选项

**相关代码：**
- `handleApplyTemplate()` - 合并用户维度和模板中的自定义选项
- 合并策略：用户维度为基础，模板中有但用户维度没有的选项添加到合并结果

### 场景 3：清除表单数据

**操作步骤：**
1. 用户点击「清除全部」按钮
2. 确认清除操作

**预期结果：**
- ✅ 所有表单数据重置为默认值
- ✅ 自定义选项重置为用户维度保存的选项
- ✅ 用户维度的自定义选项不被清除

**相关代码：**
- `clearAllFormData()` - 重置表单时保留用户维度的自定义选项

### 场景 4：登录/登出

**操作步骤：**
1. 用户以账号 A 登录，添加自定义选项 A1、A2
2. 用户登出
3. 用户以账号 B 登录
4. 用户添加自定义选项 B1、B2
5. 用户登出
6. 用户以账号 A 重新登录

**预期结果：**
- ✅ 账号 A 登录时，自定义选项为 A1、A2
- ✅ 账号 B 登录时，自定义选项为 B1、B2
- ✅ 账号 A 重新登录时，自定义选项仍为 A1、A2
- ✅ 登出时，本地缓存中的自定义选项被清除
- ✅ 登出后，新用户登录时拉取该用户的自定义选项

**相关代码：**
- `AuthContext.tsx` - 登录时调用 `initializeUserSettings()`，登出时调用 `clearAllUserSettings()`
- `userSettings.ts` - `initializeUserSettings()` 从 CloudBase 拉取用户设置

### 场景 5：跨标签页同步

**操作步骤：**
1. 用户在标签页 A 中添加自定义选项
2. 用户在标签页 B 中打开应用

**预期结果：**
- ✅ 标签页 B 中的自定义选项与标签页 A 同步
- ✅ 通过 localStorage 的 `storage` 事件实现跨标签页同步

**相关代码：**
- `userSettings.ts` - 使用 localStorage 作为本地缓存
- 跨标签页同步通过 `storage` 事件实现

## 测试清单

### 单元测试

- [ ] `getAllCustomTags()` 返回正确的自定义选项
- [ ] `saveCustomTags()` 同时保存到 localStorage 和 CloudBase
- [ ] `clearAllCustomTags()` 清除所有自定义选项
- [ ] `handleApplyTemplate()` 正确合并用户维度和模板选项
- [ ] `clearAllFormData()` 保留用户维度的自定义选项

### 集成测试

- [ ] 添加自定义选项后，刷新页面仍然存在
- [ ] 删除自定义选项后，刷新页面已被删除
- [ ] 应用模板后，模板中的临时选项不被保存
- [ ] 登出后，本地缓存被清除
- [ ] 登录新账号后，拉取该账号的自定义选项
- [ ] 跨标签页添加自定义选项，另一个标签页能同步

### 端到端测试

- [ ] 完整的用户流程：添加选项 → 应用模板 → 清除表单 → 验证选项
- [ ] 多用户场景：账号 A 的选项不会出现在账号 B 中
- [ ] 网络失败场景：网络失败时自动降级为本地缓存

## 实现细节

### 数据流向

```
用户操作（添加/删除自定义选项）
    ↓
handleAddCustomTag() / handleRemoveCustomTag()
    ↓
saveCustomTags()
    ↓
┌─────────────────────────────────────┐
│ localStorage (journal-custom-tags)  │ ← 立即生效
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ CloudBase (user_settings)           │ ← 异步同步
└─────────────────────────────────────┘
```

### 模板应用流程

```
用户点击「使用」模板
    ↓
handleApplyTemplate(template)
    ↓
获取用户维度的自定义选项：userCustomTags = getAllCustomTags()
    ↓
合并选项：
  1. 先加入用户维度的选项
  2. 再加入模板中有但用户维度没有的选项
    ↓
应用到当前表单：setAnswers({ ...template.answers, customTags: mergedCustomTags })
    ↓
重要：不保存合并后的选项到用户维度
```

### 清除表单流程

```
用户点击「清除全部」
    ↓
clearAllFormData()
    ↓
获取用户维度的自定义选项：userCustomTags = getAllCustomTags()
    ↓
重置表单：setAnswers({ ...defaultAnswers, customTags: userCustomTags })
    ↓
用户维度的自定义选项保持不变
```

## 常见问题

### Q1：为什么模板中的自定义选项不保存到用户维度？

**A：** 这是设计决策。模板中的选项是模板创建时的快照，不应该自动修改用户的个人选项库。用户可以手动添加喜欢的选项到用户维度。

### Q2：如果用户在应用模板后修改了自定义选项，会发生什么？

**A：** 修改会立即保存到用户维度。下一次创建新的生图任务时，自动使用用户维度的最新选项。

### Q3：如何确保多用户场景下的数据隔离？

**A：** 通过 CloudBase 的用户认证机制。每个用户的 `user_settings` 记录都关联到该用户的 ID，登出时清除本地缓存，登录时拉取该用户的数据。

### Q4：网络失败时会发生什么？

**A：** 自动降级为本地缓存。`saveCustomTags()` 会先保存到 localStorage（立即生效），然后异步同步到 CloudBase（失败时静默处理）。

## 修复总结

### 修复前的问题

1. **模板选项覆盖用户维度选项** - 应用模板时直接使用 `template.answers.customTags`，覆盖了用户维度的选项
2. **模板中的选项被保存到用户维度** - 应用模板后调用 `saveCustomTags(template.answers.customTags)`，导致模板选项被保存
3. **清除表单时丢失用户维度选项** - 清除表单时重置为 `defaultAnswers`，丢失了用户维度的自定义选项

### 修复后的改进

1. **合并策略** - 应用模板时合并用户维度和模板选项，而不是覆盖
2. **不保存策略** - 合并后的选项仅用于本次展示，不保存到用户维度
3. **保留策略** - 清除表单时保留用户维度的自定义选项

## 验证命令

```bash
# 查看 localStorage 中的自定义选项
localStorage.getItem('journal-custom-tags')

# 查看当前表单中的自定义选项
console.log(answers.customTags)

# 查看用户维度的自定义选项
import { getAllCustomTags } from './lib/customTagsStorage'
console.log(getAllCustomTags())
```

## 相关文件

- `src/App.tsx` - `handleApplyTemplate()`, `clearAllFormData()`, `handleAddCustomTag()`, `handleRemoveCustomTag()`
- `src/lib/customTagsStorage.ts` - 自定义标签存储的适配层
- `src/lib/userSettings.ts` - 用户设置的云端同步
- `src/components/EditableTagGroup.tsx` - 自定义标签编辑组件
- `src/contexts/AuthContext.tsx` - 用户认证和数据同步

## 更新日期

- 2024-01-XX：初始版本
- 修复内容：自定义选项的合并策略和保留策略
