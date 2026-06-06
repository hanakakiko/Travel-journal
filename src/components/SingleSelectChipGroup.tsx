import { Plus, X } from "lucide-react";
import { useState } from "react";
import { canRemoveTag, removeTag as removeTagUtil } from "../lib/tagManager";
import type { SoundEffect } from "../lib/soundEffects";

interface SingleSelectChipGroupProps {
  title: string;
  hint?: string;
  defaultOptions: Array<{ id?: string; label: string; short?: string }>;
  customOptions?: string[];
  selectedValue?: string;
  onSelectValue: (value: string) => void;
  onAddCustomOption?: (option: string) => void;
  onRemoveCustomOption?: (option: string) => void;
  onSound?: (effect: SoundEffect) => void;
}

/**
 * 单选 chip 组件，支持自定义选项
 * 用于色调、底图纸张等需要自定义的单选字段
 */
export function SingleSelectChipGroup({
  title,
  hint,
  defaultOptions,
  customOptions,
  selectedValue,
  onSelectValue,
  onAddCustomOption,
  onRemoveCustomOption,
  onSound,
}: SingleSelectChipGroupProps) {
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customInput, setCustomInput] = useState("");

  const defaultLabels = defaultOptions.map((opt) => opt.label);
  const custom = customOptions ?? [];
  const allOptions = [
    ...defaultOptions,
    ...custom.map((label) => ({ label, short: undefined })),
  ];

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed || !onAddCustomOption) return;

    onSound?.("tap");
    onAddCustomOption(trimmed);
    setCustomInput("");
    setIsAddingCustom(false);
  };

  const handleRemoveCustom = (option: string) => {
    if (!onRemoveCustomOption) return;

    onSound?.("tap");
    onRemoveCustomOption(option);

    // 如果删除的选项已被选中，清除选中
    if (selectedValue === option) {
      onSelectValue("");
    }
  };

  return (
    <div className="single-select-chip-group">
      <div className="chip-group-header">
        <p className="chip-group-title">{title}</p>
        {hint && <small className="chip-group-hint">{hint}</small>}
      </div>

      <div className="chip-row">
        {allOptions.map((opt) => {
          const isSelected = selectedValue === opt.label;
          const isCustom = custom.includes(opt.label);
          const canRemove = onRemoveCustomOption && isCustom;

          return (
            <div
              key={opt.label}
              className={`chip-wrapper ${isCustom ? "is-custom" : ""}`}
            >
              <button
                type="button"
                className={`chip chip-with-hint ${isSelected ? "is-on" : ""}`}
                onClick={() => {
                  onSound?.("tap");
                  onSelectValue(isSelected ? "" : opt.label);
                }}
                title={opt.short || opt.label}
              >
                <b>{opt.label}</b>
                {opt.short && <em>{opt.short}</em>}
              </button>

              {canRemove && (
                <button
                  type="button"
                  className="chip-delete-btn"
                  onClick={() => handleRemoveCustom(opt.label)}
                  title="删除自定义选项"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          );
        })}

        {onAddCustomOption && (
          <>
            {isAddingCustom ? (
              <div className="chip-input-wrapper">
                <input
                  type="text"
                  className="chip-input"
                  placeholder="输入新选项"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddCustom();
                    } else if (e.key === "Escape") {
                      setIsAddingCustom(false);
                      setCustomInput("");
                    }
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  className="chip-input-confirm"
                  onClick={handleAddCustom}
                  title="确认"
                >
                  ✓
                </button>
                <button
                  type="button"
                  className="chip-input-cancel"
                  onClick={() => {
                    setIsAddingCustom(false);
                    setCustomInput("");
                  }}
                  title="取消"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="chip-add-button"
                onClick={() => {
                  onSound?.("tap");
                  setIsAddingCustom(true);
                }}
                title="添加自定义选项"
              >
                +
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
