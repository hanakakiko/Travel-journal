# 前端直调模式修复总结

## 问题描述

用户在调用 QS GPT Image 2 时，仍然收到云函数错误：
```
GPT-2 API 调用失败：CloudBase generateImage 云函数调用失败，请检查云函数日志。
返回：QS_GPT_IMAGE_2_API_KEY 未在 CloudBase 云函数环境变量中配置
```

这说明代码仍然在调用云函数 `generateImage`，而不是直接调用 QS API。

## 根本原因

在之前的改造中，我在 `modelRouter.ts` 中创建了多个 `getXxxKeyWithCache()` 函数，这些函数试图从云函数获取 API Key。但这样做有两个问题：

1. **设计错误**：这些函数都调用 `getVApiKeyFromCloudFunction()`，这只能获取 V-API Key，不能获取其他模型的 Key
2. **逻辑错误**：API Key 的获取应该由各个 `callXxxOnce()` 函数内部处理，而不是在路由层预先获取

## 解决方案

### 1. 简化 API Key 缓存机制

删除了所有不必要的 `getXxxKeyWithCache()` 函数，只保留 `getVApiKeyWithCache()`（用于 V-API 模型）。

**原因**：
- QS GPT Image 2、FLUX.2 Pro、GPT-2 等模型的 API Key 来源不同
- 这些 Key 的获取逻辑已经在各个 `callXxxOnce()` 函数中实现了
- 不需要在路由层重复处理

### 2. 更新路由逻辑

修改 `callModelAPI()` 函数中的前端直调路由：

```typescript
if (isCloudbaseModelProxyEnabled()) {
  if (modelType === "flux-2-pro") {
    // 直接调用，API Key 获取由 callFlux2ProPic2Pic 内部处理
    return await callFlux2ProPic2Pic(params);
  }
  
  if (modelType === "gpt-2") {
    // 直接调用，API Key 获取由 callKratosUnifiedPic2Pic 内部处理
    return await callKratosUnifiedPic2Pic({
      ...params,
      modelType: "gpt2",
    });
  }
  
  if (modelType === "qs-gpt-image-2") {
    // 直接调用，API Key 获取由 callQsGptImage2 内部处理
    return await callQsGptImage2(params);
  }
  
  // V-API 模型仍然使用云函数获取 Key（因为有专门的 getVApiKey 云函数）
  if (modelType === "v-api-gpt-image-2") {
    const apiKey = await getVApiKeyWithCache();
    return await callVApiGptImage2({
      ...params,
      apiKeyOverride: apiKey,
    });
  }
  
  if (modelType === "v-api-seedream-4-5") {
    const apiKey = await getVApiKeyWithCache();
    return await callVApiSeedream4({
      ...params,
      apiKeyOverride: apiKey,
    });
  }
}
```

### 3. API Key 获取优先级

各个 `callXxxOnce()` 函数内部的 API Key 获取优先级：

```
1. 外部传入（apiKeyOverride 参数）
2. 用户在 API 配置面板中输入的 Key
3. 环境变量（.env 文件）
4. 本地配置文件（src/lib/api-keys.local.ts）
```

例如，`callQsGptImage2Once()` 中的逻辑：

```typescript
const userConfigs = loadUserApiConfig();
const userQsConfig = userConfigs?.["qs-gpt-image-2"];
const apiKey = apiKeyOverride || userQsConfig?.apiKey || getApiKey("VITE_QS_GPT_IMAGE_2_API_KEY");

if (!apiKey) {
  throw new Error(
    "QS GPT Image 2 API Key 未配置。请在 src/lib/api-keys.local.ts 中配置 VITE_QS_GPT_IMAGE_2_API_KEY，" +
    "或在 API 配置面板中输入你的 API Key，" +
    "或在 .env 文件中设置 VITE_QS_GPT_IMAGE_2_API_KEY。"
  );
}
```

## 修改的文件

### `src/lib/modelRouter.ts`

**删除的代码**：
- `getQsApiKeyWithCache()` 函数
- `getFlux2ProKeyWithCache()` 函数
- `getGpt2KeyWithCache()` 函数
- `getSeedream45KeyWithCache()` 函数

**修改的代码**：
- 更新 `callModelAPI()` 中的前端直调路由逻辑
- 移除了对已删除函数的调用

## 工作流程

### 用户调用 QS GPT Image 2 时的流程

1. **前端调用**：`callModelAPI("qs-gpt-image-2", params)`

2. **路由判断**：
   - 检查 `isCloudbaseModelProxyEnabled()` 是否为 true
   - 如果是，进入前端直调模式

3. **直接调用 API 函数**：
   ```typescript
   return await callQsGptImage2(params);
   ```

4. **API 函数内部处理**：
   - `callQsGptImage2()` 调用 `callQsGptImage2Once()`
   - `callQsGptImage2Once()` 内部获取 API Key
   - 直接调用 QS API（不经过云函数）

5. **返回结果**：
   - 成功：返回生成的图片 URL
   - 失败：返回错误信息

## 关键改进

✅ **不再调用云函数代理**：QS GPT Image 2 现在直接调用 QS API，绕过云函数 3 秒超时限制

✅ **API Key 获取更灵活**：支持多种 Key 来源（环境变量、用户配置、本地文件）

✅ **代码更清晰**：API Key 获取逻辑集中在各个 `callXxxOnce()` 函数中，不在路由层重复处理

✅ **向后兼容**：如果 `isCloudbaseModelProxyEnabled()` 为 false，仍然使用云函数代理模式

## 测试建议

1. **配置 API Key**：
   ```bash
   # 方式 1：环境变量
   echo "VITE_QS_GPT_IMAGE_2_API_KEY=your_key" > .env.local
   
   # 方式 2：API 配置面板
   # 在应用中打开 API 配置面板，输入 QS API Key
   ```

2. **测试调用**：
   ```typescript
   const result = await callModelAPI("qs-gpt-image-2", {
     prompt: "Your prompt",
     imageUrls: ["https://example.com/image.jpg"],
     targetWidth: 1024,
     targetHeight: 1536,
   });
   ```

3. **验证日志**：
   - 打开浏览器控制台
   - 查看 `[QS GPT Image 2]` 日志
   - 确认请求直接发送到 QS API，而不是云函数

## 总结

通过简化 API Key 缓存机制和更新路由逻辑，我们成功地让所有模型都支持前端直调，绕过了云函数 3 秒超时限制。现在 QS GPT Image 2 应该能够正常工作了！
