/**
 * 手帐本与手帐页面管理模块
 * 负责与 CloudBase 数据库的交互
 */

import { getDb, getCurrentUserId, ensureAnonymousLogin } from "./cloudbase";
import type { JournalNotebook, JournalPageEntry } from "../types";

// ── 集合名称 ──────────────────────────────────────────────────────────────

const NOTEBOOKS_COLLECTION = "journals_notebooks";
const PAGES_COLLECTION = "journals_pages";

type StoredJournalPageEntry = JournalPageEntry & { _id?: string };
type PageOrderUpdate = {
  pageId: string;
  order: number;
  page?: StoredJournalPageEntry;
};
type PageCollection = {
  doc: (id: string) => {
    update: (data: object) => Promise<unknown>;
  };
  where: (query: object) => {
    get: () => Promise<unknown>;
    remove: () => Promise<unknown>;
    update: (data: object) => Promise<unknown>;
  };
};
type OperationResult = Record<string, unknown>;

// ── 工具函数 ──────────────────────────────────────────────────────────────

/**
 * 检查 CloudBase 操作是否成功
 * CloudBase 的成功状态可能是：
 * - code: "0" (字符串)
 * - code: 0 (数字)
 * - 没有 code 字段但有 data (某些查询操作)
 * - count 操作返回 total
 * - add/update 操作返回 id（说明成功插入/更新）
 * - set 操作返回 upsertId/upsertedId（说明成功插入）
 * - 有操作计数字段 insertedCount/modifiedCount/deletedCount 或 inserted/updated/deleted > 0
 * 失败状态通常有 error 字段或 code 不为 0
 */
function isRecord(value: unknown): value is OperationResult {
  return typeof value === "object" && value !== null;
}

function hasPositiveNumberField(result: OperationResult, field: string): boolean {
  const value = result[field];

  return typeof value === "number" && value > 0;
}

function hasNonEmptyStringField(result: OperationResult, field: string): boolean {
  const value = result[field];

  return typeof value === "string" && value.length > 0;
}

function hasNonEmptyArrayField(result: OperationResult, field: string): boolean {
  const value = result[field];

  return Array.isArray(value) && value.length > 0;
}

function isSuccess(result: unknown): boolean {
  if (!isRecord(result)) return false;
  // 如果有 error 字段，说明失败
  if (result.error) return false;
  // 如果 code 明确为 0，说明成功
  if (result.code === "0" || result.code === 0) return true;
  // 如果有 data 且没有 error，也认为是成功（某些查询操作）
  if (result.data !== undefined && !result.error) return true;
  // add() 操作成功时应该返回 id（新插入记录的 ID）
  if (hasNonEmptyStringField(result, "id")) return true;
  if (hasNonEmptyArrayField(result, "ids")) return true;
  if (hasNonEmptyArrayField(result, "insertedIds")) return true;
  if (
    hasNonEmptyStringField(result, "upsertId") ||
    hasNonEmptyStringField(result, "upsertedId")
  ) {
    return true;
  }
  if (result.total !== undefined && !result.error) return true;
  // 通过检查操作计数字段来判断 update/delete 操作是否成功
  if (result.insertedCount !== undefined) {
    return hasPositiveNumberField(result, "insertedCount");
  }
  if (result.inserted !== undefined) {
    return hasPositiveNumberField(result, "inserted");
  }
  if (result.modifiedCount !== undefined) {
    return hasPositiveNumberField(result, "modifiedCount");
  }
  if (result.updated !== undefined) {
    return hasPositiveNumberField(result, "updated");
  }
  if (result.deletedCount !== undefined) {
    return hasPositiveNumberField(result, "deletedCount");
  }
  if (result.deleted !== undefined) {
    return hasPositiveNumberField(result, "deleted");
  }
  // 默认认为失败
  return false;
}

