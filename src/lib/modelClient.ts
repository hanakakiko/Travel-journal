import { edgeStyleOptions, sceneOptions, stylePresets, templatePresets, moodOptions, narratorOptions, paletteOptions, vibeOptions, layoutShapeOptions, decorationOptions, paperOptions } from "../data/presets";
import type { JournalDraft, JournalPage, PhotoAsset, StyleId, TemplateId, UserAnswers } from "../types";
import { formatDate } from "./format";
import { callModelAPI } from "./modelRouter";
import { loadUserApiConfig } from "./userApiConfig";
import { getApiKey } from "./api-keys.local";

/** 从数组中随机选择一个元素 */
const randomPick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

/** 控制 console 调试日志开关：开发模式默认开。 */
const DEBUG_ENABLED = import.meta.env.DEV;

/**
 * 通用模型日志函数，支持不同的模型名称。
 * 使用方式：
 *   - createModelLogger("GPT-2") 创建 GPT-2 的日志函数
 *   - createModelLogger("FLUX.2 [pro]") 创建 FLUX.2 的日志函数
 */
const createModelLogger = (modelName: string) => {
  return (...args: unknown[]) => {
    if (DEBUG_ENABLED) console.info(`[${modelName}]`, ...args);
  };
};

// 为了向后兼容，保留 klog 作为通用日志函数（不带模型前缀）
const klog = (...args: unknown[]) => {
  if (DEBUG_ENABLED) console.info("[Model]", ...args);
};

/** 把网络错误 / 超时错误 / HTTP 错误统一成中文提示。 */
const humanizeError = (error: unknown): string => {
  if (error instanceof Error) {
    if (/Failed to fetch|NetworkError|ERR_/i.test(error.message)) {
      return "网络异常，请检查本地代理是否运行（npm run dev）或域名是否可达";
    }
    return error.message;
  }
  return "未知错误";
};

/**
 * 每次「尝试」（含首次）触发的进度回调，便于上层 UI 显示重试状态。
 *   - attempt：当前是第几次（从 1 开始）；
 *   - totalAttempts：总尝试上限；
 *   - lastError：上一次失败的错误（首次为 undefined）。
 */
export type KratosAttemptInfo = {
  attempt: number;
  totalAttempts: number;
  lastError?: Error;
};

type StoryRequest = {
  photos: PhotoAsset[];
  answers: UserAnswers;
  styleId: StyleId;
  templateId?: TemplateId;
  remoteUrls?: string[];
  /** 每次接口尝试前回调（含首次）；用于驱动 UI 显示「第 N 次尝试」。 */
  onAttempt?: (info: KratosAttemptInfo) => void;
};

type KratosPic2PicParams = {
  prompt: string;
  imageUrls: string[];
  targetWidth?: number;
  targetHeight?: number;
  modelType?: string;
  timeoutMs?: number;
  /** 最大尝试次数（含首次），默认 3。 */
  maxAttempts?: number;
  /** 重试间隔基准毫秒，实际等待时长 = retryDelayMs * 当前已失败次数（线性退避）。默认 1500。 */
  retryDelayMs?: number;
  /** 每次尝试前回调。 */
  onAttempt?: (info: KratosAttemptInfo) => void;
};

type Flux2ProPic2PicParams = {
  prompt: string;
  imageUrls: string[];
  targetWidth?: number;
  targetHeight?: number;
  timeoutMs?: number;
  /** 最大尝试次数（含首次），默认 3。 */
  maxAttempts?: number;
  /** 重试间隔基准毫秒，实际等待时长 = retryDelayMs * 当前已失败次数（线性退避）。默认 1500。 */
  retryDelayMs?: number;
  /** 每次尝试前回调。 */
  onAttempt?: (info: KratosAttemptInfo) => void;
};

const fetchWithTimeout = async (label: string, input: RequestInfo | URL, init: RequestInit, timeoutMs: number) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`${label} ${Math.round(timeoutMs / 1000)} 秒内未返回`);
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const concreteStyle = (requested: StyleId, photos: PhotoAsset[]): JournalDraft["styleId"] => {
  if (requested !== "auto") return requested;
  const hasLocation = photos.some((photo) => photo.location);
  const hasWarmTone = photos.some((photo) => {
    const [red, green, blue] = photo.averageColor
      .replace("#", "")
      .match(/.{1,2}/g)!
      .map((part) => parseInt(part, 16));
    return red > green + 14 && red > blue + 14;
  });
  if (hasLocation) return "travel";
  if (hasWarmTone) return "vintage";
  if (photos.length >= 5) return "elegant";
  return "soft";
};

const pageId = () => crypto.randomUUID();

const pick = <T,>(items: T[], index: number) => items[index % items.length];

const baseObservations = (photos: PhotoAsset[], answers: UserAnswers) => {
  const exifCount = photos.reduce((sum, photo) => sum + photo.exifTags.length, 0);
  const tags = Array.from(new Set(photos.flatMap((photo) => photo.inferredTags))).slice(0, 7);
  return [
    `${photos.length} 张图片被整理成 ${answers.scene} 的叙事线索。`,
    exifCount ? `读取到 ${exifCount} 个可用 EXIF 标签，适合做成密集边注。` : "图片未包含明显 EXIF，页面会保留手写补充区。",
    tags.length ? `自动捕捉到 ${tags.join("、")} 等视觉/元数据提示。` : "当前等待视觉模型补充更细的内容识别。",
  ];
};

const buildExifStrip = (photo?: PhotoAsset) => {
  if (!photo) return [];
  const primary = photo.exifTags.slice(0, 5);
  return primary.length
    ? primary
    : [
        { label: "尺寸", value: `${photo.width} × ${photo.height}` },
        { label: "文件", value: photo.sizeLabel },
      ];
};

const buildPhotoBody = (photo: PhotoAsset, answers: UserAnswers, index: number) => {
  const mood = pick(answers.mood.length ? answers.mood : ["松弛"], index);
  const date = formatDate(photo.takenAt);
  const detail = photo.inferredTags.length ? `画面留下了 ${photo.inferredTags.join("、")} 的线索。` : "画面细节等待视觉模型继续补写。";
  const time = date ? `拍摄时间落在 ${date}，` : "";
  return `${time}${detail} 这一页用 ${mood} 的节奏把照片、参数和片段文字压在同一层纸面上，让记忆显得复杂而可翻阅。`;
};

export const createMockJournalDraft = ({ photos, answers, styleId }: StoryRequest): JournalDraft => {
  const resolvedStyle = concreteStyle(styleId, photos);
  const first = photos[0];
  const title = answers.titleSeed.trim() || `${answers.scene}手帐`;
  const photoTags = Array.from(new Set(photos.flatMap((photo) => photo.inferredTags))).slice(0, 8);
  const pages: JournalPage[] = [
    {
      id: pageId(),
      kind: "cover",
      title,
      kicker: "PHOTO NOTEBOOK",
      body: `${answers.narrator}。${answers.mood.join("、") || "松弛"}的素材被装订成一本可以继续编辑的手帐。`,
      note: first?.takenAt ? `始于 ${formatDate(first.takenAt)}` : "未命名的一天，也可以被认真装订。",
      photoIds: photos.slice(0, 3).map((photo) => photo.id),
      tags: ["封面", answers.scene, ...photoTags.slice(0, 4)],
      exifTags: buildExifStrip(first),
      accent: first?.averageColor ?? "#b46b4b",
      stamp: "cover",
    },
    {
      id: pageId(),
      kind: "chapter",
      title: "AI 观察草稿",
      kicker: "OBSERVATION",
      body: baseObservations(photos, answers).join(" "),
      note: "真实视觉模型接入后，这里会替换为图片内容、主体、关系、地点与情绪的综合判断。",
      photoIds: photos.slice(0, 4).map((photo) => photo.id),
      tags: ["分析", "风格推荐", resolvedStyle, answers.density === "rich" ? "繁复版式" : "平衡版式"],
      exifTags: photos.flatMap((photo) => photo.exifTags).slice(0, 6),
      accent: pick(photos, 1)?.averageColor ?? "#2f766f",
      stamp: "memo",
    },
  ];

  photos.slice(0, 6).forEach((photo, index) => {
    pages.push({
      id: pageId(),
      kind: index % 2 === 0 ? "photo" : "story",
      title: index % 2 === 0 ? `第 ${index + 1} 页照片札记` : `第 ${index + 1} 页叙事拼贴`,
      kicker: `FRAME ${String(index + 1).padStart(2, "0")}`,
      body: buildPhotoBody(photo, answers, index),
      note: `${answers.narrator}：把确定的参数留下，把不确定的情绪写成边注。`,
      photoIds: [photo.id, pick(photos, index + 1)?.id].filter(Boolean),
      tags: [answers.scene, ...answers.mood.slice(0, 3), ...photo.inferredTags].slice(0, 7),
      exifTags: buildExifStrip(photo),
      accent: photo.averageColor,
      stamp: index % 3 === 0 ? "ticket" : index % 3 === 1 ? "date" : "stamp",
    });
  });

  pages.push({
    id: pageId(),
    kind: "index",
    title: "素材索引",
    kicker: "CONTACT SHEET",
    body: "把所有照片按时间、色彩和参数排成索引页。分享为图片时，这一页适合单独保存，作为整本手帐的目录。",
    note: "后续可以接入服务端保存，生成可访问的分享链接。",
    photoIds: photos.map((photo) => photo.id),
    tags: ["目录", "EXIF", "素材", ...photoTags.slice(0, 4)],
    exifTags: photos.flatMap((photo) => photo.exifTags).slice(0, 8),
    accent: pick(photos, photos.length - 1)?.averageColor ?? "#9b6a3f",
    stamp: "index",
  });

  pages.push({
    id: pageId(),
    kind: "back",
    title: "留给下一页",
    kicker: "TO BE CONTINUED",
    body: "这一册的文字、标签和版式已经成型；下一步可以继续换风格、重排照片，或者把每一页导出成独立图片。",
    note: answers.mood.length ? `收束情绪：${answers.mood.join(" / ")}` : "收束情绪：安静 / 明亮",
    photoIds: photos.slice(-2).map((photo) => photo.id),
    tags: ["尾页", "可编辑", "可导出", answers.narrator],
    exifTags: [],
    accent: "#314f54",
    stamp: "end",
  });

  return {
    title,
    subtitle: `${answers.scene} · ${answers.narrator}`,
    styleId: resolvedStyle,
    pages: pages.slice(0, Math.min(Math.max(6, photos.length + 4), 10)),
    observations: baseObservations(photos, answers),
  };
};

/**
 * 兜底 CDN 链接：只在用户既没自动上传（COS 失败）也没手填链接、且仅有 1 张可用时
 * 用来凑够 ≥2 张图（部分接口需要参考图最少 2 张才能融合）。
 * ⚠ 真实业务流应让用户/上传逻辑保证至少 2 张可用图，这里仅做最后兜底。
 */
