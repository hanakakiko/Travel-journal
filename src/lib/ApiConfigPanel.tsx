import { Eye, EyeOff, Settings, Trash2, Check, CircleX } from "lucide-react";
import { useState } from "react";
import type { ModelType } from "./userApiConfig";
import { 
  clearUserApiConfig, 
  isValidApiKey, 
  isValidEndpoint, 
  loadUserApiConfig, 
  saveModelApiConfig,
  getModelApiConfig,
  clearModelApiConfig
} from "./userApiConfig";

const MODEL_TYPES: ModelType[] = ["gpt-2", "flux-2-pro", "qs-gpt-image-2"];

const MODEL_NAMES: Record<ModelType, string> = {
  "gpt-2": "GPT-2 (Kratos)",
  "flux-2-pro": "FLUX.2 [pro] (Replicate)",
  "qs-gpt-image-2": "QS GPT Image 2",
};

const MODEL_HINTS: Record<ModelType, string> = {
  "gpt-2": "需要小红书 Kratos 平台的 API Token",
  "flux-2-pro": "需要 Replicate 平台的 API Token",
  "qs-gpt-image-2": "需要小红书 QS 平台的 API Key",
};

export function ApiConfigPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [showApiKey, setShowApiKey] = useState<Record<ModelType, boolean>>({
    "gpt-2": false,
    "flux-2-pro": false,
    "qs-gpt-image-2": false,
  });
  const [modelType, setModelType] = useState<ModelType>("flux-2-pro");
  const [apiKey, setApiKey] = useState("");
  const [customEndpoint, setCustomEndpoint] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // 初始化时加载已保存的配置
  const handleOpenPanel = () => {
    const saved = getModelApiConfig(modelType);
    if (saved) {
      setApiKey(saved.apiKey);
      setCustomEndpoint(saved.customEndpoint || "");
    } else {
      setApiKey("");
      setCustomEndpoint("");
    }
    setError("");
    setSuccess("");
    setIsOpen(true);
  };

  // 切换模型时加载该模型的配置
  const handleModelChange = (newModelType: ModelType) => {
    setModelType(newModelType);
    const saved = getModelApiConfig(newModelType);
    if (saved) {
      setApiKey(saved.apiKey);
      setCustomEndpoint(saved.customEndpoint || "");
    } else {
      setApiKey("");
      setCustomEndpoint("");
    }
    setError("");
    setSuccess("");
  };

  const handleSave = () => {
    setError("");
    setSuccess("");

    // 验证 API Key
    if (!isValidApiKey(apiKey)) {
      setError("请输入有效的 API Key");
      return;
    }

    // 验证自定义端点（如果有的话）
    if (customEndpoint && !isValidEndpoint(customEndpoint)) {
      setError("自定义端点 URL 格式不正确");
      return;
    }

    // 保存配置
    saveModelApiConfig(modelType, {
      apiKey,
      customEndpoint: customEndpoint || undefined,
    });
    setSuccess(`${MODEL_NAMES[modelType]} 配置已保存`);
    setTimeout(() => {
      setSuccess("");
    }, 1500);
  };

  const handleClearModel = () => {
    if (window.confirm(`确定要清除 ${MODEL_NAMES[modelType]} 的 API 配置吗？`)) {
      clearModelApiConfig(modelType);
      setApiKey("");
      setCustomEndpoint("");
      setSuccess(`${MODEL_NAMES[modelType]} 配置已清除`);
      setTimeout(() => {
        setSuccess("");
      }, 1500);
    }
  };

  const handleClearAll = () => {
    if (window.confirm("确定要清除所有已保存的 API 配置吗？")) {
      clearUserApiConfig();
      setApiKey("");
      setCustomEndpoint("");
      setSuccess("所有 API 配置已清除");
      setTimeout(() => {
        setSuccess("");
      }, 1500);
    }
  };

  const allConfigs = loadUserApiConfig() || {};
  const hasAnyConfig = Object.keys(allConfigs).length > 0;
  const currentModelHasConfig = getModelApiConfig(modelType) !== null;

  return (
    <>
      {/* 设置按钮 */}
      <button
        className="api-config-button"
        type="button"
        onClick={handleOpenPanel}
        title={hasAnyConfig ? "已配置自定义 API Key" : "配置自定义 API Key"}
        aria-label="API 配置"
      >
        <Settings size={18} />
        {hasAnyConfig && <span className="config-indicator" />}
      </button>

      {/* 配置面板 */}
      {isOpen && (
        <div className="api-config-modal-layer" role="dialog" aria-modal="true">
          <button
            className="api-config-backdrop"
            type="button"
            aria-label="关闭 API 配置"
            onClick={() => setIsOpen(false)}
          />
          <div className="api-config-panel">
            <div className="api-config-header">
              <h3>自定义 API 配置</h3>
              <button
                className="api-config-close"
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="关闭"
              >
                ✕
              </button>
            </div>

            <div className="api-config-content">
              <p className="api-config-intro">
                为每个模型输入你自己的 API Key，这样就不会消耗我的额度。
              </p>

              {/* 已保存的配置列表 */}
              {hasAnyConfig && (
                <div className="api-config-saved-list">
                  <h4>已保存的配置</h4>
                  <div className="api-config-saved-items">
                    {MODEL_TYPES.map((type) => {
                      const hasConfig = allConfigs[type] !== undefined;
                      return (
                        <button
                          key={type}
                          className={`api-config-saved-item ${hasConfig ? "has-config" : "no-config"} ${modelType === type ? "active" : ""}`}
                          type="button"
                          onClick={() => handleModelChange(type)}
                          title={hasConfig ? `已配置 ${MODEL_NAMES[type]}` : `未配置 ${MODEL_NAMES[type]}`}
                        >
                          <span className="api-config-saved-name">{MODEL_NAMES[type]}</span>
                          {hasConfig && <Check size={16} className="api-config-saved-check" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 模型选择 */}
              <div className="api-config-field">
                <label htmlFor="model-select">选择模型</label>
                <select
                  id="model-select"
                  value={modelType}
                  onChange={(e) => handleModelChange(e.target.value as ModelType)}
                  className="api-config-select"
                >
                  {MODEL_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {MODEL_NAMES[type]}
                    </option>
                  ))}
                </select>
                <small className="api-config-hint">{MODEL_HINTS[modelType]}</small>
              </div>

              {/* API Key 输入 */}
              <div className="api-config-field">
                <label htmlFor="api-key-input">API Key</label>
                <div className="api-config-input-group">
                  <input
                    id="api-key-input"
                    type={showApiKey[modelType] ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={`输入你的 ${MODEL_NAMES[modelType]} API Key`}
                    className="api-config-input"
                  />
                  <button
                    type="button"
                    className="api-config-toggle-visibility"
                    onClick={() => setShowApiKey({ ...showApiKey, [modelType]: !showApiKey[modelType] })}
                    aria-label={showApiKey[modelType] ? "隐藏 API Key" : "显示 API Key"}
                  >
                    {showApiKey[modelType] ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* 自定义端点（可选） */}
              <div className="api-config-field">
                <label htmlFor="endpoint-input">自定义端点 URL（可选）</label>
                <input
                  id="endpoint-input"
                  type="url"
                  value={customEndpoint}
                  onChange={(e) => setCustomEndpoint(e.target.value)}
                  placeholder="https://your-api.example.com/v1/predictions"
                  className="api-config-input"
                />
                <small className="api-config-hint">
                  如果你有自己的模型服务，可以输入自定义的 API 端点。留空则使用默认端点。
                </small>
              </div>

              {/* 错误提示 */}
              {error && <div className="api-config-error">{error}</div>}

              {/* 成功提示 */}
              {success && <div className="api-config-success">{success}</div>}
            </div>

            {/* 操作按钮 */}
             <div className="api-config-footer">
               <button
                 className="api-config-btn-danger"
                 type="button"
                 onClick={handleClearModel}
                 disabled={!currentModelHasConfig}
                 title={currentModelHasConfig ? `清除 ${MODEL_NAMES[modelType]} 的配置` : "该模型还未配置"}
               >
                 <Trash2 size={16} />
                 <span>清除</span>
               </button>
               <button
                 className="api-config-btn-secondary"
                 type="button"
                 onClick={() => setIsOpen(false)}
               >
                 <CircleX size={16} />
                 <span>取消</span>
               </button>
               <button
                 className="api-config-btn-primary"
                 type="button"
                 onClick={handleSave}
               >
                 <Check size={16} />
                 <span>保存</span>
               </button>
             </div>
          </div>
        </div>
      )}
    </>
  );
}
