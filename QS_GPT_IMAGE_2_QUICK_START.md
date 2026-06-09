# QS GPT Image 2 快速开始卡片

## 🚀 3 分钟快速开始

### 第一步：配置 API Key（1 分钟）

选择以下任意一种方式：

**方式 1：环境变量（推荐）**
```env
# .env.local
VITE_QS_GPT_IMAGE_2_API_KEY=your_api_key_here
```

**方式 2：本地配置文件**
```typescript
// src/lib/api-keys.local.ts
export const API_KEYS = {
  VITE_QS_GPT_IMAGE_2_API_KEY: "your_api_key_here",
};
```

### 第二步：启动开发服务器（1 分钟）

```bash
npm run dev
```

### 第三步：使用 API（1 分钟）

```typescript
import { callQsGptImage2 } from "./lib/modelClient";

const result = await callQsGptImage2({
  prompt: "High Contrast, hyper detailed photo, 2k UHD",
  imageUrls: ["https://example.com/image.jpg"],
  targetWidth: 1024,
  targetHeight: 1024,
});

console.log(result.imageUrl);  // 生成的图片 URL
```

---

## 📋 关键信息速查

### 端点

```
https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview
```

### 认证

```
api-key: your_api_key_here
```

### 请求参数

| 参数 | 值 | 说明 |
|------|-----|------|
| `image` | Blob | 图片文件（自动转换） |
| `prompt` | string | 编辑提示词 |
| `quality` | "low" | 图片质量 |
| `n` | "1" | 生成数量 |
| `size` | "1024x1024" | 输出尺寸 |

### 响应格式

```json
{
  "created": 1234567890,
  "data": [
    {
      "url": "https://..."  // 或 "b64_json": "..."
    }
  ]
}
```

---

## 🔍 调试技巧

### 查看请求日志

打开浏览器 DevTools (F12) → Console，搜索 `[QS GPT Image 2]`

### 复制 curl 命令

从控制台复制生成的 curl 命令，在终端直接运行：

```bash
curl -sS -X POST "https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview" \
  -H "api-key: your_api_key" \
  -F "image=@./test.jpg" \
  -F "prompt=test" \
  -F "quality=low" \
  -F "n=1" \
  -F "size=1024x1024"
```

---

## ⚠️ 常见错误

| 错误 | 原因 | 解决方案 |
|------|------|---------|
| API Key 未配置 | 没有设置 API Key | 配置 `.env.local` 或 `api-keys.local.ts` |
| HTTP 401 | API Key 无效 | 检查 API Key 是否正确 |
| HTTP 400 | 请求参数错误 | 查看控制台日志，检查参数 |
| 图片转换失败 | 图片 URL 无效 | 检查图片 URL 是否可访问 |
| 图片过大 | 文件超过 4MB | 压缩图片或使用更小的图片 |

---

## 📚 文档导航

| 需求 | 文档 | 时间 |
|------|------|------|
| 快速参考 | [`QS_GPT_IMAGE_2_QUICK_REFERENCE.md`](QS_GPT_IMAGE_2_QUICK_REFERENCE.md) | 5 分钟 |
| 详细指南 | [`QS_GPT_IMAGE_2_EDITS_MIGRATION.md`](QS_GPT_IMAGE_2_EDITS_MIGRATION.md) | 15 分钟 |
| 测试指南 | [`QS_GPT_IMAGE_2_TEST_GUIDE.md`](QS_GPT_IMAGE_2_TEST_GUIDE.md) | 10 分钟 |
| 改造对比 | [`QS_GPT_IMAGE_2_BEFORE_AFTER.md`](QS_GPT_IMAGE_2_BEFORE_AFTER.md) | 10 分钟 |
| 完整索引 | [`QS_GPT_IMAGE_2_INDEX.md`](QS_GPT_IMAGE_2_INDEX.md) | 快速导航 |

---

## ✅ 验证清单

- [ ] API Key 已配置
- [ ] 开发服务器已启动
- [ ] 浏览器控制台可见日志
- [ ] 日志显示正确的端点 URL
- [ ] 日志显示 `api-key` header
- [ ] API 返回 HTTP 200
- [ ] 响应包含 `data[0].url` 或 `data[0].b64_json`

---

## 🎯 改动概览

| 方面 | 改造前 | 改造后 |
|------|--------|--------|
| 端点 | `/images/generations` | `/images/edits` |
| 认证 | `Authorization: Bearer` | `api-key` |
| 图片 | URL 字符串 | Blob 对象 |
| quality | ❌ | ✅ |
| n | ❌ | ✅ |
| 官方兼容 | ❌ | ✅ |

---

## 💡 提示

- 💡 图片会自动从 URL 转换为 Blob 对象
- 💡 文件大小自动检查（最大 4MB）
- 💡 文件格式自动检查（PNG/JPG/WebP）
- 💡 curl 命令自动生成用于调试
- 💡 详细日志自动打印到控制台

---

## 🚀 现在就开始！

1. 配置 API Key
2. 启动开发服务器
3. 使用 API
4. 查看日志
5. 完成！

**祝你使用愉快！** 🎉
