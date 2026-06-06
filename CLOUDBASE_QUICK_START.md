# CloudBase 云端同步快速开始

## 📋 5 分钟快速配置

### 第 1 步：CloudBase 控制台初始化（2 分钟）

1. 访问 [腾讯云 CloudBase 控制台](https://tcb.cloud.tencent.com/dev)

2. 选择环境：**my-travel-journal-d5d06m1a517f14**

3. **数据库 → 新建集合**，依次创建两个集合：
   - **集合 1**: `journal_templates`
   - **集合 2**: `user_settings`

4. **登录方式 → 匿名登录**，点击「启用」

5. **数据库 → 访问管理 → journal_templates**
   - 切换到「自定义安全规则」标签页
   - 粘贴以下规则：
   ```json
   {
     "read": "auth.uid != null",
     "write": "doc.uid == auth.uid"
   }
   ```
   - **保存**

6. **重复第 5 步**，为 `user_settings` 集合配置相同安全规则

✅ **检查**: 控制台能看到两个集合，且匿名登录已启用

---

### 第 2 步：本地开发测试（3 分钟）

```bash
# 1. 安装依赖（如果尚未安装）
npm install

# 2. 启动开发服务器
npm run dev

# 3. 打开浏览器
# 访问 http://localhost:5173/
```

**验证云端连接**：
- 打开浏览器开发者工具 → Application → LocalStorage
- 刷新页面，观察以下行为：
  - 应出现 `_cloudbase_openid` 字段（用户 uid）
  - 应出现 `journal-custom-tags`、`exif-user-api-config` 等缓存字段
  - 控制台无异常错误

✅ **云端连接成功**

---

### 第 3 步：测试数据同步（2 分钟）

#### 测试自定义标签同步
1. 在页面中添加自定义标签（例如在选择「情绪」时新增标签）
2. 打开浏览器 LocalStorage，验证 `journal-custom-tags` 已更新
3. 登录 CloudBase 控制台 → 数据库 → `user_settings`，查看是否出现新文档

#### 测试模板同步
1. 生成一个手帐后，点击「保存选项」保存模板
2. 打开浏览器 LocalStorage，验证 `journal-templates` 已更新
3. 登录 CloudBase 控制台 → 数据库 → `journal_templates`，查看是否出现新文档

✅ **数据同步正常**

---

## 🔧 常见场景

### 场景 1：用户丢失 API Key 后，登录新设备恢复配置

```
Device A (旧设备):
  - 配置了 FLUX.2 Pro 的 API Key
  - 保存了 3 个模板
  - 启用了声音

Device B (新设备):
  - 打开应用 → 自动登录
  - 自动加载用户设置（API Key + 声音）
  - 自动加载 3 个模板
  
✅ 无需重新配置，所有数据已同步
```

### 场景 2：编辑 API Key 时网络中断

```
操作: 修改 FLUX.2 Pro 的 API Key
    ↓
① 本地立即保存 ✓
    ↓
② 尝试上传云端 → 网络超时 ✗
    ↓
③ 静默失败，但本地已保存
    ↓
用户可继续使用新 Key 生成图片（离线模式）
网络恢复后，下次操作自动同步到云端
```

### 场景 3：跨浏览器 Tab 同步

```
Tab A (生成页面):
  - 用户保存一个模板
  - 本地 + 云端同步 ✓

Tab B (列表页面):
  - LocalStorage 变化事件触发
  - 自动加载新模板列表 ✓
  
✅ 同一浏览器的多个 Tab 保持实时同步
```

---

## 🐛 故障排查

### ❓ 问题：应用启动后无法登录

**检查清单**：
- [ ] CloudBase 环境 ID 是否正确：`my-travel-journal-d5d06m1a517f14`
- [ ] 是否启用了「匿名登录」
- [ ] 浏览器是否允许 LocalStorage（不是隐身模式）

**解决**：
```javascript
// 在浏览器控制台中手动测试登录
await cloudbase.init({ env: 'my-travel-journal-d5d06m1a517f14' })
  .auth()
  .signInAnonymously();
```

---

### ❓ 问题：集合中无法查看或写入数据

**检查清单**：
- [ ] 集合是否存在（控制台能看到）
- [ ] 安全规则是否正确配置
- [ ] 是否已启用匿名登录

**解决**：
1. 删除该集合并重新创建
2. 在创建后立即配置安全规则
3. 刷新页面重试

---

### ❓ 问题：模板或设置在两个设备上不同步

**检查清单**：
- [ ] 两个设备的用户 uid 是否相同？
  ```javascript
  // 在浏览器控制台中查看
  JSON.parse(localStorage.getItem('_cloudbase_openid'))
  ```
- [ ] 两个设备是否都已连接互联网
- [ ] CloudBase 控制台中是否能看到数据

**解决**：
1. 如果 uid 不同，这是正常现象（每个设备是独立用户）
2. 需要通过邮箱/手机号登录来实现真正的跨设备同步（后期功能）
3. 目前的匿名登录针对单设备/同浏览器的多 Tab

---

### ❓ 问题：浏览器开发者工具中看不到 `_cloudbase_openid`

**原因**：匿名登录还未完成

**解决**：
```javascript
// 在浏览器控制台中手动触发登录
await cloudbase.init({ env: 'my-travel-journal-d5d06m1a517f14' })
  .auth()
  .signInAnonymously()
  .then(() => {
    // 刷新页面
    location.reload();
  });
```

---

## 📊 监控与性能

### 实时监控数据库
```
CloudBase 控制台 → 环境 → 数据库 → 监控
  - 实时请求数
  - 文档数量
  - 存储大小
  - 错误日志
```

### 本地性能检查
```javascript
// 在浏览器控制台中查看
console.log(JSON.stringify(localStorage, null, 2));

// 计算缓存大小
const size = Object.keys(localStorage)
  .reduce((sum, key) => sum + localStorage[key].length, 0);
console.log(`LocalStorage 大小: ${(size / 1024).toFixed(2)} KB`);
```

---

## 📚 文档索引

- **完整指南**: 见 [`CLOUDBASE_INTEGRATION_GUIDE.md`](./CLOUDBASE_INTEGRATION_GUIDE.md)
- **模块 API**:
  - `userSettings.ts` — 用户设置统一管理
  - `templateManager.ts` — 模板云端同步
  - `cloudbase.ts` — CloudBase 核心初始化
- **官方文档**: https://docs.cloudbase.net/

---

## ✅ 验收清单

- [ ] CloudBase 环境已初始化
- [ ] 两个集合已创建：`journal_templates`, `user_settings`
- [ ] 安全规则已配置
- [ ] 匿名登录已启用
- [ ] 应用可成功启动
- [ ] LocalStorage 中出现 `_cloudbase_openid`
- [ ] 模板保存功能正常
- [ ] 自定义标签同步正常
- [ ] 跨设备/跨 Tab 数据同步正常

✅ **完成以上所有步骤后，云端同步系统已就绪**

---

## 🚀 下一步

- 部署应用到生产环境
- 监控 CloudBase 控制台的数据增长
- 根据用户反馈优化数据结构
- 考虑添加用户账户系统（邮箱/手机号登录）以实现真正的跨设备同步

