"use strict";

const DEFAULT_GEN_WIDTH = 1024;
const DEFAULT_GEN_HEIGHT = 1536;
const DEFAULT_TIMEOUT_MS = 300000;

const env = (name, fallback) => {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
};

const fetchWithTimeout = async (label, url, init = {}, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  if (typeof fetch !== "function") {
    throw new Error("当前云函数运行环境不支持 fetch，请使用 Node.js 18 或更新版本");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw new Error(`${label} ${Math.round(timeoutMs / 1000)} 秒内未返回`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const readText = async (response) => {
  try {
    return await response.text();
  } catch {
    return "";
  }
};

const readJson = async (label, response) => {
  const text = await readText(response);
  if (!response.ok) {
    throw new Error(`${label} 返回 HTTP ${response.status}${text ? `：${text.slice(0, 200)}` : ""}`);
  }

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${label} 返回非 JSON：${text.slice(0, 200)}`);
  }
};

const extractGeneratedImageUrl = (payload) => {
  const seen = new Set();
  const candidates = [];

  const visit = (value) => {
    if (!value || seen.has(value)) return;
    if (typeof value === "string") {
      if (/^https?:\/\//i.test(value) || /^data:image\//i.test(value)) {
        candidates.push(value);
      }
      return;
    }
    if (typeof value !== "object") return;

    seen.add(value);
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    const preferredKeys = [
      "imageUrl",
      "image_url",
      "generatedImageUrl",
      "url",
      "output",
      "result",
      "b64_json",
    ];

    for (const key of preferredKeys) {
      if (key in value) visit(value[key]);
    }
    for (const item of Object.values(value)) {
      visit(item);
    }
  };

  visit(payload);
  const imageUrl = candidates.find((item) => /^https?:\/\//i.test(item));
  if (imageUrl) return imageUrl;

  const base64 = candidates.find((item) => /^data:image\//i.test(item));
  if (base64) return base64;

  const data = payload && payload.data;
  if (Array.isArray(data) && data[0] && typeof data[0].b64_json === "string") {
    return `data:image/jpeg;base64,${data[0].b64_json}`;
  }

  return null;
};

const extractBusinessError = (payload) => {
  if (!payload || typeof payload !== "object") return "";
  const code = payload.code ?? payload.errCode ?? payload.errorCode;
  if (code !== undefined && code !== 0 && code !== "0") {
    return payload.message || payload.msg || payload.error || `code=${code}`;
  }
  return "";
};

const imageUrlToBuffer = async (imageUrl, index, maxBytes) => {
  const response = await fetchWithTimeout(`参考图 ${index + 1}`, imageUrl, {}, 60000);
  if (!response.ok) {
    throw new Error(`无法获取参考图 ${index + 1}：HTTP ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length > maxBytes) {
    throw new Error(
      `参考图 ${index + 1} 过大：${(buffer.length / 1024 / 1024).toFixed(2)}MB，超过接口限制`,
    );
  }
  const contentType = response.headers.get("content-type") || "image/jpeg";
  return { buffer, contentType };
};

const fileNameFromUrl = (imageUrl, index, contentType) => {
  const fromUrl = imageUrl.split("?")[0].split("/").pop();
  if (fromUrl && /\.[a-z0-9]{2,5}$/i.test(fromUrl)) return fromUrl;
  const extMap = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
  };
  return `image_${index + 1}.${extMap[contentType] || "jpg"}`;
};

const callKratos = async ({ prompt, imageUrls, targetWidth, targetHeight, timeoutMs }) => {
  const endpoint = env(
    "KRATOS_ACTION_URL",
    "http://kratos-sunyihao.sl.beta.xiaohongshu.com/ads/materialcenter/doaction",
  );
  const apiKey = env("KRATOS_API_TOKEN", "");
  const body = {
    tabName: "material_analysis_tab",
    actionCode: "UnifiedPic2PicAction",
    paramsMap: {
      prompt,
      modelType: "gpt2",
      imageUrls,
      targetWidth: String(targetWidth),
      targetHeight: String(targetHeight),
    },
  };
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const response = await fetchWithTimeout("GPT-2 接口", endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }, timeoutMs);
  const payload = await readJson("GPT-2 接口", response);
  const businessError = extractBusinessError(payload);
  if (businessError) throw new Error(`GPT-2 业务报错：${businessError}`);

  const imageUrl = extractGeneratedImageUrl(payload);
  if (!imageUrl) throw new Error("GPT-2 接口未在返回结构中找到图片链接");
  return { imageUrl, raw: payload };
};