const DEFAULT_REMOTE_IMAGE_URLS = [
  "https://growth-kratos-img-qc.xhscdn.com/1fcdf3a4ac648557e218ed0a17d656b1",
  "https://fe-video-qc.xhscdn.com/fe-platform-file/104101b8320m1jkg4m206jg51mojpm0000000002pi31ua",
];

/**
 * 收集当前 scene 用户填写了内容的字段，返回 [{ label, value }]。
 * 只返回有效（非空、trim 后非空）字段，作为 prompt 中的「事实清单」基础。
 */
const collectSceneFacts = (answers: UserAnswers): Array<{ label: string; value: string }> => {
  const sceneConfig = sceneOptions.find((scene) => scene.name === answers.scene);
  if (!sceneConfig) return [];
  return sceneConfig.fields
    .map((field) => {
      const value = answers.details?.[field.key]?.trim();
      return value ? { label: field.label, value } : null;
    })
    .filter((item): item is { label: string; value: string } => Boolean(item));
};

/**
 * 把当前 scene 的补充字段（如目的地 / 天气 / 同行）拼成中文短语。
 * 字段顺序遵循 sceneOptions 中的声明，且只输出用户填了内容的项。
 * 用故事化的语言描述，避免直接列举标签。
 */
const buildSceneDetailPhrase = (answers: UserAnswers): string => {
  const sceneConfig = sceneOptions.find((scene) => scene.name === answers.scene);
  const facts = collectSceneFacts(answers);
  if (!sceneConfig || !facts.length) return "";
  
  // 用更自然的叙述方式组织场景细节，避免重复"场景细节"这样的词
  const narratives: string[] = [];
  
  for (const fact of facts) {
    const { label, value } = fact;
    
    // 根据字段类型用不同的叙述方式
    if (label === "目的地" || label === "街区 / 商圈") {
      narratives.push(`这段经历发生在${value}`);
    } else if (label === "行程" || label === "路线感觉") {
      narratives.push(`整个过程以${value}的方式展开`);
    } else if (label === "同行人" || label === "陪伴者") {
      narratives.push(`${value}一起经历了这段时光`);
    } else if (label === "主要交通" || label === "交通方式") {
      narratives.push(`通过${value}的方式往来`);
    } else if (label === "天气" || label === "天气状况") {
      narratives.push(`当时的天气是${value}`);
    } else if (label === "印象最深" || label === "停留过的小店" || label === "亮点") {
      narratives.push(`其中最难忘的是${value}`);
    } else if (label === "季节" || label === "时间") {
      narratives.push(`发生在${value}`);
    } else if (label === "活动" || label === "主要活动") {
      narratives.push(`主要围绕${value}展开`);
    } else {
      // 默认格式
      narratives.push(`${label}是${value}`);
    }
  }
  
  if (!narratives.length) return "";
  return `${sceneConfig.tag}的背景故事：${narratives.join("；")}。`;
};

/**
 * 汇总用户授权可用的「文字白名单」。
 * 生成图里出现的任何文字标签（贴纸/盖章/边注/标题）都必须从这个集合里挑，不允许自创。
 * 同时去重、去空、控制单条长度，避免把太长的句子直接印到图上。
 */
const collectTextWhitelist = (answers: UserAnswers, title: string): string[] => {
  const pool: string[] = [];
  pool.push(title);
  if (answers.scene) pool.push(answers.scene);
  answers.mood.forEach((m) => m && pool.push(m));
  collectSceneFacts(answers).forEach(({ value }) => {
    // 字段值本身（如「东京」「下雨」），不带 label 前缀，更适合做贴纸/标签
    pool.push(value);
  });
  // 去重 + 修剪 + 过滤过长项（贴纸文案 > 24 字基本不合适直接印图）
  const dedup = Array.from(new Set(pool.map((s) => s.trim()).filter(Boolean)));
  return dedup.filter((s) => s.length <= 24);
};

/**
 * 生成图默认尺寸：竖向长图，2:3 比例（1024×1536）。
 * 选择竖向长图的原因：
 *   - 手帐天然是竖向长卷形态（多页拼贴、票根贴纸往下排）；
 *   - 移动端浏览/分享时长图更舒展；
 *   - 不再用 16:9 强约束模型，让其更自由地堆叠多张参考图。
 * 接口本身需要 targetWidth/targetHeight 必填，所以仍给一个合理默认，但 prompt 里
 * 不会再向模型「报数」具体像素，避免模型把像素当成画面文字写进去。
 */
export const DEFAULT_GEN_WIDTH = 1024;
export const DEFAULT_GEN_HEIGHT = 1536;

/**
 * 把页面上的多个状态值汇总成发送给 LLM 的中文 prompt。
 * 设计目标：
 *   1. 明确告诉模型「事实清单」——只能基于参考图 + 用户填写的字段；
 *   2. 明确禁止「凭空补充」——人名、地名、日期、品牌、座标、相机参数等都不许编；
 *   3. 文字标签必须从白名单里取，避免出现乱码 / 假英文 / 虚构地点；
 *   4. 用户未提供的细节用留白或抽象贴纸代替，绝不杜撰；
 *   5. 形态上鼓励「竖向长图拼贴」，不再写死像素尺寸，让模型按手帐自然形态发挥。
 */
/**
 * 把 VLM (qwen3-vl) 给每张照片打的标签拍平成「图1: A/B/C；图2: ...」。
 * 仅纳入 answers.visionTags 里 photoCount 张内的内容；超出张数的图忽略。
 */
const buildVisionFactsPhrase = (answers: UserAnswers, photoOrder: string[]): string => {
  const tagMap = answers.visionTags ?? {};
  const lines: string[] = [];
  photoOrder.forEach((id, index) => {
    const tags = tagMap[id];
    if (tags && tags.length) {
      lines.push(`图${index + 1}：${tags.join("/")}`);
    }
  });
  if (!lines.length) return "";
  return `照片自动识别（来自 VLM，可作为「真实视觉事实」优先采纳）：${lines.join("；")}。`;
};

/**
 * 把用户选择的「照片边缘风格」按 isFixedShape 拆成两类：
 *   - fixed：自带固定形状（电影胶片/相框/取景器/宝丽得白边）→ 会覆盖排版形状偏好；
 *   - decorative：纯装饰边缘（撕纸边/贴纸描边/羽化柔边/和纸胶带）→ 可与排版形状叠加。
 * 用户没勾选时返回空数组。
 */
const splitEdgeStyles = (answers: UserAnswers): { fixed: string[]; decorative: string[] } => {
  const picked = new Set(answers.edgeStyles ?? []);
  
  // 添加自定义标签中的边缘风格
  const customEdgeStyles = answers.customTags?.["edgeStyles"] ?? [];
  customEdgeStyles.forEach(tag => picked.add(tag));
  
  const fixed: string[] = [];
  const decorative: string[] = [];
  for (const opt of edgeStyleOptions) {
    if (!picked.has(opt.label)) continue;
    if (opt.isFixedShape) fixed.push(opt.label);
    else decorative.push(opt.label);
  }
  
  // 处理自定义标签（不在 edgeStyleOptions 中的）
  // 自定义标签默认作为装饰性边缘处理
  for (const customTag of customEdgeStyles) {
    const isInOptions = edgeStyleOptions.some(opt => opt.label === customTag);
    if (!isInOptions) {
      decorative.push(customTag);
    }
  }
  
  return { fixed, decorative };
};

/** 收集所有视觉风味选项（palette/vibes/layoutShapes/edgeStyles/decorations/paperTexture），缺省项随机选择。 */
const buildVisualFlavorPhrase = (answers: UserAnswers): string => {
  const parts: string[] = [];
  
  // 色调：如果用户没选，随机选一个
  const selectedPalette = answers.palette || randomPick(paletteOptions).label;
  parts.push(`整体色调倾向于「${selectedPalette}」的视觉氛围`);
  
  // 氛围标签：如果用户没选，随机选 1-2 个
  const selectedVibes = answers.vibes?.length ? answers.vibes : [randomPick(vibeOptions), randomPick(vibeOptions)];
  // 添加自定义的 vibes 标签
  const customVibes = answers.customTags?.["vibes"] ?? [];
  const allVibes = [...new Set([...selectedVibes, ...customVibes])];
  
  const vibeDescriptions: Record<string, string> = {
    "治愈": "让观者感到舒适放松的视觉语言",
    "松弛": "自然随意、不刻意的排版节奏",
    "热烈": "饱满充沛的色彩与情绪表达",
    "复古": "怀旧年代感的视觉元素与配色",
    "梦幻": "柔和朦胧、充满想象空间的画面质感",
    "清爽": "简洁明快、留白充足的版式设计",
    "温暖": "暖色调与亲切感的视觉营造",
    "神秘": "深沉内敛、引人思考的视觉表现",
    "夏日感": "明亮清爽的夏日氛围",
    "冬日感": "冷调宁静的冬日意境",
    "晨间": "清晨柔和的光线与宁静",
    "深夜": "深夜静谧的神秘感",
    "公路片": "开阔自由的旅途感",
    "日系小清新": "日式简约清新的美学",
    "ins 极简": "极简主义的现代感",
    "胶片颗粒": "胶片质感的复古韵味",
    "童话感": "梦幻童话的奇妙世界",
    "都市感": "城市繁华的现代气息",
    "野外感": "自然野性的户外气质",
  };
  
  const descriptions = allVibes
    .map(vibe => vibeDescriptions[vibe] || vibe)
    .filter(Boolean);
  
  if (descriptions.length) {
    parts.push(`画面应该传达${descriptions.join("、")}的整体感受`);
  }
  
  // 排版形状：如果用户没选，随机选 1-2 个
  const selectedShapes = answers.layoutShapes?.length ? answers.layoutShapes : [randomPick(layoutShapeOptions).label, randomPick(layoutShapeOptions).label];
  // 添加自定义的 layoutShapes 标签
  const customShapes = answers.customTags?.["layoutShapes"] ?? [];
  const allShapes = [...new Set([...selectedShapes, ...customShapes])];
  
  const shapeDescriptions: Record<string, string> = {
    "经典方形": "拍立得 / 标准矩形的规整感",
    "圆形 / 椭圆": "圆润柔和的照片轮廓",
    "爱心 / 异形": "充满温情的心形裁剪",
    "几何多边形": "现代感的几何形状组合",
    "沿主体轮廓抠图": "紧贴主体边界的自然裁剪",
    "局部细节剪贴": "突出细节特写的局部剪贴",
  };
  
  const shapeDescriptionsArray = allShapes
    .map(shape => shapeDescriptions[shape] || shape)
    .filter(Boolean);
  
  if (shapeDescriptionsArray.length) {
    parts.push(`照片裁剪采用${shapeDescriptionsArray.join("、")}的设计手法`);
  }
  
  // 边缘风格：分别处理固定形状和装饰性边缘
  const { fixed: fixedEdges, decorative: decoEdges } = splitEdgeStyles(answers);
  if (fixedEdges.length) {
    parts.push(`照片边缘采用「${fixedEdges.join("、")}」的固定形态（按其自带外形执行，覆盖排版形状偏好）`);
  }
  if (decoEdges.length) {
    parts.push(`在照片轮廓外侧叠加「${decoEdges.join("、")}」的装饰性边缘效果`);
  }
  
  // 装饰元素：如果用户没选，随机选 1-2 个
  const selectedDecorations = answers.decorations?.length ? answers.decorations : [randomPick(decorationOptions).label, randomPick(decorationOptions).label];
  // 添加自定义的 decorations 标签
  const customDecorations = answers.customTags?.["decorations"] ?? [];
  const allDecorations = [...new Set([...selectedDecorations, ...customDecorations])];
  
  if (allDecorations.length) {
    parts.push(`用「${allDecorations.join("、")}」等元素作为版面点缀，围绕主体但不遮挡内容`);
  }
  
  // 纸张底色：如果用户没选，随机选一个
  const selectedPaper = answers.paperTexture || randomPick(paperOptions).label;
  parts.push(`整张拼贴的底层纸感采用「${selectedPaper}」的质地与色调`);
  
  // 底图颜色：如果用户选了，加入到 prompt
  if (answers.mainColor) {
    parts.push(`整张拼贴的底图背景色应该接近「${answers.mainColor}」，照片和装饰元素的色彩可自由丰富搭配`);
  }
  
  if (!parts.length) return "";
  return `用户的视觉风味偏好指导：${parts.join("；")}。`;
};

