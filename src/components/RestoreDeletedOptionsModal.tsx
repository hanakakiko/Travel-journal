/**
 * 恢复已删除选项的弹窗
 * 当使用过时模板时，如果模板中有已删除的选项，弹窗提示用户是否恢复
 */

import { AlertCircle } from "lucide-react";

interface RestoreDeletedOptionsModalProps {
  deletedOptions: Record<string, string[]>;
  onRestore: () => void;
  onReject: () => void;
}

export function RestoreDeletedOptionsModal({
  deletedOptions,
  onRestore,
  onReject,
}: RestoreDeletedOptionsModalProps) {
  // 获取字段的中文名称
  const getFieldLabel = (fieldKey: string): string => {
    const labels: Record<string, string> = {
      mood: "情绪",
      vibes: "氛围",
      layoutShapes: "排版形状",
      edgeStyles: "照片边缘风格",
      decorations: "装饰元素",
    };
    return labels[fieldKey] || fieldKey;
  };

  return (
    <div className="modal-layer" role="dialog" aria-modal="true">
      <button
        className="modal-backdrop"
        type="button"
        aria-label="关闭"
        onClick={onReject}
      />
      <section className="info-modal" style={{ maxWidth: "500px" }}>
        <div className="modal-handle" />

        <header className="modal-header modal-header-slim">
          <div className="modal-mascot" aria-hidden="true">
            <span />
          </div>
        </header>

        <div className="modal-scroll">
          <section className="control-band modal-panel">
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "1em",
                marginBottom: "1.5em",
              }}
            >
              <AlertCircle
                size={24}
                style={{ color: "#d68a2b", flexShrink: 0, marginTop: "0.25em" }}
              />
              <div>
                <h3 style={{ margin: "0 0 0.5em 0", fontSize: "1.1em" }}>
                  模板内存在已删除的自定义选项
                </h3>
                <p style={{ margin: "0 0 1em 0", color: "#666", fontSize: "0.95em" }}>
                  这个模板使用的某些自定义选项已经从表单配置中删除。是否恢复这些选项到表单配置？
                </p>

                <div style={{ marginBottom: "1em" }}>
                  {Object.entries(deletedOptions).map(([fieldKey, options]) => (
                    <div key={fieldKey} style={{ marginBottom: "0.75em" }}>
                      <p
                        style={{
                          margin: "0 0 0.5em 0",
                          fontWeight: "500",
                          fontSize: "0.9em",
                        }}
                      >
                        {getFieldLabel(fieldKey)}：
                      </p>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "0.5em",
                        }}
                      >
                        {options.map((option) => (
                          <span
                            key={option}
                            style={{
                              display: "inline-block",
                              padding: "0.35em 0.75em",
                              backgroundColor: "#fff8b8",
                              border: "1px solid #ffd700",
                              borderRadius: "0.25em",
                              fontSize: "0.85em",
                              color: "#666",
                            }}
                          >
                            {option}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <p style={{ margin: "0", color: "#999", fontSize: "0.85em" }}>
                  💡 恢复后，这些选项将被添加回表单配置，并同步到云端。
                </p>
              </div>
            </div>
          </section>
        </div>

        <footer className="modal-footer">
          <button className="secondary-action" type="button" onClick={onReject}>
            不恢复
          </button>
          <button
            className="primary-action"
            type="button"
            onClick={onRestore}
            style={{ flex: 1 }}
          >
            恢复选项
          </button>
        </footer>
      </section>
    </div>
  );
}
