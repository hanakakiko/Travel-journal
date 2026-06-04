# QS GPT Image 2 请求格式对比分析

## 🔴 发现的关键问题

你提供的参考 curl 命令和当前代码的请求格式完全不同！

## 📊 详细对比

### 1. **认证方式**

| 项目 | 参考 curl | 当前代码 | 问题 |
|------|---------|--------|------|
| Header 名称 | `api-key` | `Authorization` | ❌ 不同 |
| Header 值 | `QST30bfa2e...` | `Bearer QST30bfa2e...` | ❌ 格式不同 |

**参考 curl：**
```bash
--header 'api-key: QST30bfa2e5f00da0a05e51e07096c2603b'
```

**当前代码：**
```typescript
"Authorization": `Bearer ${apiKey}`
```

### 2. **请求体格式**

| 项目 | 参考 curl | 当前代码 | 问题 |
|------|---------|--------|------|
| Content-Type | `application/json` | `multipart/form-data` | ❌ 完全不同 |
| 请求体 | JSON 对象 | 二进制 multipart | ❌ 格式不同 |
| 图片处理 | 不包含图片 | 包含图片 Blob | ⚠️ 不同用途 |

**参考 curl（JSON 格式）：**
```bash
--header 'Content-Type: application/json' \
--data '{
  "model":"gpt-image-2",
  "prompt": "一张小狗图片",
  "n": 1,
  "size": "1024x1024",
  "quality": "medium",
  "output_format": "jpeg",
  "output_compression": 80
}'
```

**当前代码（multipart/form-data 格式）：**
```typescript
--form 'image=@"<image-file-path>"'
--form 'prompt="..."'
--form 'model="gpt-image-2"'
--form 'size=""'
--form 'response_format=""'
```

### 3. **端点路径**

| 项目 | 参考 curl | 当前代码 | 说明 |
|------|---------|--------|------|
| 路径 | `/openai/openai/images/generations` | `/openai/openai/images/edits` | ❌ 不同 |
| 功能 | **生成**图片 (generations) | **编辑**图片 (edits) | ❌ 完全不同 |

### 4. **请求参数对比**

**参考 curl 的参数：**
```json
{
  "model": "gpt-image-2",
  "prompt": "一张小狗图片",
  "n": 1,
  "size": "1024x1024",
  "quality": "medium",
  "output_format": "jpeg",
  "output_compression": 80
}
```

**当前代码的参数：**
```
image: Blob (参考图片)
prompt: 文本
model: gpt-image-2
size: (空字符串)
response_format: (空字符串)
```

## 🎯 问题分析

### 问题 1：认证方式错误
- **当前**：使用 `Authorization: Bearer` header
- **应该**：使用 `api-key` header
- **影响**：API 不认识你的认证方式，返回 "invalid token"

### 问题 2：请求格式错误
- **当前**：使用 multipart/form-data（用于上传文件）
- **应该**：使用 application/json（用于发送 JSON 数据）
- **影响**：API 无法正确解析请求

### 问题 3：端点错误
- **当前**：`/openai/openai/images/edits`（编辑图片）
- **应该**：`/openai/openai/images/generations`（生成图片）
- **影响**：调用了错误的 API 端点

### 问题 4：功能混淆
- **当前代码**：实现的是 **图片编辑**（需要参考图片）
- **参考 curl**：实现的是 **图片生成**（不需要参考图片）
- **影响**：两个完全不同的功能

## ✅ 修复方案

需要修改 `callQsGptImage2Once` 函数：

### 修改 1：改用 api-key header

```typescript
headers: {
  "api-key": apiKey,  // 改为 api-key，不要 Bearer 前缀
  "Content-Type": "application/json",
},
```

### 修改 2：改用 JSON 请求体

```typescript
const requestBody = {
  model: "gpt-image-2",
  prompt: prompt,
  n: 1,
  size: `${targetWidth}x${targetHeight}`,
  quality: "medium",
  output_format: "jpeg",
  output_compression: 80
};

body: JSON.stringify(requestBody),
```

### 修改 3：改用 generations 端点

```typescript
: "https://maas.devops.rednote.life/openai/openai/images/generations?api-version=2025-04-01-preview";
```

### 修改 4：移除图片下载逻辑

由于是生成图片而不是编辑图片，不需要下载参考图片。

## 📝 总结

| 问题 | 原因 | 修复 |
|------|------|------|
| `"invalid token"` | 认证方式错误 | 改为 `api-key` header |
| 请求被拒绝 | 请求格式错误 | 改为 JSON 格式 |
| 端点错误 | 调用了 edits 而不是 generations | 改为 `/images/generations` |
| 功能混淆 | 实现的是编辑而不是生成 | 移除图片处理逻辑 |

## 🔍 Cookie 问题

参考 curl 中还有一个 Cookie：
```bash
--header 'Cookie: acw_tc=0a5815a717798847316797644eab9b4d425819300122a561b0903439968400'
```

这可能是：
1. 反爬虫 Cookie（acw_tc 通常是阿里云 WAF）
2. 会话 Cookie
3. 可能需要也可能不需要

建议先不加 Cookie，如果还是失败再加上。