/**
 * 7 段处理流程指令：把任务拆成「照片理解 → 故事编排 → 智能排版 → 照片边缘风格 → 文案生成 → 装饰元素 → 底图融合」，
 * 显式告诉 LLM 每一段要做什么、参考哪些字段，减少幻觉并让结果更可控。
 *
 * 关键设计：
 *   - 第 ③ 段「智能排版」只负责决定照片的「内部轮廓」（方/圆/爱心/几何/抠图/局部剪贴）；
 *   - 第 ④ 段「照片边缘风格」是独立维度，分两种情况：
 *       · fixed（电影胶片/相框/取景器/宝丽得白边）→ 自带固定外形，必须覆盖第 ③ 段的形状偏好；
 *       · decorative（撕纸边/贴纸描边/羽化柔边/和纸胶带）→ 不限制内部形状，叠加在轮廓外侧；
 *   - 「撕纸边」不是形状，是边缘风格之一，不允许出现在第 ③ 段。
 */
const buildPipelinePhrase = (answers: UserAnswers): string => {
  const { fixed, decorative } = splitEdgeStyles(answers);

  let edgeSegment: string;
  if (fixed.length && decorative.length) {
    edgeSegment = `④ 照片边缘处理：采用「${fixed.join("、")}」作为主轮廓的固定外形（如电影胶片的横长条带、宝丽得的白边方框），再在外侧叠加「${decorative.join("、")}」的装饰效果；`;
  } else if (fixed.length) {
    edgeSegment = `④ 照片边缘处理：按「${fixed.join("、")}」的固有外形渲染照片轮廓（如电影胶片为横长条带感光孔、相框为方框、宝丽得为白边方框、取景器为带四角的方形），这会覆盖排版形状的设定；`;
  } else if (decorative.length) {
    edgeSegment = `④ 照片边缘处理：保持排版形状不变，仅在轮廓外侧叠加「${decorative.join("、")}」的装饰效果（如圆形照片外面再裹一圈撕纸感）；`;
  } else {
    // 如果用户没选边缘风格，随机选一个
    const randomEdgeStyle = randomPick(edgeStyleOptions);
    if (randomEdgeStyle.isFixedShape) {
      edgeSegment = `④ 照片边缘处理：按「${randomEdgeStyle.label}」的固有外形渲染照片轮廓，这会覆盖排版形状的设定；`;
    } else {
      edgeSegment = `④ 照片边缘处理：保持排版形状不变，仅在轮廓外侧叠加「${randomEdgeStyle.label}」的装饰效果；`;
    }
  }

  return [
    "生成流程（请逐段执行，不要遗漏）：",
    "① 照片理解：优先采纳「照片自动识别」中的内容标签、色调、情绪、关键词，作为画面的真实信息基础；",
    "② 故事串联：按 EXIF 时间顺序（若可推断）或自然叙事逻辑串联多张图，围绕「主题场景 + 标题」组织一条完整的情绪线索；",
    "③ 照片裁剪：严格按用户的排版形状偏好对照片做裁剪/拼贴（圆形/爱心/几何/沿主体抠图/局部细节等），未指定时用与场景匹配的矩形；此段只决定形状本身，不加任何边缘装饰；",
    edgeSegment,
    "⑤ 文案编写：根据叙述方式和氛围偏好，写 1-3 段短句作为版面辅文（每段不超过 14 字），避免长段落；所有可见文字必须从白名单中选取；",
    "⑥ 点缀装饰：仅使用用户指定的装饰元素，不要自创；元素位置围绕主体但不遮挡内容；",
    "⑦ 纸张底层：用用户选择的纸张纹理作为整张拼贴的底色和质感；未选择时用与色调匹配的中性纸纹。",
  ].join(" ");
};

export const buildKratosPrompt = (
  answers: UserAnswers,
  styleId: StyleId,
  templateId: TemplateId,
  photoCount: number,
  photoIds: string[] = [],
) => {
  const styleName = stylePresets.find((preset) => preset.id === styleId)?.name ?? "自定义风格";
  const templateName = templatePresets.find((preset) => preset.id === templateId)?.name ?? "图文手帐";
  
  // 处理标题：如果用户没填，则不包含标题块
  const userTitle = answers.titleSeed.trim();
  const title = userTitle || `${answers.scene}手帐`;
  const hasUserTitle = Boolean(userTitle);
  
  // 处理情绪关键词：如果用户没选，随机选一个
  const moodPart = answers.mood.length ? answers.mood.join("、") : randomPick(moodOptions);
  
  // 处理叙述者口吻：如果用户没选，随机选一个
  const narratorPart = answers.narrator || randomPick(narratorOptions);
  
  const densityPart = answers.density === "rich" ? "信息密集、贴纸繁复" : "克制均衡、留白舒展";
  const detailPhrase = buildSceneDetailPhrase(answers);
  const facts = collectSceneFacts(answers);
  const whitelist = collectTextWhitelist(answers, title);
  const hasUserDetails = facts.length > 0;
  const visionPhrase = buildVisionFactsPhrase(answers, photoIds.slice(0, photoCount));
  const flavorPhrase = buildVisualFlavorPhrase(answers);
  const pipelinePhrase = buildPipelinePhrase(answers);
  
  // 处理倾诉记录：支持两个独立的选项
  const hasConfession = answers.confessionText?.trim();
  const confessionAsStyleGuide = (answers.includeConfessionInImage ?? true) && hasConfession;  // 默认 true
  const confessionAsContent = (answers.showConfessionInImage ?? false) && hasConfession;       // 默认 false

  // 「事实清单」段：只列出用户真实给到的信息
  const factSummary = [
    `主题场景：${answers.scene}`,
    `叙述者口吻：${narratorPart}`,
    `情绪关键词：${moodPart}`,
    hasUserTitle ? `标题文案：${title}` : null,
    hasUserDetails ? `用户补充的场景细节：${facts.map((f) => `${f.label}=${f.value}`).join("、")}` : null,
    confessionAsContent ? `用户的倾诉记录：${hasConfession}` : null,
  ]
    .filter(Boolean)
    .join("；");

  // 「禁止幻觉」段：明确黑名单
  // 如果倾诉记录作为风格指导，则去掉文字白名单限制
  const textConstraint = confessionAsStyleGuide
    ? `2) 所有可见文字（标题、贴纸、盖章、边注、票根、地图标注）可从白名单中选取，也可根据用户倾诉记录的关键词和情绪自由创作，但不要直接引用倾诉内容本身；`
    : `2) 所有可见文字（标题、贴纸、盖章、边注、票根、地图标注）只能从白名单中选取：[${whitelist.join(" / ")}]。若某处需要文字但白名单不足，改用图形、线条、抽象符号占位，绝不发明新词、新地名或假英文；`;

  const antiHallucination = [
    "内容约束（必须严格遵守）：",
    "1) 画面内容必须严格基于参考图、事实清单、照片自动识别的结果，禁止凭空添加用户未声明的人名、地名、城市、国家、坐标、街道、建筑、店铺、品牌、菜品名、日期、年份、相机型号、镜头参数等具体信息；",
    textConstraint,
    "3) 不要写经纬度、不要画真实地图轮廓、不要伪造 EXIF 数值；若需呈现参数感，用模糊占位（如 ƒ/· · · 、ISO ---），不要具体数字；",
    hasUserDetails
      ? "4) 用户提供的场景细节（目的地、天气、同行人等）可优先体现在画面中，但参考图的可见内容永远是最高优先级；"
      : "4) 用户未补充场景细节，请仅依据参考图本身的氛围和视觉风味生成，不要替用户想象地点、人物或行程；",
    confessionAsContent
      ? "5) 用户的倾诉记录必须作为实际内容显示在画面中（可作为边注、贴纸、标签或其他文字形式），这是画面的核心信息，不能省略；"
      : "5) 若参考图不足以填满版面，用纸纹、胶带、留白、几何贴纸等无信息元素补足，不要用虚构内容凑数；",
    "6) 装饰元素必须从用户清单中取，排版形状也必须遵守用户选择，不允许自创；",
    "7) 照片边缘风格（撕纸边、相框、电影胶片、取景器、宝丽得白边、贴纸描边、羽化柔边、和纸胶带）是独立维度，只能作为边缘装饰，不能当作形状渲染；固定形状边缘会覆盖排版形状偏好；",
    "8) 底图纸张决定整张拼贴的纸感底层，覆盖到画面外围与图片间的缝隙，让最终视觉是「贴在这张纸上的手帐」。",
  ].join(" ");

  // 倾诉记录作为风格指导的短语
  const confessionStylePhrase = confessionAsStyleGuide
    ? `用户的倾诉记录（作为情绪和风格指导，可自由提取关键词用于文案）：「${hasConfession}」。请根据这段话的情绪、关键词和氛围来调整画面的整体风格和文案内容，但不要直接引用或写出这段话的原文。`
    : "";

  // 倾诉记录作为实际内容的强制指令
  const confessionContentPhrase = confessionAsContent
    ? `【重要】用户的倾诉记录必须在画面中呈现：「${hasConfession}」。这段话是画面的核心内容，请将其以合适的形式（边注、贴纸、标签、手写感文字等）融入手帐拼贴中，确保观者能清晰看到这段倾诉。`
    : "";

  return [
    hasUserTitle ? `任务：基于 ${photoCount} 张参考图片，创作一张「${title}」主题的手帐拼贴。` : `任务：基于 ${photoCount} 张参考图片，创作一张手帐拼贴。`,
    "形态：竖向长图（手机长截图、手帐长卷风格），参考图、票根、贴纸、文字标签自上而下错落堆叠；纵横比与构图按手帐美学自由发挥，不受固定尺寸限制。",
    `风格定位：${styleName}；版式参照：${templateName}；密度：${densityPart}。`,
    pipelinePhrase,
    `信息基础（仅能使用以下内容，其他视为未知）：${factSummary}。`,
    confessionStylePhrase,
    confessionContentPhrase,
    visionPhrase,
    flavorPhrase,
    detailPhrase,
    "视觉融合：参考图、票根、贴纸、文字标签自然融合成一张拼贴，保留原始拍摄氛围；元信息区（时间、地点、参数）仅做版式占位，不写具体数值。",
    antiHallucination,
    hasUserTitle ? `标题必须且仅使用：「${title}」。` : null,
  ]
    .filter(Boolean)
    .join(" ");
};

