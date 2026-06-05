/**
 * 标签管理工具库
 * 支持用户自定义添加和删除标签，同时保证至少保留两个标签
 */

/**
 * 获取某个字段的所有可用标签（默认 + 自定义）
 */
export function getAllTags(
  defaultTags: string[],
  customTags?: string[]
): string[] {
  const custom = customTags ?? [];
  return [...defaultTags, ...custom];
}

/**
 * 添加新标签
 * @param newTag 新标签名称
 * @param customTags 当前自定义标签列表
 * @returns 更新后的自定义标签列表
 */
export function addTag(newTag: string, customTags?: string[]): string[] {
  const trimmed = newTag.trim();
  if (!trimmed) return customTags ?? [];
  
  const current = customTags ?? [];
  // 避免重复
  if (current.includes(trimmed)) return current;
  
  return [...current, trimmed];
}

/**
 * 删除标签
 * @param tag 要删除的标签
 * @param defaultTags 默认标签列表（用于检查是否是默认标签）
 * @param customTags 当前自定义标签列表
 * @param selectedTags 当前选中的标签列表
 * @returns { customTags: 更新后的自定义标签, selectedTags: 更新后的选中标签 }
 */
export function removeTag(
  tag: string,
  defaultTags: string[],
  customTags?: string[],
  selectedTags?: string[]
): { customTags: string[]; selectedTags: string[] } {
  const custom = customTags ?? [];
  const selected = selectedTags ?? [];
  
  // 如果是默认标签，检查是否可以删除（至少保留两个）
  if (defaultTags.includes(tag)) {
    const remainingDefaults = defaultTags.filter((t) => t !== tag);
    // 如果删除后默认标签少于 2 个，不允许删除
    if (remainingDefaults.length < 2) {
      return { customTags: custom, selectedTags: selected };
    }
    // 这里我们不能真正删除默认标签，只能从选中列表中移除
    return {
      customTags: custom,
      selectedTags: selected.filter((t) => t !== tag),
    };
  }
  
  // 如果是自定义标签，直接删除
  const updatedCustom = custom.filter((t) => t !== tag);
  const updatedSelected = selected.filter((t) => t !== tag);
  
  return {
    customTags: updatedCustom,
    selectedTags: updatedSelected,
  };
}

/**
 * 检查是否可以删除某个标签
 * @param tag 要检查的标签
 * @param defaultTags 默认标签列表
 * @param customTags 自定义标签列表
 * @returns 是否可以删除
 */
export function canRemoveTag(
  tag: string,
  defaultTags: string[],
  customTags?: string[]
): boolean {
  // 自定义标签总是可以删除
  if (customTags?.includes(tag)) {
    return true;
  }
  
  // 默认标签只有在删除后仍有至少 2 个时才能删除
  if (defaultTags.includes(tag)) {
    const remainingDefaults = defaultTags.filter((t) => t !== tag);
    return remainingDefaults.length >= 2;
  }
  
  return false;
}

/**
 * 检查某个标签是否是自定义标签
 */
export function isCustomTag(tag: string, customTags?: string[]): boolean {
  return (customTags ?? []).includes(tag);
}
