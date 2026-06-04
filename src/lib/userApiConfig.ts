/**
 * 用户 API 配置管理
 * 允许用户为每个模型输入自己的 API Key 和自定义端点
 */

export type ModelType = "gpt-2" | "flux-2-pro" | "qs-gpt-image-2";

export type ModelApiConfig = {
  /** 用户提供的 API Key */
  apiKey: string;
  /** 自定义的 API 端点（可选，如果不填则使用默认端点） */
  customEndpoint?: string;
};

export type UserApiConfig = {
  /** 为每个模型单独保存的 API 配置 */
  [key in ModelType]?: ModelApiConfig;
};

const STORAGE_KEY = "exif-user-api-config";

/**
 * 从 localStorage 读取用户的 API 配置
 */
export const loadUserApiConfig = (): UserApiConfig | null => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as UserApiConfig;
  } catch {
    return null;
  }
};

/**
 * 为特定模型保存 API 配置
 */
export const saveModelApiConfig = (modelType: ModelType, config: ModelApiConfig): void => {
  try {
    const allConfigs = loadUserApiConfig() || {};
    allConfigs[modelType] = config;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(allConfigs));
  } catch {
    // localStorage 不可用时静默失败
  }
};

/**
 * 获取特定模型的 API 配置
 */
export const getModelApiConfig = (modelType: ModelType): ModelApiConfig | null => {
  const allConfigs = loadUserApiConfig();
  return allConfigs?.[modelType] || null;
};

/**
 * 清除特定模型的 API 配置
 */
export const clearModelApiConfig = (modelType: ModelType): void => {
  try {
    const allConfigs = loadUserApiConfig() || {};
    delete allConfigs[modelType];
    if (Object.keys(allConfigs).length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(allConfigs));
    }
  } catch {
    // localStorage 不可用时静默失败
  }
};

/**
 * 清除所有用户的 API 配置
 */
export const clearUserApiConfig = (): void => {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage 不可用时静默失败
  }
};

/**
 * 验证 API Key 是否有效（基本检查）
 */
export const isValidApiKey = (apiKey: string): boolean => {
  return !!(apiKey && apiKey.trim().length > 0);
};

/**
 * 验证自定义端点 URL 是否有效
 */
export const isValidEndpoint = (endpoint: string): boolean => {
  if (!endpoint) return true; // 可选字段
  try {
    new URL(endpoint);
    return true;
  } catch {
    return false;
  }
};
