/**
 * 手帐本详情弹窗
 */

import { useEffect, useState, useRef } from "react";
import { ChevronLeft, Plus, Trash2, Loader2, GripVertical, X, ArrowLeft } from "lucide-react";
import type { JournalNotebook, JournalPageEntry } from "../types";
import {
  getPagesByNotebook,
  addPageToNotebook,
  deletePage,
  reorderPages,
} from "../lib/notebookManager";
import "../styles/notebook-modals.css";

interface NotebookDetailModalProps {
  notebook: JournalNotebook;
  onClose: () => void;
  onNotebookUpdated: (notebook: JournalNotebook) => void;
}

export function NotebookDetailModal({
  notebook,
  onClose,
  onNotebookUpdated,
}: NotebookDetailModalProps) {
  const [pages, setPages] = useState<JournalPageEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPages();
  }, [notebook.id]);

  const loadPages = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getPagesByNotebook(notebook.id);
      setPages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载页面失败");
      console.error("加载页面错误:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePage = async (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("确定要删除这个页面吗？")) return;

    try {
      await deletePage(pageId, notebook.id);
      const newPages = pages.filter((p) => p.id !== pageId);
      setPages(newPages);

      const updated = { ...notebook, pageCount: newPages.length };
      onNotebookUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除页面失败");
      console.error("删除页面错误:", err);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件");
      return;
    }

    try {
      setError(null);

      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageUrl = e.target?.result as string;

        const newPage = await addPageToNotebook(
          notebook.id,
          imageUrl,
          `第 ${pages.length + 1} 页`
        );

        setPages([...pages, newPage]);

        const updated = { ...notebook, pageCount: pages.length + 1 };
        onNotebookUpdated(updated);

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传页面失败");
      console.error("上传页面错误:", err);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedItem(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetIndex: number) => {
    if (draggedItem === null || draggedItem === targetIndex) return;

    try {
      setIsReordering(true);

      const newPages = [...pages];
      const [removed] = newPages.splice(draggedItem, 1);
      newPages.splice(targetIndex, 0, removed);
      setPages(newPages);

      await reorderPages(
        notebook.id,
        newPages.map((p) => p.id)
      );

      setDraggedItem(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "调整顺序失败");
      console.error("调整顺序错误:", err);
    } finally {
      setIsReordering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="notebook-modal-overlay">
        <div className="notebook-modal-content notebook-loading">
          <Loader2 className="notebook-spinner" />
          <p>加载页面中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notebook-modal-overlay">
      <div className="notebook-modal-content">
        {/* 头部 */}
        <header className="notebook-header">
          <button onClick={onClose} className="notebook-back-btn" title="返回">
            <ArrowLeft size={24} />
          </button>
          <div className="notebook-header-info">
            <h2 className="notebook-title">{notebook.name}</h2>
            <p className="notebook-page-count">{pages.length} 页</p>
          </div>
          <div style={{ width: 24 }} />
        </header>

        {/* 错误提示 */}
        {error && (
          <div className="notebook-error-banner">
            {error}
          </div>
        )}

        {/* 内容区域 */}
        <div className="notebook-content">
          {/* 上传按钮 */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="notebook-create-btn"
            disabled={isReordering}
          >
            <Plus size={20} />
            <span>上传新页面</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="notebook-file-input"
          />

          {/* 页面网格 */}
          {pages.length === 0 ? (
            <div className="notebook-empty">
              <p>✨ 还没有页面呢</p>
              <p className="notebook-empty-hint">上传你的第一个页面吧</p>
            </div>
          ) : (
            <div className="notebook-pages-grid">
              {pages.map((page, index) => (
                <div
                  key={page.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(index)}
                  className={`notebook-page-card ${
                    draggedItem === index ? "dragging" : ""
                  }`}
                >
                  {/* 图片 */}
                  <div
                    className="notebook-page-image"
                    onClick={() => setSelectedImage(page.imageUrl)}
                  >
                    <img
                      src={page.imageUrl}
                      alt={`第 ${page.order + 1} 页`}
                    />
                  </div>

                  {/* 拖动提示和操作 */}
                  <div className="notebook-page-overlay">
                    <GripVertical className="notebook-drag-icon" />
                    <button
                      onClick={(e) => handleDeletePage(page.id, e)}
                      className="notebook-page-delete"
                      title="删除"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {/* 页码 */}
                  <p className="notebook-page-number">第 {page.order + 1} 页</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 图片预览弹窗 */}
      {selectedImage && (
        <div
          className="notebook-image-preview-overlay"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="notebook-image-preview-container"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={selectedImage} alt="预览" />
            <button
              onClick={() => setSelectedImage(null)}
              className="notebook-preview-close"
              title="关闭"
            >
              <X size={28} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
