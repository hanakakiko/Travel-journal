/**
 * 手帐本与手帐页面管理模块
 * 负责与 CloudBase 数据库的交互
 */

import { getDb, getCurrentUserId, ensureAnonymousLogin } from "./cloudbase";
import type { JournalNotebook, JournalPageEntry } from "../types";

// ── 集合名称 ──────────────────────────────────────────────────────────────

const NOTEBOOKS_COLLECTION = "journals_notebooks";
const PAGES_COLLECTION = "journals_pages";

// ── 工具函数 ──────────────────────────────────────────────────────────────

/**
 * 检查 CloudBase 操作是否成功
 * CloudBase 的成功状态可能是：
 * - code: "0" (字符串)
 * - code: 0 (数字)
 * - 没有 code 字段但有 data (某些操作)
 * 失败状态通常有 error 字段或 code 不为 0
 */
function isSuccess(result: any): boolean {
  // 如果有 error 字段，说明失败
  if (result?.error) return false;
  // 如果 code 明确为 0，说明成功
  if (result?.code === "0" || result?.code === 0) return true;
  // 如果有 data 且没有 error，也认为是成功（某些查询操作）
  if (result?.data !== undefined && !result?.error) return true;
  // 默认认为失败
  return false;
}

// ── 手帐本操作 ────────────────────────────────────────────────────────────

/**
 * 创建一个新的手帐本
 */
