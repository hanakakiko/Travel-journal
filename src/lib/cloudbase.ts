/**
 * 腾讯云 CloudBase 初始化与认证模块
 *
 * 环境 ID: my-travel-journal-d5d06m1a517f14
 * 文档: https://docs.cloudbase.net/
 */

import cloudbase from "@cloudbase/js-sdk";

const ENV_ID = "my-travel-journal-d5d06m1a517f14";

// ── 单例 App 实例 ─────────────────────────────────────────────────────────────

let _app: ReturnType<typeof cloudbase.init> | null = null;

export function getApp() {
  if (!_app) {
    _app = cloudbase.init({ env: ENV_ID });
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
  const auth = app.auth();

  // 检查是否已有登录态
  const loginState = await auth.getLoginState();
  if (loginState) return;

  // 发起匿名登录
  const result = await auth.signInAnonymously();
  if (result.error) {
    throw new Error(`匿名登录失败: ${JSON.stringify(result.error)}`);
  }
}

/**
 * 获取当前登录用户的 openId（匿名 uid）。
 * 若未登录则返回 null。
 */
export async function getCurrentUserId(): Promise<string | null> {
  const app = getApp();
  const user = await app.auth().getCurrentUser();
  return user?.uid ?? null;
}

// ── 数据库快捷访问 ───────────────────────────────────────────────────────────

export function getDb() {
  return getApp().database();
}
