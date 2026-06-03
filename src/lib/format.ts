export const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

export const formatDate = (value?: string | Date) => {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const formatShutter = (value: unknown) => {
  if (typeof value !== "number" || value <= 0) return "";
  if (value < 1) return `1/${Math.round(1 / value)}s`;
  return `${value.toFixed(value > 10 ? 0 : 1)}s`;
};

export const formatCoordinate = (latitude?: number, longitude?: number) => {
  if (typeof latitude !== "number" || typeof longitude !== "number") return "";
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
};

export const clampText = (value: string, length = 32) => {
  if (value.length <= length) return value;
  return `${value.slice(0, length - 1)}…`;
};