/**
 * 解析后端返回结构，尝试从多种常见字段里提取生成结果的图片 URL。
 */
const extractGeneratedImageUrl = (payload: unknown): string | null => {
  if (!payload) return null;

  const isLikelyImageUrl = (value: string) => {
    if (!/^https?:\/\//i.test(value)) return false;
    if (/\.(jpe?g|png|webp|gif|bmp)(\?|$)/i.test(value)) return true;
    if (/cdn|img|image|pic|kratos|xhscdn/i.test(value)) return true;
    return false;
  };

  const visited = new Set<unknown>();
  const queue: unknown[] = [payload];
  const fallbacks: string[] = [];

  while (queue.length) {
    const node = queue.shift();
    if (!node || (typeof node === "object" && visited.has(node))) continue;
    if (typeof node === "object") visited.add(node);

    if (typeof node === "string") {
      if (isLikelyImageUrl(node)) return node;
      if (/^https?:\/\//i.test(node)) fallbacks.push(node);
      continue;
    }

    if (Array.isArray(node)) {
      for (const item of node) queue.push(item);
      continue;
    }

    if (typeof node === "object") {
      for (const value of Object.values(node as Record<string, unknown>)) {
        queue.push(value);
      }
    }
  }

  return fallbacks[0] ?? null;
};

/**
 * 从响应中提取 Kratos 风格的业务错误描述。
 * 常见格式：{ code: number, msg: string, data: ... } 或 { success: boolean, message: string, ... }
 */
const extractBusinessError = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  const codeRaw = record.code ?? record.status ?? record.errorCode;
  const success = record.success;
  const isCodeOk =
    codeRaw === undefined ? true : codeRaw === 0 || codeRaw === "0" || codeRaw === 200 || codeRaw === "200";
  const isSuccess = success === undefined ? true : Boolean(success);

  if (isCodeOk && isSuccess) return null;

  const msg =
    (record.msg as string | undefined) ??
    (record.message as string | undefined) ??
    (record.errorMsg as string | undefined) ??
    (record.errMsg as string | undefined) ??
    "业务返回失败";
  return codeRaw !== undefined ? `code=${codeRaw} ${msg}` : msg;
};

/**
 * 判断一个错误是否「值得重试」。
 * 大模型链路抖动种类：
 *   - 业务 code=10000「啊哦，网络有些延迟，再试一次吧」→ 后端明确建议重试；
 *   - 网络异常 / Failed to fetch → DNS / 代理 / 中间网络抖动；
 *   - 接口 N 秒内未返回（AbortError 翻译过来）→ 排队或单次跑太慢；
 *   - HTTP 5xx / 429 → 服务端临时不可用 / 限流；
 * 其他（4xx、参数错、找不到图片字段等）属于配置/数据问题，重试也徒劳。
 */
const isRetryableKratosError = (error: Error): boolean => {
  const msg = error.message || "";
  if (/code=10000\b/.test(msg)) return true; // 明确的「再试一次」
  if (/秒内未返回/.test(msg)) return true; // 超时
  if (/网络异常|Failed to fetch|NetworkError/i.test(msg)) return true; // 网络层
  if (/HTTP\s+5\d{2}\b/.test(msg)) return true; // 5xx
  if (/HTTP\s+429\b/.test(msg)) return true; // 限流
  return false;
};

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/**
 * 单次调用 Kratos UnifiedPic2PicAction，不带重试。
 * 拆出来是为了让上层 `callKratosUnifiedPic2Pic` 专注做「重试编排」。
 */
const callKratosUnifiedPic2PicOnce = async ({
   prompt,
   imageUrls,
   targetWidth = DEFAULT_GEN_WIDTH,
   targetHeight = DEFAULT_GEN_HEIGHT,
   modelType = "gpt2",
   timeoutMs = 300_000,
 }: Omit<KratosPic2PicParams, "maxAttempts" | "retryDelayMs" | "onAttempt">) => {
   // 优先使用用户提供的 API Key，其次使用环境变量，再次使用本地配置文件；本地开发默认走 /kratos 代理（vite 已配置）。
    const userConfigs = loadUserApiConfig();
    const userGpt2Config = userConfigs?.["gpt-2"];
    const endpoint = userGpt2Config?.customEndpoint
      ? userGpt2Config.customEndpoint
      : ((import.meta.env.VITE_KRATOS_ACTION_URL as string | undefined) ?? getApiKey("VITE_KRATOS_ACTION_URL") ?? "/kratos/ads/materialcenter/doaction");

   const body = {
     tabName: "material_analysis_tab",
     actionCode: "UnifiedPic2PicAction",
     paramsMap: {
       prompt,
       modelType,
       imageUrls,
       targetWidth: String(targetWidth),
       targetHeight: String(targetHeight),
     },
   };

   const glog = createModelLogger("GPT-2");
   glog("request →", endpoint);
   glog("  modelType:", modelType);
   glog("  prompt:", prompt.slice(0, 100) + "...");
   glog("  imageUrls:", imageUrls.length, "张图片");
   glog("  targetWidth:", targetWidth);
   glog("  targetHeight:", targetHeight);
   glog("=== 完整请求体 ===");
   glog(JSON.stringify(body, null, 2));

   // 构建请求头，如果用户提供了 API Key 或本地配置了 API Key 则添加到请求头中
   const headers: Record<string, string> = { "Content-Type": "application/json" };
   const kratosApiKey = userGpt2Config?.apiKey || getApiKey("VITE_KRATOS_API_TOKEN");
   if (kratosApiKey) {
     headers["Authorization"] = `Bearer ${kratosApiKey}`;
   }

  const response = await fetchWithTimeout(
    "GPT-2 接口",
    endpoint,
    {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    },
    timeoutMs,
  );

  const text = await response.text();

  if (!response.ok) {
    glog("← HTTP error", response.status, text);
    throw new Error(`GPT-2 接口返回 HTTP ${response.status}${text ? `：${text.slice(0, 160)}` : ""}`);
  }

  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    glog("← non-JSON body", text);
    throw new Error(`GPT-2 接口返回非 JSON：${text.slice(0, 160)}`);
  }

  glog("← response", payload);
  glog("=== 完整响应体 ===");
  glog(JSON.stringify(payload, null, 2));

  const businessError = extractBusinessError(payload);
  if (businessError) {
    throw new Error(`GPT-2 业务报错：${businessError}`);
  }

  const imageUrl = extractGeneratedImageUrl(payload);
  if (!imageUrl) {
    throw new Error("GPT-2 接口未在返回结构中找到图片链接（已在控制台打印 raw response，请确认字段路径）");
  }

  return { imageUrl, raw: payload };
};

/**
 * 调用 Kratos UnifiedPic2PicAction（自动重试版）。
 *
 * 重试策略：
 *   - 默认最多 3 次尝试（首次 + 2 次重试）；
 *   - 仅对可重试错误（业务 code=10000、网络抖动、超时、5xx/429）触发；
 *   - 线性退避：第 2 次等 1.5s、第 3 次等 3s（基于 retryDelayMs * 已失败次数）；
 *   - 全部失败时抛出最后一次错误，并附加「(已重试 N 次)」便于排查；
 *   - 每次尝试前通过 onAttempt 回调上报进度（含 lastError），UI 可据此显示「第 N 次尝试」。
 */
export const callKratosUnifiedPic2Pic = async ({
  maxAttempts = 3,
  retryDelayMs = 1500,
  onAttempt,
  ...rest
}: KratosPic2PicParams) => {
  const total = Math.max(1, maxAttempts);
  let lastError: Error | undefined;
  const glog = createModelLogger("GPT-2");

  for (let attempt = 1; attempt <= total; attempt++) {
    onAttempt?.({ attempt, totalAttempts: total, lastError });

    try {
      const result = await callKratosUnifiedPic2PicOnce(rest);
      if (attempt > 1) glog(`✓ succeeded on attempt ${attempt}/${total}`);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const retryable = isRetryableKratosError(lastError);
      const isLast = attempt >= total;

      glog(
        `× attempt ${attempt}/${total} failed`,
        { retryable, isLast, message: lastError.message },
      );

      if (isLast || !retryable) {
        // 永久错误立即抛；最后一次也直接抛
        if (attempt > 1) {
          // 已经重试过，给最终错误打上重试痕迹，方便用户/排查识别
          throw new Error(`${lastError.message}（已重试 ${attempt - 1} 次仍失败）`);
        }
        throw lastError;
      }

      // 线性退避：第 1 次失败后等 1.5s 再发第 2 次；第 2 次失败后等 3s 再发第 3 次
      const waitMs = retryDelayMs * attempt;
      glog(`… waiting ${waitMs}ms before next retry`);
      await sleep(waitMs);
    }
  }

  // 理论不可达：循环内要么 return 要么 throw
  throw lastError ?? new Error("GPT-2 接口未知失败");
};

/**
 * 单次调用 FLUX.2 [pro] 图生图 API，不带重试。
 * 拆出来是为了让上层 `callFlux2ProPic2Pic` 专注做「重试编排」。
 */
