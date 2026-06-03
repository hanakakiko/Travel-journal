/**
 * 模型配置系统
 * 支持多个图生图模型，可以灵活切换和扩展
 */

export type ModelType = "gpt-2" | "flux-2-pro" | "other";

export interface ModelConfig {
  id: ModelType;
  name: string;
  description: string;
  provider: "kratos" | "replicate" | "other";
  endpoint: string;
  apiTokenEnvVar: string;
  fallbackToken?: string;
  maxReferenceImages: number;
  supportedAspectRatios: string[];
  defaultAspectRatio: string;
  supportedOutputFormats: string[];
  defaultOutputFormat: string;
  estimatedTimeSeconds: number;
}

/**
 * 所有可用的模型配置
 */
export const MODEL_CONFIGS: Record<ModelType, ModelConfig> = {
  "gpt-2": {
    id: "gpt-2",
    name: "GPT-2 (Kratos)",
    description: "小红书内部 Kratos 平台的 GPT-2 模型，速度快，适合快速迭代",
    provider: "kratos",
    endpoint: "/kratos/api/v1/generate",
    apiTokenEnvVar: "VITE_KRATOS_API_TOKEN",
    maxReferenceImages: 1,
    supportedAspectRatios: ["1:1", "16:9", "9:16"],
    defaultAspectRatio: "9:16",
    supportedOutputFormats: ["png", "jpg"],
    defaultOutputFormat: "png",
    estimatedTimeSeconds: 15,
  },
  "flux-2-pro": {
    id: "flux-2-pro",
    name: "FLUX.2 [pro]",
    description: "Black Forest Labs 的 FLUX.2 Pro 模型，支持多张参考图，质量最高",
    provider: "replicate",
    endpoint: "/replicate/v1/predictions",
    apiTokenEnvVar: "VITE_REPLICATE_API_TOKEN",
    maxReferenceImages: 8,
    supportedAspectRatios: [
      "match_input_image",
      "custom",
      "1:1",
      "16:9",
      "3:2",
      "2:3",
      "4:5",
      "5:4",
      "9:16",
      "3:4",
      "4:3",
    ],
    defaultAspectRatio: "9:16",
    supportedOutputFormats: ["webp", "jpg", "png"],
    defaultOutputFormat: "png",
    estimatedTimeSeconds: 30,
  },
  "other": {
    id: "other",
    name: "其他模型",
    description: "预留给未来的模型扩展",
    provider: "other",
    endpoint: "",
    apiTokenEnvVar: "",
    maxReferenceImages: 1,
    supportedAspectRatios: ["1:1"],
    defaultAspectRatio: "1:1",
    supportedOutputFormats: ["png"],
    defaultOutputFormat: "png",
    estimatedTimeSeconds: 30,
  },
};

/**
 * 获取模型配置
 */
export const getModelConfig = (modelType: ModelType): ModelConfig => {
  return MODEL_CONFIGS[modelType];
};

/**
 * 获取所有可用的模型列表（用于 UI 下拉菜单）
 */
export const getAvailableModels = (): Array<{ id: ModelType; name: string; description: string }> => {
  return Object.values(MODEL_CONFIGS).map((config) => ({
    id: config.id,
    name: config.name,
    description: config.description,
  }));
};

/**
 * 验证宽高比是否被模型支持
 */
export const isAspectRatioSupported = (modelType: ModelType, aspectRatio: string): boolean => {
  const config = getModelConfig(modelType);
  return config.supportedAspectRatios.includes(aspectRatio);
};

/**
 * 验证输出格式是否被模型支持
 */
export const isOutputFormatSupported = (modelType: ModelType, format: string): boolean => {
  const config = getModelConfig(modelType);
  return config.supportedOutputFormats.includes(format);
};
