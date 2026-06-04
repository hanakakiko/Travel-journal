# QS GPT Image 2 API - 快速参考

## 核心信息

| 项目 | 值 |
|------|-----|
| **端点** | `https://maas.devops.rednote.life/openai/openai/images/edits?api-version=2025-04-01-preview` |
| **方法** | POST |
| **认证** | `Authorization: Bearer {API_KEY}` |
| **格式** | multipart/form-data |
| **模型** | gpt-image-2 |

## 请求参数

| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `image` | file | 参考图片（必需） | PNG/JPEG 文件 |
| `prompt` | string | 提示词（必需） | "带上眼镜" |
| `model` | string | 模型名称 | "gpt-image-2" |
| `size` | string | 尺寸（可选） | "" (空字符串) |
| `response_format` | string | 响应格式（可选） | "" (空字符串) |

## 响应格式

```json
{
  "created": 1713833628,
  "data": [
    {
      "b64_json": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    }
  ],
  "usage": {
    "total_tokens": 100,
    "input_tokens": 50,
    "output_tokens": 50
  }
}
```

## curl 命令示例

```bash
curl --location '/v1/images/edits' \
  --header 'Authorization: Bearer YOUR_API_KEY' \
  --form 'image=@"path/to/image.png"' \
  --form 'prompt="带上眼镜"' \
  --form 'model="gpt-image-2"' \
  --form 'size=""' \
  --form 'response_format=""'
```

## 代码调用

```typescript
import { callQsGptImage2 } from "./lib/modelClient";

const result = await callQsGptImage2({
  prompt: "你的提示词",
  imageUrls: ["https://example.com/image.png"],
  targetWidth: 1024,
  targetHeight: 1536,
});

console.log(result.imageUrl); // 生成的图片 URL 或 data URL
```

## 日志关键部分

### 请求日志
```
[QS GPT Image 2] === 完整请求体 (multipart/form-data) ===
[QS GPT Image 2]   字段顺序: image, prompt, model, size, response_format
[QS GPT Image 2]   image 大小: 4185.58 KB (image/jpeg)
```

### 响应日志
```
[QS GPT Image 2] === 响应格式分析 ===
[QS GPT Image 2]   data[0].b64_json 长度: 76 字符
[QS GPT Image 2] ✓ 生成成功，图片已转换为 data URL
```

## 常见问题

### Q: 参考图片没有被添加？
**A**: 检查日志中是否有 `image 大小` 显示。如果没有，检查参考图片 URL 是否可访问。

### Q: API 返回 invalid token 错误？
**A**: 确认 API Key 是否有效，是否有权限调用 Edits 接口。

### Q: 响应中没有 b64_json 字段？
**A**: 检查 API 是否返回了有效的图片数据，尝试使用更简单的提示词。

## 文件位置

- **主实现**：[`src/lib/modelClient.ts`](src/lib/modelClient.ts) (第 936-1185 行)
- **详细文档**：[`QS_GPT_IMAGE2_FINAL_SUMMARY.md`](QS_GPT_IMAGE2_FINAL_SUMMARY.md)
- **响应格式**：[`QS_GPT_IMAGE2_RESPONSE_FORMAT.md`](QS_GPT_IMAGE2_RESPONSE_FORMAT.md)

## 编译状态

✅ 代码编译成功，无错误

## 下一步

1. 运行应用：`npm run dev`
2. 打开浏览器控制台：F12
3. 尝试生成图片
4. 查看日志验证

---

**最后更新**：2026-06-03
