/**
 * 用户设置云端同步模块
 *
 * 统一管理所有用户个人偏好数据的云端同步：
 *  - 自定义标签 (customTags)
 *  - API 配置 (apiConfigs)
 *  - 声音设置 (soundEnabled)
 *
 * 存储策略（双写）：
 *  1. 本地 localStorage 作为实时读写层（立即生效）
 *  2. CloudBase "user_settings" 集合作为云端持久化层（异步同步）
 *  3. 网络失败时自动降级为本地缓存，静默处理
 */

import type { UserApiConfig } from "./userApiConfig";
import { ensureAnonymousLogin, getCurrentUserId, getDb } from "./cloudbase";

// ── 本地 localStorage Key ──────────────────────────────────────────────────────

const CUSTOM_TAGS_KEY = "journal-custom-tags";
const API_CONFIG_KEY = "exif-user-api-config";
const SOUND_ENABLED_KEY = "journal-sound";

// ── CloudBase 集合名 ───────────────────────────────────────────────────────────

const SETTINGS_COLLECTION = "user_settings";

// ── 用户设置数据模型 ───────────────────────────────────────────────────────────

export interface UserSettingsData {
  /** 自定义标签：{ fieldKey: ["tag1", "tag2"] } */
  customTags?: Record<string, string[]>;
  /** API 配置：{ modelType: { apiKey: "...", customEndpoint?: "..." } } */
  apiConfigs?: UserApiConfig;
  /** 声音开关：true | false */
  soundEnabled?: boolean;
  /** 最后修改时间戳 */
  updatedAt?: number;
}

// ── 本地 localStorage 操作 ─────────────────────────────────────────────────────

function localGetSettings(): UserSettingsData {
  return {
    customTags: tryParseLocal(CUSTOM_TAGS_KEY),
    apiConfigs: tryParseLocal(API_CONFIG_KEY),
    soundEnabled: tryParseLocal(SOUND_ENABLED_KEY) !== "off",
  };
}

