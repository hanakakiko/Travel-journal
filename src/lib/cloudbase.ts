/**
 * 腾讯云 CloudBase 初始化与认证模块
 *
 * 环境 ID: my-travel-journal-d5d06m1a517f14
 * 文档: https://docs.cloudbase.net/
 */

import cloudbase from "@cloudbase/js-sdk";
import type { ModelType } from "./modelConfig";

const ENV_ID = "my-travel-journal-d5d06m1a517f14";
const REGION = "ap-shanghai";

// ── 单例 App 实例 ─────────────────────────────────────────────────────────────

let _app: ReturnType<typeof cloudbase.init> | null = null;

export function getApp() {
  if (!_app) {
    _app = cloudbase.init({ 
      env: ENV_ID,
      region: REGION,
      auth: { detectSessionInUrl: true },
    });
  }
  return _app;
}

// ── 认证（匿名登录）────────────────────────────────────────────────────────────

/**
 * 确保当前用户已登录（匿名）。
 * 多次调用是幂等的：如果已经有登录态则直接返回，否则发起匿名登录。
 */
export async function ensureAnonymousLogin(): Promise<void> {
  const app = getApp();
  const auth = app.auth({ persistence: 'local' });

  // 先检查正式登录 session，避免已登录用户被匿名登录覆盖。
  try {
    const { data } = await auth.getSession();
    if (data?.session) return;
  } catch {
    // 兼容旧版登录态检查，继续走 getLoginState。
  }

  // 检查是否已有旧版/匿名登录态
  const loginState = await auth.getLoginState();
  if (loginState) return;

  // 发起匿名登录
  const result = await auth.signInAnonymously();
  if (result?.error) {
    throw new Error(`匿名登录失败: ${JSON.stringify(result.error)}`);
  }
}

/**
 * 获取当前登录用户的 openId（匿名 uid）。
 * 若未登录则返回 null。
 */
export async function getCurrentUserId(): Promise<string | null> {
  const app = getApp();
  const auth = app.auth({ persistence: 'local' });
  try {
    const user = await auth.getCurrentUser();
    return user?.uid ?? null;
  } catch {
    return null;
  }
}

/**
 * 获取当前用户的认证会话
 */
export async function getCurrentSession() {
  const app = getApp();
  const auth = app.auth({ persistence: 'local' });
  try {
    const { data } = await auth.getSession();
    return data?.session ?? null;
  } catch {
    return null;
  }
}

// ── 数据库快捷访问 ───────────────────────────────────────────────────────

export function getDb() {
  return getApp().database();
}

// ── 云函数调用 ────────────────────────────────────────────────────────────

/**
 * 从 CloudBase 云函数中获取 V-API Key
 * 云函数会从环境变量 V_API_KEY 中读取密钥
 */
export async function getVApiKeyFromCloudFunction(): Promise<string | null> {
  try {
    const app = getApp();
    
    // 确保用户已登录
    await ensureAnonymousLogin();
    
    // 调用云函数获取 API Key
    const result = await app.callFunction({
      name: "getVApiKey",
      data: {},
    });
    
    // 检查返回值
    if (result?.result?.code === 0 && result.result?.data?.apiKey) {
      return result.result.data.apiKey;
    }
    
    return null;
  } catch (error) {
    console.error("从 CloudBase 获取 V-API Key 失败:", error);
    return null;
  }
}

// ── AI 生成云函数代理 ─────────────────────────────────────────────────────

export type CloudbaseGenerateImageRequest = {
  modelType: ModelType;
  prompt: string;
  imageUrls: string[];
  targetWidth?: number;
  targetHeight?: number;
  timeoutMs?: number;
  /** 兼容现有 getVApiKey 云函数；更推荐直接把 V_API_KEY 配到 generateImage 云函数环境变量。 */
  apiKeyOverride?: string;
};

export type CloudbaseGenerateImageResult = {
  imageUrl: string;
  raw: unknown;
};

/**
 * 通过 CloudBase 云函数调用图像生成模型。
 * 生产环境使用它来避免浏览器 CORS，并把 API Key 留在云函数环境变量中。
 */
export async function callGenerateImageFunction(
  data: CloudbaseGenerateImageRequest,
): Promise<CloudbaseGenerateImageResult> {
  const app = getApp();
  await ensureAnonymousLogin();

  const payloadData = { ...data };
  if (
    (data.modelType === "v-api-gpt-image-2" || data.modelType === "v-api-seedream-4-5") &&
    !payloadData.apiKeyOverride
  ) {
    payloadData.apiKeyOverride = (await getVApiKeyFromCloudFunction()) ?? undefined;
  }

  const result = await app.callFunction({
    name: "generateImage",
    data: payloadData,
  });

  const payload = result?.result;
  if (!payload || payload.code !== 0) {
    const message =
      payload?.message ||
      payload?.error ||
      "CloudBase generateImage 云函数调用失败，请检查云函数日志";
    throw new Error(String(message));
  }

  const imageUrl = payload?.data?.imageUrl;
  if (typeof imageUrl !== "string" || !imageUrl.trim()) {
    throw new Error("CloudBase generateImage 云函数未返回图片链接");
  }

  return {
    imageUrl,
    raw: payload?.data?.raw ?? payload,
  };
}
