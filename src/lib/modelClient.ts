import { edgeStyleOptions, sceneOptions, stylePresets, templatePresets } from "../data/presets";
import type { JournalDraft, JournalPage, PhotoAsset, StyleId, TemplateId, UserAnswers } from "../types";
import { formatDate } from "./format";

/** 控制 console 调试日志开关：开发模式默认开。 */
const KRATOS_DEBUG = import.meta.env.DEV;
const klog = (...args: unknown[]) => {
  if (KRATOS_DEBUG) console.info("[Kratos]", ...args);
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
 */
const buildSceneDetailPhrase = (answers: UserAnswers): string => {
  const sceneConfig = sceneOptions.find((scene) => scene.name === answers.scene);
  const facts = collectSceneFacts(answers);
  if (!sceneConfig || !facts.length) return "";
  const joined = facts.map((f) => `${f.label}：${f.value}`).join("；");
  return `场景细节（${sceneConfig.tag}）—— ${joined}。`;
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
  const fixed: string[] = [];
  const decorative: string[] = [];
  for (const opt of edgeStyleOptions) {
    if (!picked.has(opt.label)) continue;
    if (opt.isFixedShape) fixed.push(opt.label);
    else decorative.push(opt.label);
  }
  return { fixed, decorative };
};

/** 收集所有视觉风味选项（palette/vibes/layoutShapes/edgeStyles/decorations/paperTexture），缺省项不输出。 */
const buildVisualFlavorPhrase = (answers: UserAnswers): string => {
  const parts: string[] = [];
  if (answers.palette) parts.push(`整体色调=「${answers.palette}」`);
  if (answers.vibes?.length) parts.push(`氛围标签=「${answers.vibes.join("、")}」`);
  if (answers.layoutShapes?.length) parts.push(`排版形状偏好=「${answers.layoutShapes.join("、")}」`);
  const { fixed: fixedEdges, decorative: decoEdges } = splitEdgeStyles(answers);
  if (fixedEdges.length) parts.push(`固定形状边缘=「${fixedEdges.join("、")}」（自带固定外形，按其固有形态执行，覆盖上方「排版形状偏好」）`);
  if (decoEdges.length) parts.push(`装饰性边缘=「${decoEdges.join("、")}」（不限制内部形状，叠加在已确定的轮廓之外）`);
  if (answers.decorations?.length) parts.push(`装饰元素=「${answers.decorations.join("、")}」`);
  if (answers.paperTexture) parts.push(`底图纸张=「${answers.paperTexture}」`);
  if (!parts.length) return "";
  return `用户「视觉风味」偏好（请在生成时严格按这些偏好执行——色调倾向 / 氛围 / 排版裁剪 / 边缘风格 / 装饰元素 / 纸张底色）：${parts.join("；")}。`;
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
    edgeSegment = `④ 照片边缘风格（独立维度，不是「形状」）：本次同时选择了「固定形状边缘」（${fixed.join("、")}）与「装饰性边缘」（${decorative.join("、")}）——请用「固定形状边缘」覆盖第 ③ 段的形状偏好按其固有外形（如电影胶片必为横长条带感光孔、宝丽得必为白边方框）渲染主轮廓；再把「装饰性边缘」叠加在轮廓外侧（如外面再裹一圈撕纸边或和纸胶带）；`;
  } else if (fixed.length) {
    edgeSegment = `④ 照片边缘风格（独立维度，不是「形状」）：本次选择了「固定形状边缘」（${fixed.join("、")}）——请按该边缘的固有外形（如电影胶片必为横长条带感光孔、相框必为方框、宝丽得必为白边方框、取景器必为带四角的方形）渲染照片，覆盖第 ③ 段的形状偏好；`;
  } else if (decorative.length) {
    edgeSegment = `④ 照片边缘风格（独立维度，不是「形状」）：本次选择了「装饰性边缘」（${decorative.join("、")}）——保持第 ③ 段确定的内部形状不变，仅在轮廓外侧叠加该边缘装饰（如「圆形」+「撕纸边」表示圆形照片外面再裹一圈撕纸感）；`;
  } else {
    edgeSegment = "④ 照片边缘风格：用户未指定，按第 ③ 段的形状偏好直接渲染干净边缘即可，不要自创相框/胶片/撕纸等额外边缘元素；";
  }

  return [
    "请按以下 7 段处理流程串联生成（每一段都不要遗漏）：",
    "① 照片理解：优先采纳「照片自动识别」中给到的 scene/tone/mood/keywords，将其作为画面真实信息来源；",
    "② 故事编排：按 EXIF 时间顺序（若可推断）或自然叙事顺序串联多张图，整体围绕「主题场景 + 标题」组织一条情绪线；",
    "③ 智能排版：严格按用户的「排版形状偏好」对照片做裁剪/拼贴（圆形/爱心/几何/沿主体抠图/局部细节剪贴等内部轮廓），未声明偏好时使用与场景匹配的克制矩形；注意此处只决定「形状本身」，不要加任何边缘装饰；",
    edgeSegment,
    "⑤ 文案生成：按「叙述方式」和「氛围标签」写 1-3 段短句作为版面辅文（每段 ≤ 14 字），避免长段落；所有可见文字必须落在文字白名单内；",
    "⑥ 装饰元素：仅添加用户「装饰元素」列表中的元素，没列出的元素不要自创；元素位置围绕但不要遮挡主体；",
    "⑦ 底图融合：使用用户选择的「底图纸张」作为整张图的纸感底色 / 纹理；未选择时用与色调匹配的中性纸纹。",
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
  const title = answers.titleSeed.trim() || `${answers.scene}手帐`;
  const moodPart = answers.mood.length ? answers.mood.join("、") : "松弛";
  const densityPart = answers.density === "rich" ? "信息密集、贴纸繁复" : "克制均衡、留白舒展";
  const detailPhrase = buildSceneDetailPhrase(answers);
  const facts = collectSceneFacts(answers);
  const whitelist = collectTextWhitelist(answers, title);
  const hasUserDetails = facts.length > 0;
  const visionPhrase = buildVisionFactsPhrase(answers, photoIds.slice(0, photoCount));
  const flavorPhrase = buildVisualFlavorPhrase(answers);
  const pipelinePhrase = buildPipelinePhrase(answers);

  // 「事实清单」段：只列出用户真实给到的信息
  const factSummary = [
    `主题场景：${answers.scene}`,
    `叙述者口吻：${answers.narrator}`,
    `情绪关键词：${moodPart}`,
    `标题文案：${title}`,
    hasUserDetails ? `用户补充的场景细节：${facts.map((f) => `${f.label}=${f.value}`).join("、")}` : null,
  ]
    .filter(Boolean)
    .join("；");

  // 「禁止幻觉」段：明确黑名单
  const antiHallucination = [
    "严格遵守以下约束：",
    "1) 画面内容必须严格基于「我提供的参考图」+「事实清单」+「照片自动识别」结果，禁止凭空添加用户未声明的人名、地名、城市、国家、坐标、街道、建筑、店铺、品牌 logo、菜品名、日期、年份、相机型号、镜头参数、票根编号、行程编号等任何具体信息；",
    `2) 图中出现的任何文字（标题、贴纸、盖章、边注、票根上的字、地图标注）只能从「文字白名单」中挑选：[${whitelist.join(" / ")}]。如果某个位置实在需要文字但白名单覆盖不到，请改用图形/线条/抽象符号占位，绝不要发明新的词、新地名或假英文；`,
    "3) 不要写真实的经纬度、不要画真实地图的可辨识轮廓、不要伪造 EXIF 数值；如需呈现「相机参数感」请使用模糊的占位排版（如 ƒ/· · · 、ISO --- ），不要写出具体数字；",
    hasUserDetails
      ? "4) 用户已经提供的场景细节请优先体现在画面中（如目的地决定主色调或地标剪影、天气决定光线、同行人决定人物数量轮廓），但仍以照片中可见内容为最高优先级；"
      : "4) 用户本次没有补充场景细节，请仅依据参考图本身的氛围 + 视觉风味偏好生成，不要替用户「想象」地点、人物关系或行程；",
    "5) 如果参考图信息不足以填满版面，请用纸纹、胶带、留白、几何贴纸等无信息元素补足，不要用「看似真实但实为虚构」的内容凑数；",
    "6a) 「装饰元素」必须从用户给出的清单中取，未列出的元素不允许自创；「排版形状偏好」也必须遵守用户选择；",
    "6b) 「照片边缘风格」是与「形状」正交的独立维度，绝不允许把「撕纸边/相框/电影胶片/取景器/宝丽得白边/贴纸描边/羽化柔边/和纸胶带」当作形状渲染——它们只能作为边缘装饰存在；同理，也不要在「形状段」里自创任何边缘元素；当用户选择了「固定形状边缘」（电影胶片/相框/取景器/宝丽得白边）时，应让其覆盖用户的形状偏好按边缘自带外形执行；",
    "7) 「底图纸张」决定整张拼贴的纸感底层，请覆盖到画面外围与所有图片之间的缝隙，让最终视觉是「贴在这张纸上的手帐」。",
  ].join(" ");

  return [
    `任务：基于我提供的 ${photoCount} 张参考图片，生成一张「${title}」主题的手帐拼贴图。`,
    "画面形态：优先输出竖向长图（类似手机长截图、手帐长卷），允许把多张参考图、票根、贴纸、文字标签自上而下错落堆叠；具体纵横比与构图请按手帐美学自由发挥，不要被任何固定尺寸框住。",
    `视觉风格：${styleName}；版式参照：${templateName}；版式密度：${densityPart}。`,
    pipelinePhrase,
    `事实清单（只能使用以下信息，未列出的一律视为未知）：${factSummary}。`,
    visionPhrase,
    flavorPhrase,
    detailPhrase,
    "画面构成：把参考图、票根、贴纸、文字标签自然地融合到同一张拼贴上，保留拍摄氛围；元信息区（时间、地点、参数）只做版式占位，不要写具体数值。",
    antiHallucination,
    `标题文字必须且只能使用：「${title}」。`,
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
  // 优先使用环境变量；本地开发默认走 /kratos 代理（vite 已配置）。
  const endpoint =
    (import.meta.env.VITE_KRATOS_ACTION_URL as string | undefined) ?? "/kratos/ads/materialcenter/doaction";

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

  klog("request →", endpoint, body);

  const response = await fetchWithTimeout(
    "Kratos 接口",
    endpoint,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    timeoutMs,
  );

  const text = await response.text();

  if (!response.ok) {
    klog("← HTTP error", response.status, text);
    throw new Error(`Kratos 接口返回 HTTP ${response.status}${text ? `：${text.slice(0, 160)}` : ""}`);
  }

  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    klog("← non-JSON body", text);
    throw new Error(`Kratos 接口返回非 JSON：${text.slice(0, 160)}`);
  }

  klog("← response", payload);

  const businessError = extractBusinessError(payload);
  if (businessError) {
    throw new Error(`Kratos 业务报错：${businessError}`);
  }

  const imageUrl = extractGeneratedImageUrl(payload);
  if (!imageUrl) {
    throw new Error("Kratos 接口未在返回结构中找到图片链接（已在控制台打印 raw response，请确认字段路径）");
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

  for (let attempt = 1; attempt <= total; attempt++) {
    onAttempt?.({ attempt, totalAttempts: total, lastError });

    try {
      const result = await callKratosUnifiedPic2PicOnce(rest);
      if (attempt > 1) klog(`✓ succeeded on attempt ${attempt}/${total}`);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const retryable = isRetryableKratosError(lastError);
      const isLast = attempt >= total;

      klog(
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
      klog(`… waiting ${waitMs}ms before next retry`);
      await sleep(waitMs);
    }
  }

  // 理论不可达：循环内要么 return 要么 throw
  throw lastError ?? new Error("Kratos 接口未知失败");
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

  const prompt = buildKratosPrompt(
    request.answers,
    request.styleId,
    request.templateId ?? "collage",
    request.photos.length,
    request.photos.map((p) => p.id),
  );
  const imageUrls = resolveImageUrls(request.photos, request.remoteUrls);

  try {
    const { imageUrl, raw } = await callKratosUnifiedPic2Pic({
      prompt,
      imageUrls,
      onAttempt: request.onAttempt,
      targetWidth: DEFAULT_GEN_WIDTH,
      targetHeight: DEFAULT_GEN_HEIGHT,
      modelType: "gpt2",
    });
    return {
      ...draft,
      generatedImageUrl: imageUrl,
      generatedPrompt: prompt,
      generationRaw: raw,
    };
  } catch (error) {
    klog("× call failed", error);
    return {
      ...draft,
      generatedPrompt: prompt,
      generationError: `Kratos 接口调用失败：${humanizeError(error)}`,
    };
  }
};
