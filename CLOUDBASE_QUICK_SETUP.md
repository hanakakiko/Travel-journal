# CloudBase V-API Key 快速设置指南

## 三步快速开始

### 步骤 1：在 CloudBase 创建云函数

1. 登录 [CloudBase 控制台](https://tcb.cloud.tencent.com)
2. 进入 **开发** → **云函数**
3. 点击 **新建函数**
4. 设置函数参数：
   - **函数名**：`getVApiKey`
   - **运行环境**：Node.js 16 或更新版本
   - **内存**：128 MB
   - **超时时间**：5 秒

### 步骤 2：部署云函数代码

在函数编辑器中，将 `getVApiKey.js` 的内容复制粘贴：

```javascript
'use strict';

exports.main = async (event, context) => {
  const apiKey = process.env.V_API_KEY;

  if (!apiKey) {
    return {
      code: -1,
      message: 'V_API_KEY 未在环境变量中配置',
      data: null,
    };
  }

  return {
    code: 0,
    message: '成功获取 V-API Key',
    data: {
      apiKey: apiKey,
      timestamp: new Date().toISOString(),
    },
  };
};
```

### 步骤 3：配置环境变量

1. 在云函数编辑器中找到 **环境变量** 部分
2. 添加新的环境变量：
   - **变量名**：`V_API_KEY`
   - **值**：`你的实际V-API密钥`
3. 点击 **保存并发布**

## 验证设置

### 在浏览器控制台测试

打开应用并打开开发者工具（F12），在 Console 中粘贴：

```javascript
// 测试 CloudBase 连接
import { getVApiKeyFromCloudFunction } from './lib/cloudbase.js';
const key = await getVApiKeyFromCloudFunction();
console.log('获取的 Key:', key ? '成功' : '失败');
```

### 检查日志

在 CloudBase 控制台的云函数日志中，应该看到：
- `[getVApiKey] 云函数被调用`
- `[getVApiKey] 成功返回 V-API Key`

## 工作原理

```
用户调用 V-API 模型
    ↓
检查用户提供的 API Key？
    ├─ 有 → 使用用户 Key ✓
    └─ 无 ↓
检查环境变量？
    ├─ 有 → 使用环境变量 Key ✓
    └─ 无 ↓
检查本地配置文件？
    ├─ 有 → 使用本地配置 Key ✓
    └─ 无 ↓
从 CloudBase 获取？
    ├─ 成功 → 使用 CloudBase Key ✓
    └─ 失败 → 抛出错误 ✗
```

## 文件位置参考

| 文件 | 说明 |
|-----|------|
| `src/lib/cloudbase.ts` | CloudBase 初始化，包含 `getVApiKeyFromCloudFunction()` 函数 |
| `src/lib/modelClient.ts` | 模型调用，已集成 API Key 获取逻辑 |
| `getVApiKey.js` | CloudBase 云函数代码示例 |
| `CLOUDBASE_V_API_KEY_SETUP.md` | 详细设置文档 |

## 修改了哪些代码

### 1. `src/lib/cloudbase.ts`（第 84-115 行）
添加了 `getVApiKeyFromCloudFunction()` 函数，用于调用 CloudBase 云函数获取 API Key。

### 2. `src/lib/modelClient.ts`
- 添加了导入：`import { getVApiKeyFromCloudFunction } from "./cloudbase";`
- 修改了 `callVApiGptImage2Once()` 函数（第 1360-1394 行）
  - 当用户未提供 API Key 时，自动调用 CloudBase 云函数
  - 添加了日志记录获取过程
- 修改了 `callVApiSeedream4Once()` 函数（第 1663-1687 行）
  - 同样的逻辑实现

## 故障排查

| 问题 | 原因 | 解决方案 |
|-----|------|--------|
| "V_API_KEY 未在环境变量中配置" | 云函数未配置环境变量 | 在 CloudBase 控制台添加 `V_API_KEY` 环境变量 |
| 权限拒绝错误 | 函数权限不足 | 检查 CloudBase 权限控制中的 `FunctionsHttpApiAllow` 是否启用 |
| 匿名登录失败 | CloudBase 认证配置错误 | 确保 CloudBase 环境 ID 正确：`my-travel-journal-d5d06m1a517f14` |
| 调用超时 | 云函数响应慢 | 检查云函数是否正常运行，查看 CloudBase 日志 |

## 安全建议

✅ **推荐做法**
- 在 CloudBase 环境变量中存储敏感的 API Key
- 不要在前端代码中硬编码密钥
- 定期轮换 API Key
- 监控云函数的调用日志

❌ **不要做的事**
- 在前端代码中暴露 API Key
- 使用过期的密钥
- 共享云函数的环境变量配置
- 允许任何人都能访问云函数

## 下一步

1. ✓ 已修改前端代码集成 CloudBase 获取逻辑
2. ⏳ 需要在 CloudBase 部署云函数
3. ⏳ 配置环境变量 `V_API_KEY`
4. ⏳ 测试端到端流程

## 相关链接

- [CloudBase 文档](https://docs.cloudbase.net/)
- [云函数 API 文档](https://docs.cloudbase.net/api-reference/webv3/functions)
- [权限控制文档](https://docs.cloudbase.net/guide/start/auth)
- CloudBase 控制台：https://tcb.cloud.tencent.com

---

**最后更新时间**：2026-06-06
**环境 ID**：`my-travel-journal-d5d06m1a517f14`
**函数名**：`getVApiKey`
