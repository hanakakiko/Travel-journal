# 日志系统升级总结

## 概述

将原来的 Kratos 特定日志系统升级为通用的模型日志系统，支持多个模型（GPT-2、FLUX.2 [pro]）的统一日志管理。

## 主要改进

### 1. 通用日志函数

**之前**：
```typescript
const klog = (...args: unknown[]) => {
  if (KRATOS_DEBUG) console.info("[Kratos]", ...args);
};
```

**现在**：
```typescript
const createModelLogger = (modelName: string) => {
  return (...args: unknown[]) => {
    if (DEBUG_ENABLED) console.info(`[${modelName}]`, ...args);
  };
};

// 使用方式
const glog = createModelLogger("GPT-2");
const flog = createModelLogger("FLUX.2 [pro]");
```

### 2. 日志前缀统一

所有模型的日志现在都使用实际的模型名称作为前缀：
- `[GPT-2]` - GPT-2 模型的日志
- `[FLUX.2 [pro]]` - FLUX.2 [pro] 模型的日志
- `[Model]` - 通用模型日志（向后兼容）

### 3. 日志内容完整性

每个模型的调用现在都包含以下日志：

#### 请求阶段
```
[GPT-2] request → /kratos/ads/materialcenter/doaction
[GPT-2]   modelType: gpt2
[GPT-2]   prompt: 任务：基于我提供的 2 张参考图片，生成一张「巴西五日游」主题的手帐拼贴图。...
[GPT-2]   imageUrls: 2 张图片
[GPT-2]   targetWidth: 1024
[GPT-2]   targetHeight: 1536
[GPT-2] === 完整请求体 ===
[GPT-2] {
[GPT-2]   "tabName": "material_analysis_tab",
[GPT-2]   "actionCode": "UnifiedPic2PicAction",
[GPT-2]   ...
[GPT-2] }
```

#### 响应阶段
```
[GPT-2] ← response { code: 0, data: { ... } }
[GPT-2] === 完整响应体 ===
[GPT-2] {
[GPT-2]   "code": 0,
[GPT-2]   "data": { ... }
[GPT-2] }
```

#### 重试阶段
```
[GPT-2] × attempt 1/3 failed { retryable: true, isLast: false, message: "..." }
[GPT-2] … waiting 1500ms before next retry
[GPT-2] ✓ succeeded on attempt 2/3
```

#### 高层调用
```
[GPT-2] 开始调用 GPT-2 API...
[GPT-2]   prompt 长度: 2847 字符
[GPT-2]   参考图数量: 2 张
[GPT-2] ✓ GPT-2 API 调用成功
```

### 4. 修改的文件

#### `src/lib/modelClient.ts`

**日志系统部分**（第 6-24 行）：
- 创建 `createModelLogger()` 函数
- 保留 `klog()` 作为向后兼容的通用日志函数

**GPT-2 实现部分**：
- `callKratosUnifiedPic2PicOnce()` - 单次调用日志
- `callKratosUnifiedPic2Pic()` - 重试逻辑日志
- 所有错误消息从 `[Kratos]` 改为 `[GPT-2]`

**FLUX.2 实现部分**：
- `callFlux2ProPic2PicOnce()` - 单次调用日志
- `callFlux2ProPic2Pic()` - 重试逻辑日志
- 所有日志前缀为 `[FLUX.2 [pro]]`

**高层调用部分**：
- `requestJournalDraft()` - 添加了模型选择和调用开始/结束的日志

## 使用示例

### 在浏览器控制台中查看日志

开发模式下（`npm run dev`），打开浏览器开发者工具的 Console 标签，可以看到：

```
[GPT-2] 开始调用 GPT-2 API...
[GPT-2]   prompt 长度: 2847 字符
[GPT-2]   参考图数量: 2 张
[GPT-2] request → /kratos/ads/materialcenter/doaction
[GPT-2]   modelType: gpt2
[GPT-2]   prompt: 任务：基于我提供的 2 张参考图片...
[GPT-2]   imageUrls: 2 张图片
[GPT-2]   targetWidth: 1024
[GPT-2]   targetHeight: 1536
[GPT-2] === 完整请求体 ===
[GPT-2] { tabName: "material_analysis_tab", ... }
[GPT-2] ← response { code: 0, data: { ... } }
[GPT-2] === 完整响应体 ===
[GPT-2] { code: 0, data: { ... } }
[GPT-2] ✓ GPT-2 API 调用成功
```

### 添加新的模型

如果需要添加新的模型（例如 Claude），只需：

```typescript
const clog = createModelLogger("Claude");
clog("request →", endpoint);
clog("← response", payload);
```

## 向后兼容性

- 原有的 `klog()` 函数仍然可用，但现在使用 `[Model]` 前缀
- 所有现有的日志调用都已更新为使用特定模型的日志函数
- 不会对现有功能造成任何破坏

## 调试建议

1. **查看完整请求体**：搜索 `=== 完整请求体 ===` 可以看到发送给 API 的完整 JSON
2. **查看完整响应体**：搜索 `=== 完整响应体 ===` 可以看到 API 返回的完整 JSON
3. **追踪重试过程**：搜索 `attempt` 可以看到所有的重试尝试
4. **按模型过滤**：在控制台搜索 `[GPT-2]` 或 `[FLUX.2 [pro]]` 可以只看特定模型的日志

## 性能影响

- 日志系统仅在开发模式（`import.meta.env.DEV`）下启用
- 生产环境中不会有任何日志输出，不会影响性能
- 日志函数创建是轻量级的，不会造成性能问题
