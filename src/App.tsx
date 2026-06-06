import {
  BookOpen,
  Brush,
  Check,
  CircleX,
  Eye,
  ImagePlus,
  ImageDown,
  Layers3,
  Link as LinkIcon,
  Loader2,
  LogOut,
  Palette,
  Save,
  Sparkles,
  Tag,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { CSSProperties, Dispatch, ReactNode, SetStateAction } from "react";
import { useEffect, useState } from "react";
import { ErrorAlert } from "./lib/ErrorAlert";
import { ApiConfigPanel } from "./lib/ApiConfigPanel";
import { useAuth } from "./contexts/AuthContext";
import { AuthPage } from "./components/AuthPage";
import {
  decorationOptions,
  edgeStyleOptions,
  layoutShapeOptions,
  mainColorOptions,
  moodOptions,
  narratorOptions,
  paletteOptions,
  paperOptions,
  sceneOptions,
  stylePresets,
  templatePresets,
  vibeOptions,
  type SceneDetailField,
} from "./data/presets";
import { processImageFile } from "./lib/imageTools";
import { buildKratosPrompt, requestJournalDraft } from "./lib/modelClient";
import { createSampleFiles } from "./lib/samplePhotos";
import { playSound, type SoundEffect } from "./lib/soundEffects";
import { recognizePhotoBatch } from "./lib/visionClient";
import type { JournalDraft, PhotoAsset, StyleId, TemplateId, UserAnswers, SavedTemplate } from "./types";
import { getAvailableModels, hasApiKeyForModel, MODEL_CONFIGS, type ModelType } from "./lib/modelConfig";
import { getAllTemplates, getAllTemplatesAsync, saveTemplate, deleteTemplate } from "./lib/templateManager";
import { ensureAnonymousLogin } from "./lib/cloudbase";
import { initializeUserSettings, getSoundEnabled, saveSoundEnabled } from "./lib/userSettings";
import { EditableTagGroup } from "./components/EditableTagGroup";
import { addTag, removeTag } from "./lib/tagManager";
import { getAllCustomTags, saveCustomTags } from "./lib/customTagsStorage";

const defaultAnswers: UserAnswers = {
   scene: "一次旅程",
   mood: ["怀旧", "像电影"],
   narrator: "像一本精致生活杂志",
   density: "rich",
   titleSeed: "",
   details: {},
   vibes: [],
   layoutShapes: [],
   edgeStyles: [],
   decorations: [],
   visionTags: {},
   customTags: {},  // 不在这里初始化，在 useState 中动态获取
   selectedModel: "flux-2-pro",  // 默认使用 FLUX.2 Pro
   confessionText: "",
   includeConfessionInImage: true,  // 默认勾选"融入画面生成"
   showConfessionInImage: false,    // 默认不勾选"放在画面中"
   palette: undefined,
   paperTexture: undefined,
   mainColor: undefined,
 };

/** 多选 chip 值的序列化分隔符，统一存到 details[key] 里。 */
const MULTI_SEP = "、";
const splitMulti = (raw: string | undefined): string[] =>
  raw ? raw.split(MULTI_SEP).map((s) => s.trim()).filter(Boolean) : [];
const joinMulti = (arr: string[]): string => arr.filter(Boolean).join(MULTI_SEP);

const classNames = (...items: Array<string | false | undefined>) => items.filter(Boolean).join(" ");

const downloadDataUrl = (dataUrl: string, filename: string) => {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
};

function App() {
    // 认证管理
    const { user, isLoading: authLoading, signOut } = useAuth();
    const [showAuthPage, setShowAuthPage] = useState(!user);
    
    // 必须在条件语句之前声明所有 hooks
    const [photos, setPhotos] = useState<PhotoAsset[]>([]);
    const [answers, setAnswers] = useState<UserAnswers>(() => ({
      ...defaultAnswers,
      customTags: getAllCustomTags(),
    }));
    const [styleId, setStyleId] = useState<StyleId>("auto");
    const [templateId, setTemplateId] = useState<TemplateId>("collage");
    const [draft, setDraft] = useState<JournalDraft | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState("");
    const [isErrorAlertOpen, setIsErrorAlertOpen] = useState(false);
    /** 记录当前错误是否来自 COS 上传失败（用于判断是否显示重试按钮） */
    const [failedPhotosForRetry, setFailedPhotosForRetry] = useState<PhotoAsset[]>([]);
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [isPhotoManagerOpen, setIsPhotoManagerOpen] = useState(false);
    /**
     * 「手绘中」遮罩的持久挂载状态：
     *   - isGenerating 为 true 时立即挂载（enter 动画）；
     *   - isGenerating 变 false 时不立即卸载，给 320ms 让 leave 动画跑完再卸载，
     *     避免遮罩"啪一下消失"的硬切。
     */
    const [overlayMounted, setOverlayMounted] = useState(false);
    /** Kratos 接口当前重试进度（含首次），用于 DrawingOverlay 显示「第 N 次尝试」。 */
    const [attemptInfo, setAttemptInfo] = useState<{ attempt: number; total: number } | null>(null);
    /** 用户在 InfoModal 中为每张照片填写的远程链接（与 photos 对齐的稀疏数组）。 */
    const [remoteUrls, setRemoteUrls] = useState<string[]>([]);
    /** VLM 自动识图状态：进行中标志 + 上次错误（便于面板内提示）。 */
    const [isVisionLoading, setIsVisionLoading] = useState(false);
    const [visionError, setVisionError] = useState("");
    const [soundEnabled, setSoundEnabled] = useState(() => getSoundEnabled());
    const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>(() => getAllTemplates());
    const [showTemplateManager, setShowTemplateManager] = useState(false);

    // 如果正在加载认证状态，显示加载中
    if (authLoading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-700 font-medium">加载认证信息中...</p>
          </div>
        </div>
      );
    }

    // 如果未登录或显示认证页面，显示认证页面（使用条件渲染而不是早期返回）
    if (!user || showAuthPage) {
      return <AuthPage onAuthSuccess={() => setShowAuthPage(false)} />;
    }
    
    // 只有当用户已登录时才返回 AppContent 组件（这样所有的 hooks 都被执行）
    return <AppContent 
      user={user}
      signOut={signOut}
      setShowAuthPage={setShowAuthPage}
      photos={photos}
      setPhotos={setPhotos}
      answers={answers}
      setAnswers={setAnswers}
      styleId={styleId}
      setStyleId={setStyleId}
      templateId={templateId}
      setTemplateId={setTemplateId}
      draft={draft}
      setDraft={setDraft}
      isProcessing={isProcessing}
      setIsProcessing={setIsProcessing}
      isGenerating={isGenerating}
      setIsGenerating={setIsGenerating}
      error={error}
      setError={setError}
      isErrorAlertOpen={isErrorAlertOpen}
      setIsErrorAlertOpen={setIsErrorAlertOpen}
      failedPhotosForRetry={failedPhotosForRetry}
      setFailedPhotosForRetry={setFailedPhotosForRetry}
      isInfoOpen={isInfoOpen}
      setIsInfoOpen={setIsInfoOpen}
      isPhotoManagerOpen={isPhotoManagerOpen}
      setIsPhotoManagerOpen={setIsPhotoManagerOpen}
      overlayMounted={overlayMounted}
      setOverlayMounted={setOverlayMounted}
      attemptInfo={attemptInfo}
      setAttemptInfo={setAttemptInfo}
      remoteUrls={remoteUrls}
      setRemoteUrls={setRemoteUrls}
      isVisionLoading={isVisionLoading}
      setIsVisionLoading={setIsVisionLoading}
      visionError={visionError}
      setVisionError={setVisionError}
      soundEnabled={soundEnabled}
      setSoundEnabled={setSoundEnabled}
      savedTemplates={savedTemplates}
      setSavedTemplates={setSavedTemplates}
      showTemplateManager={showTemplateManager}
      setShowTemplateManager={setShowTemplateManager}
    />;
}

type AppContentProps = {
  user: any;
  signOut: () => Promise<void>;
  setShowAuthPage: Dispatch<SetStateAction<boolean>>;
  photos: PhotoAsset[];
  setPhotos: Dispatch<SetStateAction<PhotoAsset[]>>;
  answers: UserAnswers;
  setAnswers: Dispatch<SetStateAction<UserAnswers>>;
  styleId: StyleId;
  setStyleId: Dispatch<SetStateAction<StyleId>>;
  templateId: TemplateId;
  setTemplateId: Dispatch<SetStateAction<TemplateId>>;
  draft: JournalDraft | null;
  setDraft: Dispatch<SetStateAction<JournalDraft | null>>;
  isProcessing: boolean;
  setIsProcessing: Dispatch<SetStateAction<boolean>>;
  isGenerating: boolean;
  setIsGenerating: Dispatch<SetStateAction<boolean>>;
  error: string;
  setError: Dispatch<SetStateAction<string>>;
  isErrorAlertOpen: boolean;
  setIsErrorAlertOpen: Dispatch<SetStateAction<boolean>>;
  failedPhotosForRetry: PhotoAsset[];
  setFailedPhotosForRetry: Dispatch<SetStateAction<PhotoAsset[]>>;
  isInfoOpen: boolean;
  setIsInfoOpen: Dispatch<SetStateAction<boolean>>;
  isPhotoManagerOpen: boolean;
  setIsPhotoManagerOpen: Dispatch<SetStateAction<boolean>>;
  overlayMounted: boolean;
  setOverlayMounted: Dispatch<SetStateAction<boolean>>;
  attemptInfo: { attempt: number; total: number } | null;
  setAttemptInfo: Dispatch<SetStateAction<{ attempt: number; total: number } | null>>;
  remoteUrls: string[];
  setRemoteUrls: Dispatch<SetStateAction<string[]>>;
  isVisionLoading: boolean;
  setIsVisionLoading: Dispatch<SetStateAction<boolean>>;
  visionError: string;
  setVisionError: Dispatch<SetStateAction<string>>;
  soundEnabled: boolean;
  setSoundEnabled: Dispatch<SetStateAction<boolean>>;
  savedTemplates: SavedTemplate[];
  setSavedTemplates: Dispatch<SetStateAction<SavedTemplate[]>>;
  showTemplateManager: boolean;
  setShowTemplateManager: Dispatch<SetStateAction<boolean>>;
};

