/**
 * 自定义标签持久化工具（适配层）
 *
 * 功能已迁移到 userSettings.ts，此文件保留为兼容层，
 * 确保现有代码无需改动就能使用云端同步能力。
 */

import {
  getCustomTags,
  saveCustomTags as cloudSaveCustomTags,
  getCustomTagsForField,
  addCustomTagToField,
  removeCustomTagFromField,
  clearAllCustomTags,
} from "./userSettings";

/**
 * 获取所有自定义标签
 */
export const getAllCustomTags = (): Record<string, string[]> => {
  return getCustomTags();
};

/**
 * 保存自定义标签
 */
export const saveCustomTags = (customTags: Record<string, string[]>): void => {
  cloudSaveCustomTags(customTags);
};

/**
 * 获取某个字段的自定义标签
 */
export const getCustomTagsForField_legacy = (fieldKey: string): string[] => {
  return getCustomTagsForField(fieldKey);
};

/**
 * 添加自定义标签到某个字段
 */
export const addCustomTagToField_legacy = (fieldKey: string, tag: string): void => {
  addCustomTagToField(fieldKey, tag);
};

/**
 * 从某个字段删除自定义标签
 */
export const removeCustomTagFromField_legacy = (fieldKey: string, tag: string): void => {
  removeCustomTagFromField(fieldKey, tag);
};

/**
 * 清空所有自定义标签
 */
export const clearAllCustomTags_legacy = (): void => {
  clearAllCustomTags();
};
