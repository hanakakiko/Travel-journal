/**
 * 模板管理工具
 * 负责保存、加载、删除用户的配置模板。
 *
 * 存储策略（双写）：
 *  1. 优先使用腾讯云 CloudBase 数据库（集合名：journal_templates）
 *  2. 同时在 localStorage 做本地缓存，断网时也能正常使用
 *  3. 所有云端操作失败时静默降级为仅本地操作，不阻断 UI 流程
 */

import type { SavedTemplate, UserAnswers, StyleId, TemplateId } from "../types";
import { ensureAnonymousLogin, getCurrentUserId, getDb } from "./cloudbase";

const STORAGE_KEY = "journal-templates";
const COLLECTION = "journal_templates";

// ── 本地 localStorage 操作（离线缓存层）────────────────────────────────────────

function localGetAll(): SavedTemplate[] {
  try {
    const data = window.localStorage.getItem(STORAGE_KEY);
    return data ? (JSON.parse(data) as SavedTemplate[]) : [];
  } catch {
    return [];
  }
}

function localSave(templates: SavedTemplate[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch {
    // localStorage 不可用时静默失败
  }
}

// ── 云端 CloudBase 数据库操作 ─────────────────────────────────────────────────

/**
 * 从云端拉取当前用户的模板列表，并更新本地缓存。
 * 失败时返回本地缓存。
 */
async function cloudFetchAll(): Promise<SavedTemplate[]> {
  try {
    await ensureAnonymousLogin();
    const uid = await getCurrentUserId();
    if (!uid) return localGetAll();

    const db = getDb();
    const result = await db
      .collection(COLLECTION)
      .where({ uid })
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const templates = (result.data ?? []) as SavedTemplate[];
    // 更新本地缓存
    localSave(templates);
    return templates;
  } catch {
    // 网络失败时降级到本地
    return localGetAll();
  }
}

/**
 * 向云端写入一条新模板文档，失败时静默。
 * 文档 ID 使用模板自己的 id 字段，方便后续精准删除。
 */
async function cloudAdd(template: SavedTemplate): Promise<void> {
  try {
    await ensureAnonymousLogin();
    const uid = await getCurrentUserId();
    if (!uid) return;

    const db = getDb();
    // 用模板 id 作为文档 id，保证 idempotent
    await db.collection(COLLECTION).doc(template.id).set({ ...template, uid });
  } catch {
    // 静默失败，本地已保存
  }
}

/**
 * 从云端删除指定模板文档，失败时静默。
 */
async function cloudDelete(templateId: string): Promise<void> {
  try {
    await ensureAnonymousLogin();
    const db = getDb();
    await db.collection(COLLECTION).doc(templateId).remove();
  } catch {
    // 静默失败，本地已删除
  }
}

// ── 公开 API（同步版，兼容现有调用方）────────────────────────────────────────

/**
 * 获取所有已保存的模板（同步，读本地缓存）。
 * 如果需要最新云端数据，请使用 getAllTemplatesAsync()。
 */
export const getAllTemplates = (): SavedTemplate[] => localGetAll();

/**
 * 获取所有已保存的模板（异步，优先从云端拉取）。
 */
export const getAllTemplatesAsync = (): Promise<SavedTemplate[]> => cloudFetchAll();

/**
 * 保存一个新模板（本地立即生效，云端异步同步）。
 */
export const saveTemplate = (
  name: string,
  answers: UserAnswers,
  styleId: StyleId,
  templateId: TemplateId,
  coverImageUrl?: string,
): SavedTemplate => {
  const templates = localGetAll();

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
  localSave(templates);

  // 异步同步到云端（不等待，不阻断 UI）
  void cloudAdd(newTemplate);

  return newTemplate;
};

/**
 * 删除一个模板（本地立即生效，云端异步同步）。
 */
export const deleteTemplate = (templateId: string): void => {
  const templates = localGetAll();
  const filtered = templates.filter((t) => t.id !== templateId);
  localSave(filtered);

  // 异步从云端删除
  void cloudDelete(templateId);
};

/**
 * 更新模板名称（仅本地，轻量操作）。
 */
export const renameTemplate = (templateId: string, newName: string): void => {
  const templates = localGetAll();
  const template = templates.find((t) => t.id === templateId);

  if (template) {
    template.name = newName;
    localSave(templates);
  }
};

/**
 * 获取单个模板（本地查找）。
 */
export const getTemplate = (templateId: string): SavedTemplate | null => {
  const templates = localGetAll();
  return templates.find((t) => t.id === templateId) ?? null;
};
