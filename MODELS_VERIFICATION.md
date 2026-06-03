# 模型实现验证指南

## ✅ 快速验证清单

### 1. 检查 modelClient.ts 中的函数

#### GPT-2 实现
```bash
# 检查 callKratosUnifiedPic2PicOnce 函数是否存在
grep -n "callKratosUnifiedPic2PicOnce" src/lib/modelClient.ts

# 检查 callKratosUnifiedPic2Pic 函数是否存在
grep -n "callKratosUnifiedPic2Pic" src/lib/modelClient.ts
```

**预期输出**: 两个函数都应该存在

#### FLUX.2 实现
```bash
# 检查 callFlux2ProPic2PicOnce 函数是否存在
grep -n "callFlux2ProPic2PicOnce" src/lib/modelClient.ts

# 检查 callFlux2ProPic2Pic 函数是否存在
grep -n "callFlux2ProPic2Pic" src/lib/modelClient.ts
```

**预期输出**: 两个函数都应该存在

### 2. 检查 modelRouter.ts 中的路由

```bash
# 检查 GPT-2 路由是否正确
grep -A 10 'case "gpt-2":' src/lib/modelRouter.ts

# 检查 FLUX.2 路由是否正确
grep -A 10 'case "flux-2-pro":' src/lib/modelRouter.ts
```

**预期输出**:
- GPT-2 路由应该调用 `callKratosUnifiedPic2Pic`
- FLUX.2 路由应该调用 `callFlux2ProPic2Pic`

### 3. 检查 modelConfig.ts 中的配置

```bash
# 检查 GPT-2 配置是否存在
grep -A 10 '"gpt-2":' src/lib/modelConfig.ts

# 检查 FLUX.2 配置是否存在
grep -A 10 '"flux-2-pro":' src/lib/modelConfig.ts
```

**预期输出**: 两个模型的配置都应该存在

### 4. 检查 types.ts 中的类型定义

```bash
# 检查 ModelType 是否包含两个模型
grep "ModelType" src/types.ts
```

**预期输出**: 应该包含 `"gpt-2" | "flux-2-pro"`

## 🧪 功能测试

### 测试 GPT-2 模型

1. **启动开发服务器**
   ```bash
   npm run dev
   ```

2. **打开浏览器控制台**
   - 按 F12 打开开发者工具
   - 切换到 Console 标签

3. **上传照片并生成**
   - 上传至少 1 张照片
   - 填写手帐信息
   - 在"生成模型"中选择 **GPT-2**
   - 点击"装订手帐本"

4. **观察日志**
   - 应该看到 `[Kratos]` 前缀的日志
   - 应该看到 `request → /kratos/ads/materialcenter/doaction`
   - 应该看到 `modelType: "gpt2"`

### 测试 FLUX.2 模型

1. **启动开发服务器**
   ```bash
   npm run dev
   ```

2. **打开浏览器控制台**
   - 按 F12 打开开发者工具
   - 切换到 Console 标签

3. **上传照片并生成**
   - 上传至少 1 张照片
   - 填写手帐信息
   - 在"生成模型"中选择 **FLUX.2 [pro]**
   - 点击"装订手帐本"

4. **观察日志**
   - 应该看到 `[Kratos]` 前缀的日志
   - 应该看到 `request → /replicate/v1/predictions`
   - 应该看到 `version: "black-forest-labs/flux-2-pro"`

## 📊 预期行为对比

| 特性 | GPT-2 | FLUX.2 [pro] |
|------|-------|-------------|
| API 端点 | `/kratos/ads/materialcenter/doaction` | `/replicate/v1/predictions` |
| 参考图数量 | 1 张 | 最多 8 张 |
| 生成时间 | ~15 秒 | ~30 秒 |
| 质量 | 中等 | 最高 |
| 模型类型参数 | `"gpt2"` | 无需指定 |
| 轮询等待 | 否 | 是 |

## 🔍 常见问题排查

### 问题 1: 选择 GPT-2 后出现错误

**症状**: 看到错误信息 "GPT-2 模型暂未实现"

**原因**: 代码中的 GPT-2 实现未被正确导入或路由未更新

**解决**:
1. 检查 `src/lib/modelRouter.ts` 中是否导入了 `callKratosUnifiedPic2Pic`
2. 检查 `callModelAPI` 中的 `case "gpt-2":` 是否调用了 `callKratosUnifiedPic2Pic`

### 问题 2: 选择 FLUX.2 后出现错误

**症状**: 看到错误信息 "FLUX.2 API 调用失败"

**原因**: 可能是 API token 过期或网络问题

**解决**:
1. 检查环境变量 `VITE_REPLICATE_API_TOKEN` 是否设置
2. 检查网络连接
3. 查看浏览器控制台的完整错误信息

### 问题 3: 两个模型都无法使用

**症状**: 任何模型都无法生成

**原因**: 可能是模型路由系统有问题

**解决**:
1. 检查 `src/lib/modelRouter.ts` 中的 `callModelAPI` 函数
2. 检查 `src/lib/modelConfig.ts` 中的模型配置
3. 检查浏览器控制台的错误信息

## 📝 验证脚本

### 快速验证所有函数都存在

```bash
#!/bin/bash

echo "检查 GPT-2 实现..."
grep -q "callKratosUnifiedPic2Pic" src/lib/modelClient.ts && echo "✓ callKratosUnifiedPic2Pic 存在" || echo "✗ callKratosUnifiedPic2Pic 缺失"

echo "检查 FLUX.2 实现..."
grep -q "callFlux2ProPic2Pic" src/lib/modelClient.ts && echo "✓ callFlux2ProPic2Pic 存在" || echo "✗ callFlux2ProPic2Pic 缺失"

echo "检查 GPT-2 路由..."
grep -q 'case "gpt-2":' src/lib/modelRouter.ts && echo "✓ GPT-2 路由存在" || echo "✗ GPT-2 路由缺失"

echo "检查 FLUX.2 路由..."
grep -q 'case "flux-2-pro":' src/lib/modelRouter.ts && echo "✓ FLUX.2 路由存在" || echo "✗ FLUX.2 路由缺失"

echo "检查 GPT-2 配置..."
grep -q '"gpt-2":' src/lib/modelConfig.ts && echo "✓ GPT-2 配置存在" || echo "✗ GPT-2 配置缺失"

echo "检查 FLUX.2 配置..."
grep -q '"flux-2-pro":' src/lib/modelConfig.ts && echo "✓ FLUX.2 配置存在" || echo "✗ FLUX.2 配置缺失"

echo ""
echo "验证完成！"
```

## 🎯 验证结果

### ✅ 所有检查都通过

如果所有检查都通过，说明：
- 两个模型都已正确实现
- 路由系统正常工作
- 配置完整无误
- 可以正常使用两个模型

### ⚠️ 某些检查失败

如果某些检查失败，请：
1. 查看失败的具体项目
2. 参考本文档的"常见问题排查"部分
3. 检查相关文件的内容
4. 查看浏览器控制台的错误信息

## 📚 相关文档

- [GPT-2 恢复总结](GPT2_RESTORATION.md)
- [模型路由指南](MODEL_ROUTING_GUIDE.md)
- [快速参考](QUICK_REFERENCE.md)
- [实现状态](IMPLEMENTATION_STATUS.md)

---

**验证日期**: 2024 年
**状态**: ✅ 完成

**祝你验证顺利！** 🚀