const callFlux2ProPic2PicOnce = async ({
   prompt,
   imageUrls,
   targetWidth = DEFAULT_GEN_WIDTH,
   targetHeight = DEFAULT_GEN_HEIGHT,
   timeoutMs = 300_000,
 }: Omit<Flux2ProPic2PicParams, "maxAttempts" | "retryDelayMs" | "onAttempt">) => {
   // 优先使用用户提供的 API Key，其次使用环境变量，再次使用本地配置文件
   const userConfigs = loadUserApiConfig();
   const userFlux2Config = userConfigs?.["flux-2-pro"];
   const apiToken = userFlux2Config?.apiKey || getApiKey("VITE_REPLICATE_API_TOKEN");
   
   if (!apiToken) {
     throw new Error(
       "FLUX.2 [pro] API Token 未配置。请在 src/lib/api-keys.local.ts 中配置 VITE_REPLICATE_API_TOKEN，" +
       "或在 API 配置面板中输入你的 Replicate API Token，" +
       "或在 .env 文件中设置 VITE_REPLICATE_API_TOKEN。"
     );
   }

   // 使用用户自定义端点或默认端点
   const endpoint = userFlux2Config?.customEndpoint || "/replicate/v1/predictions";

  // 构建参考图参数（FLUX.2 支持最多 8 张）
  // 根据 Replicate API schema，参考图参数是 input_images，它是一个数组
  const validUrls = imageUrls.slice(0, 8).filter(url => url && url.trim());
  
  if (!validUrls.length) {
    throw new Error("至少需要一张参考图");
  }

  const flog = createModelLogger("FLUX.2 [pro]");
  flog(`✓ 使用 ${validUrls.length} 张参考图`);

  // 计算宽高比并转换成 FLUX.2 支持的格式
  // FLUX.2 支持的 aspect_ratio: "match_input_image", "custom", "1:1", "16:9", "3:2", "2:3", "4:5", "5:4", "9:16", "3:4", "4:3"
  // 我们的默认是 1024x1536 (2:3)，所以用 "9:16"
  const aspectRatio = "9:16"; // 竖向长图，接近 2:3 比例

  // 构建请求体
  // 根据 FLUX.2 [pro] 的 API schema，参数应该是：
  // - input_images: 数组，最多 8 张图片
  // - aspect_ratio: 宽高比
  // - resolution: 分辨率（可选，默认 1 MP）
  // - output_format: 输出格式（webp, jpg, png）
  
  const body = {
    version: "black-forest-labs/flux-2-pro",
    input: {
      prompt,
      input_images: validUrls,
      aspect_ratio: aspectRatio,
      resolution: "1 MP", // 推荐使用 2 MP 或以下
      output_format: "png",
    },
  };

  flog("request →", endpoint);
  flog("  version:", body.version);
  flog("  input.prompt:", body.input.prompt.slice(0, 100) + "...");
  flog("  input.input_images:", validUrls.length, "张图片");
  flog("  input.aspect_ratio:", body.input.aspect_ratio);
  flog("  input.resolution:", body.input.resolution);
  flog("  input.output_format:", body.input.output_format);
  
  // 完整的请求体日志（便于调试）
  flog("=== 完整请求体 ===");
  flog(JSON.stringify(body, null, 2));

  const response = await fetchWithTimeout(
    "FLUX.2 [pro] API",
    endpoint,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Token ${apiToken}`,
      },
      body: JSON.stringify(body),
    },
    timeoutMs,
  );

  const text = await response.text();

  if (!response.ok) {
    flog("← HTTP error", response.status, text);
    throw new Error(`FLUX.2 [pro] API 返回 HTTP ${response.status}${text ? `：${text.slice(0, 160)}` : ""}`);
  }

  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    flog("← non-JSON body", text);
    throw new Error(`FLUX.2 [pro] API 返回非 JSON：${text.slice(0, 160)}`);
  }

  flog("← response", payload);
  
  // 完整的响应体日志（便于调试）
  flog("=== 完整响应体 ===");
  flog(JSON.stringify(payload, null, 2));

  // Replicate API 返回的是一个 prediction 对象，需要轮询获取结果
  // 这里我们需要等待 prediction 完成
  const predictionId = (payload as Record<string, unknown>)?.id as string | undefined;
  if (!predictionId) {
    throw new Error("FLUX.2 [pro] API 未返回 prediction ID");
  }

  // 轮询等待 prediction 完成（最多等待 5 分钟）
  const maxWaitTime = 300_000; // 5 分钟
  const pollInterval = 1000; // 1 秒
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    const statusResponse = await fetchWithTimeout(
      "FLUX.2 [pro] 状态查询",
      `${endpoint}/${predictionId}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Token ${apiToken}`,
        },
      },
      30_000,
    );

    const statusText = await statusResponse.text();
    const statusPayload = JSON.parse(statusText);
    const status = (statusPayload as Record<string, unknown>)?.status as string | undefined;

    flog(`← prediction status: ${status}`);
    
    // 完整的状态响应日志（便于调试）
    if (status === "succeeded" || status === "failed") {
      flog("=== 完整状态响应体 ===");
      flog(JSON.stringify(statusPayload, null, 2));
    }

    if (status === "succeeded") {
      // Replicate API 返回的 output 是一个 URI 字符串
      const output = (statusPayload as Record<string, unknown>)?.output as string | undefined;
      const imageUrl = output || extractGeneratedImageUrl(statusPayload);
      
      if (!imageUrl) {
        flog("← statusPayload:", statusPayload);
        throw new Error("FLUX.2 [pro] API 未在返回结构中找到图片链接");
      }
      
      flog(`✓ 生成成功，图片 URL: ${imageUrl.slice(0, 80)}...`);
      return { imageUrl, raw: statusPayload };
    }

    if (status === "failed") {
      const error = (statusPayload as Record<string, unknown>)?.error as string | undefined;
      throw new Error(`FLUX.2 [pro] API 生成失败：${error || "未知错误"}`);
    }

    // 等待后继续轮询
    await sleep(pollInterval);
  }

  throw new Error("FLUX.2 [pro] API 生成超时（5 分钟）");
};

/**
 * 调用 FLUX.2 [pro] 图生图 API（自动重试版）。
 *
 * 重试策略：
 *   - 默认最多 3 次尝试（首次 + 2 次重试）；
 *   - 仅对可重试错误（网络抖动、超时、5xx/429）触发；
 *   - 线性退避：第 2 次等 1.5s、第 3 次等 3s（基于 retryDelayMs * 已失败次数）；
 *   - 全部失败时抛出最后一次错误，并附加「(已重试 N 次)」便于排查；
 *   - 每次尝试前通过 onAttempt 回调上报进度（含 lastError），UI 可据此显示「第 N 次尝试」。
 */
export const callFlux2ProPic2Pic = async ({
  maxAttempts = 3,
  retryDelayMs = 1500,
  onAttempt,
  ...rest
}: Flux2ProPic2PicParams) => {
  const total = Math.max(1, maxAttempts);
  let lastError: Error | undefined;
  const flog = createModelLogger("FLUX.2 [pro]");

  for (let attempt = 1; attempt <= total; attempt++) {
    onAttempt?.({ attempt, totalAttempts: total, lastError });

    try {
      const result = await callFlux2ProPic2PicOnce(rest);
      if (attempt > 1) flog(`✓ succeeded on attempt ${attempt}/${total}`);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const retryable = isRetryableKratosError(lastError);
      const isLast = attempt >= total;

      flog(
        `× attempt ${attempt}/${total} failed`,
        { retryable, isLast, message: lastError.message },
      );

      if (isLast || !retryable) {
        // 永久错误立即抛；最后一次也直接抛
        if (attempt > 1) {
          // 已经重试过，给最终错误打上重试痕迹，方便用户/排查识别
          throw new Error(`${lastError.message}（已重试 ${attempt - 1} 次仍失败）`);
        }
        throw lastError;
      }

      // 线性退避：第 1 次失败后等 1.5s 再发第 2 次；第 2 次失败后等 3s 再发第 3 次
      const waitMs = retryDelayMs * attempt;
      flog(`… waiting ${waitMs}ms before next retry`);
      await sleep(waitMs);
    }
  }

  // 理论不可达：循环内要么 return 要么 throw
  throw lastError ?? new Error("FLUX.2 [pro] API 调用失败");
};

/**
 * 单次调用 QS GPT Image 2 API，不带重试。
 */
const callQsGptImage2Once = async ({
  prompt,
  imageUrls,
  targetWidth = DEFAULT_GEN_WIDTH,
  targetHeight = DEFAULT_GEN_HEIGHT,
  timeoutMs = 300_000,
}: Omit<Flux2ProPic2PicParams, "maxAttempts" | "retryDelayMs" | "onAttempt">) => {
  // 优先使用用户提供的 API Key，其次使用环境变量，再次使用本地配置文件
  const userConfigs = loadUserApiConfig();
  const userQsConfig = userConfigs?.["qs-gpt-image-2"];
  const apiKey = userQsConfig?.apiKey || getApiKey("VITE_QS_GPT_IMAGE_2_API_KEY");

  if (!apiKey) {
    throw new Error(
      "QS GPT Image 2 API Key 未配置。请在 src/lib/api-keys.local.ts 中配置 VITE_QS_GPT_IMAGE_2_API_KEY，" +
      "或在 API 配置面板中输入你的 API Key，" +
      "或在 .env 文件中设置 VITE_QS_GPT_IMAGE_2_API_KEY。"
    );
  }

  // 使用用户自定义端点或默认端点
  const endpoint = userQsConfig?.customEndpoint || "/maas/openai/openai/images/generations?api-version=2025-04-01-preview";

  const qlog = createModelLogger("QS GPT Image 2");

  // 获取参考图片 URLs
  const imageUrlList: string[] = [];
  if (imageUrls && imageUrls.length > 0) {
    for (let i = 0; i < imageUrls.length; i++) {
      imageUrlList.push(imageUrls[i]);
      qlog(`✓ 参考图片 ${i + 1}: ${imageUrls[i].slice(0, 80)}...`);
    }
  }

  qlog("request →", endpoint);
  qlog("  model: gpt-image-2");
  qlog("  prompt:", prompt.slice(0, 100) + "...");
  qlog("  size:", `${targetWidth}x${targetHeight}`);
  qlog("  response_format: b64_json");
  qlog(`  images: ${imageUrlList.length} 张`);

  // 使用 FormData API 构建 multipart/form-data 请求体
  const formData = new FormData();

  // 添加多个 image 字段（支持多张图片）- 作为字符串 URL
  for (let i = 0; i < imageUrlList.length; i++) {
    formData.append("image", imageUrlList[i]);
  }

  // 添加其他字段
  formData.append("prompt", prompt);
  formData.append("model", "gpt-image-2");
  formData.append("size", `${targetWidth}x${targetHeight}`);
  formData.append("response_format", "b64_json");

  // 打印完整的请求体信息
  qlog("=== 完整请求体 (multipart/form-data) ===");
  qlog(`  images: ${imageUrlList.length} 张`);
  qlog(`  prompt 长度: ${prompt.length} 字符`);
  qlog(`  model: gpt-image-2`);
  qlog(`  size: ${targetWidth}x${targetHeight}`);
  qlog(`  response_format: b64_json`);

  // 打印实际发送的请求信息（用于调试）
  qlog("=== 实际发送的请求信息 ===");
  qlog(`  URL: ${endpoint}`);
  qlog(`  Method: POST`);
  qlog(`  Headers:`);
  qlog(`    Authorization: Bearer ${apiKey.slice(0, 10)}...${apiKey.slice(-10)}`);
  qlog(`    Content-Type: multipart/form-data (自动设置)`);
  qlog(`  Body 字段:`);
  for (let i = 0; i < imageUrlList.length; i++) {
    qlog(`    - image[${i + 1}]: ${imageUrlList[i].slice(0, 80)}...`);
  }
  qlog(`    - prompt: ${prompt.length} 字符`);
  qlog(`    - model: gpt-image-2`);
  qlog(`    - size: ${targetWidth}x${targetHeight}`);
  qlog(`    - response_format: b64_json`);

  // 生成完整的 curl 命令用于调试
  qlog("=== 完整 curl 命令 ===");
  let curlCmd = `curl --location '${endpoint}' \\
  --header 'Authorization: Bearer ${apiKey}' \\`;
  for (let i = 0; i < imageUrlList.length; i++) {
    curlCmd += `\n  --form 'image="${imageUrlList[i]}"' \\`;
  }
  curlCmd += `\n  --form 'prompt="${prompt.replace(/"/g, '\\"')}"' \\
  --form 'model="gpt-image-2"' \\
  --form 'size="${targetWidth}x${targetHeight}"' \\
  --form 'response_format="b64_json"'`;
  qlog(curlCmd);

  const response = await fetchWithTimeout(
    "QS GPT Image 2 API",
    endpoint,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        // 不设置 Content-Type，让浏览器自动处理 FormData
      },
      body: formData,
    },
    timeoutMs,
  );

  const text = await response.text();

  if (!response.ok) {
    qlog("← HTTP error", response.status, text);
    throw new Error(`QS GPT Image 2 API 返回 HTTP ${response.status}${text ? `：${text.slice(0, 160)}` : ""}`);
  }

  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    qlog("← non-JSON body", text);
    throw new Error(`QS GPT Image 2 API 返回非 JSON：${text.slice(0, 160)}`);
  }

  qlog("← response", payload);
  qlog("=== 完整响应体 ===");
  qlog(JSON.stringify(payload, null, 2));

  // 打印响应格式信息
  if (payload && typeof payload === "object") {
    const payloadObj = payload as Record<string, unknown>;
    qlog("=== 响应格式分析 ===");
    qlog(`  created: ${payloadObj.created ?? "未找到"}`);
    qlog(`  data 数组长度: ${Array.isArray(payloadObj.data) ? (payloadObj.data as any[]).length : "未找到"}`);
    if (Array.isArray(payloadObj.data) && (payloadObj.data as any[]).length > 0) {
      const firstData = (payloadObj.data as any[])[0];
      qlog(`  data[0] 字段: ${Object.keys(firstData).join(", ")}`);
      if ("b64_json" in firstData) {
        const b64Str = firstData.b64_json as string;
        qlog(`  data[0].b64_json 长度: ${b64Str.length} 字符`);
      }
      if ("url" in firstData) {
        qlog(`  data[0].url: ${(firstData.url as string).slice(0, 80)}...`);
      }
    }
    if ("usage" in payloadObj) {
      const usage = payloadObj.usage as Record<string, unknown>;
      qlog(`  usage.total_tokens: ${usage.total_tokens ?? "未找到"}`);
    }
  }

  // 提取生成的图片 URL
  let generatedImageUrl: string | null = null;
  
  // 尝试从 data[0].url 提取 URL
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    Array.isArray((payload as any).data) &&
    (payload as any).data.length > 0 &&
    "url" in (payload as any).data[0]
  ) {
    const url = (payload as any).data[0].url;
    if (typeof url === "string") {
      generatedImageUrl = url;
      qlog(`✓ 生成成功，图片 URL: ${url.slice(0, 80)}...`);
    }
  }
  
  // 如果没有找到 URL，尝试查找 base64 数据
  if (!generatedImageUrl) {
    if (
      payload &&
      typeof payload === "object" &&
      "data" in payload &&
      Array.isArray((payload as any).data) &&
      (payload as any).data.length > 0 &&
      "b64_json" in (payload as any).data[0]
    ) {
      const b64Data = (payload as any).data[0].b64_json;
      if (typeof b64Data === "string") {
        // 将 base64 转换为 data URL
        generatedImageUrl = `data:image/jpeg;base64,${b64Data}`;
        qlog(`✓ 生成成功，图片已转换为 data URL (${b64Data.length} 字符)`);
      }
    }
  }
  
  // 如果还是没有找到，尝试其他可能的字段
  if (!generatedImageUrl) {
    generatedImageUrl = extractGeneratedImageUrl(payload);
  }
  
  if (!generatedImageUrl) {
    throw new Error("QS GPT Image 2 API 未在返回结构中找到图片链接或 base64 数据（已在控制台打印 raw response，请确认字段路径）");
  }

  qlog(`✓ 生成成功，图片 URL: ${generatedImageUrl.slice(0, 80)}...`);
  return { imageUrl: generatedImageUrl, raw: payload };
};

/**
 * 调用 QS GPT Image 2 API（自动重试版）。
 */
export const callQsGptImage2 = async ({
  maxAttempts = 3,
  retryDelayMs = 1500,
  onAttempt,
  ...rest
}: Flux2ProPic2PicParams) => {
  const total = Math.max(1, maxAttempts);
  let lastError: Error | undefined;
  const qlog = createModelLogger("QS GPT Image 2");

  for (let attempt = 1; attempt <= total; attempt++) {
    onAttempt?.({ attempt, totalAttempts: total, lastError });

    try {
      const result = await callQsGptImage2Once(rest);
      if (attempt > 1) qlog(`✓ succeeded on attempt ${attempt}/${total}`);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const retryable = isRetryableKratosError(lastError);
      const isLast = attempt >= total;

      qlog(
        `× attempt ${attempt}/${total} failed`,
        { retryable, isLast, message: lastError.message },
      );

      if (isLast || !retryable) {
        if (attempt > 1) {
          throw new Error(`${lastError.message}（已重试 ${attempt - 1} 次仍失败）`);
        }
        throw lastError;
      }

      const waitMs = retryDelayMs * attempt;
      qlog(`… waiting ${waitMs}ms before next retry`);
      await sleep(waitMs);
    }
  }

  throw lastError ?? new Error("QS GPT Image 2 API 调用失败");
};

/**
 * 单次调用 V-API GPT Image 2 API，不带重试。
 */
const callVApiGptImage2Once = async ({
  prompt,
  imageUrls,
  targetWidth = DEFAULT_GEN_WIDTH,
  targetHeight = DEFAULT_GEN_HEIGHT,
  timeoutMs = 300_000,
}: Omit<Flux2ProPic2PicParams, "maxAttempts" | "retryDelayMs" | "onAttempt">) => {
  // 优先使用用户提供的 API Key，其次使用环境变量，再次使用本地配置文件
  const userConfigs = loadUserApiConfig();
  const userVApiConfig = userConfigs?.["v-api-gpt-image-2"];
  const apiKey = userVApiConfig?.apiKey || getApiKey("VITE_V_API_GPT_IMAGE_2_API_KEY");

  if (!apiKey) {
    throw new Error(
      "V-API GPT Image 2 API Key 未配置。请在 src/lib/api-keys.local.ts 中配置 VITE_V_API_GPT_IMAGE_2_API_KEY，" +
      "或在 API 配置面板中输入你的 API Key，" +
      "或在 .env 文件中设置 VITE_V_API_GPT_IMAGE_2_API_KEY。"
    );
  }

  // 使用用户自定义端点或默认端点
  const endpoint = userVApiConfig?.customEndpoint || "https://api.v3.cm/v1/images/edits";

  const vlog = createModelLogger("V-API GPT Image 2");

  // 获取参考图片 URLs
  const imageUrlList: string[] = [];
  if (imageUrls && imageUrls.length > 0) {
    for (let i = 0; i < imageUrls.length; i++) {
      imageUrlList.push(imageUrls[i]);
      vlog(`✓ 参考图片 ${i + 1}: ${imageUrls[i].slice(0, 80)}...`);
    }
  }

  vlog("request →", endpoint);
  vlog("  model: gpt-image-2-c");
  vlog("  prompt:", prompt.slice(0, 100) + "...");
  vlog("  size:", `${targetWidth}x${targetHeight}`);
  vlog("  response_format: b64_json");
  vlog(`  images: ${imageUrlList.length} 张`);

  // 使用 FormData API 构建 multipart/form-data 请求体
  const formData = new FormData();

  // 添加多个 image 字段 - 需要转换为 Blob 对象
  const MAX_FILE_SIZE_MB = 4;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
  const ALLOWED_FORMATS = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  
  for (let i = 0; i < imageUrlList.length; i++) {
    try {
      const imageUrl = imageUrlList[i];
      // 从 URL 获取图片 Blob
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`无法获取图片 ${i + 1}：HTTP ${response.status}`);
      }
      const blob = await response.blob();
      
      // 检查文件大小
      if (blob.size > MAX_FILE_SIZE_BYTES) {
        throw new Error(
          `图片 ${i + 1} 过大：${(blob.size / 1024 / 1024).toFixed(2)}MB，` +
          `API 限制最大 ${MAX_FILE_SIZE_MB}MB`
        );
      }
      
      // 检查文件格式
      if (!ALLOWED_FORMATS.includes(blob.type)) {
        vlog(`⚠️ 图片 ${i + 1} 格式为 ${blob.type}，API 推荐使用 PNG/JPG/WebP`);
      }
      
      // 生成文件名（从 URL 提取或使用默认名称）
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1] || `image_${i + 1}.jpg`;
      
      // 添加为 File 对象而不是字符串
      formData.append("image", blob, fileName);
      vlog(`✓ 图片 ${i + 1} 已转换为 Blob 对象 (${(blob.size / 1024).toFixed(1)}KB, ${blob.type})`);
    } catch (error) {
      vlog(`✗ 图片 ${i + 1} 转换失败:`, error);
      throw new Error(`无法处理参考图片 ${i + 1}：${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 添加其他字段
  formData.append("prompt", prompt);
  formData.append("model", "gpt-image-2-c");
  formData.append("size", `${targetWidth}x${targetHeight}`);
  formData.append("response_format", "b64_json");

  // 打印完整的请求体信息
  vlog("=== 完整请求体 (multipart/form-data) ===");
  vlog(`  images: ${imageUrlList.length} 张`);
  vlog(`  prompt 长度: ${prompt.length} 字符`);
  vlog(`  model: gpt-image-2-c`);
  vlog(`  size: ${targetWidth}x${targetHeight}`);
  vlog(`  response_format: b64_json`);

  // 打印实际发送的请求信息（用于调试）
  vlog("=== 实际发送的请求信息 ===");
  vlog(`  URL: ${endpoint}`);
  vlog(`  Method: POST`);
  vlog(`  Headers:`);
  vlog(`    Authorization: Bearer ${apiKey.slice(0, 10)}...${apiKey.slice(-10)}`);
  vlog(`    Content-Type: multipart/form-data (自动设置)`);
  vlog(`  Body 字段:`);
  for (let i = 0; i < imageUrlList.length; i++) {
    vlog(`    - image[${i + 1}]: ${imageUrlList[i].slice(0, 80)}...`);
  }
  vlog(`    - prompt: ${prompt.length} 字符`);
  vlog(`    - model: gpt-image-2-c`);
  vlog(`    - size: ${targetWidth}x${targetHeight}`);
  vlog(`    - response_format: b64_json`);

  // 生成完整的 curl 命令用于调试（注：实际发送的是 Blob 对象，curl 示例仅供参考）
  vlog("=== 完整 curl 命令（参考，实际发送 Blob 对象）===");
  let curlCmd = `curl --location '${endpoint}' \\
  --header 'Authorization: Bearer ${apiKey}' \\`;
  for (let i = 0; i < imageUrlList.length; i++) {
    const fileName = imageUrlList[i].split('/').pop() || `image_${i + 1}.jpg`;
    curlCmd += `\n  --form 'image=@/path/to/${fileName}' \\`;
  }
  curlCmd += `\n  --form 'prompt="${prompt.replace(/"/g, '\\"')}"' \\
  --form 'model="gpt-image-2-c"' \\
  --form 'size="${targetWidth}x${targetHeight}"' \\
  --form 'response_format="b64_json"'`;
  vlog(curlCmd);

  const response = await fetchWithTimeout(
    "V-API GPT Image 2 API",
    endpoint,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        // 不设置 Content-Type，让浏览器自动处理 FormData
      },
      body: formData,
    },
    timeoutMs,
  );

  const text = await response.text();

  if (!response.ok) {
    vlog("← HTTP error", response.status, text);
    throw new Error(`V-API GPT Image 2 API 返回 HTTP ${response.status}${text ? `：${text.slice(0, 160)}` : ""}`);
  }

  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    vlog("← non-JSON body", text);
    throw new Error(`V-API GPT Image 2 API 返回非 JSON：${text.slice(0, 160)}`);
  }

  vlog("← response", payload);
  vlog("=== 完整响应体 ===");
  vlog(JSON.stringify(payload, null, 2));

  // 打印响应格式信息
  if (payload && typeof payload === "object") {
    const payloadObj = payload as Record<string, unknown>;
    vlog("=== 响应格式分析 ===");
    vlog(`  created: ${payloadObj.created ?? "未找到"}`);
    vlog(`  data 数组长度: ${Array.isArray(payloadObj.data) ? (payloadObj.data as any[]).length : "未找到"}`);
    if (Array.isArray(payloadObj.data) && (payloadObj.data as any[]).length > 0) {
      const firstData = (payloadObj.data as any[])[0];
      vlog(`  data[0] 字段: ${Object.keys(firstData).join(", ")}`);
      if ("b64_json" in firstData) {
        const b64Str = firstData.b64_json as string;
        vlog(`  data[0].b64_json 长度: ${b64Str.length} 字符`);
      }
      if ("url" in firstData) {
        vlog(`  data[0].url: ${(firstData.url as string).slice(0, 80)}...`);
      }
    }
    if ("usage" in payloadObj) {
      const usage = payloadObj.usage as Record<string, unknown>;
      vlog(`  usage.total_tokens: ${usage.total_tokens ?? "未找到"}`);
    }
  }

  // 提取生成的图片 URL
  let generatedImageUrl: string | null = null;

  // 尝试从 data[0].url 提取 URL
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    Array.isArray((payload as any).data) &&
    (payload as any).data.length > 0 &&
    "url" in (payload as any).data[0]
  ) {
    const url = (payload as any).data[0].url;
    if (typeof url === "string") {
      generatedImageUrl = url;
      vlog(`✓ 生成成功，图片 URL: ${url.slice(0, 80)}...`);
    }
  }

  // 如果没有找到 URL，尝试查找 base64 数据
  if (!generatedImageUrl) {
    if (
      payload &&
      typeof payload === "object" &&
      "data" in payload &&
      Array.isArray((payload as any).data) &&
      (payload as any).data.length > 0 &&
      "b64_json" in (payload as any).data[0]
    ) {
      const b64Data = (payload as any).data[0].b64_json;
      if (typeof b64Data === "string") {
        // 将 base64 转换为 data URL
        generatedImageUrl = `data:image/jpeg;base64,${b64Data}`;
        vlog(`✓ 生成成功，图片已转换为 data URL (${b64Data.length} 字符)`);
      }
    }
  }

  // 如果还是没有找到，尝试其他可能的字段
  if (!generatedImageUrl) {
    generatedImageUrl = extractGeneratedImageUrl(payload);
  }

  if (!generatedImageUrl) {
    throw new Error("V-API GPT Image 2 API 未在返回结构中找到图片链接或 base64 数据（已在控制台打印 raw response，请确认字段路径）");
  }

  vlog(`✓ 生成成功，图片 URL: ${generatedImageUrl.slice(0, 80)}...`);
  return { imageUrl: generatedImageUrl, raw: payload };
};

