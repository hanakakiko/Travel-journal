/**
 * 支持自定义选项的单选 Chip 组件
 * 用于色调、纸张、主色调等视觉风味字段
 */

import { Plus, X } from "lucide-react";
import { useState } from "react";
import type { SoundEffect } from "../lib/soundEffects";

const classNames = (...items: Array<string | false | undefined>) =>
  items.filter(Boolean).join(" ");

interface SingleSelectOption {
  id?: string;
  label: string;
  short?: string;
  color?: string; // 用于主色调等有颜色的字段
}

interface SingleSelectWithCustomOptionsProps {
  title: string;
  defaultOptions: SingleSelectOption[];
  customOptions?: string[];
  selectedValue?: string;
  onSelectValue: (value: string) => void;
  onAddCustomOption?: (option: string) => void;
  onRemoveCustomOption?: (option: string) => void;
  onSound?: (effect: SoundEffect) => void;
  className?: string;
  chipClassName?: string;
  renderCustomChip?: (label: string) => React.ReactNode;
}

/**
 * 单选 Chip 组件，支持自定义选项
 * 用于 palette、paperTexture、mainColor 等字段
 */
export function SingleSelectWithCustomOptions({
  title,
  defaultOptions,
  customOptions,
  selectedValue,
  onSelectValue,
  onAddCustomOption,
  onRemoveCustomOption,
  onSound,
  className,
  chipClassName = "chip chip-with-hint",
  renderCustomChip,
}: SingleSelectWithCustomOptionsProps) {
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customInput, setCustomInput] = useState("");

  const custom = customOptions ?? [];
  const allOptions: SingleSelectOption[] = [
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
    // 自动选中新添加的选项
    onSelectValue(trimmed);
  };

  const handleRemoveCustom = (option: string) => {
    if (!onRemoveCustomOption) return;

    onSound?.("tap");
    onRemoveCustomOption(option);

    // 如果删除的是选中项，清除选中
    if (selectedValue === option) {
      onSelectValue("");
    }
  };

  return (
    <div className={`single-select-with-custom-options ${className || ""}`}>
      <p className="flavor-group-title">{title}</p>

      <div className="chip-row">
        {allOptions.map((opt) => {
          const isSelected = selectedValue === opt.label;
          const isCustom = custom.includes(opt.label);

          return (
            <div key={opt.label} className={classNames("option-wrapper", isCustom && "is-custom")}>
              <button
                type="button"
                className={classNames(chipClassName, isSelected && "is-on")}
                title={opt.short || opt.label}
                onClick={() => {
                  onSound?.("tap");
                  onSelectValue(opt.label);
                }}
                style={opt.color ? { backgroundColor: opt.color, color: "#fff" } : undefined}
              >
                {opt.color ? (
                  <>
                    <span
                      style={{
                        width: "1.2em",
                        height: "1.2em",
                        borderRadius: "50%",
                        backgroundColor: opt.color,
                        border: "2px solid #ddd",
                        display: "inline-block",
                        marginRight: "0.5em",
                      }}
                    />
                    <span>{opt.label}</span>
                  </>
                ) : (
                  <>
                    <b>{opt.label}</b>
                    {opt.short && <em>{opt.short}</em>}
                  </>
                )}
              </button>

              {isCustom && onRemoveCustomOption && (
                <button
                  type="button"
                  className="option-delete-btn"
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
              <div className="option-input-wrapper">
                <input
                  type="text"
                  className="option-input"
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
                  className="option-input-confirm"
                  onClick={handleAddCustom}
                  title="确认"
                >
                  ✓
                </button>
                <button
                  type="button"
                  className="option-input-cancel"
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
                className="option-add-button"
                onClick={() => {
                  onSound?.("tap");
                  setIsAddingCustom(true);
                }}
                title="添加自定义选项"
              >
                <Plus size={16} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