export async function createNotebook(
  name: string,
  coverImageUrl: string
): Promise<JournalNotebook> {
  await ensureAnonymousLogin();
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("未能获取用户 ID");

  const now = Date.now();
  const id = `notebook_${userId}_${now}`;

  const notebook: JournalNotebook = {
    id,
    userId,
    name,
    coverImageUrl,
    pageCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  const db = getDb();
  const result = await db.collection(NOTEBOOKS_COLLECTION).add(notebook);

  if (!isSuccess(result)) {
    throw new Error(`创建手帐本失败: ${result.message || JSON.stringify(result)}`);
  }

  return notebook;
}

/**
 * 获取当前用户的所有手帐本
 */
export async function getAllNotebooks(): Promise<JournalNotebook[]> {
  try {
    await ensureAnonymousLogin();
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("未能获取用户 ID");

    const db = getDb();
    const result = await db
      .collection(NOTEBOOKS_COLLECTION)
      .where({ userId })
      .orderBy("createdAt", "desc")
      .get();

    if (!isSuccess(result)) {
      const errorMsg = result.message || JSON.stringify(result);
      console.error("CloudBase 查询错误详情:", result);
      throw new Error(`获取手帐本列表失败: ${errorMsg}`);
    }

    // 确保返回数组（即使 data 为 undefined）
    const notebooks = Array.isArray(result.data) ? result.data : [];
    console.log("成功获取手帐本:", notebooks.length);
    return notebooks;
  } catch (error) {
    console.error("getAllNotebooks 详细错误:", error);
    // 如果是集合不存在的错误，提供更友好的提示
    if (error instanceof Error && error.message.includes("not exist")) {
      throw new Error("还没有创建手帐本集合，请先在 CloudBase 创建 journals_notebooks 集合。参考: CLOUDBASE_QUICK_SETUP.md");
    }
    throw error;
  }
}

/**
 * 获取指定手帐本的详情
 */
export async function getNotebookById(notebookId: string): Promise<JournalNotebook | null> {
  try {
    await ensureAnonymousLogin();
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("未能获取用户 ID");

    const db = getDb();
    const result = await db
      .collection(NOTEBOOKS_COLLECTION)
      .where({ id: notebookId, userId })
      .get();

    if (!isSuccess(result)) {
      const errorMsg = result.message || JSON.stringify(result);
      console.error("CloudBase 查询错误详情:", result);
      throw new Error(`获取手帐本失败: ${errorMsg}`);
    }

    return Array.isArray(result.data) ? result.data[0] || null : null;
  } catch (error) {
    console.error("getNotebookById 详细错误:", error);
    if (error instanceof Error && error.message.includes("not exist")) {
      throw new Error("集合不存在，请先在 CloudBase 创建 journals_notebooks 集合");
    }
    throw error;
  }
}

/**
 * 更新手帐本信息
 */
export async function updateNotebook(
  notebookId: string,
  updates: Partial<Pick<JournalNotebook, "name" | "coverImageUrl">>
): Promise<void> {
  await ensureAnonymousLogin();
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("未能获取用户 ID");

  const db = getDb();
  const result = await db
    .collection(NOTEBOOKS_COLLECTION)
    .where({ id: notebookId, userId })
    .update({
      ...updates,
      updatedAt: Date.now(),
    });

  if (!isSuccess(result)) {
    throw new Error(`更新手帐本失败: ${result.message || JSON.stringify(result)}`);
  }
}

/**
 * 删除手帐本（会自动删除其中的所有页面）
 */
export async function deleteNotebook(notebookId: string): Promise<void> {
  await ensureAnonymousLogin();
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("未能获取用户 ID");

  const db = getDb();

  // 先删除此手帐本的所有页面
  const pagesResult = await db
    .collection(PAGES_COLLECTION)
    .where({ notebookId, userId })
    .remove();

  if (!isSuccess(pagesResult)) {
    console.warn(`删除手帐页面失败: ${pagesResult.message || JSON.stringify(pagesResult)}`);
  }

  // 再删除手帐本本身
  const result = await db
    .collection(NOTEBOOKS_COLLECTION)
    .where({ id: notebookId, userId })
    .remove();

  if (!isSuccess(result)) {
    throw new Error(`删除手帐本失败: ${result.message || JSON.stringify(result)}`);
  }
}

// ── 手帐页面操作 ──────────────────────────────────────────────────────────

/**
 * 添加页面到手帐本
 */
export async function addPageToNotebook(
  notebookId: string,
  imageUrl: string,
  title: string
): Promise<JournalPageEntry> {
  await ensureAnonymousLogin();
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("未能获取用户 ID");

  // 获取当前最大的 order 值
  const db = getDb();
  const existingPages = await db
    .collection(PAGES_COLLECTION)
    .where({ notebookId, userId })
    .orderBy("order", "desc")
    .limit(1)
    .get();

  const maxOrder = existingPages.data?.[0]?.order ?? -1;
  const newOrder = maxOrder + 1;

  const now = Date.now();
  const id = `page_${notebookId}_${now}`;

  const page: JournalPageEntry = {
    id,
    notebookId,
    userId,
    imageUrl,
    title,
    order: newOrder,
    createdAt: now,
  };

  const result = await db.collection(PAGES_COLLECTION).add(page);

  if (!isSuccess(result)) {
    throw new Error(`添加页面失败: ${result.message || JSON.stringify(result)}`);
  }

  // 更新手帐本的 pageCount
  await updateNotebookPageCount(notebookId);

  return page;
}

/**
 * 获取手帐本中的所有页面
 */
export async function getPagesByNotebook(notebookId: string): Promise<JournalPageEntry[]> {
  await ensureAnonymousLogin();
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("未能获取用户 ID");

  const db = getDb();
  const result = await db
    .collection(PAGES_COLLECTION)
    .where({ notebookId, userId })
    .orderBy("order", "asc")
    .get();

  if (!isSuccess(result)) {
    throw new Error(`获取页面列表失败: ${result.message || JSON.stringify(result)}`);
  }

  return Array.isArray(result.data) ? result.data : [];
}

/**
 * 删除指定页面
 */
export async function deletePage(pageId: string, notebookId: string): Promise<void> {
  await ensureAnonymousLogin();
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("未能获取用户 ID");

  const db = getDb();
  const result = await db
    .collection(PAGES_COLLECTION)
    .where({ id: pageId, notebookId, userId })
    .remove();

  if (!isSuccess(result)) {
    throw new Error(`删除页面失败: ${result.message || JSON.stringify(result)}`);
  }

  // 更新手帐本的 pageCount
  await updateNotebookPageCount(notebookId);
}

/**
 * 调整页面顺序
 * @param pageIds 按新顺序排列的页面 ID 数组
 */
export async function reorderPages(notebookId: string, pageIds: string[]): Promise<void> {
  await ensureAnonymousLogin();
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("未能获取用户 ID");

  const db = getDb();

  // 批量更新每个页面的 order 值
  for (let i = 0; i < pageIds.length; i++) {
    const pageId = pageIds[i];
    const result = await db
      .collection(PAGES_COLLECTION)
      .where({ id: pageId, notebookId, userId })
      .update({ order: i });

    if (!isSuccess(result)) {
      throw new Error(`调整页面顺序失败: ${result.message || JSON.stringify(result)}`);
    }
  }
}

// ── 辅助函数 ──────────────────────────────────────────────────────────────

/**
 * 更新手帐本的页面计数
 */
async function updateNotebookPageCount(notebookId: string): Promise<void> {
  await ensureAnonymousLogin();
  const userId = await getCurrentUserId();
  if (!userId) return;

  const db = getDb();

  // 获取页面总数
  const pagesResult = await db
    .collection(PAGES_COLLECTION)
    .where({ notebookId, userId })
    .count();

  if (isSuccess(pagesResult)) {
    const pageCount = pagesResult.total || 0;

    await db
      .collection(NOTEBOOKS_COLLECTION)
      .where({ id: notebookId, userId })
      .update({
        pageCount,
        updatedAt: Date.now(),
      });
  }
}