function isWriteAccepted(result: unknown): boolean {
  if (!isRecord(result)) return false;
  if (result.error) return false;
  if (result.code !== undefined && result.code !== "0" && result.code !== 0) return false;
  if (hasNonEmptyStringField(result, "requestId")) return true;
  return isSuccess(result);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toPages(result: unknown): StoredJournalPageEntry[] {
  if (
    isRecord(result) &&
    "data" in result &&
    Array.isArray(result.data)
  ) {
    return result.data as StoredJournalPageEntry[];
  }

  return [];
}

function sortPagesByOrder(pages: StoredJournalPageEntry[]): StoredJournalPageEntry[] {
  return [...pages].sort((a, b) => {
    const orderDiff = Number(a.order) - Number(b.order);

    if (orderDiff !== 0) return orderDiff;

    return Number(a.createdAt) - Number(b.createdAt);
  });
}

async function applyPageOrderUpdates(
  pagesCollection: PageCollection,
  notebookId: string,
  userId: string,
  updates: PageOrderUpdate[]
): Promise<void> {
  for (const { pageId, order, page } of updates) {
    const query = page?._id
      ? pagesCollection.doc(page._id)
      : pagesCollection.where({ id: pageId, notebookId, userId });
    const result = await query.update({ order });

    if (!isWriteAccepted(result)) {
      throw new Error(`调整页面顺序失败: ${getResultMessage(result)}`);
    }
  }
}

function getResultMessage(result: unknown): string {
  if (
    isRecord(result) &&
    "message" in result &&
    typeof result.message === "string"
  ) {
    return result.message;
  }

  return JSON.stringify(result);
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
    
    // 调试日志：打印用户 ID
    console.log("[getAllNotebooks] 当前用户 ID:", userId);
    
    // 注意：某些 CloudBase 版本在使用 where + orderBy 时可能有问题
    // 为了兼容性，先尝试带 orderBy，如果失败则回退到不带 orderBy
    let result: any;
    try {
      result = await db
        .collection(NOTEBOOKS_COLLECTION)
        .where({ userId })
        .orderBy("createdAt", "desc")
        .get();
    } catch (orderByError) {
      console.warn("[getAllNotebooks] orderBy 查询失败，尝试不带 orderBy:", orderByError);
      // 回退方案：不使用 orderBy，在客户端排序
      result = await db
        .collection(NOTEBOOKS_COLLECTION)
        .where({ userId })
        .get();
      
      // 客户端排序
      if (Array.isArray(result?.data)) {
        result.data.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
      }
    }

    // 详细的调试日志
    console.log("[getAllNotebooks] 原始响应:", result);
    console.log("[getAllNotebooks] 响应 code:", result?.code);
    console.log("[getAllNotebooks] 响应 error:", (result as any)?.error);
    console.log("[getAllNotebooks] 响应 data 类型:", typeof result?.data);
    console.log("[getAllNotebooks] 响应 data 内容:", result?.data);

    if (!isSuccess(result)) {
      const errorMsg = (result as any)?.error?.message || (result as any)?.message || (result as any)?.error || JSON.stringify(result);
      console.error("[getAllNotebooks] CloudBase 查询错误详情:", result);
      throw new Error(`获取手帐本列表失败: ${errorMsg}`);
    }

    // 确保返回数组（即使 data 为 undefined）
    const notebooks = Array.isArray(result.data) ? result.data : [];
    console.log("[getAllNotebooks] 成功获取手帐本数量:", notebooks.length);
    
    // 验证返回的数据结构
    if (notebooks.length > 0) {
      console.log("[getAllNotebooks] 第一个手帐本:", notebooks[0]);
    }
    
    return notebooks;
  } catch (error) {
    console.error("[getAllNotebooks] 详细错误:", error);
    
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
  
  let existingPages: any;
  try {
    existingPages = await db
      .collection(PAGES_COLLECTION)
      .where({ notebookId, userId })
      .orderBy("order", "desc")
      .limit(1)
      .get();
  } catch (orderByError) {
    console.warn("[addPageToNotebook] orderBy 查询失败，尝试不带 orderBy:", orderByError);
    // 回退方案：不使用 orderBy，改用 limit + 客户端排序
    existingPages = await db
      .collection(PAGES_COLLECTION)
      .where({ notebookId, userId })
      .get();
    
    // 客户端排序并取最大值
    if (Array.isArray(existingPages?.data) && existingPages.data.length > 0) {
      existingPages.data.sort((a: any, b: any) => (b.order || 0) - (a.order || 0));
      existingPages.data = [existingPages.data[0]]; // 只保留第一个
    }
  }

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
    // 输出详细的错误信息用于调试
    console.error("CloudBase add() 失败，返回结果:", result);
    const errorMsg = (result as any)?.message || JSON.stringify(result);
    throw new Error(`添加页面失败: ${errorMsg}`);
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
  
  // 为了兼容性，先尝试带 orderBy，如果失败则回退到不带 orderBy
  let result: any;
  try {
    result = await db
      .collection(PAGES_COLLECTION)
      .where({ notebookId, userId })
      .orderBy("order", "asc")
      .get();
  } catch (orderByError) {
    console.warn("[getPagesByNotebook] orderBy 查询失败，尝试不带 orderBy:", orderByError);
    // 回退方案：不使用 orderBy，在客户端排序
    result = await db
      .collection(PAGES_COLLECTION)
      .where({ notebookId, userId })
      .get();
    
    // 客户端排序
    if (Array.isArray(result?.data)) {
      result.data.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
    }
  }

  if (!isSuccess(result)) {
    throw new Error(`获取页面列表失败: ${(result as any)?.message || JSON.stringify(result)}`);
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
  const pagesCollection = db.collection(PAGES_COLLECTION) as PageCollection;
  const pagesResult = await pagesCollection.where({ notebookId, userId }).get();

  if (!isSuccess(pagesResult)) {
    throw new Error(`获取当前页面顺序失败: ${getResultMessage(pagesResult)}`);
  }

  const existingPages = toPages(pagesResult);
  const pageToDelete = existingPages.find((page) => page.id === pageId);

  if (!pageToDelete) {
    throw new Error("页面不存在或已删除");
  }

  const remainingPages = sortPagesByOrder(
    existingPages.filter((page) => page.id !== pageId)
  );

  const result = await pagesCollection
    .where({ id: pageId, notebookId, userId })
    .remove();

  if (!isWriteAccepted(result)) {
    throw new Error(`删除页面失败: ${getResultMessage(result)}`);
  }

  await applyPageOrderUpdates(
    pagesCollection,
    notebookId,
    userId,
    remainingPages
      .map((page, order) => ({ pageId: page.id, order, page }))
      .filter(({ page, order }) => Number(page.order) !== order)
  );

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
  const pagesCollection = db.collection(PAGES_COLLECTION) as PageCollection;
  const maxAttempts = 3;

  const getCurrentPages = async () => {
    const pagesResult = await pagesCollection.where({ notebookId, userId }).get();

    if (!isSuccess(pagesResult)) {
      throw new Error(`获取当前页面顺序失败: ${getResultMessage(pagesResult)}`);
    }

    return toPages(pagesResult);
  };

  const getPagesToUpdate = (currentPages: (JournalPageEntry & { _id?: string })[]) => {
    const currentPagesById = new Map(currentPages.map((page) => [page.id, page]));
    const missingPageId = pageIds.find((pageId) => !currentPagesById.has(pageId));

    if (missingPageId || currentPages.length !== pageIds.length) {
      throw new Error("页面列表已变化，请刷新后重试");
    }

    return pageIds
      .map((pageId, order) => ({ pageId, order, page: currentPagesById.get(pageId) }))
      .filter(({ page, order }) => Number(page?.order) !== order);
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const pagesToUpdate = getPagesToUpdate(await getCurrentPages());

    if (pagesToUpdate.length === 0) {
      return;
    }

    await applyPageOrderUpdates(pagesCollection, notebookId, userId, pagesToUpdate);

    if (attempt < maxAttempts) {
      await wait(120);
    }
  }

  await wait(120);
  if (getPagesToUpdate(await getCurrentPages()).length === 0) {
    return;
  }

  throw new Error("页面顺序同步未生效，请稍后重试");
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