/**
 * 调用 V-API GPT Image 2 API（自动重试版）。
 */
export const callVApiGptImage2 = async ({
  maxAttempts = 3,
  retryDelayMs = 1500,
  onAttempt,
  ...rest
}: Flux2ProPic2PicParams) => {
  const total = Math.max(1, maxAttempts);
  let lastError: Error | undefined;
  const vlog = createModelLogger("V-API GPT Image 2");

  for (let attempt = 1; attempt <= total; attempt++) {
    onAttempt?.({ attempt, totalAttempts: total, lastError });

    try {
      const result = await callVApiGptImage2Once(rest);
      if (attempt > 1) vlog(`✓ succeeded on attempt ${attempt}/${total}`);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const retryable = isRetryableKratosError(lastError);
      const isLast = attempt >= total;

      vlog(
        `× attempt ${attempt}/${total} failed`,
        { retryable, isLast, message: lastError.message },
      );

      if (isLast || !retryable) {
        if (attempt > 1) {
          throw new Error(`${lastError.message}（已重试 ${attempt - 1} 次仍失败）`);
        }
        throw lastError;
      }

      const waitMs = retryDelayMs * attempt;
      vlog(`… waiting ${waitMs}ms before next retry`);
      await sleep(waitMs);
    }
  }

  throw lastError ?? new Error("V-API GPT Image 2 API 调用失败");
};

