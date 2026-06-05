import { Plus, X } from "lucide-react";
import { useState } from "react";
import { addTag, canRemoveTag, removeTag } from "../lib/tagManager";
import type { SoundEffect } from "../lib/soundEffects";

interface EditableTagGroupProps {
  title: string;
  defaultTags: string[];
  customTags?: string[];
  selectedTags?: string[];
  onAddTag: (newTag: string) => void;
  onRemoveTag: (tag: string) => void;
  onToggleTag: (tag: string) => void;
  onSound: (effect: SoundEffect) => void;
  hint?: string;
  isMultiple?: boolean;
}

export function EditableTagGroup({
  title,
  defaultTags,
  customTags,
  selectedTags,
  onAddTag,
  onRemoveTag,
  onToggleTag,
  onSound,
  hint,
  isMultiple = true,
}: EditableTagGroupProps) {
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");
  
  const allTags = [...defaultTags, ...(customTags ?? [])];
  const selected = selectedTags ?? [];
  
  const handleAddTag = () => {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    
    onSound("tap");
    onAddTag(trimmed);
    setNewTagInput("");
    setIsAddingTag(false);
  };
  
  const handleRemoveTag = (tag: string) => {
    if (!canRemoveTag(tag, defaultTags, customTags)) {
      // 无法删除时不播放声音，只是不执行删除操作
      return;
    }
    onSound("tap");
    onRemoveTag(tag);
  };
  
  const handleToggleTag = (tag: string) => {
    onSound("tap");
    onToggleTag(tag);
  };
  
  return (
    <div className="editable-tag-group">
      <div className="tag-group-header">
        <p className="tag-group-title">{title}</p>
        {hint && <small className="tag-group-hint">{hint}</small>}
      </div>
      
      <div className="tag-row">
        {allTags.map((tag) => {
          const isSelected = selected.includes(tag);
          const isCustom = customTags?.includes(tag);
          const canRemove = canRemoveTag(tag, defaultTags, customTags);
          
          return (
            <div
              key={tag}
              className={`tag-chip ${isSelected ? "is-selected" : ""} ${isCustom ? "is-custom" : ""}`}
            >
              <button
                type="button"
                className="tag-chip-button"
                onClick={() => handleToggleTag(tag)}
                title={isSelected ? "取消选择" : "选择"}
              >
                {tag}
              </button>
              {isCustom && (
                <button
                  type="button"
                  className="tag-chip-delete"
                  onClick={() => handleRemoveTag(tag)}
                  title="删除自定义标签"
                  aria-label={`删除标签 ${tag}`}
                >
                  <X size={14} />
                </button>
              )}
              {!isCustom && !canRemove && (
                <span className="tag-chip-lock" title="至少需要保留两个默认标签">
                  🔒
                </span>
              )}
            </div>
          );
        })}
        
        {isAddingTag ? (
          <div className="tag-input-wrapper">
            <input
              type="text"
              className="tag-input"
              placeholder="输入新标签"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddTag();
                } else if (e.key === "Escape") {
                  setIsAddingTag(false);
                  setNewTagInput("");
                }
              }}
              autoFocus
            />
            <button
              type="button"
              className="tag-input-confirm"
              onClick={handleAddTag}
              title="确认添加"
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              className="tag-input-cancel"
              onClick={() => {
                setIsAddingTag(false);
                setNewTagInput("");
              }}
              title="取消"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="tag-add-button"
            onClick={() => {
              onSound("tap");
              setIsAddingTag(true);
            }}
            title="添加新标签"
          >
            <Plus size={16} />
            <span>添加</span>
          </button>
        )}
      </div>
    </div>
  );
}