function AppContent({
  user,
  signOut,
  setShowAuthPage,
  photos,
  setPhotos,
  answers,
  setAnswers,
  styleId,
  setStyleId,
  templateId,
  setTemplateId,
  draft,
  setDraft,
  isProcessing,
  setIsProcessing,
  isGenerating,
  setIsGenerating,
  error,
  setError,
  isErrorAlertOpen,
  setIsErrorAlertOpen,
  failedPhotosForRetry,
  setFailedPhotosForRetry,
  isInfoOpen,
  setIsInfoOpen,
  isPhotoManagerOpen,
  setIsPhotoManagerOpen,
  overlayMounted,
  setOverlayMounted,
  attemptInfo,
  setAttemptInfo,
  remoteUrls,
  setRemoteUrls,
  isVisionLoading,
  setIsVisionLoading,
  visionError,
  setVisionError,
  soundEnabled,
  setSoundEnabled,
  savedTemplates,
  setSavedTemplates,
  showTemplateManager,
  setShowTemplateManager,
}: AppContentProps) {

  const activeStyle = draft?.styleId ?? (styleId === "auto" ? "elegant" : styleId);
  const play = (effect: SoundEffect) => playSound(effect, soundEnabled);

  const handleSaveTemplate = (name: string, coverImageUrl?: string) => {
    const newTemplate = saveTemplate(name, answers, styleId, templateId, coverImageUrl);
    setSavedTemplates((current) => [...current, newTemplate]);
    play("success");
  };

  const handleApplyTemplate = (template: SavedTemplate) => {
    setAnswers(template.answers);
    setStyleId(template.styleId);
    setTemplateId(template.templateId);
    setDraft(null);
    
    // 恢复模板中的自定义标签到 localStorage
    if (template.answers.customTags) {
      saveCustomTags(template.answers.customTags);
    }
    
    play("tap");
  };

  const handleDeleteTemplate = (templateId: string) => {
    deleteTemplate(templateId);
    setSavedTemplates((current) => current.filter((t) => t.id !== templateId));
    play("tap");
  };

  // 应用启动时：匿名登录 + 从云端拉取最新设置 + 加载模板列表
  useEffect(() => {
    void initializeUserSettings()
      .then(() => Promise.all([
        getAllTemplatesAsync(),
        // 刷新声音设置（可能从云端拉取了新值）
        Promise.resolve(setSoundEnabled(getSoundEnabled())),
      ]))
      .then(([cloudTemplates]) => {
        if (cloudTemplates.length > 0) {
          setSavedTemplates(cloudTemplates);
        }
      })
      .catch(() => {
        // 网络失败时沿用本地缓存，静默处理
      });
  }, []);

  // 监听 localStorage 变化（跨 Tab 同步），确保模板列表始终同步
  useEffect(() => {
    const handleStorageChange = () => {
      setSavedTemplates(getAllTemplates());
    };
    
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("modal-open", isInfoOpen || isPhotoManagerOpen);
    return () => document.body.classList.remove("modal-open");
  }, [isInfoOpen, isPhotoManagerOpen]);

  useEffect(() => {
    if (!isInfoOpen) return;
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(".modal-scroll")?.scrollTo({ top: 0 });
    });
  }, [isInfoOpen]);

  useEffect(() => {
    saveSoundEnabled(soundEnabled);
  }, [soundEnabled]);

  // 遮罩挂载/卸载节奏控制：进入立即、退出延迟 320ms（与 CSS leave 动画同步）。
  useEffect(() => {
    if (isGenerating) {
      setOverlayMounted(true);
      return;
    }
    if (!overlayMounted) return;
    const id = window.setTimeout(() => setOverlayMounted(false), 320);
    return () => window.clearTimeout(id);
  }, [isGenerating, overlayMounted]);

  const processFiles = async (files: File[]) => {
    if (!files.length) return;
    setError("");
    setIsErrorAlertOpen(false);
    setIsProcessing(true);
    try {
      const imageFiles = files.filter((file) => file.type.startsWith("image/"));
      // processImageFile 内部会同步把图片上传到 COS（用于喂给 LLM），
      // 上传失败时不抛错、只把 remoteUrl 留空，所以这里 UI 流程不中断。
      const processed = await Promise.all(imageFiles.map(processImageFile));
      setPhotos((current) => [...current, ...processed]);
      // 同步扩展 remoteUrls，保持与 photos 索引对齐。
      setRemoteUrls((current) => [...current, ...processed.map(() => "")]);
      setDraft(null);

      const failedCount = processed.filter((photo) => !photo.remoteUrl).length;
      if (failedCount > 0) {
        // 给一个明确的警告，说明这些图片无法被 LLM 使用
        const failedPhotos = processed.filter((photo) => !photo.remoteUrl);
        const failedList = failedPhotos
          .map((p, idx) => {
            const errorReason = p.uploadError ? ` — ${p.uploadError}` : "";
            return `${idx + 1}. ${p.fileName}${errorReason}`;
          })
          .join("\n");
        const errorMessage =
          `${failedCount} 张图片上传失败，无法被 AI 使用：\n\n${failedList}\n\n` +
          `解决方案：\n` +
          `1. 在「补充信息」面板手动填入这些图片的可访问链接\n` +
          `2. 删除这些图片后重新上传\n` +
          `3. 继续生成但结果可能不会用到这些图片`;
        setError(errorMessage);
        setFailedPhotosForRetry(failedPhotos);
        setIsErrorAlertOpen(true);
      }
      if (processed.length) play("upload");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "图片读取失败");
      setFailedPhotosForRetry([]);
      setIsErrorAlertOpen(true);
    } finally {
      setIsProcessing(false);
    }
  };

  /** 重试上传失败的图片 */
  const retryFailedPhotos = async () => {
    if (!failedPhotosForRetry.length) return;
    setError("");
    setIsErrorAlertOpen(false);
    setIsProcessing(true);
    try {
      // 从失败的图片中提取原始 File 对象（通过 blob 重建）
      const retryFiles = await Promise.all(
        failedPhotosForRetry.map(async (photo) => {
          const response = await fetch(photo.url);
          const blob = await response.blob();
          return new File([blob], photo.fileName, { type: blob.type });
        })
      );

      // 重新处理这些文件
      const reprocessed = await Promise.all(retryFiles.map(processImageFile));

      // 更新 photos 数组：用新的处理结果替换对应的失败图片
      setPhotos((current) => {
        const next = [...current];
        reprocessed.forEach((newPhoto) => {
          const index = next.findIndex((p) => p.fileName === newPhoto.fileName);
          if (index >= 0) {
            next[index] = newPhoto;
          }
        });
        return next;
      });

      // 检查是否还有失败的
      const stillFailed = reprocessed.filter((photo) => !photo.remoteUrl);
      if (stillFailed.length > 0) {
        const failedList = stillFailed
          .map((p) => {
            const errorReason = p.uploadError ? ` — ${p.uploadError}` : "";
            return `• ${p.fileName}${errorReason}`;
          })
          .join("\n");
        setError(
          `仍有 ${stillFailed.length} 张图片上传失败：\n\n${failedList}\n\n` +
          `可在「补充信息」面板手动填入这些图片的可访问链接。`
        );
        setFailedPhotosForRetry(stillFailed);
        setIsErrorAlertOpen(true);
      } else {
        // 全部成功
        setFailedPhotosForRetry([]);
        play("success");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "重试失败");
      setIsErrorAlertOpen(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    await processFiles(Array.from(files));
  };

  const loadSamples = async () => {
    play("tap");
    const files = await createSampleFiles();
    await processFiles(files);
  };

  const toggleSound = () => {
    const nextEnabled = !soundEnabled;
    if (nextEnabled) playSound("open", true);
    setSoundEnabled(nextEnabled);
  };

  const toggleMood = (mood: string) => {
    setAnswers((current) => {
      const exists = current.mood.includes(mood);
      const nextMood = exists ? current.mood.filter((item) => item !== mood) : [...current.mood, mood].slice(-4);
      return { ...current, mood: nextMood };
    });
  };

  /** 通用：在 UserAnswers 的一个字符串数组字段上做 toggle 多选。 */
  const toggleAnswerList = (key: "vibes" | "layoutShapes" | "edgeStyles" | "decorations", value: string) => {
    setAnswers((current) => {
      const arr = current[key] ?? [];
      const exists = arr.includes(value);
      const next = exists ? arr.filter((item) => item !== value) : [...arr, value];
      return { ...current, [key]: next };
    });
  };

  /** 获取某个字段的默认标签 */
  const getDefaultTagsForField = (fieldKey: string): string[] => {
    switch (fieldKey) {
      case "vibes":
        return vibeOptions;
      case "layoutShapes":
        return layoutShapeOptions.map((opt) => opt.label);
      case "edgeStyles":
        return edgeStyleOptions.map((opt) => opt.label);
      case "decorations":
        return decorationOptions.map((opt) => opt.label);
      default:
        return [];
    }
  };

  /** 单选：palette / paperTexture。同值再次点击则清空。 */
  const setSingleChoice = (key: "palette" | "paperTexture", value: string) => {
    setAnswers((current) => ({
      ...current,
      [key]: current[key] === value ? undefined : value,
    }));
  };

  /** 添加自定义标签 */
  const handleAddCustomTag = (fieldKey: string, newTag: string) => {
    setAnswers((current) => {
      const customTags = current.customTags ?? {};
      const fieldTags = customTags[fieldKey] ?? [];
      const updated = addTag(newTag, fieldTags);
      const nextCustomTags = { ...customTags, [fieldKey]: updated };
      
      // 保存到 localStorage
      saveCustomTags(nextCustomTags);
      
      return {
        ...current,
        customTags: nextCustomTags,
      };
    });
  };

  /** 删除自定义标签 */
  const handleRemoveCustomTag = (fieldKey: string, tag: string, defaultTags: string[]) => {
    setAnswers((current) => {
      const customTags = current.customTags ?? {};
      const fieldTags = customTags[fieldKey] ?? [];
      const selectedTags = current[fieldKey as keyof UserAnswers] as string[] | undefined;
      
      const { customTags: updatedCustom, selectedTags: updatedSelected } = removeTag(
        tag,
        defaultTags,
        fieldTags,
        selectedTags
      );
      
      const nextCustomTags = { ...customTags, [fieldKey]: updatedCustom };
      
      // 保存到 localStorage
      saveCustomTags(nextCustomTags);
      
      return {
        ...current,
        customTags: nextCustomTags,
        [fieldKey]: updatedSelected,
      };
    });
  };

  /**
   * 让小兔先看一眼照片：批量调用 qwen3-vl，把识别到的标签存到 answers.visionTags。
   * 只对 remoteUrl 已经上传成功的图片识别；其余给一个温和提示，不阻断。
   */
  const recognizePhotos = async () => {
    setVisionError("");
    const targets = photos
      .map((p) => ({ id: p.id, url: p.remoteUrl ?? "" }))
      .filter((item) => Boolean(item.url));
    if (!targets.length) {
      setVisionError("还没有可识别的图片云端链接，请先等待上传完成或手填远程链接。");
      return;
    }
    setIsVisionLoading(true);
    try {
      const tags = await recognizePhotoBatch(targets);
      setAnswers((current) => ({
        ...current,
        visionTags: { ...(current.visionTags ?? {}), ...tags },
      }));
      const recognizedCount = Object.keys(tags).length;
      if (recognizedCount === 0) {
        setVisionError("小兔暂时没看出明确标签，可以手动添加视觉风味再生成。");
      } else {
        play("success");
      }
    } catch (reason) {
      setVisionError(reason instanceof Error ? reason.message : "识图失败");
    } finally {
      setIsVisionLoading(false);
    }
  };

  /** 删除某张图的某个 VLM 标签（用户校对）。 */
  const removeVisionTag = (photoId: string, tag: string) => {
    setAnswers((current) => {
      const all = current.visionTags ?? {};
      const list = all[photoId] ?? [];
      const nextList = list.filter((t) => t !== tag);
      const next = { ...all };
      if (nextList.length) next[photoId] = nextList;
      else delete next[photoId];
      return { ...current, visionTags: next };
    });
  };

  /** 删除指定索引的图片 */
  const deletePhoto = (index: number) => {
    const photoToDelete = photos[index];
    setPhotos((current) => current.filter((_, i) => i !== index));
    setRemoteUrls((current) => current.filter((_, i) => i !== index));
    // 同时清除该图片的 VLM 标签
    if (photoToDelete) {
      setAnswers((current) => {
        const all = current.visionTags ?? {};
        const next = { ...all };
        delete next[photoToDelete.id];
        return { ...current, visionTags: next };
      });
    }
  };

  const generateJournal = async (closeAfter = false) => {
    if (!photos.length) {
      setError("请先上传图片");
      return;
    }

    // 检查是否有可用的生成模型
    const availableModels = getAvailableModels();
    if (availableModels.length === 0) {
      setError(
        "还没有配置任何生成模型。请在 src/lib/api-keys.local.ts 中配置至少一个模型的 API Key，或联系管理员 叶瑄（丁江颖）获取试用 API Key。"
      );
      setIsErrorAlertOpen(true);
      return;
    }

    // 检查是否有上传失败的图片
    const failedPhotos = photos.filter((p) => !p.remoteUrl);
    if (failedPhotos.length > 0) {
      const failedNames = failedPhotos.map((p) => p.fileName).join("、");
      const confirmed = window.confirm(
        `⚠️ 以下 ${failedPhotos.length} 张图片上传失败，无法被 AI 使用：\n${failedNames}\n\n` +
          "继续生成的话，这些图片不会出现在最终结果中。\n\n是否继续？",
      );
      if (!confirmed) return;
    }

    setError("");
    // 进入生成流程前先清掉旧的重试进度，避免上次的「3/3」残留干扰。
    setAttemptInfo(null);
    setIsGenerating(true);
    try {
      const nextDraft = await requestJournalDraft({
        photos,
        answers,
        styleId,
        templateId,
        remoteUrls,
        // Kratos 内部最多 3 次尝试，每次开始前回调进度供 DrawingOverlay 显示。
        onAttempt: ({ attempt, totalAttempts }) =>
          setAttemptInfo({ attempt, total: totalAttempts }),
      });
      setDraft(nextDraft);
      if (nextDraft.generationError) {
        setError(nextDraft.generationError);
      } else {
        play("success");
      }
      if (closeAfter) setIsInfoOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "生成失败");
    } finally {
      setIsGenerating(false);
      // 退出生成态后清掉进度，等待动画结束遮罩卸载时 attemptInfo 也归位。
      setAttemptInfo(null);
    }
  };

  const updateRemoteUrl = (index: number, value: string) => {
    setRemoteUrls((current) => {
      const next = [...current];
      while (next.length < photos.length) next.push("");
      next[index] = value;
      return next;
    });
  };

  const downloadGeneratedImage = async () => {
    if (!draft?.generatedImageUrl) return;
    play("export");
    try {
      const response = await fetch(draft.generatedImageUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      downloadDataUrl(objectUrl, `${draft.title || "generated"}-llm.png`);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 4_000);
    } catch {
      // 跨域下载失败时退化为新窗口打开。
      window.open(draft.generatedImageUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <main className={classNames("app", draft ? "has-draft" : false, `style-${activeStyle}`, `template-${templateId}`)}>
      {/* 用户信息栏 */}
      <div className="user-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.75em 1.5em',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderBottom: '1px solid #f0f0f0',
        fontSize: '0.9em',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
          <span style={{ color: '#666' }}>欢迎，</span>
          <span style={{ fontWeight: '500', color: '#333' }}>
            {user?.nickname || user?.username || user?.email || '用户'}
          </span>
        </div>
        <button
          onClick={async () => {
            await signOut();
            setShowAuthPage(true);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35em',
            padding: '0.4em 0.8em',
            backgroundColor: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: '0.35em',
            cursor: 'pointer',
            fontSize: '0.85em',
            color: '#666',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#efefef';
            e.currentTarget.style.borderColor = '#ccc';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
            e.currentTarget.style.borderColor = '#ddd';
          }}
        >
          <LogOut size={14} />
          <span>登出</span>
        </button>
      </div>

      <section className="upload-band">
         <div className="upload-band-controls">
            <button
              className={classNames("sound-toggle", soundEnabled && "is-on")}
              type="button"
              aria-pressed={soundEnabled}
              aria-label={soundEnabled ? "关闭声音" : "打开声音"}
              title={soundEnabled ? "关闭声音" : "打开声音"}
              onClick={toggleSound}
            >
              {soundEnabled ? <Volume2 size={19} /> : <VolumeX size={19} />}
            </button>
            <ApiConfigPanel />
          </div>
        <div className="upload-studio">
          <div className="studio-preview" aria-hidden="true">
            <div className="post-scene atelier-scene">
              <svg className="atelier-svg" viewBox="0 0 430 254" focusable="false">
                <path className="minimal-wash" d="M62 56 C115 27 286 26 360 61 C381 75 371 115 348 129 C278 168 146 161 78 130 C50 117 39 75 62 56 Z" />
                <path className="minimal-ground" d="M67 198 C116 191 160 204 215 194 C270 183 320 191 366 201" />

                {/*
                 * 大兔子姿态是「低头专心看书的背影」：
                 *   - 两只耳朵立在最高处 + 耳廓内线作为细节；
                 *   - 圆润身体轮廓作为剪影；
                 *   - 故意不画眼睛/嘴/脸颊——背影状态下这些元素只会显得位置错乱。
                 * 这与下方 .small-rabbit 的「侧脸偷看」形成视角对比，画面更耐读。
                 */}
                <g className="minimal-rabbit">
                  <path
                    className="minimal-rabbit-fill"
                    d="M161 196 C137 183 126 157 134 132 C140 112 154 99 173 91 C164 61 169 32 184 26 C197 48 197 69 188 92 C201 62 220 33 236 39 C244 68 231 91 209 105 C232 109 251 123 259 141 C278 143 294 154 294 167 C294 183 279 192 257 190 C244 205 190 211 161 196 Z"
                  />
                  <path className="minimal-ear-line" d="M185 43 C187 61 186 77 181 93" />
                  <path className="minimal-ear-line" d="M228 51 C224 69 216 88 202 103" />
                </g>

                <g className="small-rabbit">
                  <path
                    className="small-rabbit-fill"
                    d="M82 196 C66 188 61 171 67 157 C72 145 82 139 93 136 C86 118 90 101 101 98 C109 111 109 126 104 138 C114 122 127 112 137 116 C139 133 131 145 118 152 C133 154 145 164 148 178 C150 192 132 201 105 201 C97 201 89 200 82 196 Z"
                  />
                  <path className="small-ear-line" d="M101 109 C102 121 100 130 96 138" />
                  <circle className="small-eye" cx="126" cy="163" r="3.5" />
                  <path className="small-smile" d="M132 174 C137 179 143 178 147 172" />
                </g>

                <g className="minimal-book">
                  <path className="book-page-right" d="M214 164 C237 153 268 157 289 172 L282 218 C260 205 237 204 215 215 Z" />
                  <path className="book-page-left" d="M214 164 C196 155 167 156 150 171 L158 218 C176 207 197 205 215 215 Z" />
                  <path className="book-spine" d="M215 165 L215 215" />
                  <path className="book-line book-line-left" d="M168 179 C181 174 195 174 206 179" />
                  <path className="book-line book-line-right" d="M231 179 C246 175 261 178 273 185" />
                </g>

                <g className="minimal-photos">
                  <path className="photo-float-left" d="M74 130 L120 123 L127 158 L81 166 Z" />
                  <path className="photo-float-right" d="M310 113 L353 122 L345 156 L303 148 Z" />
                  <path className="photo-line-left" d="M84 143 L115 138" />
                  <path className="photo-line-right" d="M315 129 L342 134" />
                </g>

                <g className="minimal-stars">
                  <path d="M70 91 C75 89 78 86 80 80 C82 86 86 89 91 91 C86 94 82 97 80 103 C78 97 75 94 70 91 Z" />
                  <path d="M335 78 C339 77 342 74 344 69 C346 74 349 77 354 78 C349 81 346 84 344 89 C342 84 339 81 335 78 Z" />
                </g>

                <g className="motion-lines">
                  <path d="M123 107 C137 99 153 98 167 104" />
                  <path d="M290 102 C305 94 321 95 335 103" />
                  <path d="M171 224 C199 232 244 232 273 223" />
                </g>
              </svg>
            </div>
          </div>

          <div className="studio-actions">
            <div className="studio-title">
              <p>今天的画稿</p>
              <h2>{photos.length ? `${photos.filter((p) => p.remoteUrl).length} 张画面铺好啦` : "让小兔画进手帐"}</h2>
            </div>

            <div className="atelier-note" aria-live="polite">
              <p>{photos.length ? "画纸已经摊开，下一步写几句想留下的心情。" : "先挑几张喜欢的画面，放到小兔的画桌上。"}</p>
            </div>

            <div className="upload-actions">
              {photos.length > 0 ? (
                <button
                  className={classNames("upload-drop", isProcessing && "is-busy")}
                  type="button"
                  onClick={() => {
                    play("tap");
                    setIsPhotoManagerOpen(true);
                  }}
                >
                  <span className="upload-mark">
                    {isProcessing ? <Loader2 className="spin" size={22} /> : <ImagePlus size={22} />}
                  </span>
                  <span className="upload-title">增删画面</span>
                  <span className="upload-meta">管理已上传的图片</span>
                </button>
              ) : (
                <label className={classNames("upload-drop", isProcessing && "is-busy")} onPointerDown={() => play("tap")}>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => {
                      void handleFiles(event.currentTarget.files);
                      event.currentTarget.value = "";
                    }}
                  />
                  <span className="upload-mark">
                    {isProcessing ? <Loader2 className="spin" size={22} /> : <ImagePlus size={22} />}
                  </span>
                  <span className="upload-title">选择照片</span>
                  <span className="upload-meta">多张图片一起装订</span>
                </label>
              )}
              <button className="sample-action" type="button" onClick={loadSamples} disabled={isProcessing}>
                <Sparkles size={16} />
                <span>借用练习素材</span>
              </button>
            </div>

            <div className="atelier-steps" aria-label="制作步骤">
              <span>
                <b>1</b>挑画面
              </span>
              <span>
                <b>2</b>添故事
              </span>
              <span>
                <b>3</b>装成册
              </span>
            </div>
          </div>
        </div>

        {photos.length > 0 && (
          <div className="make-card">
            <div>
              <span>{draft ? "画册完成" : "下一步"}</span>
              <strong>{draft ? "画册已经装好，还能继续调整" : "画纸收好啦，再写几句想留住的故事"}</strong>
            </div>
            <button
              className="make-journal-action"
              type="button"
              onClick={() => {
                play("open");
                setIsInfoOpen(true);
              }}
            >
              <Brush size={18} />
              <span>{draft ? "补充后重画" : "开始画手帐"}</span>
            </button>
          </div>
        )}
      </section>

      {isPhotoManagerOpen && (
        <PhotoManagerModal
          photos={photos}
          isProcessing={isProcessing}
          onClose={() => {
            play("paper");
            setIsPhotoManagerOpen(false);
          }}
          onAddPhotos={handleFiles}
          onDeletePhoto={deletePhoto}
          onSound={play}
        />
      )}

      {photos.length > 0 && isInfoOpen && (
        <InfoModal
          answers={answers}
          draft={draft}
          error={error}
          isGenerating={isGenerating}
          photos={photos}
          remoteUrls={remoteUrls}
          styleId={styleId}
          templateId={templateId}
          isVisionLoading={isVisionLoading}
          visionError={visionError}
          savedTemplates={savedTemplates}
          showTemplateManager={showTemplateManager}
          onClose={() => {
            play("paper");
            setIsInfoOpen(false);
          }}
          onGenerate={() => void generateJournal(true)}
          onSetAnswers={setAnswers}
          onSetRemoteUrl={updateRemoteUrl}
          onSetStyle={(nextStyle) => {
            setStyleId(nextStyle);
            setDraft(null);
          }}
          onSetTemplate={setTemplateId}
          onToggleMood={toggleMood}
          onToggleAnswerList={toggleAnswerList}
          onSetSingleChoice={setSingleChoice}
          onRecognizePhotos={() => void recognizePhotos()}
          onRemoveVisionTag={removeVisionTag}
          onSound={play}
          onApplyTemplate={handleApplyTemplate}
          onDeleteTemplate={handleDeleteTemplate}
          onToggleTemplateManager={() => setShowTemplateManager(!showTemplateManager)}
          onAddCustomTag={handleAddCustomTag}
          onRemoveCustomTag={handleRemoveCustomTag}
        />
      )}

      {draft && (
        <section className="book-band">
          <GeneratedShowcase
            draft={draft}
            answers={answers}
            onDownload={downloadGeneratedImage}
            onSaveTemplate={handleSaveTemplate}
            onSound={play}
          />
        </section>
      )}

      {/* 等待 LLM 接口时的全屏「手绘中」遮罩：兔子跳动 + 选中图片轮播，缓解等待焦虑 */}
      {overlayMounted && photos.length > 0 && (
        <DrawingOverlay photos={photos} isLeaving={!isGenerating} attemptInfo={attemptInfo} />
      )}

      {/* 错误提示弹窗 */}
      {isErrorAlertOpen && error && (
        <ErrorAlert
          message={error}
          onClose={() => setIsErrorAlertOpen(false)}
          onRetry={failedPhotosForRetry.length > 0 ? retryFailedPhotos : undefined}
        />
      )}
    </main>
  );
}

function QuestionGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="question-group">
      <p>{title}</p>
      <div className="choice-grid">{children}</div>
    </div>
  );
}

