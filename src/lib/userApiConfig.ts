/**
 * 用户 API 配置管理（适配层）
 *
 * 功能已迁移到 userSettings.ts，此文件保留为兼容层，
 * 确保现有代码无需改动就能使用云端同步能力。
 */

import {
  getApiConfigs,
  saveApiConfigs,
  getModelApiConfig as settingsGetModelApiConfig,
  saveModelApiConfig as settingsSaveModelApiConfig,
  clearModelApiConfig as settingsClearModelApiConfig,
  clearAllApiConfigs,
} from "./userSettings";

export type ModelType = "gpt-2" | "flux-2-pro" | "qs-gpt-image-2" | "v-api-gpt-image-2" | "v-api-seedream-4-5";

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

/**
 * 从 localStorage 读取用户的 API 配置
 */
export const loadUserApiConfig = (): UserApiConfig | null => {
  return getApiConfigs();
};

/**
 * 为特定模型保存 API 配置
 */
export const saveModelApiConfig = (modelType: ModelType, config: ModelApiConfig): void => {
  settingsSaveModelApiConfig(modelType, config);
};

/**
 * 获取特定模型的 API 配置
 */
export const getModelApiConfig = (modelType: ModelType): ModelApiConfig | null => {
  return settingsGetModelApiConfig(modelType);
};

/**
 * 清除特定模型的 API 配置
 */
export const clearModelApiConfig = (modelType: ModelType): void => {
  settingsClearModelApiConfig(modelType);
};

/**
 * 清除所有用户的 API 配置
 */
export const clearUserApiConfig = (): void => {
  clearAllApiConfigs();
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
