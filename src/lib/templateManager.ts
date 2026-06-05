/**
 * 模板管理工具
 * 负责保存、加载、删除用户的配置模板
 */

import type { SavedTemplate, UserAnswers, StyleId, TemplateId } from "../types";

const STORAGE_KEY = "journal-templates";

/**
 * 获取所有已保存的模板
 */
export const getAllTemplates = (): SavedTemplate[] => {
  try {
    const data = window.localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

/**
 * 保存一个新模板
 */
export const saveTemplate = (
  name: string,
  answers: UserAnswers,
  styleId: StyleId,
  templateId: TemplateId,
  coverImageUrl?: string
): SavedTemplate => {
  const templates = getAllTemplates();
  
  const newTemplate: SavedTemplate = {
    id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    createdAt: Date.now(),
    answers,
    styleId,
    templateId,
    coverImageUrl,
  };
  
  templates.push(newTemplate);
  
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch {
    // Local storage is optional
  }
  
  return newTemplate;
};

/**
 * 删除一个模板
 */
export const deleteTemplate = (templateId: string): void => {
  const templates = getAllTemplates();
  const filtered = templates.filter((t) => t.id !== templateId);
  
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    // Local storage is optional
  }
};

/**
 * 更新模板名称
 */
export const renameTemplate = (templateId: string, newName: string): void => {
  const templates = getAllTemplates();
  const template = templates.find((t) => t.id === templateId);
  
  if (template) {
    template.name = newName;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    } catch {
      // Local storage is optional
    }
  }
};

/**
 * 获取单个模板
 */
export const getTemplate = (templateId: string): SavedTemplate | null => {
  const templates = getAllTemplates();
  return templates.find((t) => t.id === templateId) || null;
};
