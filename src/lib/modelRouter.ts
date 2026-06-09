/**
 * 模型路由系统
 * 根据用户选择的模型，调用对应的 API 实现
 */

import type { ModelType } from "./modelConfig";
import { getModelConfig } from "./modelConfig";
import { callGenerateImageFunction, getVApiKeyFromCloudFunction } from "./cloudbase";
import { isCloudbaseModelProxyEnabled } from "./deploymentMode";
import { callFlux2ProPic2Pic, callKratosUnifiedPic2Pic, callQsGptImage2, callVApiGptImage2, callVApiSeedream4 } from "./modelClient";
import type { KratosAttemptInfo } from "./modelClient";

/**
 * 前端直调 API 模式（推荐）
 *
 * 生产环境下，所有模型都绕过云函数（3s 限制），改为：
 * 1. 先用快速云函数取 Key（<1s）
 * 2. 再前端直调 API（支持 CORS）
 * 3. Key 缓存在内存中，避免每次都调云函数
 *
 * 优势：
 * - 绕过云函数 3 秒超时限制
 * - 更快的响应速度（直接调用）
 * - 更好的错误处理和日志
 *
 * 如果未来升级云函数超时时长，可以改回 callCloudbaseModelProxy 模式
 * 只需改动 modelRouter.ts 中的路由逻辑即可，无需修改其他代码
 */
let _cachedVApiKey: string | null = null;

const getVApiKeyWithCache = async (): Promise<string> => {
  if (_cachedVApiKey) return _cachedVApiKey;
  const key = await getVApiKeyFromCloudFunction();
  if (!key) throw new Error("无法从 CloudBase 获取 V-API Key，请检查云函数 getVApiKey 的环境变量配置");
  _cachedVApiKey = key;
  return key;
};

export interface ModelCallParams {
  prompt: string;
  imageUrls: string[];
  targetWidth?: number;
  targetHeight?: number;
  timeoutMs?: number;
  maxAttempts?: number;
  retryDelayMs?: number;
  onAttempt?: (info: KratosAttemptInfo) => void;
}

export interface ModelCallResult {
  imageUrl: string;
  raw: unknown;
}

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

const isRetryableModelError = (error: Error): boolean => {
  const msg = error.message || "";
  if (/秒内未返回|超时|timeout/i.test(msg)) return true;
  if (/网络异常|Failed to fetch|NetworkError|ERR_/i.test(msg)) return true;
  if (/HTTP\s+5\d{2}\b/.test(msg)) return true;
  if (/HTTP\s+429\b/.test(msg)) return true;
  return false;
};

