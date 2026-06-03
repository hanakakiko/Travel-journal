import exifr from "exifr";
import type { ExifTag, PhotoAsset } from "../types";
import { uploadToCos } from "./cosUploader";
import { formatBytes, formatCoordinate, formatDate, formatShutter } from "./format";

type RawExif = Record<string, unknown>;

const parseExifDate = (raw: unknown) => {
  if (raw instanceof Date) return raw.toISOString();
  if (typeof raw !== "string") return undefined;
  const normalized = raw.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const formatFNumber = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  return `f/${value.toFixed(value >= 10 ? 0 : 1)}`;
};

const formatFocal = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  return `${Math.round(value)}mm`;
};

const formatIso = (value: unknown) => {
  if (typeof value !== "number" && typeof value !== "string") return "";
  return `ISO ${value}`;
};

const makeExifTags = (exif: RawExif): ExifTag[] => {
  const latitude = typeof exif.latitude === "number" ? exif.latitude : undefined;
  const longitude = typeof exif.longitude === "number" ? exif.longitude : undefined;
  const tags: Array<ExifTag | false | ""> = [
    formatDate(parseExifDate(exif.DateTimeOriginal ?? exif.CreateDate ?? exif.ModifyDate)) && {
      label: "时间",
      value: formatDate(parseExifDate(exif.DateTimeOriginal ?? exif.CreateDate ?? exif.ModifyDate)),
    },
    exif.Make || exif.Model
      ? {
          label: "相机",
          value: [exif.Make, exif.Model].filter(Boolean).join(" "),
        }
      : "",
    exif.LensModel ? { label: "镜头", value: String(exif.LensModel) } : "",
    formatFocal(exif.FocalLength) && { label: "焦距", value: formatFocal(exif.FocalLength) },
    formatFNumber(exif.FNumber) && { label: "光圈", value: formatFNumber(exif.FNumber) },
    formatShutter(exif.ExposureTime) && { label: "快门", value: formatShutter(exif.ExposureTime) },
    formatIso(exif.ISO) && { label: "感光", value: formatIso(exif.ISO) },
    formatCoordinate(latitude, longitude) && {
      label: "坐标",
      value: formatCoordinate(latitude, longitude),
    },
  ];

  return tags.filter(Boolean) as ExifTag[];
};

const getImageSize = (url: string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Image failed to load"));
    image.src = url;
  });

const averageColor = async (url: string) => {
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  await image.decode();

  const canvas = document.createElement("canvas");
  const size = 24;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return "#a87852";
  context.drawImage(image, 0, 0, size, size);

  const pixels = context.getImageData(0, 0, size, size).data;
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3];
    if (alpha < 30) continue;
    red += pixels[index];
    green += pixels[index + 1];
    blue += pixels[index + 2];
    count += 1;
  }
  if (!count) return "#a87852";
  const toHex = (value: number) => Math.round(value / count).toString(16).padStart(2, "0");
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
};

const inferTags = (asset: {
  width: number;
  height: number;
  averageColor: string;
  exifTags: ExifTag[];
  fileName: string;
}) => {
  const tags = new Set<string>();
  const ratio = asset.width / asset.height;
  if (ratio > 1.2) tags.add("横向叙事");
  if (ratio < 0.82) tags.add("竖幅留白");
  if (asset.exifTags.some((tag) => tag.label === "坐标")) tags.add("有地点线索");
  if (asset.exifTags.some((tag) => tag.label === "时间")) tags.add("有拍摄时间");
  if (asset.exifTags.some((tag) => tag.label === "相机")) tags.add("相机参数");
  if (/travel|trip|journey|city|street|road|海|山|旅|街/i.test(asset.fileName)) tags.add("旅途感");
  if (/food|meal|coffee|cake|餐|咖啡|甜/i.test(asset.fileName)) tags.add("食物片刻");

  const [red, green, blue] = asset.averageColor
    .replace("#", "")
    .match(/.{1,2}/g)!
    .map((value) => parseInt(value, 16));
  if (red + green + blue < 230) tags.add("低调暗部");
  if (red > green + 16 && red > blue + 16) tags.add("暖色记忆");
  if (blue > red + 12 && green > red + 8) tags.add("清冷空气");

  return Array.from(tags).slice(0, 6);
};

export const processImageFile = async (file: File): Promise<PhotoAsset> => {
  const url = URL.createObjectURL(file);
  // 本地预览解析 + 远程 COS 上传同步并发：
  //   - 本地解析（尺寸/EXIF/主色）支撑 UI 立刻显示缩略图；
  //   - COS 上传得到的公网 URL 给 LLM/Kratos 作为参考图来源；
  //   - 上传失败时不阻断本地预览，remoteUrl 留空，由 modelClient 兜底处理。
  const [{ width, height }, exif, color, remoteUrl] = await Promise.all([
    getImageSize(url),
    exifr.parse(file, {
      tiff: true,
      exif: true,
      gps: true,
      xmp: true,
      iptc: true,
      mergeOutput: true,
    }).catch(() => ({} as RawExif)),
    averageColor(url).catch(() => "#a87852"),
    uploadToCos(file).catch((error: unknown) => {
      console.warn("[imageTools] COS 上传失败，将依赖用户手填或兜底链接：", error);
      return undefined;
    }),
  ]);

  const rawExif = (exif ?? {}) as RawExif;
  const exifTags = makeExifTags(rawExif);
  const camera =
    [rawExif.Make, rawExif.Model]
      .filter(Boolean)
      .join(" ")
      .trim() || undefined;
  const lens = rawExif.LensModel ? String(rawExif.LensModel) : undefined;
  const location = formatCoordinate(
    typeof rawExif.latitude === "number" ? rawExif.latitude : undefined,
    typeof rawExif.longitude === "number" ? rawExif.longitude : undefined,
  );
  const takenAt = parseExifDate(rawExif.DateTimeOriginal ?? rawExif.CreateDate ?? rawExif.ModifyDate);

  const base = {
    id: crypto.randomUUID(),
    fileName: file.name,
    sizeLabel: formatBytes(file.size),
    url,
    width,
    height,
    aspect: width / height > 1.15 ? "landscape" : width / height < 0.88 ? "portrait" : "square",
    averageColor: color,
    takenAt,
    camera,
    lens,
    location: location || undefined,
    exifTags,
    remoteUrl,
  } satisfies Omit<PhotoAsset, "inferredTags">;

  return {
    ...base,
    inferredTags: inferTags(base),
  };
};
