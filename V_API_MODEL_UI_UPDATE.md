# V-API 模型选择器 UI 更新说明

## 📝 快速概览

V-API 的两个模型（GPT Image 2 和 Seedream 4.5）现在即使未配置 API Key，也能在模型选择器中显示为可选状态，而不是灰化禁用。

## 🎯 用户体验变化

### 未配置 API Key 时

**之前：**
- 模型显示为灰色，无法点击
- 显示红色 "未配置" 标签
- Tooltip 提示 "未配置 xxx 的 API Key"

**现在：**
- 模型显示为正常状态，可以点击
- 显示灰色 "付费额度" 标签
- Tooltip 显示模型描述

### 已配置 API Key 时

无变化，行为和显示都保持不变。

## 💻 技术实现

### 修改的文件

#### 1. `src/lib/modelConfig.ts`

**修改 `hasApiKeyForModel()` 函数：**
- V-API 两个模型现在始终返回 `true`
- 原因：这些模型可以通过 CloudBase 云函数自动获取 API Key
- 其他模型行为不变

**新增 `hasDirectApiKeyForModel()` 函数：**
- 检查是否"直接"配置了 API Key（不考虑 CloudBase 后备）
- 用于判断是否显示 "付费额度" 标签

```typescript
export const hasApiKeyForModel = (modelType: ModelType): boolean => {
  // ... 检查直接配置的 Key ...
  
  // V-API 模型即使没有直接配置也认为可用
  if (modelType === "v-api-gpt-image-2" || modelType === "v-api-seedream-4-5") {
    return true;
  }

  return false;
};

export const hasDirectApiKeyForModel = (modelType: ModelType): boolean => {
  // ... 只检查直接配置的 Key ...
};
```

#### 2. `src/App.tsx`

**导入添加：**
```typescript
import { hasDirectApiKeyForModel, ... } from "./lib/modelConfig";
```

**模型按钮 UI 逻辑修改（第 1495-1514 行）：**
```typescript
const hasDirectConfig = hasDirectApiKeyForModel(modelId);
const isVApiModel = modelId === "v-api-gpt-image-2" || modelId === "v-api-seedream-4-5";

<button
  // ... 其他属性 ...
  className={classNames(
    answers.selectedModel === modelId && "is-active",
    !hasDirectConfig && isVApiModel && "is-cloud-enabled"  // 新增
  )}
  disabled={!hasConfig}  // 保留（hasConfig 对 V-API 始终为 true）
  title={config.description}
>
  {config.name}
  {!hasDirectConfig && isVApiModel && <span className="model-unconfigured-badge">付费额度</span>}
</button>
```

## 🔄 工作流程

### 用户未配置 API Key 的流程

```
1. 用户打开应用
   ↓
2. 看到 V-API 两个模型显示"付费额度"，可以点击
   ↓
3. 用户选择其中一个 V-API 模型
   ↓
4. 用户点击"生成"按钮
   ↓
5. 系统调用 modelClient.ts 中的函数
   ├─ 检查用户提供的 API Key ✗ (无)
   ├─ 检查环境变量 ✗ (无)
   ├─ 检查本地配置文件 ✗ (无)
   └─ 从 CloudBase 云函数获取 API Key ✓ (成功)
   ↓
6. 使用获取的 API Key 调用 V-API 接口
   ↓
7. 生成图片并显示
```

## 🔐 安全性考虑

1. **API Key 不暴露在前端**：从 CloudBase 云函数获取，不在浏览器存储
2. **用户配置优先**：如果用户配置了 API Key，优先使用用户的配置
3. **错误处理**：如果 CloudBase 不可用，系统会抛出清晰的错误信息

## ⚙️ 配置要求

为了使 V-API 模型在未配置时也能正常工作，需要：

1. **在 CloudBase 部署 `getVApiKey` 云函数**
   - 参考：`getVApiKey.js`

2. **配置环境变量 `V_API_KEY`**
   - 在 CloudBase 云函数中设置

3. **验证权限配置**
   - 确保前端应用有权调用云函数

详见：[CLOUDBASE_QUICK_SETUP.md](./CLOUDBASE_QUICK_SETUP.md)

## ✅ 兼容性

- ✅ 向后兼容，不影响其他模型
- ✅ 已配置 API Key 的用户不受影响
- ✅ 编译验证通过，无错误

## 📊 相关修改汇总

| 文件 | 修改内容 | 行号 |
|------|---------|------|
| `src/lib/modelConfig.ts` | 更新 `hasApiKeyForModel()` 函数 | 140-168 |
| `src/lib/modelConfig.ts` | 新增 `hasDirectApiKeyForModel()` 函数 | 170-187 |
| `src/App.tsx` | 导入 `hasDirectApiKeyForModel` | 49 |
| `src/App.tsx` | 修改模型选择器 UI 逻辑 | 1495-1514 |

## 🚀 后续步骤

1. 在 CloudBase 部署 `getVApiKey` 云函数
2. 配置环境变量 `V_API_KEY`
3. 测试 V-API 两个模型的使用
4. 监控 CloudBase 云函数的调用日志

## 📝 常见问题

**Q: 为什么显示"付费额度"而不是"免费"？**
A: 因为这需要付费 API Key。"付费额度"只是提示有这个付费选项可用。

**Q: 如果 CloudBase 没有配置会怎样？**
A: 用户点击生成后，系统会抛出错误提示 "V_API_KEY 未在环境变量中配置"。

**Q: 已配置的 API Key 会被使用吗？**
A: 会的。用户配置的 API Key 优先级最高，会优先使用。

**Q: 其他模型的行为变了吗？**
A: 没有。只有 V-API 的两个模型受到影响。

---

**更新日期**：2026-06-06
**相关文档**：[CLOUDBASE_QUICK_SETUP.md](./CLOUDBASE_QUICK_SETUP.md)
