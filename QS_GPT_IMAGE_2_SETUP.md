# QS GPT Image 2 模型配置指南

## 📌 概述

已添加对小红书 QS 平台的 **GPT Image 2** 模型的支持。这是一个新的图生图模型，可以作为 FLUX.2 和 GPT-2 的替代方案。

## 🔧 配置步骤

### 1. 获取 API Key

你已经有了 API Key：
```
QST30bfa2e5f00da0a05e51e07096c2603b
```

### 2. 打开 API 配置面板

1. 点击应用左上角的 ⚙️ 按钮
2. 打开 API 配置面板

### 3. 选择模型

在 "选择模型" 下拉菜单中选择：
```
QS GPT Image 2
```

### 4. 输入 API Key

在 "API Key" 字段中输入：
```
QST30bfa2e5f00da0a05e51e07096c2603b
```

### 5. 自定义端点（可选）

如果需要使用自定义端点，可以输入：
```
https://maas.devops.rednote.life/openai/openai/images/generations?api-version=2025-04-01-preview
```

如果留空，应用会自动使用上面的默认端点。

### 6. 保存配置

点击 "保存配置" 按钮，配置会被保存到浏览器本地。

## 📋 模型信息

| 属性 | 值 |
|------|-----|
| 模型名称 | QS GPT Image 2 |
| 提供商 | 小红书 QS 平台 |
| 端点 | https://maas.devops.rednote.life/openai/openai/images/generations?api-version=2025-04-01-preview |
| API Key 环境变量 | VITE_QS_GPT_IMAGE_2_API_KEY |
| 最大参考图数 | 1 张 |
| 支持的宽高比 | 1:1, 16:9, 9:16 |
| 默认宽高比 | 9:16 |
| 支持的输出格式 | JPEG, PNG |
| 默认输出格式 | JPEG |
| 估计生成时间 | 20 秒 |

## 🔑 API 请求格式

### 请求头

```
Content-Type: application/json
api-key: <你的API Key>
```

### 请求体

```json
{
  "model": "gpt-image-2",
  "prompt": "你的 prompt",
  "n": 1,
  "size": "1024x1536",
  "quality": "high",
  "output_format": "jpeg",
  "output_compression": 85
}
```

### 响应格式

API 会返回生成的图片 URL。

## ⚠️ 常见问题

### Q: 为什么出现 "invalid token" 错误？

A: 这说明你的 API Key 无效或已过期。请检查：
1. API Key 是否正确复制
2. API Key 是否有效
3. API Key 是否有足够的额度

### Q: 如何切换回其他模型？

A: 打开 API 配置面板，选择其他模型，输入对应的 API Key，然后保存。

### Q: 自定义端点有什么用？

A: 如果你有自己的代理或自建服务，可以使用自定义端点来调用你自己的服务。

### Q: 生成失败了怎么办？

A: 
1. 检查 API Key 是否有效
2. 检查网络连接
3. 查看浏览器控制台（F12）的错误信息
4. 尝试刷新页面后重新生成

## 🚀 使用示例

### 步骤 1: 配置 API Key

```
1. 点击 ⚙️ 按钮
2. 选择 "QS GPT Image 2"
3. 输入 API Key: QST30bfa2e5f00da0a05e51e07096c2603b
4. 点击 "保存配置"
```

### 步骤 2: 上传图片

```
1. 点击 "选择照片" 上传图片
2. 填写手帐信息（标题、场景、情绪等）
```

### 步骤 3: 生成手帐

```
1. 点击 "装订手帐本" 按钮
2. 等待生成完成（约 20 秒）
3. 下载生成的图片
```

## 📝 技术细节

### 认证方式

QS GPT Image 2 使用 `api-key` 请求头进行认证，而不是 `Authorization` 请求头。

### 请求格式

请求体使用标准的 OpenAI 兼容格式，但有一些特定的参数：
- `model`: 必须是 "gpt-image-2"
- `quality`: 支持 "low", "medium", "high"
- `output_compression`: 0-100 的压缩级别

### 响应格式

API 返回的响应包含生成的图片 URL，可以直接用于显示或下载。

## 🔄 与其他模型的对比

| 特性 | GPT-2 | FLUX.2 | QS GPT Image 2 |
|------|-------|--------|----------------|
| 参考图数量 | 1 张 | 8 张 | 1 张 |
| 生成速度 | 快 | 慢 | 中等 |
| 质量 | 中等 | 高 | 中等 |
| 提供商 | Kratos | Replicate | QS |

## 💡 建议

- 如果需要快速生成，使用 **GPT-2**
- 如果需要高质量输出，使用 **FLUX.2**
- 如果想尝试新模型，使用 **QS GPT Image 2**

## 📞 获取帮助

如果遇到问题，请：
1. 检查 API Key 是否正确
2. 查看浏览器控制台的错误信息
3. 尝试清除配置后重新配置
4. 检查网络连接

---

**最后更新**: 2024年
**状态**: ✅ 完成
