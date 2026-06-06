/**
 * Deployment mode switches.
 *
 * Production builds default to CloudBase because Vite dev proxy is unavailable
 * after static hosting. Local dev keeps the existing proxy/COS behavior unless
 * explicitly overridden in .env.local.
 */

const normalize = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim().toLowerCase() : undefined;

const isDisabled = (value: unknown): boolean => {
  const normalized = normalize(value);
  return normalized === "false" || normalized === "0" || normalized === "off" || normalized === "no";
};

export const isCloudbaseModelProxyEnabled = (): boolean => {
  const override = normalize(import.meta.env.VITE_USE_CLOUDBASE_MODEL_PROXY);
  if (override !== undefined) return !isDisabled(override);
  return import.meta.env.PROD;
};

export const isCloudbaseModelVisible = (modelType: string): boolean => {
  const configured = normalize(import.meta.env.VITE_CLOUDBASE_AVAILABLE_MODELS);
  if (!configured) return true;
  return configured
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .includes(modelType);
};

export type UploadProvider = "cloudbase" | "cos";

export const getUploadProvider = (): UploadProvider => {
  const override = normalize(import.meta.env.VITE_UPLOAD_PROVIDER);
  if (override === "cloudbase" || override === "cos") return override;
  return import.meta.env.PROD ? "cloudbase" : "cos";
};
