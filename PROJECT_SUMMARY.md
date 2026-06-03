# 手帐生成应用 - 项目总结

## 📱 项目简介

这是一个基于 React + TypeScript + Vite 的手帐生成应用。用户可以：
1. 上传照片
2. 填写手帐信息（标题、场景、情绪、风格等）
3. 选择 AI 模型
4. 生成精美的手帐拼贴图

## 🎯 核心功能

### 已实现 ✅
- 📸 照片上传和处理
- 🎨 EXIF 数据提取和显示
- 📝 手帐信息填写（场景、情绪、叙述方式等）
- 🎭 视觉风味选择（色调、氛围、排版形状、边缘风格等）
- 🤖 AI 模型选择和切换
- 🖼️ 手帐拼贴图生成
- 💾 生成结果导出

### 模型支持 🚀
- **FLUX.2 [pro]** ✅ 完全实现
  - 提供商: Replicate
  - 参考图: 最多 8 张
  - 生成时间: ~30 秒
  - 质量: 最高

- **GPT-2 (Kratos)** ⏳ 框架已准备
  - 提供商: 小红书内部
  - 参考图: 1 张
  - 生成时间: ~15 秒
  - 质量: 中等

## 🏗️ 架构设计

### 模型路由系统

```
┌─────────────────────────────────────────────────────┐
│                    用户界面 (UI)                     │
│              (src/App.tsx)                          │
└────────────────────┬────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────┐
│              业务逻辑层                              │
│         (src/lib/modelClient.ts)                    │
│      - 构建 prompt                                  │
│      - 解析图片 URL                                 │
│      - 调用模型 API                                 │
└────────────────────┬────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────┐
│              模型路由层                              │
│         (src/lib/modelRouter.ts)                    │
│      - 根据模型类型路由                             │
│      - 调用对应的 API 实现                          │
└────────────────────┬────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ↓                         ↓
┌──────────────────┐    ┌──────────────────┐
│  FLUX.2 Pro API  │    │  GPT-2 API       │
│  (已实现)        │    │  (待实现)        │
└──────────────────┘    └──────────────────┘
```

### 文件结构

```
src/
├── lib/
│   ├── modelConfig.ts      # 模型配置定义
│   ├── modelRouter.ts      # 模型路由逻辑
│   ├── modelClient.ts      # API 实现
│   ├── imageTools.ts       # 图片处理
│   ├── cosUploader.ts      # COS 上传
│   ├── visionClient.ts     # 视觉识别
│   ├── format.ts           # 格式化工具
│   ├── soundEffects.ts     # 音效
│   └── ErrorAlert.tsx      # 错误提示
├── data/
│   └── presets.ts          # 预设数据
├── types.ts                # 类型定义
├── App.tsx                 # 主应用
├── main.tsx                # 入口
├── styles.css              # 样式
└── vite-env.d.ts           # Vite 类型
```

## 🔧 技术栈

### 前端框架
- **React 19** - UI 框架
- **TypeScript 5.7** - 类型安全
- **Vite 6** - 构建工具

### 依赖库
- **lucide-react** - 图标库
- **html-to-image** - 图片导出
- **exifr** - EXIF 数据提取

### API 集成
- **Replicate API** - FLUX.2 Pro 模型
- **小红书 Kratos** - GPT-2 模型（待实现）
- **腾讯 COS** - 图片上传存储
- **阿里云 Qwen VLM** - 图片识别（可选）

## 📊 数据流

### 生成流程

```
1. 用户上传照片
   ↓
2. 提取 EXIF 数据和平均色值
   ↓
3. 上传到 COS（可选）
   ↓
4. 用户填写手帐信息
   ↓
5. 选择 AI 模型
   ↓
6. 点击"装订手帐本"
   ↓
7. 构建 prompt（包含所有用户信息）
   ↓
8. 调用选定的 AI 模型
   ↓
9. 模型生成拼贴图
   ↓
10. 显示结果
```

### 参考图处理

```
用户上传的照片
   ↓
提取 remoteUrl（COS 上传结果）
   ↓
如果为空，使用用户手填的链接
   ↓
如果仍为空，使用示例链接兜底
   ↓
传给 AI 模型
```

## 🎨 UI 组件

### 主要组件
- **InfoModal** - 补充信息弹窗
  - 手帐标题输入
  - 场景选择
  - 情绪选择
  - 叙述方式选择
  - 视觉风味选择
  - **生成模型选择** ✨ 新增
  - 风格选择
  - 模板选择
  - 图片远程链接填写
  - 视觉识别面板

- **PhotoGrid** - 照片网格
  - 照片上传
  - 照片预览
  - 照片删除

- **JournalPreview** - 手帐预览
  - 页面展示
  - 生成结果显示
  - 导出功能

## 🔐 安全性

### API Token 管理
```typescript
// 环境变量优先级
1. 环境变量 (VITE_REPLICATE_API_TOKEN)
2. 备用 token (fallbackToken)
3. 错误提示

// 示例
const apiToken = import.meta.env.VITE_REPLICATE_API_TOKEN as string | undefined;

if (!apiToken) {
  throw new Error(
    "FLUX.2 [pro] API Token 未配置。请在 .env 文件中设置 VITE_REPLICATE_API_TOKEN"
  );
}
```

### 参考图验证
```typescript
// 只接受有效的 HTTP(S) URL
const isLikelyImageUrl = (value: string) => {
  if (!/^https?:\/\//i.test(value)) return false;
  if (/\.(jpe?g|png|webp|gif|bmp)(\?|$)/i.test(value)) return true;
  if (/cdn|img|image|pic|kratos|xhscdn/i.test(value)) return true;
  return false;
};
```