/**
 * 单次调用 V-API Seedream 4.0 API，不带重试。
 */
const callVApiSeedream4Once = async ({
  prompt,
  imageUrls,
  targetWidth = DEFAULT_GEN_WIDTH,
  targetHeight = DEFAULT_GEN_HEIGHT,
  timeoutMs = 300_000,
}: Omit<Flux2ProPic2PicParams, "maxAttempts" | "retryDelayMs" | "onAttempt">) => {
  // 优先使用用户提供的 API Key，其次使用环境变量，再次使用本地配置文件
  const userConfigs = loadUserApiConfig();
  const userSeedreamConfig = userConfigs?.["v-api-seedream-4-5"];
  const apiKey = userSeedreamConfig?.apiKey || getApiKey("VITE_V_API_SEEDREAM_4_5_API_KEY");

  if (!apiKey) {
    throw new Error(
      "V-API Seedream 4.5 API Key 未配置。请在 src/lib/api-keys.local.ts 中配置 VITE_V_API_SEEDREAM_4_5_API_KEY，" +
      "或在 API 配置面板中输入你的 API Key，" +
      "或在 .env 文件中设置 VITE_V_API_SEEDREAM_4_5_API_KEY。"
    );
  }

  // 使用用户自定义端点或默认端点
  const endpoint = userSeedreamConfig?.customEndpoint || "https://api.v3.cm/v1/images/edits";

  const slog = createModelLogger("V-API Seedream 4.5");

  // 获取参考图片 URLs（支持 1-10 张）
  const imageUrlList: string[] = [];
  if (imageUrls && imageUrls.length > 0) {
    const maxImages = 10;
    const imagesToUse = imageUrls.slice(0, maxImages);
    for (let i = 0; i < imagesToUse.length; i++) {
      imageUrlList.push(imagesToUse[i]);
      slog(`✓ 参考图片 ${i + 1}: ${imagesToUse[i].slice(0, 80)}...`);
    }
    if (imageUrls.length > maxImages) {
      slog(`⚠️ 超过最大图片数 ${maxImages}，仅使用前 ${maxImages} 张`);
    }
  }

  // Seedream 4.5 支持两种方式指定尺寸（不可混用）：
  // 方式 1：指定 2K 或 4K，让模型根据 prompt 判断具体尺寸
  // 方式 2：指定具体像素值（如 2048x2048）
  //   - 总像素范围：[2560x1440=3686400, 4096x4096=16777216]
  //   - 宽高比范围：[1/16, 16]
  
  // 官方推荐的标准尺寸映射表（与 GPT-2 保持一致）
  const SEEDREAM_SIZE_MAP: Record<string, { "2K": string; "4K": string }> = {
    "1:1": { "2K": "2048x2048", "4K": "4096x4096" },
    "4:3": { "2K": "2304x1728", "4K": "4704x3520" },
    "3:4": { "2K": "1728x2304", "4K": "3520x4704" },
    "16:9": { "2K": "2848x1600", "4K": "5504x3040" },
    "9:16": { "2K": "1600x2848", "4K": "3040x5504" },
    "3:2": { "2K": "2496x1664", "4K": "4992x3328" },
    "2:3": { "2K": "1664x2496", "4K": "3328x4992" },
    "21:9": { "2K": "3136x1344", "4K": "6240x2656" },
  };
  
  // 根据目标宽高比确定使用 2K 还是 4K
  const totalPixels = targetWidth * targetHeight;
  const sizeLevel = totalPixels >= 8388608 ? "4K" : "2K";
  
  // 计算目标宽高比（四舍五入到小数点后两位）
  const ratio = targetWidth / targetHeight;
  let closestRatio = "9:16"; // 默认
  let minDiff = Infinity;
  
  for (const [key] of Object.entries(SEEDREAM_SIZE_MAP)) {
    const [w, h] = key.split(":").map(Number);
    const keyRatio = w / h;
    const diff = Math.abs(ratio - keyRatio);
    if (diff < minDiff) {
      minDiff = diff;
      closestRatio = key;
    }
  }
  
  // 获取对应的像素尺寸
  const sizeMapping = SEEDREAM_SIZE_MAP[closestRatio];
  const sizeStr = sizeMapping[sizeLevel];
  
  slog(`✓ 目标宽高比: ${targetWidth}x${targetHeight} (${closestRatio})`);
  slog(`✓ 使用尺寸等级: ${sizeLevel}`);
  slog(`✓ 最终像素值: ${sizeStr}`);

  slog("request →", endpoint);
  slog("  model: doubao-seedream-4-5-251128");
  slog("  prompt:", prompt.slice(0, 100) + "...");
  slog("  size:", sizeStr);
  slog("  response_format: url");
  slog(`  images: ${imageUrlList.length} 张`);

  // 使用 FormData API 构建 multipart/form-data 请求体
  const formData = new FormData();

  // 添加多个 image 字段 - 需要转换为 Blob 对象
  const MAX_FILE_SIZE_MB = 10;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
  const ALLOWED_FORMATS = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  
  for (let i = 0; i < imageUrlList.length; i++) {
    try {
      const imageUrl = imageUrlList[i];
      // 从 URL 获取图片 Blob
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`无法获取图片 ${i + 1}：HTTP ${response.status}`);
      }
      const blob = await response.blob();
      
      // 检查文件大小
      if (blob.size > MAX_FILE_SIZE_BYTES) {
        throw new Error(
          `图片 ${i + 1} 过大：${(blob.size / 1024 / 1024).toFixed(2)}MB，` +
          `API 限制最大 ${MAX_FILE_SIZE_MB}MB`
        );
      }
      
      // 检查文件格式
      if (!ALLOWED_FORMATS.includes(blob.type)) {
        slog(`⚠️ 图片 ${i + 1} 格式为 ${blob.type}，API 推荐使用 PNG/JPG/WebP`);
      }
      
      // 生成文件名（从 URL 提取或使用默认名称）
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1] || `image_${i + 1}.jpg`;
      
      // 添加为 File 对象而不是字符串
      formData.append("image", blob, fileName);
      slog(`✓ 图片 ${i + 1} 已转换为 Blob 对象 (${(blob.size / 1024).toFixed(1)}KB, ${blob.type})`);
    } catch (error) {
      slog(`✗ 图片 ${i + 1} 转换失败:`, error);
      throw new Error(`无法处理参考图片 ${i + 1}：${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 添加其他字段
  formData.append("prompt", prompt);
  formData.append("model", "doubao-seedream-4-5-251128");
  formData.append("size", sizeStr);
  formData.append("response_format", "url");
  formData.append("watermark", "false");

  // 打印完整的请求体信息
  slog("=== 完整请求体 (multipart/form-data) ===");
  slog(`  images: ${imageUrlList.length} 张`);
  slog(`  prompt 长度: ${prompt.length} 字符`);
  slog(`  model: doubao-seedream-4-5-251128`);
  slog(`  size: ${sizeStr}`);
  slog(`  response_format: url`);
  slog(`  watermark: false`);

  // 打印实际发送的请求信息（用于调试）
  slog("=== 实际发送的请求信息 ===");
  slog(`  URL: ${endpoint}`);
  slog(`  Method: POST`);
  slog(`  Headers:`);
  slog(`    Authorization: Bearer ${apiKey.slice(0, 10)}...${apiKey.slice(-10)}`);
  slog(`    Content-Type: multipart/form-data (自动设置)`);
  slog(`  Body 字段:`);
  for (let i = 0; i < imageUrlList.length; i++) {
    slog(`    - image[${i + 1}]: ${imageUrlList[i].slice(0, 80)}...`);
  }
  slog(`    - prompt: ${prompt.length} 字符`);
  slog(`    - model: doubao-seedream-4-5-251128`);
  slog(`    - size: ${sizeStr}`);
  slog(`    - response_format: url`);
  slog(`    - watermark: false`);

  // 生成完整的 curl 命令用于调试（注：实际发送的是 Blob 对象，curl 示例仅供参考）
  slog("=== 完整 curl 命令（参考，实际发送 Blob 对象）===");
  let curlCmd = `curl --location '${endpoint}' \\
  --header 'Authorization: Bearer ${apiKey}' \\`;
  for (let i = 0; i < imageUrlList.length; i++) {
    const fileName = imageUrlList[i].split('/').pop() || `image_${i + 1}.jpg`;
    curlCmd += `\n  --form 'image=@/path/to/${fileName}' \\`;
  }
  curlCmd += `\n  --form 'prompt="${prompt.replace(/"/g, '\\"')}"' \\
  --form 'model="doubao-seedream-4-5-251128"' \\
  --form 'size="${sizeStr}"' \\
  --form 'response_format="url"' \\
  --form 'watermark="false"'`;
  slog(curlCmd);

  const response = await fetchWithTimeout(
    "V-API Seedream 4.5 API",
    endpoint,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        // 不设置 Content-Type，让浏览器自动处理 FormData
      },
      body: formData,
    },
    timeoutMs,
  );

  const text = await response.text();

  if (!response.ok) {
    slog("← HTTP error", response.status, text);
    throw new Error(`V-API Seedream 4.5 API 返回 HTTP ${response.status}${text ? `：${text.slice(0, 160)}` : ""}`);
  }

  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    slog("← non-JSON body", text);
    throw new Error(`V-API Seedream 4.5 API 返回非 JSON：${text.slice(0, 160)}`);
  }

  slog("← response", payload);
  slog("=== 完整响应体 ===");
  slog(JSON.stringify(payload, null, 2));

  // 打印响应格式信息
  if (payload && typeof payload === "object") {
    const payloadObj = payload as Record<string, unknown>;
    slog("=== 响应格式分析 ===");
    slog(`  created: ${payloadObj.created ?? "未找到"}`);
    slog(`  data 数组长度: ${Array.isArray(payloadObj.data) ? (payloadObj.data as any[]).length : "未找到"}`);
    if (Array.isArray(payloadObj.data) && (payloadObj.data as any[]).length > 0) {
      const firstData = (payloadObj.data as any[])[0];
      slog(`  data[0] 字段: ${Object.keys(firstData).join(", ")}`);
      if ("url" in firstData) {
        slog(`  data[0].url: ${(firstData.url as string).slice(0, 80)}...`);
      }
    }
    if ("usage" in payloadObj) {
      const usage = payloadObj.usage as Record<string, unknown>;
      slog(`  usage.generated_images: ${usage.generated_images ?? "未找到"}`);
      slog(`  usage.total_tokens: ${usage.total_tokens ?? "未找到"}`);
    }
  }

  // 提取生成的图片 URL
  let generatedImageUrl: string | null = null;

  // 尝试从 data[0].url 提取 URL
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    Array.isArray((payload as any).data) &&
    (payload as any).data.length > 0 &&
    "url" in (payload as any).data[0]
  ) {
    const url = (payload as any).data[0].url;
    if (typeof url === "string") {
      generatedImageUrl = url;
      slog(`✓ 生成成功，图片 URL: ${url.slice(0, 80)}...`);
    }
  }

  // 如果还是没有找到，尝试其他可能的字段
  if (!generatedImageUrl) {
    generatedImageUrl = extractGeneratedImageUrl(payload);
  }

  if (!generatedImageUrl) {
    throw new Error("V-API Seedream 4.5 API 未在返回结构中找到图片链接（已在控制台打印 raw response，请确认字段路径）");
  }

  slog(`✓ 生成成功，图片 URL: ${generatedImageUrl.slice(0, 80)}...`);
  return { imageUrl: generatedImageUrl, raw: payload };
};

/**
 * 调用 V-API Seedream 4.0 API（自动重试版）。
 */
export const callVApiSeedream4 = async ({
  maxAttempts = 3,
  retryDelayMs = 1500,
  onAttempt,
  ...rest
}: Flux2ProPic2PicParams) => {
  const total = Math.max(1, maxAttempts);
  let lastError: Error | undefined;
  const slog = createModelLogger("V-API Seedream 4.5");

  for (let attempt = 1; attempt <= total; attempt++) {
    onAttempt?.({ attempt, totalAttempts: total, lastError });

    try {
      const result = await callVApiSeedream4Once(rest);
      if (attempt > 1) slog(`✓ succeeded on attempt ${attempt}/${total}`);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const retryable = isRetryableKratosError(lastError);
      const isLast = attempt >= total;

      slog(
        `× attempt ${attempt}/${total} failed`,
        { retryable, isLast, message: lastError.message },
      );

      if (isLast || !retryable) {
        if (attempt > 1) {
          throw new Error(`${lastError.message}（已重试 ${attempt - 1} 次仍失败）`);
        }
        throw lastError;
      }

      const waitMs = retryDelayMs * attempt;
      slog(`… waiting ${waitMs}ms before next retry`);
      await sleep(waitMs);
    }
  }

  throw lastError ?? new Error("V-API Seedream 4.0 API 调用失败");
};

/**
 * 把当前一组图片的远程地址整理成 Kratos 接口需要的 imageUrls 数组。
 * 优先级（从高到低）：
 *   1. 用户在 InfoModal 中手填的链接（最高，便于 debug / 覆盖错误自动上传结果）；
 *   2. PhotoAsset.remoteUrl（processImageFile 阶段自动上传到 COS 得到的公网 URL）；
 *   3. 原始 photo.url 若已经是 http(s) 链接（极少数情况，例如示例素材直接给链接）；
 *   4. 上面三步全空 → 该位置略过，不计入。
 * 最后如果总数 < 2，再用 DEFAULT_REMOTE_IMAGE_URLS 兜底，避免接口因参考图不足直接报错。
 */
const resolveImageUrls = (photos: PhotoAsset[], extra?: string[]): string[] => {
  const merged: string[] = [];
  photos.forEach((photo, index) => {
    const candidate =
      extra?.[index]?.trim() ||
      photo.remoteUrl?.trim() ||
      (photo.url.startsWith("http") ? photo.url : "");
    if (candidate) merged.push(candidate);
  });

  if (merged.length < 2) {
    klog(
      `× 可用远程链接不足（${merged.length}/2），临时启用 DEFAULT_REMOTE_IMAGE_URLS 兜底。` +
        " 如果是 COS 上传被 CORS 拦截，请检查 bucket 的 CORS 规则。",
    );
    for (const fallback of DEFAULT_REMOTE_IMAGE_URLS) {
      if (!merged.includes(fallback)) merged.push(fallback);
      if (merged.length >= 2) break;
    }
  }

  return merged;
};

export const requestJournalDraft = async (request: StoryRequest): Promise<JournalDraft> => {
  const draft = createMockJournalDraft(request);
  const startTime = Date.now();

  // 先解析实际可用的图片 URL
  const imageUrls = resolveImageUrls(request.photos, request.remoteUrls);
  
  // 然后用实际可用的图片数量来生成 prompt（而不是原始的 photos.length）
  const prompt = buildKratosPrompt(
    request.answers,
    request.styleId,
    request.templateId ?? "collage",
    imageUrls.length,  // 使用实际可用的图片数量
    request.photos.map((p) => p.id),
  );

  try {
    // 使用模型路由调用对应的 API
    const modelName = request.answers.selectedModel === "flux-2-pro" ? "FLUX.2 [pro]" : "GPT-2";
    const mlog = createModelLogger(modelName);
    
    mlog(`开始调用 ${modelName} API...`);
    mlog(`  prompt 长度: ${prompt.length} 字符`);
    mlog(`  参考图数量: ${imageUrls.length} 张`);
    
    const { imageUrl, raw } = await callModelAPI(request.answers.selectedModel, {
      prompt,
      imageUrls,
      onAttempt: request.onAttempt,
      targetWidth: DEFAULT_GEN_WIDTH,
      targetHeight: DEFAULT_GEN_HEIGHT,
    });
    
    const generationTimeMs = Date.now() - startTime;
    mlog(`✓ ${modelName} API 调用成功，耗时 ${generationTimeMs}ms`);
    
    return {
      ...draft,
      generatedImageUrl: imageUrl,
      generatedPrompt: prompt,
      generationRaw: raw,
      generationTimeMs,
    };
  } catch (error) {
    const modelName = request.answers.selectedModel === "flux-2-pro" ? "FLUX.2 [pro]" : "GPT-2";
    const mlog = createModelLogger(modelName);
    const generationTimeMs = Date.now() - startTime;
    mlog("× call failed", error);
    return {
      ...draft,
      generatedPrompt: prompt,
      generationError: `${modelName} API 调用失败：${humanizeError(error)}`,
      generationTimeMs,
    };
  }
};