const callCloudbaseModelProxy = async (
  modelType: ModelType,
  params: ModelCallParams,
): Promise<ModelCallResult> => {
  const total = Math.max(1, params.maxAttempts ?? 3);
  const retryDelayMs = params.retryDelayMs ?? 1500;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= total; attempt++) {
    params.onAttempt?.({ attempt, totalAttempts: total, lastError });

    try {
      return await callGenerateImageFunction({
        modelType,
        prompt: params.prompt,
        imageUrls: params.imageUrls,
        targetWidth: params.targetWidth,
        targetHeight: params.targetHeight,
        timeoutMs: params.timeoutMs,
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const retryable = isRetryableModelError(lastError);
      const isLast = attempt >= total;

      if (isLast || !retryable) {
        if (attempt > 1) {
          throw new Error(`${lastError.message}（已重试 ${attempt - 1} 次仍失败）`);
        }
        throw lastError;
      }

      await sleep(retryDelayMs * attempt);
    }
  }

  throw lastError ?? new Error("CloudBase 模型代理调用失败");
};

/**
 * 根据模型类型调用对应的 API
 */
export const callModelAPI = async (
  modelType: ModelType,
  params: ModelCallParams
): Promise<ModelCallResult> => {
  const config = getModelConfig(modelType);

  if (isCloudbaseModelProxyEnabled()) {
    // 前端直调模式：所有模型都绕开云函数 3s 超时限制
    // 各个 API 函数内部会自动处理 API Key 的获取（从环境变量、用户配置、或云函数）
    //
    // 如果未来升级云函数超时时长，可以改回 callCloudbaseModelProxy 模式
    // 只需改动这里的路由逻辑即可，无需修改其他代码
    
    if (modelType === "flux-2-pro") {
      // FLUX.2 Pro：前端直调 Replicate API
      return await callFlux2ProPic2Pic(params);
    }
    
    if (modelType === "gpt-2") {
      // GPT-2：前端直调 Kratos API
      return await callKratosUnifiedPic2Pic({
        ...params,
        modelType: "gpt2",
      });
    }
    
    if (modelType === "v-api-gpt-image-2") {
      // V-API GPT Image 2：前端直调 V-API
      const apiKey = await getVApiKeyWithCache();
      return await callVApiGptImage2({
        ...params,
        apiKeyOverride: apiKey,
      });
    }
    
    if (modelType === "qs-gpt-image-2") {
      // QS GPT Image 2：前端直调 QS API
      // 注意：这里不需要预先获取 API Key，callQsGptImage2 会从用户配置中获取
      return await callQsGptImage2(params);
    }
    
    if (modelType === "v-api-seedream-4-5") {
      // V-API Seedream 4.5：前端直调 V-API
      const apiKey = await getVApiKeyWithCache();
      return await callVApiSeedream4({
        ...params,
        apiKeyOverride: apiKey,
      });
    }
    
    // 如果有新模型未在上面处理，回退到云函数代理（保留向后兼容）
    return await callCloudbaseModelProxy(modelType, params);
  }

  switch (modelType) {
    case "flux-2-pro":
      // FLUX.2 Pro 通过 Replicate API
      return await callFlux2ProPic2Pic({
        prompt: params.prompt,
        imageUrls: params.imageUrls,
        targetWidth: params.targetWidth,
        targetHeight: params.targetHeight,
        timeoutMs: params.timeoutMs,
        maxAttempts: params.maxAttempts,
        retryDelayMs: params.retryDelayMs,
        onAttempt: params.onAttempt,
      });

    case "gpt-2":
      // GPT-2 通过 Kratos API
      return await callKratosUnifiedPic2Pic({
        prompt: params.prompt,
        imageUrls: params.imageUrls,
        targetWidth: params.targetWidth,
        targetHeight: params.targetHeight,
        modelType: "gpt2",
        timeoutMs: params.timeoutMs,
        maxAttempts: params.maxAttempts,
        retryDelayMs: params.retryDelayMs,
        onAttempt: params.onAttempt,
      });

    case "qs-gpt-image-2":
      // QS GPT Image 2 通过 QS API
      return await callQsGptImage2({
        prompt: params.prompt,
        imageUrls: params.imageUrls,
        targetWidth: params.targetWidth,
        targetHeight: params.targetHeight,
        timeoutMs: params.timeoutMs,
        maxAttempts: params.maxAttempts,
        retryDelayMs: params.retryDelayMs,
        onAttempt: params.onAttempt,
      });

    case "v-api-gpt-image-2":
      // V-API GPT Image 2 通过 V-API
      return await callVApiGptImage2({
        prompt: params.prompt,
        imageUrls: params.imageUrls,
        targetWidth: params.targetWidth,
        targetHeight: params.targetHeight,
        timeoutMs: params.timeoutMs,
        maxAttempts: params.maxAttempts,
        retryDelayMs: params.retryDelayMs,
        onAttempt: params.onAttempt,
      });

    case "v-api-seedream-4-5":
      // V-API Seedream 4.5 通过 V-API
      return await callVApiSeedream4({
        prompt: params.prompt,
        imageUrls: params.imageUrls,
        targetWidth: params.targetWidth,
        targetHeight: params.targetHeight,
        timeoutMs: params.timeoutMs,
        maxAttempts: params.maxAttempts,
        retryDelayMs: params.retryDelayMs,
        onAttempt: params.onAttempt,
      });

    default:
      throw new Error(`未知的模型类型: ${modelType}`);
  }
};

/**
 * 获取模型的估计生成时间（秒）
 */
export const getEstimatedGenerationTime = (modelType: ModelType): number => {
  const config = getModelConfig(modelType);
  return config.estimatedTimeSeconds;
};

/**
 * 获取模型支持的最大参考图数量
 */
export const getMaxReferenceImages = (modelType: ModelType): number => {
  const config = getModelConfig(modelType);
  return config.maxReferenceImages;
};