function ChoiceButton({
  active,
  children,
  onClick,
  onSound,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
  onSound?: (effect: SoundEffect) => void;
}) {
  return (
    <button
      className={classNames("choice", active && "is-active")}
      type="button"
      onClick={() => {
        onSound?.("tap");
        onClick();
      }}
    >
      <span>{children}</span>
      {active && <Check size={14} />}
    </button>
  );
}

export default App;

function GeneratedShowcase({
  draft,
  answers,
  onDownload,
  onSaveTemplate,
  onSound,
}: {
  draft: JournalDraft;
  answers: UserAnswers;
  onDownload: () => void;
  onSaveTemplate?: (name: string, coverImageUrl?: string) => void;
  onSound?: (effect: SoundEffect) => void;
}) {
  const hasImage = Boolean(draft.generatedImageUrl);
  const hasError = Boolean(draft.generationError);
  const [copiedConfession, setCopiedConfession] = useState(false);

  if (!hasImage && !hasError) return null;

  // 格式化生成耗时
  const formatGenerationTime = (ms?: number): string => {
    if (!ms) return "";
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // 复制倾诉记录到剪贴板
  const copyConfessionToClipboard = async () => {
    if (!answers.confessionText) return;
    try {
      await navigator.clipboard.writeText(answers.confessionText);
      setCopiedConfession(true);
      onSound?.("success");
      setTimeout(() => setCopiedConfession(false), 2000);
    } catch {
      // 降级方案：使用 execCommand
      const textarea = document.createElement("textarea");
      textarea.value = answers.confessionText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedConfession(true);
      onSound?.("success");
      setTimeout(() => setCopiedConfession(false), 2000);
    }
  };

  return (
    <section
      className={classNames("generated-hero", hasImage && "is-ready", hasError && "is-error")}
      aria-label="LLM 生成结果"
    >
      <header className="generated-hero-head">
        <div>
          <p className="generated-hero-kicker">LLM · FLUX.2 [pro]</p>
          <h3>{draft.title}</h3>
          <small>{draft.subtitle}</small>
          {draft.generationTimeMs && (
            <small style={{ display: "block", marginTop: "0.5em", color: "#666", fontSize: "0.85em" }}>
              ⏱ 生成耗时：{formatGenerationTime(draft.generationTimeMs)}
            </small>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.5em", flexWrap: "wrap", justifyContent: "flex-end" }}>
          {hasImage && (
            <button type="button" className="generated-hero-download" onClick={onDownload}>
              <ImageDown size={16} />
              <span>下载图</span>
            </button>
          )}
          {onSaveTemplate && (
            <button
              type="button"
              className="generated-hero-download"
              onClick={() => {
                const name = window.prompt("请输入模板名称（保存本次的选项配置）：");
                if (name?.trim()) {
                  onSaveTemplate(name.trim(), draft.generatedImageUrl);
                  onSound?.("success");
                }
              }}
              title="保存当前配置为模板，下次可快速应用"
            >
              <Save size={16} />
              <span>保存选项</span>
            </button>
          )}
        </div>
      </header>

      {hasImage ? (
        <figure className="generated-hero-figure">
          {/* 不加 crossOrigin，避免 CDN 缺少 CORS 头时图片被浏览器拦截。 */}
          <img src={draft.generatedImageUrl} alt={`${draft.title} · LLM 生成`} referrerPolicy="no-referrer" />
        </figure>
      ) : (
        <div className="generated-hero-empty">
          <p>{draft.generationError}</p>
          <small>右下角的 "重新装订" 可再试一次；本地可在控制台查看请求详情。</small>
        </div>
      )}

      {draft.generatedPrompt && (
        <details className="generated-hero-prompt">
          <summary>查看本次发给 LLM 的 prompt</summary>
          <p>{draft.generatedPrompt}</p>
        </details>
      )}

      {/* 倾诉记录展示 */}
      {answers.confessionText && (
        <div className="confession-display">
          <div className="confession-display-header">
            <h4>💭 今天的倾诉</h4>
            <button
              type="button"
              className="confession-copy-btn"
              onClick={copyConfessionToClipboard}
              title="复制到剪贴板"
            >
              {copiedConfession ? "已复制 ✓" : "复制"}
            </button>
          </div>
          <p className="confession-display-text">{answers.confessionText}</p>
        </div>
      )}
    </section>
  );
}

function InfoModal({
   answers,
   draft,
   error,
   isGenerating,
   photos,
   remoteUrls,
   styleId,
   templateId,
   isVisionLoading,
   visionError,
   savedTemplates,
   showTemplateManager,
   onClose,
   onGenerate,
   onSetAnswers,
   onSetRemoteUrl,
   onSetStyle,
   onSetTemplate,
   onToggleMood,
   onToggleAnswerList,
   onSetSingleChoice,
   onRecognizePhotos,
   onRemoveVisionTag,
   onSound,
   onApplyTemplate,
   onDeleteTemplate,
   onToggleTemplateManager,
   onAddCustomTag,
   onRemoveCustomTag,
}: {
   answers: UserAnswers;
   draft: JournalDraft | null;
   error: string;
   isGenerating: boolean;
   photos: PhotoAsset[];
   remoteUrls: string[];
   styleId: StyleId;
   templateId: TemplateId;
   isVisionLoading: boolean;
   visionError: string;
   savedTemplates: SavedTemplate[];
   showTemplateManager: boolean;
   onClose: () => void;
   onGenerate: () => void;
   onSetAnswers: Dispatch<SetStateAction<UserAnswers>>;
   onSetRemoteUrl: (index: number, value: string) => void;
   onSetStyle: (style: StyleId) => void;
   onSetTemplate: (template: TemplateId) => void;
   onToggleMood: (mood: string) => void;
   onToggleAnswerList: (key: "vibes" | "layoutShapes" | "edgeStyles" | "decorations", value: string) => void;
   onSetSingleChoice: (key: "palette" | "paperTexture", value: string) => void;
   onRecognizePhotos: () => void;
   onRemoveVisionTag: (photoId: string, tag: string) => void;
   onSound: (effect: SoundEffect) => void;
   onApplyTemplate: (template: SavedTemplate) => void;
   onDeleteTemplate: (templateId: string) => void;
   onToggleTemplateManager: () => void;
   onAddCustomTag: (fieldKey: string, newTag: string) => void;
   onRemoveCustomTag: (fieldKey: string, tag: string, defaultTags: string[]) => void;
}) {
   const [showTemplateSelection, setShowTemplateSelection] = useState(() => savedTemplates.length > 0);
   const [selectedTemplateDetail, setSelectedTemplateDetail] = useState<SavedTemplate | null>(null);

   // 如果用户点击了查看详情，显示模板详情页面
   if (selectedTemplateDetail) {
     return (
       <TemplateDetailModal
         template={selectedTemplateDetail}
         onClose={() => setSelectedTemplateDetail(null)}
         onApply={() => {
           onApplyTemplate(selectedTemplateDetail);
           setShowTemplateSelection(false);
           setSelectedTemplateDetail(null);
         }}
         onDelete={() => {
           onDeleteTemplate(selectedTemplateDetail.id);
           setSelectedTemplateDetail(null);
         }}
         onSound={onSound}
       />
     );
   }

   // 如果有模板且用户还没选择，显示模板选择界面
   if (showTemplateSelection && savedTemplates.length > 0) {
     return (
       <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="template-selection-title">
         <button className="modal-backdrop" type="button" aria-label="关闭模板选择" onClick={onClose} />
         <section className="info-modal">
           <div className="modal-handle" />
           <div className="speech-bubble">选择一个模板快速开始，或从头开始</div>
           <header className="modal-header modal-header-slim">
             <div className="modal-mascot" aria-hidden="true">
               <span />
             </div>
             <button
               className="icon-button modal-close-floating"
               type="button"
               aria-label="关闭"
               onClick={onClose}
             >
               <CircleX size={22} />
             </button>
           </header>

           <div className="modal-scroll">
             <section className="control-band modal-panel">
               <div className="band-heading">
                 <span>
                   <Sparkles size={17} />
                   保存的模板
                 </span>
               </div>
               <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.75em" }}>
                 {savedTemplates.map((template) => (
                   <div
                     key={template.id}
                     style={{
                       padding: "1em",
                       border: "1px solid #ddd",
                       borderRadius: "0.5em",
                       backgroundColor: "#fafafa",
                       transition: "all 0.2s ease",
                       display: "flex",
                       gap: "0.5em",
                       alignItems: "center",
                     }}
                     onMouseEnter={(e) => {
                       e.currentTarget.style.backgroundColor = "#f0f0f0";
                       e.currentTarget.style.borderColor = "#999";
                     }}
                     onMouseLeave={(e) => {
                       e.currentTarget.style.backgroundColor = "#fafafa";
                       e.currentTarget.style.borderColor = "#ddd";
                     }}
                   >
                     {template.coverImageUrl && (
                       <img
                         src={template.coverImageUrl}
                         alt={template.name}
                         style={{
                           width: "60px",
                           height: "60px",
                           borderRadius: "0.25em",
                           objectFit: "cover",
                           flexShrink: 0,
                         }}
                       />
                     )}
                     <div style={{ flex: 1, minWidth: 0 }}>
                       <div style={{ fontWeight: "bold", marginBottom: "0.25em" }}>{template.name}</div>
                       <div style={{ fontSize: "0.85em", color: "#666" }}>
                         {new Date(template.createdAt).toLocaleDateString("zh-CN")}
                       </div>
                     </div>
                     <div style={{ display: "flex", gap: "0.5em", flexShrink: 0 }}>
                       <button
                         type="button"
                         onClick={() => {
                           onSound("tap");
                           setSelectedTemplateDetail(template);
                         }}
                         style={{
                           padding: "0.5em 0.75em",
                           fontSize: "0.85em",
                           border: "1px solid #ddd",
                           borderRadius: "0.25em",
                           backgroundColor: "#fff",
                           cursor: "pointer",
                           transition: "all 0.2s ease",
                         }}
                         onMouseEnter={(e) => {
                           e.currentTarget.style.backgroundColor = "#f5f5f5";
                         }}
                         onMouseLeave={(e) => {
                           e.currentTarget.style.backgroundColor = "#fff";
                         }}
                       >
                         查看
                       </button>
                       <button
                         type="button"
                         onClick={() => {
                           onSound("tap");
                           onApplyTemplate(template);
                           setShowTemplateSelection(false);
                         }}
                         style={{
                           padding: "0.5em 0.75em",
                           fontSize: "0.85em",
                           border: "1px solid #4a90e2",
                           borderRadius: "0.25em",
                           backgroundColor: "#4a90e2",
                           color: "#fff",
                           cursor: "pointer",
                           transition: "all 0.2s ease",
                         }}
                         onMouseEnter={(e) => {
                           e.currentTarget.style.backgroundColor = "#357abd";
                         }}
                         onMouseLeave={(e) => {
                           e.currentTarget.style.backgroundColor = "#4a90e2";
                         }}
                       >
                         使用
                       </button>
                       <button
                         type="button"
                         onClick={() => {
                           if (window.confirm(`确定要删除模板 "${template.name}" 吗？`)) {
                             onSound("tap");
                             onDeleteTemplate(template.id);
                           }
                         }}
                         style={{
                           padding: "0.5em 0.75em",
                           fontSize: "0.85em",
                           border: "1px solid #d32f2f",
                           borderRadius: "0.25em",
                           backgroundColor: "#fff",
                           color: "#d32f2f",
                           cursor: "pointer",
                           transition: "all 0.2s ease",
                         }}
                         onMouseEnter={(e) => {
                           e.currentTarget.style.backgroundColor = "#ffebee";
                         }}
                         onMouseLeave={(e) => {
                           e.currentTarget.style.backgroundColor = "#fff";
                         }}
                         title="删除此模板"
                       >
                         <Trash2 size={16} style={{ display: "inline", marginRight: "0.25em" }} />
                         删除
                       </button>
                     </div>
                   </div>
                 ))}
               </div>
             </section>
           </div>

           <footer className="modal-footer">
             <button className="secondary-action" type="button" onClick={onClose}>
               关闭
             </button>
             <button
               className="primary-action"
               type="button"
               onClick={() => {
                 onSound("tap");
                 setShowTemplateSelection(false);
               }}
               style={{ flex: 1 }}
             >
               <Brush size={19} />
               <span>从头开始</span>
             </button>
           </footer>
         </section>
       </div>
     );
   }

   return (
     <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="journal-modal-title">
       <button className="modal-backdrop" type="button" aria-label="关闭补充信息" onClick={onClose} />
       <section className="info-modal">
         <div className="modal-handle" />
         <div className="speech-bubble">告诉小兔今天想留下什么</div>
        {/*
         * 头部精简：去掉「故事纸条 / 补充画册信息」文案与素材小记 observations，
         * 关闭按钮浮在右上角，mascot 居中作为视觉过渡。
         */}
        <header className="modal-header modal-header-slim">
          <div className="modal-mascot" aria-hidden="true">
            <span />
          </div>
          <button
            className="icon-button modal-close-floating"
            type="button"
            aria-label="关闭"
            onClick={onClose}
          >
            <CircleX size={22} />
          </button>
        </header>

        <div className="modal-scroll">
           {/* 生成模型选择 - 放在最上方 */}
           <section className="control-band modal-panel">
            <div className="control-row">
              <div className="band-heading">
                <span>
                  <Sparkles size={17} />
                  生成模型
                </span>
              </div>
              <div className="segmented">
                {(Object.keys(MODEL_CONFIGS) as ModelType[])
                  .filter((id) => id !== "other")
                  .map((modelId) => {
                    const config = MODEL_CONFIGS[modelId];
                    const hasConfig = hasApiKeyForModel(modelId);
                    return (
                      <button
                        key={modelId}
                        className={classNames(
                          answers.selectedModel === modelId && "is-active",
                          !hasConfig && "is-disabled"
                        )}
                        type="button"
                        onClick={() => {
                          if (hasConfig) {
                            onSound("tap");
                            onSetAnswers((current) => ({ ...current, selectedModel: modelId }));
                          }
                        }}
                        disabled={!hasConfig}
                        title={hasConfig ? config.description : `未配置 ${config.name} 的 API Key`}
                      >
                        {config.name}
                        {!hasConfig && <span className="model-unconfigured-badge">未配置</span>}
                      </button>
                    );
                  })}
              </div>
              {getAvailableModels().length === 0 && (
                <div style={{ padding: "1em", backgroundColor: "#fff3cd", borderRadius: "0.5em", color: "#856404", marginTop: "0.5em" }}>
                  <p style={{ margin: "0 0 0.5em 0", fontWeight: "bold" }}>⚠️ 还没有配置任何生成模型</p>
                  <p style={{ margin: "0 0 0.5em 0" }}>
                    请点击右上角的 API 配置按钮，为至少一个模型配置 API Key，或联系管理员 <strong>叶瑄（丁江颖）</strong> 获取试用 API Key。
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="dialogue-band modal-panel">
            {/* 「手帐标题」作为开场输入，替代原"补充画册信息"位置 */}
            <label className="title-input title-input-hero">
              <span id="journal-modal-title">手帐标题</span>
              <input
                value={answers.titleSeed}
                onChange={(event) => onSetAnswers((current) => ({ ...current, titleSeed: event.target.value }))}
                placeholder="例如：巴西五日游"
              />
            </label>

            <QuestionGroup title="场景">
              {sceneOptions.map((scene) => (
                <ChoiceButton
                  key={scene.name}
                  active={answers.scene === scene.name}
                  onClick={() => onSetAnswers((current) => ({ ...current, scene: scene.name }))}
                  onSound={onSound}
                >
                  {scene.name}
                </ChoiceButton>
              ))}
            </QuestionGroup>

            <SceneDetails answers={answers} onSetAnswers={onSetAnswers} />

            <EditableTagGroup
              title="情绪"
              defaultTags={moodOptions}
              customTags={answers.customTags?.mood}
              selectedTags={answers.mood}
              onAddTag={(newTag) => onAddCustomTag("mood", newTag)}
              onRemoveTag={(tag) => onRemoveCustomTag("mood", tag, moodOptions)}
              onToggleTag={(tag) => onToggleMood(tag)}
              onSound={onSound}
            />

            <QuestionGroup title="叙述方式">
              {narratorOptions.map((narrator) => (
                <ChoiceButton
                  key={narrator}
                  active={answers.narrator === narrator}
                  onClick={() => onSetAnswers((current) => ({ ...current, narrator }))}
                  onSound={onSound}
                >
                  {narrator}
                </ChoiceButton>
              ))}
            </QuestionGroup>

            {/* 倾诉记录 - 新增步骤 */}
            <div className="confession-section">
              <div className="confession-header">
                <p className="confession-title">
                  <span className="confession-emoji">💭</span>
                  今天的倾诉
                  <span className="confession-optional">可选</span>
                </p>
                <small className="confession-hint">
                  记录今天的感想、心情、发生的事情…这段话可以帮助 AI 更好地理解你的情绪，也可以只作为个人记录。
                </small>
              </div>
              <textarea
                className="confession-textarea"
                value={answers.confessionText ?? ""}
                onChange={(event) => onSetAnswers((current) => ({ ...current, confessionText: event.target.value }))}
                placeholder="比如：今天天气很好，和朋友去了海边，虽然有点累但很开心。希望能把这份美好记录下来…"
                rows={5}
              />
              <div className="confession-options">
                <label className="confession-checkbox">
                  <input
                    type="checkbox"
                    checked={answers.includeConfessionInImage ?? true}
                    onChange={(event) => onSetAnswers((current) => ({ ...current, includeConfessionInImage: event.target.checked }))}
                  />
                  <span>将这段话作为风格指导和关键词提取，融入画面生成</span>
                </label>
                <label className="confession-checkbox">
                  <input
                    type="checkbox"
                    checked={answers.showConfessionInImage ?? false}
                    onChange={(event) => onSetAnswers((current) => ({ ...current, showConfessionInImage: event.target.checked }))}
                  />
                  <span>将这段话作为实际内容放在画面中</span>
                </label>
              </div>
            </div>
           </section>

           <VisualFlavorPanel
            answers={answers}
            onToggleAnswerList={onToggleAnswerList}
            onSetSingleChoice={onSetSingleChoice}
            onSetAnswers={onSetAnswers}
            onSound={onSound}
            onAddCustomTag={onAddCustomTag}
            onRemoveCustomTag={onRemoveCustomTag}
          />

          <section className="control-band modal-panel">
            <div className="control-row">
              <div className="band-heading">
                <span>
                  <Palette size={17} />
                  风格
                </span>
              </div>
              <div className="segmented">
                {stylePresets.map((preset) => (
                  <button
                    key={preset.id}
                    className={classNames(styleId === preset.id && "is-active")}
                    type="button"
                    onClick={() => {
                      onSound("tap");
                      onSetStyle(preset.id);
                    }}
                    title={preset.short}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="control-row">
              <div className="band-heading">
                <span>
                  <Layers3 size={17} />
                  模板
                </span>
              </div>
              <div className="segmented">
                {templatePresets.map((preset) => (
                  <button
                    key={preset.id}
                    className={classNames(templateId === preset.id && "is-active")}
                    type="button"
                    onClick={() => {
                      onSound("tap");
                      onSetTemplate(preset.id);
                    }}
                    title={preset.short}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="control-band modal-panel">
            <div className="band-heading">
              <span>
                <LinkIcon size={17} />
                图片远程链接
              </span>
              <small>
                {photos.length ? (
                  <>
                    共 <b>{photos.filter((p) => p.remoteUrl).length}</b> 张
                    {photos.some((p) => !p.remoteUrl) && (
                      <span style={{ color: "#d68a2b", marginLeft: "0.5em" }}>
                        （{photos.filter((p) => !p.remoteUrl).length} 张待补充）
                      </span>
                    )}
                  </>
                ) : (
                  "上传图片后填写"
                )}
              </small>
            </div>
            <p className="remote-tip">
              本地上传的图片浏览器无法直接交给 LLM 读取。请填上能公网/内网访问的图片链接；为空则使用接口示例链接占位以确保流程可跑通。
            </p>
            <div className="remote-list">
              {photos.map((photo, index) => (
                <label className="remote-item" key={photo.id}>
                  <span className="remote-index">{String(index + 1).padStart(2, "0")}</span>
                  <div className="remote-fields">
                    <strong>{photo.fileName}</strong>
                    <input
                      value={remoteUrls[index] ?? ""}
                      onChange={(event) => onSetRemoteUrl(index, event.target.value)}
                      placeholder="https://cdn.example.com/your-photo.jpg"
                      spellCheck={false}
                      autoComplete="off"
                    />
                  </div>
                </label>
              ))}
              {!photos.length && <p className="remote-empty">先在上方上传图片，再回来填链接。</p>}
            </div>

            <PhotoVisionPanel
              photos={photos}
              visionTags={answers.visionTags ?? {}}
              isLoading={isVisionLoading}
              errorText={visionError}
              onRecognize={onRecognizePhotos}
              onRemoveTag={onRemoveVisionTag}
            />

            <details className="prompt-preview">
              <summary>预览本次发给 LLM 的 prompt</summary>
              <p>{buildKratosPrompt(answers, styleId, templateId, photos.filter((p) => p.remoteUrl).length, photos.map((p) => p.id))}</p>
            </details>
          </section>
        </div>

        <footer className="modal-footer">
          <button className="secondary-action" type="button" onClick={onClose}>
            稍后再说
          </button>
          <button
            className="primary-action"
            type="button"
            onClick={() => {
              onSound("tap");
              onGenerate();
            }}
            disabled={isGenerating}
            style={{ flex: 1 }}
          >
            {isGenerating ? <Loader2 className="spin" size={19} /> : <BookOpen size={19} />}
            <span>{draft ? "重新装订" : "装订手帐本"}</span>
          </button>
        </footer>
        {error && <p className="error-text modal-error">{error}</p>}
      </section>
    </div>
  );
}

/**
 * 根据当前 scene 动态展示一组与场景匹配的补充输入（目的地 / 同行 / 天气…）。
 * 所有字段都可留空；填了就会被拼进发给 LLM 的 prompt。
 */
function SceneDetails({
  answers,
  onSetAnswers,
}: {
  answers: UserAnswers;
  onSetAnswers: Dispatch<SetStateAction<UserAnswers>>;
}) {
  const sceneConfig = sceneOptions.find((scene) => scene.name === answers.scene);
  if (!sceneConfig?.fields.length) return null;

  // 仅统计"当前场景"已填写的字段数；切场景时切回去仍能看到原值。
  const filledCount = sceneConfig.fields.reduce(
    (sum, field) => (answers.details?.[field.key]?.trim() ? sum + 1 : sum),
    0,
  );
  const totalCount = sceneConfig.fields.length;
  const hasAnyFilled = filledCount > 0;

  const clearScene = () => {
    onSetAnswers((current) => {
      const next = { ...current.details };
      sceneConfig.fields.forEach((field) => {
        delete next[field.key];
      });
      return { ...current, details: next };
    });
  };

  return (
    <div className="scene-details" aria-label={`${sceneConfig.tag}场景补充`}>
      <div className="scene-details-head">
        <p className="scene-details-title">
          <span className="scene-details-tag">{sceneConfig.tag}</span>
          围绕「{sceneConfig.name}」补一些细节
          <span className="scene-details-optional">可选</span>
        </p>
        <div className="scene-details-meta">
          <small className="scene-details-hint">
            {hasAnyFilled
              ? `已填 ${filledCount} / ${totalCount} 项 · LLM 会按你的描述生成`
              : `全部可留空 · 填得越多生成越贴近你的「${sceneConfig.tag}」记忆`}
          </small>
          {hasAnyFilled && (
            <button type="button" className="scene-details-clear" onClick={clearScene}>
              清空本场景
            </button>
          )}
        </div>
      </div>
      <div className="scene-detail-grid">
        {sceneConfig.fields.map((field) => (
          <SceneDetailControl
            key={field.key}
            field={field}
            value={answers.details?.[field.key] ?? ""}
            onChange={(nextValue) => {
              onSetAnswers((current) => {
                const nextDetails = { ...current.details };
                if (nextValue) nextDetails[field.key] = nextValue;
                else delete nextDetails[field.key];
                return { ...current, details: nextDetails };
              });
            }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 单个场景字段控件——根据 field.options + field.multiple 自动分发：
 *   - 无 options：纯输入框（保留旧逻辑）；
 *   - 单选 chip：点中即填，再点一次清空；
 *   - 多选 chip：点击 toggle，序列化用「、」拼接；
 *   - allowCustom：底部追加一个小输入框，回车追加到多选集合中。
 */
function SceneDetailControl({
  field,
  value,
  onChange,
}: {
  field: SceneDetailField;
  value: string;
  onChange: (next: string) => void;
}) {
  const hasOptions = Array.isArray(field.options) && field.options.length > 0;

  if (!hasOptions) {
    return (
      <label className="scene-detail-item">
        <span>{field.label}</span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          spellCheck={false}
          autoComplete="off"
        />
      </label>
    );
  }

  if (field.multiple) {
    const selected = splitMulti(value);
    const toggle = (opt: string) => {
      const exists = selected.includes(opt);
      const next = exists ? selected.filter((s) => s !== opt) : [...selected, opt];
      onChange(joinMulti(next));
    };
    return (
      <div className="scene-detail-item scene-detail-item-chips">
        <span>
          {field.label}
          <em className="scene-detail-multi-hint">多选</em>
        </span>
        <div className="chip-row">
          {field.options!.map((opt) => (
            <button
              key={opt}
              type="button"
              className={classNames("chip", selected.includes(opt) && "is-on")}
              onClick={() => toggle(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 单选 chip
  return (
    <div className="scene-detail-item scene-detail-item-chips">
      <span>{field.label}</span>
      <div className="chip-row">
        {field.options!.map((opt) => (
          <button
            key={opt}
            type="button"
            className={classNames("chip", value === opt && "is-on")}
            onClick={() => onChange(value === opt ? "" : opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * 视觉风味面板——对应 6 段处理流程中的「智能排版 / 装饰元素 / 底图融合 / 色调 / 氛围」。
 * 所有项都用 chip 选择，最大化降低用户输入成本。
 */
function VisualFlavorPanel({
    answers,
    onToggleAnswerList,
    onSetSingleChoice,
    onSetAnswers,
    onSound,
    onAddCustomTag,
    onRemoveCustomTag,
  }: {
    answers: UserAnswers;
    onToggleAnswerList: (key: "vibes" | "layoutShapes" | "edgeStyles" | "decorations", value: string) => void;
    onSetSingleChoice: (key: "palette" | "paperTexture", value: string) => void;
    onSetAnswers: Dispatch<SetStateAction<UserAnswers>>;
    onSound: (effect: SoundEffect) => void;
    onAddCustomTag: (fieldKey: string, newTag: string) => void;
    onRemoveCustomTag: (fieldKey: string, tag: string, defaultTags: string[]) => void;
  }) {
   // 获取各字段的默认标签
   const layoutShapeLabels = layoutShapeOptions.map((opt) => opt.label);
   const edgeStyleLabels = edgeStyleOptions.map((opt) => opt.label);
   const decorationLabels = decorationOptions.map((opt) => opt.label);
  return (
    <section className="visual-flavor-panel modal-panel">
      <div className="visual-flavor-head">
        <p className="visual-flavor-title">
          <Sparkles size={15} />
          视觉风味（全部可选 · 全部 chip 选择）
        </p>
        <small className="visual-flavor-hint">
          色调 / 氛围 / 排版形状 / 装饰元素 / 底图纸张——你选什么，画就长什么样。
        </small>
      </div>

      <FlavorGroup title="色调（单选）">
        {paletteOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={classNames("chip chip-with-hint", answers.palette === opt.label && "is-on")}
            title={opt.short}
            onClick={() => {
              onSound("tap");
              onSetSingleChoice("palette", opt.label);
            }}
          >
            <b>{opt.label}</b>
            <em>{opt.short}</em>
          </button>
        ))}
      </FlavorGroup>

      <EditableTagGroup
        title="氛围（多选）"
        defaultTags={vibeOptions}
        customTags={answers.customTags?.vibes}
        selectedTags={answers.vibes}
        onAddTag={(newTag) => onAddCustomTag("vibes", newTag)}
        onRemoveTag={(tag) => onRemoveCustomTag("vibes", tag, vibeOptions)}
        onToggleTag={(tag) => onToggleAnswerList("vibes", tag)}
        onSound={onSound}
      />

      <EditableTagGroup
        title="排版形状（多选 · 仅控制照片轮廓）"
        defaultTags={layoutShapeLabels}
        customTags={answers.customTags?.layoutShapes}
        selectedTags={answers.layoutShapes}
        onAddTag={(newTag) => onAddCustomTag("layoutShapes", newTag)}
        onRemoveTag={(tag) => onRemoveCustomTag("layoutShapes", tag, layoutShapeLabels)}
        onToggleTag={(tag) => onToggleAnswerList("layoutShapes", tag)}
        onSound={onSound}
      />

      <EditableTagGroup
        title="照片边缘风格（多选 · 与形状正交；带 🔒 的边缘自带固定形状会覆盖上方选择）"
        defaultTags={edgeStyleLabels}
        customTags={answers.customTags?.edgeStyles}
        selectedTags={answers.edgeStyles}
        onAddTag={(newTag) => onAddCustomTag("edgeStyles", newTag)}
        onRemoveTag={(tag) => onRemoveCustomTag("edgeStyles", tag, edgeStyleLabels)}
        onToggleTag={(tag) => onToggleAnswerList("edgeStyles", tag)}
        onSound={onSound}
      />

      <EditableTagGroup
        title="装饰元素（多选）"
        defaultTags={decorationLabels}
        customTags={answers.customTags?.decorations}
        selectedTags={answers.decorations}
        onAddTag={(newTag) => onAddCustomTag("decorations", newTag)}
        onRemoveTag={(tag) => onRemoveCustomTag("decorations", tag, decorationLabels)}
        onToggleTag={(tag) => onToggleAnswerList("decorations", tag)}
        onSound={onSound}
      />

      <FlavorGroup title="底图纸张（单选）">
        {paperOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={classNames("chip chip-with-hint", answers.paperTexture === opt.label && "is-on")}
            title={opt.short}
            onClick={() => {
              onSound("tap");
              onSetSingleChoice("paperTexture", opt.label);
            }}
          >
            <b>{opt.label}</b>
            <em>{opt.short}</em>
          </button>
        ))}
      </FlavorGroup>

      <FlavorGroup title="画面主色调（单选 · 可不选）">
        {mainColorOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={classNames("chip chip-color", answers.mainColor === opt.label && "is-on")}
            title={opt.label}
            onClick={() => {
              onSound("tap");
              onSetAnswers((current) => ({
                ...current,
                mainColor: current.mainColor === opt.label ? undefined : opt.label,
              }));
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5em",
            }}
          >
            <span
              style={{
                width: "1.2em",
                height: "1.2em",
                borderRadius: "50%",
                backgroundColor: opt.color,
                border: "2px solid #ddd",
                flexShrink: 0,
              }}
            />
            <span>{opt.label}</span>
          </button>
        ))}
      </FlavorGroup>
    </section>
  );
}

function FlavorGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flavor-group">
      <p className="flavor-group-title">{title}</p>
      <div className="chip-row">{children}</div>
    </div>
  );
}

/**
 * VLM 自动识图面板——「让小兔先看一眼照片 ✨」按钮 + 每张图的识别标签。
 * 用户可以点 × 删除任意标签（精细校对）。
 */
function PhotoVisionPanel({
  photos,
  visionTags,
  isLoading,
  errorText,
  onRecognize,
  onRemoveTag,
}: {
  photos: PhotoAsset[];
  visionTags: Record<string, string[]>;
  isLoading: boolean;
  errorText: string;
  onRecognize: () => void;
  onRemoveTag: (photoId: string, tag: string) => void;
}) {
  const recognizedCount = photos.filter((p) => (visionTags[p.id]?.length ?? 0) > 0).length;
  const uploadedCount = photos.filter((p) => Boolean(p.remoteUrl)).length;

  return (
    <section className="vision-panel">
      <div className="vision-head">
        <div>
          <p className="vision-title">
            <Eye size={15} />
            让小兔先看一眼照片
          </p>
          <small className="vision-hint">
            qwen3-vl 会逐张识别场景 / 色调 / 氛围 / 关键词，识别结果会一并喂给 LLM。
            {uploadedCount > 0
              ? ` 已上传 ${uploadedCount} 张可识别；已识别 ${recognizedCount} 张。`
              : " 等待图片上传完成后再点。"}
          </small>
        </div>
        <button
          type="button"
          className="vision-action"
          onClick={onRecognize}
          disabled={isLoading || uploadedCount === 0}
        >
          {isLoading ? <Loader2 className="spin" size={16} /> : <Tag size={16} />}
          <span>{isLoading ? "识别中…" : recognizedCount > 0 ? "再识别一次" : "开始识图"}</span>
        </button>
      </div>

      {errorText && <p className="vision-error">{errorText}</p>}

      <div className="vision-grid">
        {photos.map((photo) => {
          const tags = visionTags[photo.id] ?? [];
          return (
            <div className="vision-card" key={photo.id}>
              <div className="vision-thumb">
                <img src={photo.url} alt="" referrerPolicy="no-referrer" />
              </div>
              <div className="vision-info">
                <strong className="vision-name" title={photo.fileName}>
                  {photo.fileName}
                </strong>
                {tags.length ? (
                  <div className="vision-tag-row">
                    {tags.map((tag) => (
                      <span key={tag} className="vision-tag">
                        {tag}
                        <button
                          type="button"
                          aria-label={`删除标签 ${tag}`}
                          onClick={() => onRemoveTag(photo.id, tag)}
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <small className="vision-empty">
                    {photo.remoteUrl ? "未识别 · 点上方按钮" : "未上传到云端 · 暂不能识别"}
                  </small>
                )}
              </div>
            </div>
          );
        })}
        {!photos.length && <p className="vision-empty-row">先上传图片再来识别。</p>}
      </div>
    </section>
  );
}

/**
 * 等待 LLM 接口期间的全屏「手绘中」遮罩：
 *   - backdrop-filter 模糊背后所有内容（包括弹窗与主界面）；
 *   - 上半部分一只兔子上下跳动 + 椭圆阴影呼吸；
 *   - 中部「手绘中…」状态文字 + 三个跳动小点；
 *   - 下半部分把用户选中的图片做拍立得式轮播（每 1.6s 切一张），
 *     让用户清晰看到「我刚刚交给小兔的素材正在被处理」。
 * 不需要任何手动 cancel：父组件根据 isGenerating 自动卸载。
 */
/**
 * 多阶段文案，按真实等待时间错峰切换，让用户感觉"进度真的在推进"。
 * 阶段间隔 6s，最后一阶段会持续到接口返回为止。
 */
const DRAWING_PHASES: Array<{ title: string; hint: string }> = [
  { title: "打底稿中", hint: "小兔把照片摊在画桌上，开始勾轮廓" },
  { title: "上色中", hint: "纸面上的颜色一层一层叠上来" },
  { title: "贴贴纸啦", hint: "票根、文字标签按版式贴到该贴的位置" },
  { title: "装订成册", hint: "马上把这本手帐合起来交到你手上" },
];
const DRAWING_PHASE_INTERVAL_MS = 6_000;
const DRAWING_CAROUSEL_INTERVAL_MS = 1_600;
const DRAWING_MAX_CARDS = 12;

function DrawingOverlay({
  photos,
  isLeaving,
  attemptInfo,
}: {
  photos: PhotoAsset[];
  isLeaving: boolean;
  attemptInfo: { attempt: number; total: number } | null;
}) {
  // 只显示上传成功的图片，然后取最多 N 张参与轮播，避免极端情况下渲染过多 DOM
  const successfulPhotos = photos.filter((p) => p.remoteUrl);
  const carousel = successfulPhotos.slice(0, DRAWING_MAX_CARDS);
  const [activeIndex, setActiveIndex] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  /** 加载失败的图片 id 集合，用于把破图换成纸纹占位。 */
  const [brokenIds, setBrokenIds] = useState<Set<string>>(() => new Set());

  // 轮播：每 1.6s 切下一张
  useEffect(() => {
    if (carousel.length <= 1) return;
    const id = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % carousel.length);
    }, DRAWING_CAROUSEL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [carousel.length]);

  // 多阶段文案：每 6s 切一次，最后一段保持到接口返回
  useEffect(() => {
    const id = window.setInterval(() => {
      setPhaseIndex((prev) => Math.min(prev + 1, DRAWING_PHASES.length - 1));
    }, DRAWING_PHASE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  /** 越界防御：极端情况下 photos 在生成期间被外部修改，确保 active 始终落在数组内。 */
  const safeActive = carousel.length ? activeIndex % carousel.length : 0;
  const phase = DRAWING_PHASES[phaseIndex] ?? DRAWING_PHASES[0];

  return (
    <div
      className={classNames("drawing-overlay", isLeaving && "is-leaving")}
      role="status"
      aria-live="polite"
      aria-label="小兔正在手绘中"
    >
      <div className="drawing-rabbit-wrap" aria-hidden="true">
        <div className="drawing-rabbit">
          <svg viewBox="0 0 120 110" focusable="false">
            <g
              fill="#fffdf4"
              stroke="#1a1410"
              strokeWidth="3.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* 身体 */}
              <path d="M28 88 C16 78 16 58 30 50 C40 44 52 44 60 48 C68 44 80 44 90 50 C104 58 104 78 92 88 Z" />
              {/* 左耳 */}
              <path d="M44 50 C38 30 38 16 44 8 C52 18 54 36 52 50" />
              {/* 右耳 */}
              <path d="M76 50 C82 30 82 16 76 8 C68 18 66 36 68 50" />
            </g>
            {/* 眼睛 + 微笑 */}
            <g fill="#1a1410">
              <circle cx="46" cy="68" r="2.6" />
              <circle cx="74" cy="68" r="2.6" />
            </g>
            <path
              d="M54 80 Q60 86 66 80"
              stroke="#1a1410"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            {/* 一支铅笔 */}
            <g strokeLinecap="round" strokeLinejoin="round">
              <line x1="85" y1="82" x2="103" y2="62" stroke="#1a1410" strokeWidth="3.2" />
              <line x1="101" y1="62" x2="106" y2="57" stroke="#d68a2b" strokeWidth="3.2" />
            </g>
          </svg>
        </div>
        <div className="drawing-rabbit-shadow" />
      </div>

      <div className="drawing-status">
        {/* key 强制重挂载触发 fade 动画，让文案切换不突兀 */}
        <strong key={`title-${phaseIndex}`} className="drawing-phase-title">
          {phase.title}
        </strong>
        <span className="drawing-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <small key={`hint-${phaseIndex}`} className="drawing-phase-hint">
          {phase.hint} · 共
          <b>{carousel.length}</b>
          张画稿
        </small>
        {/*
         * 重试态徽标：仅当处于第 2 次/第 3 次尝试时显示，避免首次也亮一个「1/3」干扰。
         * key 触发淡入：每次 attempt 变化都重挂载一次。
         */}
        {attemptInfo && attemptInfo.attempt > 1 && (
          <span
            key={`retry-${attemptInfo.attempt}`}
            className="drawing-retry-badge"
            role="status"
          >
            网络抖动了一下 · 正在第 <b>{attemptInfo.attempt}</b> / {attemptInfo.total} 次尝试
          </span>
        )}
      </div>

      <div className="drawing-carousel" aria-hidden="true">
        {carousel.map((photo, index) => {
          const offset = index - safeActive;
          // 给每张图一个稳定的小角度倾斜，制造手帐拍立得感
          const rotateBase = (index % 2 === 0 ? -1 : 1) * (3 + (index % 3));
          const style: CSSProperties = {
            "--rotate": `${rotateBase}deg`,
          } as CSSProperties;
          const isBroken = brokenIds.has(photo.id);
          return (
            <figure
              key={photo.id}
              className={classNames(
                "drawing-card",
                offset === 0 && "is-active",
                offset === -1 && "is-prev",
                offset === 1 && "is-next",
                isBroken && "is-broken",
              )}
              style={style}
            >
              {isBroken ? (
                <div className="drawing-card-placeholder" aria-hidden="true">
                  <span>素材</span>
                </div>
              ) : (
                <img
                  src={photo.url}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={() =>
                    setBrokenIds((prev) => {
                      if (prev.has(photo.id)) return prev;
                      const next = new Set(prev);
                      next.add(photo.id);
                      return next;
                    })
                  }
                />
              )}
              <figcaption>{photo.fileName}</figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}

function PhotoManagerModal({
 photos,
 isProcessing,
 onClose,
 onAddPhotos,
 onDeletePhoto,
 onSound,
}: {
 photos: PhotoAsset[];
 isProcessing: boolean;
 onClose: () => void;
 onAddPhotos: (files: FileList | null) => void;
 onDeletePhoto: (index: number) => void;
 onSound: (effect: SoundEffect) => void;
}) {
 return (
   <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="photo-manager-title">
     <button className="modal-backdrop" type="button" aria-label="关闭增删画面" onClick={onClose} />
     <section className="info-modal">
       <div className="modal-handle" />
       <div className="speech-bubble">整理一下画桌上的画面</div>
       <header className="modal-header modal-header-slim">
         <div className="modal-mascot" aria-hidden="true">
           <span />
         </div>
         <button
           className="icon-button modal-close-floating"
           type="button"
           aria-label="关闭"
           onClick={onClose}
         >
           <CircleX size={22} />
         </button>
       </header>

       <div className="modal-scroll">
         {/* 上传新图片区域 */}
         <section className="control-band modal-panel">
           <div className="band-heading">
             <span>
               <ImagePlus size={17} />
               添加新图片
             </span>
           </div>
           <label className={classNames("upload-drop", isProcessing && "is-busy")} onPointerDown={() => onSound("tap")}>
             <input
               type="file"
               accept="image/*"
               multiple
               onChange={(event) => {
                 onAddPhotos(event.currentTarget.files);
                 event.currentTarget.value = "";
               }}
             />
             <span className="upload-mark">
               {isProcessing ? <Loader2 className="spin" size={22} /> : <ImagePlus size={22} />}
             </span>
             <span className="upload-title">选择或拖拽图片</span>
             <span className="upload-meta">支持多张图片同时上传</span>
           </label>
         </section>

         {/* 已上传图片列表 */}
         <section className="control-band modal-panel">
           <div className="band-heading">
             <span>
               <Layers3 size={17} />
               已上传的画面
             </span>
             <small>共 <b>{photos.length}</b> 张</small>
           </div>
           <div className="photo-manager-list">
             {photos.map((photo, index) => (
               <div key={photo.id} className="photo-manager-item">
                 <div className="photo-manager-preview">
                   <img src={photo.url} alt={photo.fileName} />
                   <div className="photo-manager-overlay">
                     <button
                       className="photo-delete-btn"
                       type="button"
                       onClick={() => {
                         onSound("tap");
                         onDeletePhoto(index);
                       }}
                       title="删除此图片"
                       aria-label={`删除 ${photo.fileName}`}
                     >
                       <Trash2 size={18} />
                       <span>删除</span>
                     </button>
                   </div>
                 </div>
                 <div className="photo-manager-info">
                   <strong>{photo.fileName}</strong>
                   <small>{photo.sizeLabel}</small>
                   {photo.remoteUrl ? (
                     <small style={{ color: "#4caf50" }}>✓ 已上传到云端</small>
                   ) : (
                     <small style={{ color: "#d68a2b" }}>⚠ 云端上传失败</small>
                   )}
                 </div>
               </div>
             ))}
             {photos.length === 0 && (
               <p style={{ textAlign: "center", color: "#999", padding: "2em" }}>还没有上传任何图片</p>
             )}
           </div>
         </section>
       </div>
     </section>
   </div>
 );
}

function TemplateDetailModal({
  template,
  onClose,
  onApply,
  onDelete,
  onSound,
}: {
  template: SavedTemplate;
  onClose: () => void;
  onApply: () => void;
  onDelete: () => void;
  onSound: (effect: SoundEffect) => void;
}) {
 const stylePreset = stylePresets.find((s) => s.id === template.styleId);
 const templatePreset = templatePresets.find((t) => t.id === template.templateId);

 return (
   <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="template-detail-title">
     <button className="modal-backdrop" type="button" aria-label="关闭模板详情" onClick={onClose} />
     <section className="info-modal">
       <div className="modal-handle" />
       <div className="speech-bubble">模板详情</div>
       <header className="modal-header modal-header-slim">
         <div className="modal-mascot" aria-hidden="true">
           <span />
         </div>
         <button
           className="icon-button modal-close-floating"
           type="button"
           aria-label="关闭"
           onClick={onClose}
         >
           <CircleX size={22} />
         </button>
       </header>

       <div className="modal-scroll">
         {/* 模板封面 */}
         {template.coverImageUrl && (
           <section className="control-band modal-panel">
             <div className="band-heading">
               <span>模板封面</span>
             </div>
             <figure style={{ margin: 0, borderRadius: "0.5em", overflow: "hidden" }}>
               <img
                 src={template.coverImageUrl}
                 alt={template.name}
                 style={{
                   width: "100%",
                   height: "auto",
                   display: "block",
                 }}
               />
             </figure>
           </section>
         )}

         {/* 基本信息 */}
         <section className="control-band modal-panel">
           <div className="band-heading">
             <span>基本信息</span>
           </div>
           <div style={{ display: "grid", gap: "1em" }}>
             <div>
               <label style={{ display: "block", fontSize: "0.85em", color: "#666", marginBottom: "0.25em" }}>
                 模板名称
               </label>
               <div style={{ fontSize: "1em", fontWeight: "bold" }}>{template.name}</div>
             </div>
             <div>
               <label style={{ display: "block", fontSize: "0.85em", color: "#666", marginBottom: "0.25em" }}>
                 创建时间
               </label>
               <div style={{ fontSize: "1em" }}>
                 {new Date(template.createdAt).toLocaleDateString("zh-CN", {
                   year: "numeric",
                   month: "long",
                   day: "numeric",
                   hour: "2-digit",
                   minute: "2-digit",
                 })}
               </div>
             </div>
           </div>
         </section>

         {/* 风格和模板 */}
         <section className="control-band modal-panel">
           <div className="band-heading">
             <span>配置信息</span>
           </div>
           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1em" }}>
             <div>
               <label style={{ display: "block", fontSize: "0.85em", color: "#666", marginBottom: "0.25em" }}>
                 风格
               </label>
               <div style={{ fontSize: "1em", fontWeight: "bold" }}>
                 {stylePreset?.name || template.styleId}
               </div>
             </div>
             <div>
               <label style={{ display: "block", fontSize: "0.85em", color: "#666", marginBottom: "0.25em" }}>
                 模板
               </label>
               <div style={{ fontSize: "1em", fontWeight: "bold" }}>
                 {templatePreset?.name || template.templateId}
               </div>
             </div>
           </div>
         </section>

         {/* 场景和情绪 */}
         <section className="control-band modal-panel">
           <div className="band-heading">
             <span>内容配置</span>
           </div>
           <div style={{ display: "grid", gap: "1em" }}>
             <div>
               <label style={{ display: "block", fontSize: "0.85em", color: "#666", marginBottom: "0.25em" }}>
                 场景
               </label>
               <div style={{ fontSize: "1em" }}>{template.answers.scene}</div>
             </div>
             <div>
               <label style={{ display: "block", fontSize: "0.85em", color: "#666", marginBottom: "0.25em" }}>
                 情绪
               </label>
               <div style={{ fontSize: "1em" }}>
                 {template.answers.mood.join("、") || "未设置"}
               </div>
             </div>
             <div>
               <label style={{ display: "block", fontSize: "0.85em", color: "#666", marginBottom: "0.25em" }}>
                 叙述方式
               </label>
               <div style={{ fontSize: "1em" }}>{template.answers.narrator}</div>
             </div>
             {template.answers.titleSeed && (
               <div>
                 <label style={{ display: "block", fontSize: "0.85em", color: "#666", marginBottom: "0.25em" }}>
                   标题种子
                 </label>
                 <div style={{ fontSize: "1em" }}>{template.answers.titleSeed}</div>
               </div>
             )}
           </div>
         </section>

         {/* 视觉风味 */}
         {(template.answers.vibes?.length ||
           template.answers.layoutShapes?.length ||
           template.answers.edgeStyles?.length ||
           template.answers.decorations?.length) && (
           <section className="control-band modal-panel">
             <div className="band-heading">
               <span>视觉风味</span>
             </div>
             <div style={{ display: "grid", gap: "1em" }}>
               {template.answers.vibes?.length > 0 && (
                 <div>
                   <label style={{ display: "block", fontSize: "0.85em", color: "#666", marginBottom: "0.25em" }}>
                     氛围标签
                   </label>
                   <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5em" }}>
                     {template.answers.vibes.map((vibe) => (
                       <span
                         key={vibe}
                         style={{
                           padding: "0.25em 0.75em",
                           backgroundColor: "#e8f4f8",
                           borderRadius: "1em",
                           fontSize: "0.85em",
                         }}
                       >
                         {vibe}
                       </span>
                     ))}
                   </div>
                 </div>
               )}
               {template.answers.layoutShapes?.length > 0 && (
                 <div>
                   <label style={{ display: "block", fontSize: "0.85em", color: "#666", marginBottom: "0.25em" }}>
                     排版形状
                   </label>
                   <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5em" }}>
                     {template.answers.layoutShapes.map((shape) => (
                       <span
                         key={shape}
                         style={{
                           padding: "0.25em 0.75em",
                           backgroundColor: "#f0e8f8",
                           borderRadius: "1em",
                           fontSize: "0.85em",
                         }}
                       >
                         {shape}
                       </span>
                     ))}
                   </div>
                 </div>
               )}
               {template.answers.edgeStyles?.length > 0 && (
                 <div>
                   <label style={{ display: "block", fontSize: "0.85em", color: "#666", marginBottom: "0.25em" }}>
                     边缘风格
                   </label>
                   <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5em" }}>
                     {template.answers.edgeStyles.map((style) => (
                       <span
                         key={style}
                         style={{
                           padding: "0.25em 0.75em",
                           backgroundColor: "#f8e8e8",
                           borderRadius: "1em",
                           fontSize: "0.85em",
                         }}
                       >
                         {style}
                       </span>
                     ))}
                   </div>
                 </div>
               )}
               {template.answers.decorations?.length > 0 && (
                 <div>
                   <label style={{ display: "block", fontSize: "0.85em", color: "#666", marginBottom: "0.25em" }}>
                     装饰元素
                   </label>
                   <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5em" }}>
                     {template.answers.decorations.map((decoration) => (
                       <span
                         key={decoration}
                         style={{
                           padding: "0.25em 0.75em",
                           backgroundColor: "#f8f0e8",
                           borderRadius: "1em",
                           fontSize: "0.85em",
                         }}
                       >
                         {decoration}
                       </span>
                     ))}
                   </div>
                 </div>
               )}
             </div>
           </section>
         )}
       </div>

       <footer className="modal-footer">
         <button className="secondary-action" type="button" onClick={onClose}>
           返回
         </button>
         <button
           className="primary-action"
           type="button"
           onClick={() => {
             onSound("tap");
             onApply();
           }}
           style={{ flex: 1 }}
         >
           <Brush size={19} />
           <span>使用此模板</span>
         </button>
         <button
           className="secondary-action"
           type="button"
           onClick={() => {
             if (window.confirm(`确定要删除模板 "${template.name}" 吗？`)) {
               onSound("tap");
               onDelete();
             }
           }}
           title="删除此模板"
           style={{ color: "#d32f2f" }}
         >
           <Trash2 size={19} />
           <span>删除</span>
         </button>
       </footer>
     </section>
   </div>
 );
}
