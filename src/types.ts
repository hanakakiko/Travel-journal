import type { ModelType } from "./lib/modelConfig";

export type StyleId = "auto" | "elegant" | "vintage" | "travel" | "soft";

export type TemplateId = "atlas" | "collage" | "magazine" | "archive";

export type PageKind = "cover" | "chapter" | "photo" | "story" | "index" | "back";

export type UserAnswers = {
  scene: string;
  mood: string[];
  narrator: string;
  density: "rich" | "balanced";
  titleSeed: string;
  /** 选择的图生图模型 */
  selectedModel: ModelType;
  /**
   * 根据当前 scene 在弹窗中补充的字段（如目的地、同行、天气…），key 与 SceneDetailField.key 对应。
   * 值统一为字符串：单选 chip 直接存名，多选 chip 用「、」拼接。
   */
  details: Record<string, string>;
  /** 整体色调倾向（单选，例如「暖色胶片」）。 */
  palette?: string;
  /** 氛围标签（多选，例如「治愈」「松弛」）。 */
  vibes: string[];
  /** 照片裁剪/排版偏好形状（多选，例如「圆形」「沿主体轮廓」）。仅控制形状本身，不含边缘装饰。 */
  layoutShapes: string[];
  /**
   * 照片边缘风格（多选，例如「撕纸边」「电影胶片」「宝丽得白边」）。
   * 与 layoutShapes 正交：
   *   - 带固定形状的边缘（胶片/相框/取景器/宝丽得）会覆盖 layoutShapes；
   *   - 纯装饰边缘（撕纸边/羽化/和纸胶带）可与 layoutShapes 自由组合。
   */
  edgeStyles: string[];
  /** 装饰元素偏好（多选，例如「手绘小猫」「纸飞机」）。 */
  decorations: string[];
  /** 底图纸张纹理（单选，例如「米色道林纸」）。 */
  paperTexture?: string;
  /**
   * VLM（qwen3-vl）对每张照片的自动识别标签：photoId -> ["美食", "暖色", "黄昏"]。
   * 用户也可以在 UI 上覆盖/增删，覆盖结果优先级高于 VLM 自动识别。
   */
  visionTags?: Record<string, string[]>;
};

export type ExifTag = {
  label: string;
  value: string;
};

export type PhotoAsset = {
  id: string;
  fileName: string;
  sizeLabel: string;
  url: string;
  width: number;
  height: number;
  aspect: "portrait" | "landscape" | "square";
  averageColor: string;
  takenAt?: string;
  camera?: string;
  lens?: string;
  location?: string;
  exifTags: ExifTag[];
  inferredTags: string[];
  /** 用户提供的可被 Kratos 接口访问的远程链接（本地 blob 无法上传时的兜底）。 */
  remoteUrl?: string;
  /** 自动上传到云端时的错误信息（如果有的话）。 */
  uploadError?: string;
};

export type JournalPage = {
  id: string;
  kind: PageKind;
  title: string;
  kicker: string;
  body: string;
  note: string;
  photoIds: string[];
  tags: string[];
  exifTags: ExifTag[];
  accent: string;
  stamp: string;
};

export type JournalDraft = {
  title: string;
  subtitle: string;
  styleId: Exclude<StyleId, "auto">;
  pages: JournalPage[];
  observations: string[];
  /** LLM (Kratos UnifiedPic2PicAction) 生成的主图链接。 */
  generatedImageUrl?: string;
  /** 实际提交给 LLM 的 prompt，便于调试与展示。 */
  generatedPrompt?: string;
  /** Kratos 接口失败时的提示文本。 */
  generationError?: string;
  /** 接口原始返回，便于调试。 */
  generationRaw?: unknown;
  /** 生成耗时（毫秒）。 */
  generationTimeMs?: number;
};
