/**
 * 表单草稿存储工具
 * 自动保存表单数据到浏览器本地存储，支持表单关闭后恢复
 */

import type { UserAnswers, PhotoAsset } from "../types";

const DRAFT_KEY = "form_draft_answers";
const PHOTOS_KEY = "form_draft_photos";
const STYLE_KEY = "form_draft_styleId";
const TEMPLATE_KEY = "form_draft_templateId";
const TIMESTAMP_KEY = "form_draft_timestamp";

interface FormDraft {
  answers: UserAnswers;
  photos: PhotoAsset[];
  styleId: string;
  templateId: string;
  timestamp: number;
}

/**
 * 保存表单数据到本地存储
 */
export const saveFormDraft = (
  answers: UserAnswers,
  photos: PhotoAsset[],
  styleId: string,
  templateId: string
): void => {
  try {
    const draft: FormDraft = {
      answers,
      photos,
      styleId,
      templateId,
      timestamp: Date.now(),
    };
    
    // 分别存储各部分数据，增加容错性
    localStorage.setItem(DRAFT_KEY, JSON.stringify(answers));
    localStorage.setItem(PHOTOS_KEY, JSON.stringify(photos));
    localStorage.setItem(STYLE_KEY, styleId);
    localStorage.setItem(TEMPLATE_KEY, templateId);
    localStorage.setItem(TIMESTAMP_KEY, String(Date.now()));
  } catch (error) {
    // localStorage 可能已满，静默处理
    console.warn("Failed to save form draft to localStorage:", error);
  }
};

/**
 * 从本地存储恢复表单数据
 */
export const loadFormDraft = (): FormDraft | null => {
  try {
    const answersStr = localStorage.getItem(DRAFT_KEY);
    const photosStr = localStorage.getItem(PHOTOS_KEY);
    const styleId = localStorage.getItem(STYLE_KEY);
    const templateId = localStorage.getItem(TEMPLATE_KEY);
    const timestamp = localStorage.getItem(TIMESTAMP_KEY);

    if (!answersStr || !photosStr || !styleId || !templateId) {
      return null;
    }

    const answers = JSON.parse(answersStr) as UserAnswers;
    const photos = JSON.parse(photosStr) as PhotoAsset[];

    return {
      answers,
      photos,
      styleId,
      templateId,
      timestamp: timestamp ? parseInt(timestamp, 10) : Date.now(),
    };
  } catch (error) {
    // 解析失败，返回 null
    console.warn("Failed to load form draft from localStorage:", error);
    return null;
  }
};

/**
 * 清空表单草稿
 */
export const clearFormDraft = (): void => {
  try {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(PHOTOS_KEY);
    localStorage.removeItem(STYLE_KEY);
    localStorage.removeItem(TEMPLATE_KEY);
    localStorage.removeItem(TIMESTAMP_KEY);
  } catch (error) {
    console.warn("Failed to clear form draft from localStorage:", error);
  }
};

/**
 * 获取表单草稿的最后保存时间
 */
export const getFormDraftTimestamp = (): number | null => {
  try {
    const timestamp = localStorage.getItem(TIMESTAMP_KEY);
    return timestamp ? parseInt(timestamp, 10) : null;
  } catch (error) {
    return null;
  }
};

/**
 * 检查是否存在有效的草稿数据
 */
export const hasFormDraft = (): boolean => {
  try {
    return (
      localStorage.getItem(DRAFT_KEY) !== null &&
      localStorage.getItem(PHOTOS_KEY) !== null &&
      localStorage.getItem(STYLE_KEY) !== null &&
      localStorage.getItem(TEMPLATE_KEY) !== null
    );
  } catch (error) {
    return false;
  }
};