const callReplicateFlux = async ({ prompt, imageUrls, timeoutMs }) => {
  const apiToken = env("REPLICATE_API_TOKEN", "");
  if (!apiToken) throw new Error("REPLICATE_API_TOKEN 未在 CloudBase 云函数环境变量中配置");

  const endpoint = `${env("REPLICATE_BACKEND", "https://api.replicate.com").replace(/\/+$/, "")}/v1/predictions`;
  const validUrls = imageUrls.slice(0, 8).filter(Boolean);
  if (!validUrls.length) throw new Error("至少需要一张参考图");

  const response = await fetchWithTimeout("FLUX.2 [pro] API", endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${apiToken}`,
    },
    body: JSON.stringify({
      version: "black-forest-labs/flux-2-pro",
      input: {
        prompt,
        input_images: validUrls,
        aspect_ratio: "9:16",
        resolution: "1 MP",
        output_format: "png",
      },
    }),
  }, timeoutMs);

  const created = await readJson("FLUX.2 [pro] API", response);
  if (!created || !created.id) throw new Error("FLUX.2 [pro] API 未返回 prediction ID");

  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const statusResponse = await fetchWithTimeout("FLUX.2 [pro] 状态查询", `${endpoint}/${created.id}`, {
      method: "GET",
      headers: { Authorization: `Token ${apiToken}` },
    }, 30000);
    const statusPayload = await readJson("FLUX.2 [pro] 状态查询", statusResponse);
    const status = statusPayload && statusPayload.status;

    if (status === "succeeded") {
      const output = statusPayload.output;
      const imageUrl =
        typeof output === "string" ? output : Array.isArray(output) ? output[0] : extractGeneratedImageUrl(statusPayload);
      if (!imageUrl) throw new Error("FLUX.2 [pro] API 未在返回结构中找到图片链接");
      return { imageUrl, raw: statusPayload };
    }
    if (status === "failed" || status === "canceled") {
      throw new Error(`FLUX.2 [pro] API 生成失败：${statusPayload.error || status}`);
    }
  }

  throw new Error("FLUX.2 [pro] API 生成超时");
};

const callQsGptImage2 = async ({ prompt, imageUrls, targetWidth, targetHeight, timeoutMs }) => {
  const apiKey = env("QS_GPT_IMAGE_2_API_KEY", "");
  if (!apiKey) throw new Error("QS_GPT_IMAGE_2_API_KEY 未在 CloudBase 云函数环境变量中配置");

  const endpoint =
    `${env("MAAS_BACKEND", "https://maas.devops.xiaohongshu.com").replace(/\/+$/, "")}` +
    "/openai/openai/images/generations?api-version=2025-04-01-preview";

  const form = new FormData();
  imageUrls.filter(Boolean).forEach((url) => form.append("image", url));
  form.append("prompt", prompt);
  form.append("model", "gpt-image-2");
  form.append("size", `${targetWidth}x${targetHeight}`);
  form.append("response_format", "b64_json");

  const response = await fetchWithTimeout("QS GPT Image 2 API", endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  }, timeoutMs);
  const payload = await readJson("QS GPT Image 2 API", response);
  const imageUrl = extractGeneratedImageUrl(payload);
  if (!imageUrl) throw new Error("QS GPT Image 2 API 未在返回结构中找到图片链接或 base64 数据");
  return { imageUrl, raw: payload };
};

const callVApiEdit = async ({ prompt, imageUrls, targetWidth, targetHeight, timeoutMs, modelType, apiKeyOverride }) => {
  const apiKey =
    modelType === "v-api-seedream-4-5"
      ? env("V_API_SEEDREAM_4_5_API_KEY", env("V_API_KEY", apiKeyOverride || ""))
      : env("V_API_GPT_IMAGE_2_API_KEY", env("V_API_KEY", apiKeyOverride || ""));
  if (!apiKey) throw new Error("V_API_KEY 未在 CloudBase 云函数环境变量中配置");

  const endpoint = env("V_API_ENDPOINT", "https://api.v3.cm/v1/images/edits");
  const isSeedream = modelType === "v-api-seedream-4-5";
  const form = new FormData();
  const maxImages = isSeedream ? 10 : 1;
  const maxBytes = (isSeedream ? 10 : 4) * 1024 * 1024;

  const urls = imageUrls.slice(0, maxImages).filter(Boolean);
  for (let index = 0; index < urls.length; index++) {
    const { buffer, contentType } = await imageUrlToBuffer(urls[index], index, maxBytes);
    const imageBlob = new Blob([buffer], { type: contentType });
    form.append("image", imageBlob, fileNameFromUrl(urls[index], index, contentType));
  }

  form.append("prompt", prompt);
  form.append("model", isSeedream ? "doubao-seedream-4-5-251128" : "gpt-image-2-c");
  form.append("size", isSeedream ? "1600x2848" : `${targetWidth}x${targetHeight}`);
  form.append("response_format", isSeedream ? "url" : "b64_json");
  if (isSeedream) form.append("watermark", "false");

  const response = await fetchWithTimeout(isSeedream ? "V-API Seedream 4.5 API" : "V-API GPT Image 2 API", endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  }, timeoutMs);

  const payload = await readJson(isSeedream ? "V-API Seedream 4.5 API" : "V-API GPT Image 2 API", response);
  const imageUrl = extractGeneratedImageUrl(payload);
  if (!imageUrl) throw new Error("V-API 未在返回结构中找到图片链接或 base64 数据");
  return { imageUrl, raw: payload };
};

const dispatch = async (event) => {
  const modelType = event.modelType;
  const prompt = typeof event.prompt === "string" ? event.prompt.trim() : "";
  const imageUrls = Array.isArray(event.imageUrls) ? event.imageUrls.filter((url) => typeof url === "string" && url.trim()) : [];
  const targetWidth = Number(event.targetWidth) || DEFAULT_GEN_WIDTH;
  const targetHeight = Number(event.targetHeight) || DEFAULT_GEN_HEIGHT;
  const timeoutMs = Math.min(Number(event.timeoutMs) || DEFAULT_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
  const apiKeyOverride = typeof event.apiKeyOverride === "string" ? event.apiKeyOverride.trim() : "";

  if (!prompt) throw new Error("prompt 不能为空");
  if (!imageUrls.length) throw new Error("imageUrls 不能为空");

  const params = { prompt, imageUrls, targetWidth, targetHeight, timeoutMs, modelType, apiKeyOverride };
  switch (modelType) {
    case "gpt-2":
      return callKratos(params);
    case "flux-2-pro":
      return callReplicateFlux(params);
    case "qs-gpt-image-2":
      return callQsGptImage2(params);
    case "v-api-gpt-image-2":
    case "v-api-seedream-4-5":
      return callVApiEdit(params);
    default:
      throw new Error(`未知的模型类型：${modelType}`);
  }
};

exports.main = async (event) => {
  console.log("[generateImage] request", {
    modelType: event && event.modelType,
    imageCount: Array.isArray(event && event.imageUrls) ? event.imageUrls.length : 0,
    promptLength: typeof (event && event.prompt) === "string" ? event.prompt.length : 0,
  });

  try {
    const result = await dispatch(event || {});
    return {
      code: 0,
      message: "ok",
      data: result,
    };
  } catch (error) {
    console.error("[generateImage] failed", error);
    return {
      code: -1,
      message: error instanceof Error ? error.message : String(error),
      data: null,
    };
  }
};
