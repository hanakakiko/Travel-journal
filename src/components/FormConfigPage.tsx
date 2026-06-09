import { ArrowLeft, Plus, X } from "lucide-react";
import { useState } from "react";
import { getAllCustomTags, saveCustomTags } from "../lib/customTagsStorage";
import type { SoundEffect } from "../lib/soundEffects";

interface FormConfigPageProps {
  onBack: () => void;
  onSound: (effect: SoundEffect) => void;
}

const FIELD_CONFIGS = [
  { key: "mood", label: "情绪", description: "表达当前的情绪状态" },
  { key: "vibes", label: "视觉风味", description: "描述画面的视觉风格" },
  { key: "layoutShapes", label: "布局形状", description: "选择画面的布局方式" },
  { key: "edgeStyles", label: "边框风格", description: "选择边框的装饰风格" },
  { key: "decorations", label: "装饰元素", description: "添加装饰性的视觉元素" },
];

export function FormConfigPage({ onBack, onSound }: FormConfigPageProps) {
  const [customTags, setCustomTags] = useState(() => getAllCustomTags());
  const [editingField, setEditingField] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const handleAddTag = (fieldKey: string, newTag: string) => {
    const trimmed = newTag.trim();
    if (!trimmed) return;

    setCustomTags((current) => {
      const fieldTags = current[fieldKey] ?? [];
      // 检查是否已存在
      if (fieldTags.includes(trimmed)) {
        onSound("tap");
        return current;
      }
      const updated = { ...current, [fieldKey]: [...fieldTags, trimmed] };
      setHasChanges(true);
      onSound("tap");
      return updated;
    });
    setNewTagInput("");
  };

  const handleRemoveTag = (fieldKey: string, tag: string) => {
    setCustomTags((current) => {
      const fieldTags = current[fieldKey] ?? [];
      const updated = fieldTags.filter((t) => t !== tag);
      const next = { ...current, [fieldKey]: updated };
      setHasChanges(true);
      onSound("tap");
      return next;
    });
  };

  const handleSave = () => {
    saveCustomTags(customTags);
    setHasChanges(false);
    onSound("success");
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (window.confirm("有未保存的更改，确定要放弃吗？")) {
        setCustomTags(getAllCustomTags());
        setHasChanges(false);
        onBack();
      }
    } else {
      onBack();
    }
  };

  return (
    <div className="form-config-page" style={{ padding: "1.5em" }}>
      {/* 头部 */}
      <div style={{ display: "flex", alignItems: "center", gap: "1em", marginBottom: "1.5em" }}>
        <button
          type="button"
          onClick={handleCancel}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5em",
            padding: "0.5em 1em",
            backgroundColor: "#f5f5f5",
            border: "1px solid #ddd",
            borderRadius: "0.35em",
            cursor: "pointer",
            fontSize: "0.9em",
            color: "#666",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#efefef";
            e.currentTarget.style.borderColor = "#ccc";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#f5f5f5";
            e.currentTarget.style.borderColor = "#ddd";
          }}
        >
          <ArrowLeft size={18} />
          <span>返回</span>
        </button>
        <h1 style={{ margin: 0, flex: 1, fontSize: "1.5em", fontWeight: "bold" }}>表单配置</h1>
        {hasChanges && (
          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: "0.5em 1.5em",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "0.35em",
              cursor: "pointer",
              fontSize: "0.9em",
              fontWeight: "bold",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#45a049";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#4CAF50";
            }}
          >
            保存更改
          </button>
        )}
      </div>

      {/* 配置列表 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5em" }}>
        {FIELD_CONFIGS.map((field) => {
          const fieldTags = customTags[field.key] ?? [];
          const isEditing = editingField === field.key;

          return (
            <div
              key={field.key}
              style={{
                padding: "1.5em",
                border: "1px solid #ddd",
                borderRadius: "0.5em",
                backgroundColor: "#fafafa",
              }}
            >
              <div style={{ marginBottom: "1em" }}>
                <h3 style={{ margin: "0 0 0.25em 0", fontSize: "1.1em", fontWeight: "bold" }}>
                  {field.label}
                </h3>
                <p style={{ margin: 0, fontSize: "0.85em", color: "#666" }}>
                  {field.description}
                </p>
              </div>

              {/* 标签列表 */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.5em",
                  marginBottom: "1em",
                  minHeight: "2em",
                  alignItems: "flex-start",
                }}
              >
                {fieldTags.length === 0 ? (
                  <p style={{ margin: 0, color: "#999", fontSize: "0.9em" }}>
                    还没有自定义选项
                  </p>
                ) : (
                  fieldTags.map((tag) => (
                    <div
                      key={tag}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.5em",
                        padding: "0.4em 0.8em",
                        backgroundColor: "#e8f5e9",
                        border: "1px solid #81c784",
                        borderRadius: "999px",
                        fontSize: "0.9em",
                      }}
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(field.key, tag)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "1.2em",
                          height: "1.2em",
                          padding: 0,
                          backgroundColor: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: "#666",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "#d32f2f";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "#666";
                        }}
                        title="删除此选项"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* 添加新标签 */}
              {isEditing ? (
                <div style={{ display: "flex", gap: "0.5em" }}>
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddTag(field.key, newTagInput);
                        setNewTagInput("");
                      } else if (e.key === "Escape") {
                        setEditingField(null);
                        setNewTagInput("");
                      }
                    }}
                    placeholder="输入新选项"
                    autoFocus
                    style={{
                      flex: 1,
                      padding: "0.5em 0.75em",
                      border: "1px solid #ddd",
                      borderRadius: "0.35em",
                      fontSize: "0.9em",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      handleAddTag(field.key, newTagInput);
                      setNewTagInput("");
                    }}
                    style={{
                      padding: "0.5em 1em",
                      backgroundColor: "#4CAF50",
                      color: "white",
                      border: "none",
                      borderRadius: "0.35em",
                      cursor: "pointer",
                      fontSize: "0.9em",
                      fontWeight: "bold",
                    }}
                  >
                    添加
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingField(null);
                      setNewTagInput("");
                    }}
                    style={{
                      padding: "0.5em 1em",
                      backgroundColor: "#f5f5f5",
                      border: "1px solid #ddd",
                      borderRadius: "0.35em",
                      cursor: "pointer",
                      fontSize: "0.9em",
                    }}
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingField(field.key);
                    onSound("tap");
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5em",
                    padding: "0.5em 1em",
                    backgroundColor: "#f5f5f5",
                    border: "1px solid #ddd",
                    borderRadius: "0.35em",
                    cursor: "pointer",
                    fontSize: "0.9em",
                    color: "#666",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#efefef";
                    e.currentTarget.style.borderColor = "#ccc";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#f5f5f5";
                    e.currentTarget.style.borderColor = "#ddd";
                  }}
                >
                  <Plus size={16} />
                  <span>添加选项</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 提示信息 */}
      <div
        style={{
          marginTop: "2em",
          padding: "1em",
          backgroundColor: "#e3f2fd",
          border: "1px solid #90caf9",
          borderRadius: "0.5em",
          color: "#1565c0",
          fontSize: "0.9em",
        }}
      >
        <p style={{ margin: "0 0 0.5em 0", fontWeight: "bold" }}>💡 提示</p>
        <ul style={{ margin: 0, paddingLeft: "1.5em" }}>
          <li>在这个页面管理所有自定义选项</li>
          <li>生图任务中只能选择或不选择，不能增删选项</li>
          <li>删除的选项无法在生图任务中选择</li>
          <li>使用旧模板时，如果模板包含已删除的选项，会提示是否恢复</li>
        </ul>
      </div>
    </div>
  );
}
