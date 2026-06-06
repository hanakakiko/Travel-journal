/**
 * 可自定义的单选按钮组
 * 支持所有类型的单选字段自定义选项（场景、叙述方式、风格、模板等）
 */

import { Plus, X } from "lucide-react";
import { useState } from "react";
import type { SoundEffect } from "../lib/soundEffects";

interface CustomizableChoiceGroupProps {
  title: string;
  icon?: React.ReactNode;
  defaultChoices: Array<{ id?: string; name: string; short?: string }>;
  customChoices?: string[];
  selectedValue?: string;
  onSelectValue: (value: string) => void;
  onAddCustomChoice?: (choice: string) => void;
  onRemoveCustomChoice?: (choice: string) => void;
  onSound?: (effect: SoundEffect) => void;
  className?: string;
}

/**
 * 可自定义单选组件
 * 用于场景、叙述方式、风格、模板等顶层字段
 */
export function CustomizableChoiceGroup({
  title,
  icon,
  defaultChoices,
  customChoices,
  selectedValue,
  onSelectValue,
  onAddCustomChoice,
  onRemoveCustomChoice,
  onSound,
  className,
}: CustomizableChoiceGroupProps) {
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customInput, setCustomInput] = useState("");

  const custom = customChoices ?? [];
  const allChoices = [
    ...defaultChoices,
    ...custom.map((name) => ({ name, short: undefined })),
  ];

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed || !onAddCustomChoice) return;

    onSound?.("tap");
    onAddCustomChoice(trimmed);
    setCustomInput("");
    setIsAddingCustom(false);
    // 自动选中新添加的选项
    onSelectValue(trimmed);
  };

  const handleRemoveCustom = (choice: string) => {
    if (!onRemoveCustomChoice) return;

    onSound?.("tap");
    onRemoveCustomChoice(choice);

    // 如果删除的是选中项，清除选中
    if (selectedValue === choice) {
      onSelectValue("");
    }
  };

  return (
    <div className={`customizable-choice-group ${className || ""}`}>
      <div className="band-heading">
        {icon && <span className="icon-wrapper">{icon}</span>}
        <span>{title}</span>
      </div>

      <div className="choice-buttons">
        {allChoices.map((choice) => {
          const isSelected = selectedValue === choice.name;
          const isCustom = custom.includes(choice.name);

          return (
            <div
              key={choice.name}
              className={`choice-wrapper ${isCustom ? "is-custom" : ""}`}
            >
              <button
                type="button"
                className={`choice-button ${isSelected ? "is-active" : ""}`}
                onClick={() => {
                  onSound?.("tap");
                  onSelectValue(isSelected ? "" : choice.name);
                }}
                title={choice.short || choice.name}
              >
                {choice.name}
              </button>

              {isCustom && onRemoveCustomChoice && (
                <button
                  type="button"
                  className="choice-delete-btn"
                  onClick={() => handleRemoveCustom(choice.name)}
                  title="删除自定义选项"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          );
        })}

        {onAddCustomChoice && (
          <>
            {isAddingCustom ? (
              <div className="choice-input-wrapper">
                <input
                  type="text"
                  className="choice-input"
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
                  className="choice-input-confirm"
                  onClick={handleAddCustom}
                  title="确认"
                >
                  ✓
                </button>
                <button
                  type="button"
                  className="choice-input-cancel"
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
                className="choice-add-button"
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
