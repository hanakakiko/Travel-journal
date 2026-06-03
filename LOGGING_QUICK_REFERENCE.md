# 日志系统快速参考

## 日志前缀对照表

| 前缀 | 含义 | 模型 |
|------|------|------|
| `[GPT-2]` | GPT-2 模型日志 | Kratos API (gpt2) |
| `[FLUX.2 [pro]]` | FLUX.2 [pro] 模型日志 | Replicate API |
| `[Model]` | 通用模型日志 | 向后兼容 |

## 常见日志模式

### 1. 请求开始
```
[GPT-2] 开始调用 GPT-2 API...
[GPT-2]   prompt 长度: 2847 字符
[GPT-2]   参考图数量: 2 张
```

### 2. 发送请求
```
[GPT-2] request → /kratos/ads/materialcenter/doaction
[GPT-2]   modelType: gpt2
[GPT-2]   prompt: 任务：基于我提供的 2 张参考图片...
[GPT-2]   imageUrls: 2 张图片
[GPT-2]   targetWidth: 1024
[GPT-2]   targetHeight: 1536
[GPT-2] === 完整请求体 ===
[GPT-2] { ... JSON ... }
```

### 3. 接收响应
```
[GPT-2] ← response { code: 0, data: { ... } }
[GPT-2] === 完整响应体 ===
[GPT-2] { ... JSON ... }
```

### 4. 重试过程
```
[GPT-2] × attempt 1/3 failed { retryable: true, isLast: false, message: "..." }
[GPT-2] … waiting 1500ms before next retry
[GPT-2] × attempt 2/3 failed { retryable: true, isLast: false, message: "..." }
[GPT-2] … waiting 3000ms before next retry
[GPT-2] ✓ succeeded on attempt 3/3
```

### 5. 成功完成
```
[GPT-2] ✓ GPT-2 API 调用成功
```

### 6. 失败处理
```
[GPT-2] × call failed Error: GPT-2 接口返回 HTTP 500
```

## 日志符号说明

| 符号 | 含义 |
|------|------|
| `→` | 发送请求 |
| `←` | 接收响应 |
| `✓` | 成功 |
| `×` | 失败 |
| `…` | 等待中 |
| `===` | 完整数据块分隔符 |

## 在浏览器控制台中搜索

### 按模型搜索
- 搜索 `[GPT-2]` - 只看 GPT-2 的日志
- 搜索 `[FLUX.2 [pro]]` - 只看 FLUX.2 的日志

### 按操作搜索
- 搜索 `request →` - 查看所有请求
- 搜索 `← response` - 查看所有响应
- 搜索 `attempt` - 查看所有重试
- 搜索 `✓` - 查看所有成功
- 搜索 `×` - 查看所有失败

### 按内容搜索
- 搜索 `=== 完整请求体 ===` - 查看完整请求 JSON
- 搜索 `=== 完整响应体 ===` - 查看完整响应 JSON
- 搜索 `=== 完整状态响应体 ===` - 查看 FLUX.2 的轮询状态

## 日志启用/禁用

日志系统自动根据环境变量控制：

```typescript
const DEBUG_ENABLED = import.meta.env.DEV;
```

- **开发模式**（`npm run dev`）：日志启用 ✓
- **生产模式**（`npm run build`）：日志禁用 ✗

## 添加自定义日志

如果需要在代码中添加自定义日志：

```typescript
// 导入日志函数
import { createModelLogger } from "./modelClient";

// 创建特定模型的日志函数
const glog = createModelLogger("GPT-2");

// 使用日志
glog("这是一条 GPT-2 的日志");
glog("支持多个参数", { key: "value" });
```

## 常见问题排查

### 问题：看不到日志
**解决**：
1. 确保在开发模式下运行（`npm run dev`）
2. 打开浏览器开发者工具（F12）
3. 切换到 Console 标签
4. 刷新页面

### 问题：日志太多，难以查找
**解决**：
1. 在控制台搜索框中输入模型名称（如 `[GPT-2]`）
2. 或搜索特定操作（如 `request →`）
3. 或搜索特定符号（如 `×` 查看失败）

### 问题：想看完整的请求/响应 JSON
**解决**：
1. 搜索 `=== 完整请求体 ===` 或 `=== 完整响应体 ===`
2. 查看下面的 JSON 数据块
3. 可以在控制台中展开对象查看详细内容

## 性能提示

- 日志系统仅在开发模式下启用，不会影响生产环境性能
- 日志输出是同步的，大量日志可能会略微影响开发时的性能
- 如果日志过多，可以在浏览器控制台中使用搜索功能过滤
