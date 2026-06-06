# CloudBase V-API Key 自动获取设置指南

## 概述

此功能允许在用户未提供 API Key 时，自动从 CloudBase 云函数环境变量中获取 V-API Key。这样可以隐藏敏感信息，并在服务端安全地管理密钥。

## 功能流程

当用户调用 V-API GPT Image 2 或 V-API Seedream 4.5 模型时：

1. 优先使用用户在 UI 中提供的 API Key
2. 其次使用环境变量 `VITE_V_API_GPT_IMAGE_2_API_KEY` 或 `VITE_V_API_SEEDREAM_4_5_API_KEY`
3. 再次使用本地配置文件中的 API Key
4. **最后** 从 CloudBase 云函数环境变量中获取 `V_API_KEY`

## 部署步骤

### 1. 在 CloudBase 创建云函数

在腾讯云 CloudBase 平台创建一个名为 `getVApiKey` 的云函数。

**函数配置：**
- 函数名：`getVApiKey`
- 运行环境：Node.js（推荐 16.x 或更新版本）
- 内存：128MB
- 超时时间：5 秒

### 2. 部署云函数代码

**Node.js 实现（推荐）：**

```javascript
'use strict';

exports.main = async (event, context) => {
  // 从环境变量中获取 V-API Key
  const apiKey = process.env.V_API_KEY;

  // 如果没有配置 Key，返回错误
  if (!apiKey) {
    return {
      code: -1,
      message: 'V_API_KEY 未在环境变量中配置',
      data: null,
    };
  }

  // 返回成功结果
  return {
    code: 0,
    message: '成功获取 V-API Key',
    data: {
      apiKey: apiKey,
    },
  };
};
```

### 3. 配置环境变量

在 CloudBase 云函数的环境变量配置中添加：

| 环境变量名 | 值 | 说明 |
|----------|-----|------|
| `V_API_KEY` | `your-v-api-key-here` | 替换为实际的 V-API Key |

### 4. 配置权限

确保云函数有权限被前端应用调用。在 CloudBase 控制台中检查权限配置：

- 进入 **身份认证/权限控制**
- 确认 `FunctionsHttpApiAllow` 策略已启用
- 匿名用户应有权调用此云函数

详细说明：[权限控制文档](/identity/auth-control/detail?roleIdentity=registerUser&tab=strategy)

### 5. 前端代码集成

前端代码已自动集成，无需额外操作。当用户未提供 API Key 时，系统会：

1. 调用 CloudBase 匿名登录
2. 调用 `getVApiKey` 云函数
3. 使用返回的 API Key 进行后续 API 调用

## 工作流程详解

### 获取 API Key 的过程

```typescript
// 在 cloudbase.ts 中
export async function getVApiKeyFromCloudFunction(): Promise<string | null> {
  try {
    const app = getApp();
    
    // 1. 确保用户已匿名登录
    await ensureAnonymousLogin();
    
    // 2. 调用云函数
    const result = await app.callFunction({
      name: "getVApiKey",
      data: {},
    });
    
    // 3. 检查返回值
    if (result?.result?.code === 0 && result.result?.data?.apiKey) {
      return result.result.data.apiKey;
    }
    
    return null;
  } catch (error) {
    console.error("从 CloudBase 获取 V-API Key 失败:", error);
    return null;
  }
}
```

### 模型调用的 Key 获取逻辑

```typescript
// 在 modelClient.ts 中，以 V-API GPT Image 2 为例
const vlog = createModelLogger("V-API GPT Image 2");

// 优先级 1: 用户提供的 API Key
const userConfigs = loadUserApiConfig();
const userVApiConfig = userConfigs?.["v-api-gpt-image-2"];
let apiKey = userVApiConfig?.apiKey || getApiKey("VITE_V_API_GPT_IMAGE_2_API_KEY");

// 优先级 2-3: 环境变量或本地配置已在上面处理

// 优先级 4: CloudBase 云函数
if (!apiKey) {
  vlog("正在从 CloudBase 获取 V-API Key...");
  const cloudbaseApiKey = await getVApiKeyFromCloudFunction();
  if (cloudbaseApiKey) {
    apiKey = cloudbaseApiKey;
    vlog("✓ 成功从 CloudBase 获取 V-API Key");
  }
}

// 如果最终没有 Key，抛出错误
if (!apiKey) {
  throw new Error("V-API GPT Image 2 API Key 未配置...");
}
```

## 安全建议

1. **不要在代码中硬编码 API Key**：使用环境变量管理敏感信息
2. **限制云函数访问**：配置合适的权限策略，仅允许必要的访问
3. **监控 API 调用**：在 CloudBase 控制台监控云函数的调用日志
4. **轮换密钥**：定期更新 V-API Key
5. **使用 HTTPS**：所有通信都应通过加密连接

## 故障排查

### 问题 1: 云函数调用失败

**症状：** 出现 "从 CloudBase 获取 V-API Key 失败" 错误

**解决方案：**
1. 检查 CloudBase 环境 ID 是否正确（应为 `my-travel-journal-d5d06m1a517f14`）
2. 确认云函数 `getVApiKey` 已部署
3. 检查环境变量 `V_API_KEY` 是否已配置
4. 查看 CloudBase 控制台的日志，获取更多错误信息

### 问题 2: 权限拒绝

**症状：** 调用云函数时出现权限错误

**解决方案：**
1. 登录 CloudBase 控制台
2. 进入 **身份认证/权限控制**
3. 确认策略中 `FunctionsHttpApiAllow` 已启用
4. 对匿名用户授予调用权限

### 问题 3: 环境变量未被读取

**症状：** 云函数返回错误 "V_API_KEY 未在环境变量中配置"

**解决方案：**
1. 重新部署云函数
2. 确认环境变量已正确设置（区分大小写）
3. 重启云函数或重新发布版本

## 测试

可以在浏览器控制台测试，打开开发者工具并查看日志输出：

```javascript
// 手动测试（在浏览器控制台）
import { getVApiKeyFromCloudFunction } from './lib/cloudbase';
const key = await getVApiKeyFromCloudFunction();
console.log('获取的 API Key:', key);
```

## 相关文件

- `src/lib/cloudbase.ts` - CloudBase 初始化和云函数调用
- `src/lib/modelClient.ts` - 模型 API 调用（集成了 Key 获取逻辑）
- CloudBase 文档：https://docs.cloudbase.net/api-reference/webv3/functions

## 常见问题（FAQ）

**Q: 为什么需要从 CloudBase 获取 Key？**
A: 这样可以避免在前端代码中暴露敏感的 API Key，同时支持动态更新 Key 而无需修改代码。

**Q: 如果 CloudBase 不可用怎么办？**
A: 系统会继续使用其他来源的 Key（环境变量、本地配置、用户输入）。只有都不可用时才会调用云函数。

**Q: 调用云函数会产生额外费用吗？**
A: CloudBase 的免费套餐包含一定额度的云函数调用，通常足以满足大多数应用的需求。具体费用请查看 CloudBase 定价。

**Q: 如何定期轮换 API Key？**
A: 只需在 CloudBase 控制台更新环境变量 `V_API_KEY` 的值，无需修改或重新部署前端应用。

