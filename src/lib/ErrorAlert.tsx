import { X } from "lucide-react";
import { useEffect, useState } from "react";

export type ErrorAlertProps = {
  message: string;
  onClose: () => void;
  /** 自动关闭延迟（毫秒），不设置则不自动关闭 */
  autoCloseDuration?: number;
};

/**
 * 美化的错误提示弹窗
 * - 支持多行错误信息，自动解析结构
 * - 可手动关闭或自动关闭
 * - 与应用风格保持一致
 */
export const ErrorAlert = ({ message, onClose, autoCloseDuration }: ErrorAlertProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!autoCloseDuration) return;
    const timer = window.setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, autoCloseDuration);
    return () => window.clearTimeout(timer);
  }, [autoCloseDuration, onClose]);

  if (!isVisible) return null;

  const handleClose = () => {
    setIsVisible(false);
    onClose();
  };

  // 解析错误消息，分离标题、文件列表和解决方案
  const parseMessage = (text: string) => {
    const lines = text.split("\n").filter((line) => line.trim());
    let title = "";
    const fileItems: string[] = [];
    const solutions: string[] = [];
    let currentSection = "title";

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.includes("解决方案")) {
        currentSection = "solutions";
        continue;
      }
      
      if (currentSection === "title" && !title) {
        title = trimmed;
      } else if (currentSection === "solutions") {
        if (trimmed) {
          solutions.push(trimmed);
        }
      } else if (trimmed.match(/^\d+\./)) {
        fileItems.push(trimmed);
      }
    }

    return { title, fileItems, solutions };
  };

  const { title, fileItems, solutions } = parseMessage(message);

  return (
    <div className="error-alert-overlay" onClick={handleClose}>
      <div className="error-alert-container" onClick={(e) => e.stopPropagation()}>
        <div className="error-alert-header">
          <div className="error-alert-icon">⚠️</div>
          <button className="error-alert-close" onClick={handleClose} aria-label="关闭">
            <X size={20} />
          </button>
        </div>

        <div className="error-alert-content">
          {title && <div className="error-alert-title">{title}</div>}

          {fileItems.length > 0 && (
            <div className="error-alert-section">
              <div className="error-alert-items">
                {fileItems.map((item, idx) => (
                  <div key={idx} className="error-alert-item">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {solutions.length > 0 && (
            <div className="error-alert-section">
              <div className="error-alert-solutions-label">解决方案：</div>
              <div className="error-alert-solutions">
                {solutions.map((solution, idx) => (
                  <div key={idx} className="error-alert-solution">
                    {solution}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="error-alert-footer">
          <button className="error-alert-action" onClick={handleClose}>
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
};
