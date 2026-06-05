/**
 * 自定义标签持久化工具
 * 负责将用户添加的自定义标签保存到 localStorage
 */

const CUSTOM_TAGS_STORAGE_KEY = "journal-custom-tags";

/**
 * 获取所有自定义标签
 */
export const getAllCustomTags = (): Record<string, string[]> => {
  try {
    const data = window.localStorage.getItem(CUSTOM_TAGS_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

/**
 * 保存自定义标签
 */
export const saveCustomTags = (customTags: Record<string, string[]>): void => {
  try {
    window.localStorage.setItem(CUSTOM_TAGS_STORAGE_KEY, JSON.stringify(customTags));
  } catch {
    // Local storage is optional
  }
};

/**
 * 获取某个字段的自定义标签
 */
export const getCustomTagsForField = (fieldKey: string): string[] => {
  const allTags = getAllCustomTags();
  return allTags[fieldKey] ?? [];
};

/**
 * 添加自定义标签到某个字段
 */
export const addCustomTagToField = (fieldKey: string, tag: string): void => {
  const allTags = getAllCustomTags();
  const fieldTags = allTags[fieldKey] ?? [];
  
  if (!fieldTags.includes(tag)) {
    fieldTags.push(tag);
    allTags[fieldKey] = fieldTags;
    saveCustomTags(allTags);
  }
};

/**
 * 从某个字段删除自定义标签
 */
export const removeCustomTagFromField = (fieldKey: string, tag: string): void => {
  const allTags = getAllCustomTags();
  const fieldTags = allTags[fieldKey] ?? [];
  
  const filtered = fieldTags.filter((t) => t !== tag);
  if (filtered.length > 0) {
    allTags[fieldKey] = filtered;
  } else {
    delete allTags[fieldKey];
  }
  
  saveCustomTags(allTags);
};

/**
 * 清空所有自定义标签
 */
export const clearAllCustomTags = (): void => {
  try {
    window.localStorage.removeItem(CUSTOM_TAGS_STORAGE_KEY);
  } catch {
    // Local storage is optional
  }
};
