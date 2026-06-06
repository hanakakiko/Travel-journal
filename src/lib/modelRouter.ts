/**
 * 模型路由系统
 * 根据用户选择的模型，调用对应的 API 实现
 */

import type { ModelType } from "./modelConfig";
import { getModelConfig } from "./modelConfig";
import { callGenerateImageFunction } from "./cloudbase";
import { isCloudbaseModelProxyEnabled } from "./deploymentMode";
import { callFlux2ProPic2Pic, callKratosUnifiedPic2Pic, callQsGptImage2, callVApiGptImage2, callVApiSeedream4 } from "./modelClient";
import type { KratosAttemptInfo } from "./modelClient";

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
