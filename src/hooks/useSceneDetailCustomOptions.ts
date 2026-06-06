/**
 * 场景细节字段自定义选项 Hook
 * 
 * 为场景详情中的多选和单选字段提供自定义选项管理能力。
 * 集成本地缓存和云服务同步。
 */

import { useCallback, useEffect, useState } from "react";
import {
  getCustomTagsForField,
  addCustomTagToField,
  removeCustomTagFromField,
  saveCustomTags,
  getCustomTags,
} from "../lib/userSettings";

export interface UseSceneDetailCustomOptionsReturn {
  customOptions: Record<string, string[]>;
  getFieldCustomOptions: (fieldKey: string) => string[];
  addCustomOption: (fieldKey: string, option: string) => void;
  removeCustomOption: (fieldKey: string, option: string) => void;
  isLoading: boolean;
}

/**
 * Hook: 管理场景细节字段的自定义选项
 * 
 * @param fieldKey - 字段标识符（如 "menu", "stops", "activity"）
 * @returns 自定义选项管理接口
 */
export function useSceneDetailCustomOptions(): UseSceneDetailCustomOptionsReturn {
  const [customOptions, setCustomOptions] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  // 初始化：从本地加载自定义选项
  useEffect(() => {
    const initCustomOptions = () => {
      try {
        const saved = getCustomTags();
        setCustomOptions(saved);
      } catch (error) {
        console.error("Failed to initialize custom options:", error);
      }
    };
    initCustomOptions();
  }, []);

  // 获取某个字段的自定义选项
  const getFieldCustomOptions = useCallback((fieldKey: string): string[] => {
    return customOptions[fieldKey] ?? [];
  }, [customOptions]);

  // 添加自定义选项
  const addCustomOption = useCallback((fieldKey: string, option: string) => {
    const trimmed = option.trim();
    if (!trimmed) return;

    const current = customOptions[fieldKey] ?? [];
    if (current.includes(trimmed)) return; // 避免重复

    const updated = [...current, trimmed];
    const nextCustomOptions = { ...customOptions, [fieldKey]: updated };
    
    setCustomOptions(nextCustomOptions);
    saveCustomTags(nextCustomOptions);
  }, [customOptions]);

  // 删除自定义选项
  const removeCustomOption = useCallback((fieldKey: string, option: string) => {
    const current = customOptions[fieldKey] ?? [];
    const filtered = current.filter((opt) => opt !== option);

    const nextCustomOptions = { ...customOptions };
    if (filtered.length > 0) {
      nextCustomOptions[fieldKey] = filtered;
    } else {
      delete nextCustomOptions[fieldKey];
    }

    setCustomOptions(nextCustomOptions);
    saveCustomTags(nextCustomOptions);
  }, [customOptions]);

  return {
    customOptions,
    getFieldCustomOptions,
    addCustomOption,
    removeCustomOption,
    isLoading,
  };
}

/**
 * Hook: 获取某个字段的所有可用选项（默认 + 自定义）
 * 
 * @param defaultOptions - 默认选项列表
 * @param fieldKey - 字段标识符
 * @param customOptions - 自定义选项对象
 * @returns 合并后的选项列表
 */
export function getAllAvailableOptions(
  defaultOptions: string[],
  fieldKey: string,
  customOptions: Record<string, string[]>
): string[] {
  const custom = customOptions[fieldKey] ?? [];
  return [...defaultOptions, ...custom];
}