function tryParseLocal(key: string): any {
  try {
    const data = window.localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function localSaveField(key: string, value: any): void {
  try {
    if (value === null || value === undefined) {
      window.localStorage.removeItem(key);
    } else if (typeof value === "boolean") {
      // 声音设置特殊处理
      window.localStorage.setItem(key, value ? "on" : "off");
    } else {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // localStorage 不可用时静默失败
  }
}

// ── 云端 CloudBase 数据库操作 ───────────────────────────────────────────────────

/**
 * 从云端拉取当前用户的所有设置，并更新本地缓存。
 * 失败时返回本地缓存。
 */
export async function cloudFetchSettings(): Promise<UserSettingsData> {
  try {
    await ensureAnonymousLogin();
    const uid = await getCurrentUserId();
    if (!uid) return localGetSettings();

    const db = getDb();
    const result = await db.collection(SETTINGS_COLLECTION).doc(uid).get();

    const settings = (result.data?.[0] ?? {}) as UserSettingsData;
    // 同步本地缓存
    if (settings.customTags) localSaveField(CUSTOM_TAGS_KEY, settings.customTags);
    if (settings.apiConfigs) localSaveField(API_CONFIG_KEY, settings.apiConfigs);
    if (settings.soundEnabled !== undefined) {
      localSaveField(SOUND_ENABLED_KEY, settings.soundEnabled);
    }

    return settings;
  } catch {
    // 网络失败时降级到本地
    return localGetSettings();
  }
}

/**
 * 将完整用户设置上传到云端（全量覆盖），失败时静默。
 * 内部由各个字段的保存函数调用。
 */
async function cloudSaveSettings(settings: UserSettingsData): Promise<void> {
  try {
    await ensureAnonymousLogin();
    const uid = await getCurrentUserId();
    if (!uid) return;

    const db = getDb();
    // 用用户 uid 作为文档 id，全量覆盖
    await db
      .collection(SETTINGS_COLLECTION)
      .doc(uid)
      .set({
        ...settings,
        uid,
        updatedAt: Date.now(),
      });
  } catch {
    // 静默失败，本地已保存
  }
}

// ── 自定义标签 API ─────────────────────────────────────────────────────────────

export function getCustomTags(): Record<string, string[]> {
  try {
    const data = window.localStorage.getItem(CUSTOM_TAGS_KEY);
    return data ? (JSON.parse(data) as Record<string, string[]>) : {};
  } catch {
    return {};
  }
}

export function saveCustomTags(customTags: Record<string, string[]>): void {
  localSaveField(CUSTOM_TAGS_KEY, customTags);
  // 异步同步到云端
  void cloudSaveSettings({ customTags, updatedAt: Date.now() });
}

export function getCustomTagsForField(fieldKey: string): string[] {
  return getCustomTags()[fieldKey] ?? [];
}

export function addCustomTagToField(fieldKey: string, tag: string): void {
  const allTags = getCustomTags();
  const fieldTags = allTags[fieldKey] ?? [];
  if (!fieldTags.includes(tag)) {
    fieldTags.push(tag);
    allTags[fieldKey] = fieldTags;
    saveCustomTags(allTags);
  }
}

export function removeCustomTagFromField(fieldKey: string, tag: string): void {
  const allTags = getCustomTags();
  const fieldTags = allTags[fieldKey] ?? [];
  const filtered = fieldTags.filter((t) => t !== tag);
  if (filtered.length > 0) {
    allTags[fieldKey] = filtered;
  } else {
    delete allTags[fieldKey];
  }
  saveCustomTags(allTags);
}

export function clearAllCustomTags(): void {
  localSaveField(CUSTOM_TAGS_KEY, null);
  // 异步同步到云端
  void cloudSaveSettings({ customTags: {}, updatedAt: Date.now() });
}

// ── API 配置 API ──────────────────────────────────────────────────────────────

export function getApiConfigs(): UserApiConfig | null {
  try {
    const data = window.localStorage.getItem(API_CONFIG_KEY);
    return data ? (JSON.parse(data) as UserApiConfig) : null;
  } catch {
    return null;
  }
}

export function saveApiConfigs(apiConfigs: UserApiConfig): void {
  localSaveField(API_CONFIG_KEY, apiConfigs);
  // 异步同步到云端
  void cloudSaveSettings({ apiConfigs, updatedAt: Date.now() });
}

export function getModelApiConfig(modelType: string): any {
  const configs = getApiConfigs();
  return configs?.[modelType as keyof UserApiConfig] ?? null;
}

export function saveModelApiConfig(modelType: string, config: any): void {
  const allConfigs = getApiConfigs() || {};
  allConfigs[modelType as keyof UserApiConfig] = config;
  saveApiConfigs(allConfigs);
}

export function clearModelApiConfig(modelType: string): void {
  const allConfigs = getApiConfigs() || {};
  delete allConfigs[modelType as keyof UserApiConfig];
  if (Object.keys(allConfigs).length === 0) {
    localSaveField(API_CONFIG_KEY, null);
    void cloudSaveSettings({ apiConfigs: {}, updatedAt: Date.now() });
  } else {
    saveApiConfigs(allConfigs);
  }
}

export function clearAllApiConfigs(): void {
  localSaveField(API_CONFIG_KEY, null);
  void cloudSaveSettings({ apiConfigs: {}, updatedAt: Date.now() });
}

// ── 声音设置 API ──────────────────────────────────────────────────────────────

export function getSoundEnabled(): boolean {
  try {
    return window.localStorage.getItem(SOUND_ENABLED_KEY) !== "off";
  } catch {
    return true;
  }
}

export function saveSoundEnabled(enabled: boolean): void {
  localSaveField(SOUND_ENABLED_KEY, enabled);
  // 异步同步到云端
  void cloudSaveSettings({ soundEnabled: enabled, updatedAt: Date.now() });
}

// ── 初始化和清理 ──────────────────────────────────────────────────────────────

/**
 * 应用启动时调用：完整初始化所有用户设置
 * （登录 → 从云端加载 → 同步到本地）
 */
export async function initializeUserSettings(): Promise<UserSettingsData> {
  await ensureAnonymousLogin();
  return cloudFetchSettings();
}

/**
 * 登出时调用：清理本地缓存中的所有用户设置
 * 防止其他用户看到前一个用户的数据
 */
export function clearAllLocalSettings(): void {
  try {
    localSaveField(CUSTOM_TAGS_KEY, null);
    localSaveField(API_CONFIG_KEY, null);
    localSaveField(SOUND_ENABLED_KEY, null);
    console.log('[UserSettings] Cleared all local settings');
  } catch (err) {
    console.error('[UserSettings] Failed to clear local settings:', err);
  }
}
