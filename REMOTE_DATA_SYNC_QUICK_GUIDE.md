# 远端数据同步 - 快速参考指南

## 问题解决总结

✅ **"保存的模板"现在跟随用户账号**
- 存储在 CloudBase 远端数据库
- 每次登录时从云端拉取最新数据
- 登出时清理本地缓存

✅ **"告诉小兔今天想留下什么"的自定义选项现在跟随用户账号**
- 存储在 CloudBase 远端数据库
- 每次登录时从云端拉取最新数据
- 登出时清理本地缓存

✅ **用户切换账号时数据完全隔离**
- 用户 A 的数据在用户 B 登录后完全不可见
- 本地缓存被新用户的数据覆盖

✅ **登出时清理本地缓存**
- 防止其他人看到前一个用户的数据
- 包括模板、自定义选项、API 配置等

## 核心改动

### 1. 模板管理 (`src/lib/templateManager.ts`)

```typescript
// 新增：清理本地缓存（登出时调用）
export const clearLocalCache = (): void => {
  localClear();
};
```

### 2. 用户设置 (`src/lib/userSettings.ts`)

```typescript
// 新增：清理所有本地设置（登出时调用）
export function clearAllLocalSettings(): void {
  localSaveField(CUSTOM_TAGS_KEY, null);
  localSaveField(API_CONFIG_KEY, null);
  localSaveField(SOUND_ENABLED_KEY, null);
}
```

### 3. 认证流程 (`src/contexts/AuthContext.tsx`)

**登录成功后：** 拉取远端数据
```typescript
// 登录成功后，从云端拉取用户设置和模板
await Promise.all([
  initializeUserSettings(),
  getAllTemplatesAsync(),
]);
```

**登出时：** 清理本地缓存
```typescript
// 清理用户设置和模板的本地缓存
clearAllLocalSettings();
clearTemplateCache();
```

### 4. 应用初始化 (`src/App.tsx`)

**监听用户变化：** 当用户 ID 变化时重新拉取数据
```typescript
useEffect(() => {
  if (!user) return;
  
  // 用户已登录，从云端拉取最新的设置和模板
  void Promise.all([
    initializeUserSettings(),
    getAllTemplatesAsync(),
  ]);
}, [user?.id]);
```

## 数据流程

### 用户登录
```
用户输入邮箱 → 验证 OTP → 登录成功
                              ↓
                    从云端拉取用户数据
                    - 模板列表
                    - 自定义选项
                    - 声音设置
                              ↓
                    覆盖本地 localStorage
                              ↓
                    显示用户的模板和选项
```

### 用户保存模板
```
用户点击保存 → 本地立即保存 → UI 立即显示
                              ↓
                    异步上传到云端
                    (网络失败时静默处理)
```

### 用户登出
```
用户点击登出 → 清理 CloudBase 会话
                              ↓
                    清理本地 localStorage
                    - 删除模板缓存
                    - 删除自定义选项
                    - 删除 API 配置
                              ↓
                    显示认证页面
```

### 用户切换账号
```
用户 A 登出 → 清理本地缓存
                              ↓
用户 B 登录 → 从云端拉取用户 B 的数据
                              ↓
            覆盖本地 localStorage
                              ↓
            显示用户 B 的模板和选项
```

## 存储策略

### 云端存储（CloudBase）
- **journal_templates** 集合：保存的模板
- **user_settings** 集合：用户设置（自定义选项、API 配置、声音设置）
- 所有数据通过 `uid` 字段进行用户隔离

### 本地缓存（localStorage）
- **journal-templates**：模板列表缓存
- **journal-custom-tags**：自定义选项缓存
- **exif-user-api-config**：API 配置缓存
- **journal-sound**：声音设置缓存

### 缓存策略
- **读取**：优先读本地缓存（快速）
- **写入**：本地立即写入，异步同步到云端
- **同步**：登录时从云端拉取，覆盖本地缓存
- **清理**：登出时删除所有本地缓存

## 网络异常处理

### 登录时网络失败
- 使用本地缓存（如果有的话）
- 不阻断登录流程
- 日志记录警告信息

### 保存数据时网络失败
- 本地已保存，UI 立即显示
- 异步重试上传到云端
- 用户无感知

### 登出时网络失败
- 仍然清理本地缓存
- 仍然清理 CloudBase 会话
- 确保数据隐私

## 测试场景

### ✅ 单用户场景
1. 用户登录
2. 保存模板
3. 添加自定义选项
4. 刷新页面 → 数据仍然存在
5. 登出 → 本地缓存被清理

### ✅ 多用户场景
1. 用户 A 登录，保存模板 A
2. 用户 A 登出
3. 用户 B 登录 → 看不到模板 A
4. 用户 B 保存模板 B
5. 用户 B 登出
6. 用户 A 重新登录 → 看到模板 A，看不到模板 B

### ✅ 网络异常场景
1. 登录时断网 → 使用本地缓存
2. 保存模板时断网 → 本地已保存，UI 显示
3. 登出时断网 → 仍然清理本地缓存

## 常见问题

### Q: 为什么登出后本地缓存要清理？
A: 防止其他人在同一台设备上看到前一个用户的数据。这是安全最佳实践。

### Q: 如果网络一直不好怎么办？
A: 本地缓存会保留，用户可以继续使用。当网络恢复时，数据会自动同步到云端。

### Q: 在多个浏览器标签页登录会怎样？
A: 每个标签页都会独立拉取云端数据，保持同步。

### Q: 如果用户在多个设备同时编辑怎么办？
A: 目前采用"最后写入获胜"策略。未来可以添加冲突解决机制。

### Q: 本地缓存和云端数据不一致怎么办？
A: 登录时会从云端拉取最新数据，覆盖本地缓存，确保一致性。

## 相关文件

| 文件 | 用途 |
|------|------|
| [`src/lib/templateManager.ts`](src/lib/templateManager.ts) | 模板管理和本地缓存清理 |
| [`src/lib/userSettings.ts`](src/lib/userSettings.ts) | 用户设置和本地缓存清理 |
| [`src/contexts/AuthContext.tsx`](src/contexts/AuthContext.tsx) | 认证流程和数据同步 |
| [`src/App.tsx`](src/App.tsx) | 应用初始化和用户变化监听 |
| [`REMOTE_DATA_SYNC_IMPLEMENTATION.md`](REMOTE_DATA_SYNC_IMPLEMENTATION.md) | 详细实现文档 |

## 下一步

1. **测试**：按照测试清单逐一验证
2. **监控**：观察日志中的数据同步情况
3. **优化**：根据实际使用情况优化同步策略
4. **文档**：更新用户文档说明数据同步机制
