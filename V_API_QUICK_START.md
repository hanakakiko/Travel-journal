# V-API GPT Image 2 快速开始指南

## 一句话总结
已添加新的图生图模型 **V-API GPT Image 2**，支持通过 V-API 平台的 `/v1/images/edits` 接口进行图片编辑。

## 快速配置（3 步）

### 第 1 步：配置 API Key
选择以下任一方式：

**方式 A：编辑本地配置文件**
```bash
# 编辑 src/lib/api-keys.local.ts
VITE_V_API_GPT_IMAGE_2_API_KEY: "your-api-key-here",
```

**方式 B：设置环境变量**
```bash
# 在 .env 文件中添加
VITE_V_API_GPT_IMAGE_2_API_KEY=your-api-key-here
```

**方式 C：使用 UI 配置面板**
- 打开应用，点击右上角的 API 配置按钮
- 找到 V-API GPT Image 2，输入 API Key
- 点击保存

### 第 2 步：选择模型
1. 上传图片后，点击「开始画手帐」或「补充后重画」
2. 在弹窗顶部找到「生成模型」区域
3. 点击 **V-API GPT Image 2** 按钮

### 第 3 步：生成图片
1. 填写手帐标题、场景、情绪等信息
2. 点击「装订手帐本」或「重新装订」
3. 等待生成完成

## 模型信息

| 属性 | 值 |
|------|-----|
| **模型名称** | V-API GPT Image 2 |
| **API 端点** | `https://api.v3.cm/v1/images/edits` |
| **支持宽高比** | 1:1, 16:9, 9:16 |
| **默认宽高比** | 9:16（竖向长图） |
| **输出格式** | JPEG, PNG |
| **最大参考图数** | 1 张 |
| **预计生成时间** | 20 秒 |

## 常见问题

### Q: 如何验证 API Key 是否正确？
A: 配置后，在应用中选择该模型，如果模型按钮可点击（不显示「未配置」），说明 API Key 已正确配置。

### Q: 生成失败怎么办？
A: 
1. 打开浏览器开发者工具（F12）
2. 查看 Console 标签中的错误信息
3. 常见错误：
   - `API Key 未配置` → 检查 API Key 配置
   - `HTTP 401` → API Key 无效
   - `HTTP 400` → 图片 URL 无法访问
   - `HTTP 429` → 请求过于频繁，稍后重试

### Q: 可以自定义 API 端点吗？
A: 可以。在 UI 配置面板中，为 V-API GPT Image 2 设置「自定义端点」即可。

### Q: 支持多张参考图吗？
A: 不支持。该模型最多支持 1 张参考图片。

### Q: 生成的图片格式是什么？
A: 默认为 JPEG 格式，也支持 PNG 格式。

## 调试技巧

### 查看完整请求/响应
1. 打开浏览器开发者工具（F12）
2. 切换到 Console 标签
3. 搜索 `[V-API GPT Image 2]` 日志
4. 查看「完整请求体」和「完整响应体」

### 手动测试 API
复制 Console 中的 curl 命令，在终端执行：
```bash
curl --location 'https://api.v3.cm/v1/images/edits' \
  --header 'Authorization: Bearer YOUR_API_KEY' \
  --form 'image="https://example.com/image.jpg"' \
  --form 'prompt="your prompt here"' \
  --form 'model="gpt-image-2"' \
  --form 'size="1024x1536"' \
  --form 'response_format="b64_json"'
```

## 修改的文件清单

✅ `src/lib/modelConfig.ts` - 添加模型配置  
✅ `src/lib/userApiConfig.ts` - 更新用户配置类型  
✅ `src/lib/api-keys.local.ts` - 添加 API Key 配置项  
✅ `src/lib/modelClient.ts` - 实现 API 调用函数  
✅ `src/lib/modelRouter.ts` - 添加路由逻辑  

## 相关文档

- 详细实现文档：[`V_API_GPT_IMAGE_2_IMPLEMENTATION.md`](V_API_GPT_IMAGE_2_IMPLEMENTATION.md)
- 模型配置系统：[`src/lib/modelConfig.ts`](src/lib/modelConfig.ts)
- API 客户端：[`src/lib/modelClient.ts`](src/lib/modelClient.ts)

## 获取帮助

如有问题，请：
1. 查看浏览器 Console 中的错误日志
2. 参考详细实现文档
3. 联系管理员 叶瑄（丁江颖）