## 🚀 性能优化

### 重试机制
```typescript
// 自动重试配置
- 最多 3 次尝试（首次 + 2 次重试）
- 仅对可重试错误触发（网络、超时、5xx、429）
- 线性退避：第 2 次等 1.5s、第 3 次等 3s
```

### 超时控制
```typescript
// 默认超时配置
- API 调用: 5 分钟
- 单次请求: 30 秒
- 轮询间隔: 1 秒
```

### 日志记录
```typescript
// 开发模式自动启用
const KRATOS_DEBUG = import.meta.env.DEV;
const klog = (...args: unknown[]) => {
  if (KRATOS_DEBUG) console.info("[Kratos]", ...args);
};
```

## 📈 扩展性

### 添加新模型

只需 5 步：

1. **配置模型** (`src/lib/modelConfig.ts`)
   ```typescript
   "new-model": { ... }
   ```

2. **更新类型** (`src/types.ts`)
   ```typescript
   export type ModelType = "gpt-2" | "flux-2-pro" | "new-model";
   ```

3. **添加路由** (`src/lib/modelRouter.ts`)
   ```typescript
   case "new-model":
     return await callNewModelAPI(params);
   ```

4. **实现 API** (`src/lib/modelClient.ts`)
   ```typescript
   const callNewModelAPI = async (params) => { ... };
   ```

5. **配置环境变量**
   ```env
   VITE_NEW_MODEL_TOKEN=your_token
   ```

### 添加新功能

- **新的视觉风味选项**: 编辑 `src/data/presets.ts`
- **新的场景类型**: 编辑 `src/data/presets.ts`
- **新的导出格式**: 编辑 `src/App.tsx` 的导出逻辑
- **新的 UI 组件**: 在 `src/` 中创建新文件

## 🐛 已知问题

### 1. exifr 模块错误
**症状**: `Cannot find module 'exifr'`
**原因**: 依赖未安装
**解决**: 运行 `npm install`

### 2. CORS 错误
**症状**: 图片上传失败
**原因**: COS bucket CORS 规则未配置
**解决**: 检查 COS bucket 的 CORS 规则

### 3. API Token 过期
**症状**: API 调用返回 401
**原因**: Token 已过期
**解决**: 更新环境变量中的 token

## 📚 文档

### 快速参考
- [`QUICK_REFERENCE.md`](QUICK_REFERENCE.md) - 快速参考卡片

### 详细指南
- [`MODEL_ROUTING_GUIDE.md`](MODEL_ROUTING_GUIDE.md) - 完整的模型路由指南
- [`QUICK_MODEL_ADD.md`](QUICK_MODEL_ADD.md) - 5 分钟快速添加新模型
- [`MODEL_ROUTING_SUMMARY.md`](MODEL_ROUTING_SUMMARY.md) - 实现总结
- [`IMPLEMENTATION_STATUS.md`](IMPLEMENTATION_STATUS.md) - 实现状态报告

### 其他文档
- [`README.md`](README.md) - 项目 README
- [`QUICK_START.md`](QUICK_START.md) - 快速开始指南

## 🎯 下一步

### 短期目标
- [ ] 测试 FLUX.2 Pro 模型
- [ ] 验证 UI 模型选择功能
- [ ] 完善错误处理

### 中期目标
- [ ] 实现 GPT-2 (Kratos) 模型
- [ ] 添加更多模型（Stable Diffusion、Midjourney 等）
- [ ] 实现模型对比功能

### 长期目标
- [ ] 添加模型性能统计
- [ ] 实现模型预热和缓存
- [ ] 支持自定义模型
- [ ] 实现模型微调

## 💡 最佳实践

### 开发
1. 使用 TypeScript 确保类型安全
2. 添加完整的错误处理
3. 记录详细的日志
4. 编写清晰的注释

### 测试
1. 测试各种网络条件
2. 测试超时和重试机制
3. 测试错误处理
4. 测试不同的模型

### 部署
1. 配置环境变量
2. 检查 API token
3. 验证 CORS 规则
4. 监控错误日志

## 🤝 贡献指南

### 添加新模型
1. 按照 `QUICK_MODEL_ADD.md` 的步骤
2. 编写完整的错误处理
3. 添加日志记录
4. 更新文档

### 修复 Bug
1. 创建 issue 描述问题
2. 编写测试用例
3. 修复代码
4. 验证修复

### 改进文档
1. 更新相关文档
2. 添加示例代码
3. 检查拼写和语法
4. 提交 PR

## 📞 支持

### 常见问题
- **Q: 如何添加新模型？**
  A: 参考 `QUICK_MODEL_ADD.md`

- **Q: 如何调试 API 调用？**
  A: 打开浏览器控制台，查看 `[Kratos]` 前缀的日志

- **Q: 如何配置 API token？**
  A: 在 `.env.local` 中设置 `VITE_*_API_TOKEN`

- **Q: 如何处理 CORS 错误？**
  A: 检查 COS bucket 的 CORS 规则

### 获取帮助
- 查看文档: [`QUICK_REFERENCE.md`](QUICK_REFERENCE.md)
- 查看示例: [`QUICK_MODEL_ADD.md`](QUICK_MODEL_ADD.md)
- 查看源代码: [`src/lib/modelClient.ts`](src/lib/modelClient.ts)

## 📄 许可证

MIT License

## 🙏 致谢

感谢所有贡献者和用户的支持！

---

**最后更新**: 2024 年
**版本**: 0.1.0
**状态**: 开发中 🚀
