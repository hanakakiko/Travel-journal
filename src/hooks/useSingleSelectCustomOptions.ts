/**
 * 单选字段自定义选项 Hook（如 palette、paperTexture、mainColor）
 * 
 * 为顶层和视觉风味单选字段提供自定义选项管理能力。
 * 集成本地缓存和云服务同步。
 */

import { useCallback, useEffect, useState } from "react";
import {
  getCustomTags,
  saveCustomTags,
} from "../lib/userSettings";

export interface UseSingleSelectCustomOptionsReturn {
  customOptions: Record<string, string[]>;
  getFieldCustomOptions: (fieldKey: string) => string[];
  addCustomOption: (fieldKey: string, option: string) => void;
  removeCustomOption: (fieldKey: string, option: string) => void;
  isLoading: boolean;
}

/**
 * Hook: 管理单选字段的自定义选项
 * 
 * 用于 palette、paperTexture、mainColor 等单选字段
 * 
 * @returns 自定义选项管理接口
 */
export function useSingleSelectCustomOptions(): UseSingleSelectCustomOptionsReturn {
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
