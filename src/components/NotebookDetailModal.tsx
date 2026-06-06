/**
 * 手帐本详情弹窗
 */

import { useEffect, useState, useRef } from "react";
import {
  Plus,
  Trash2,
  Loader2,
  GripVertical,
  X,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Upload,
  Save,
} from "lucide-react";
import type { JournalNotebook, JournalPageEntry } from "../types";
import {
  getPagesByNotebook,
  addPageToNotebook,
  deletePage,
  reorderPages,
  updateNotebook,
} from "../lib/notebookManager";
import "../styles/notebook-modals.css";

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("读取图片失败"));
    };

    reader.onerror = () => reject(new Error(`读取 ${file.name} 失败`));
    reader.readAsDataURL(file);
  });

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
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [isUploadingPages, setIsUploadingPages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [isEditingNotebook, setIsEditingNotebook] = useState(false);
  const [editName, setEditName] = useState(notebook.name);
  const [editCoverPreview, setEditCoverPreview] = useState(notebook.coverImageUrl);
  const [isSavingNotebook, setIsSavingNotebook] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const previewTouchStartXRef = useRef<number | null>(null);

  const selectedPage =
    selectedImageIndex === null ? null : pages[selectedImageIndex] ?? null;
  const selectedPageNumber = selectedImageIndex === null ? 0 : selectedImageIndex + 1;
  const canSwitchPreview = pages.length > 1;

  useEffect(() => {
    loadPages();
    setIsEditingNotebook(false);
    setEditName(notebook.name);
    setEditCoverPreview(notebook.coverImageUrl);
    setSelectedImageIndex(null);
  }, [notebook.id]);

  useEffect(() => {
    if (selectedImageIndex === null) return;

    if (pages.length === 0) {
      setSelectedImageIndex(null);
      return;
    }

    if (selectedImageIndex >= pages.length) {
      setSelectedImageIndex(pages.length - 1);
    }
  }, [pages.length, selectedImageIndex]);

  useEffect(() => {
    if (selectedImageIndex === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedImageIndex(null);
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        switchPreviewImage("previous");
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        switchPreviewImage("next");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImageIndex, pages.length]);

  const switchPreviewImage = (direction: "previous" | "next") => {
    setSelectedImageIndex((currentIndex) => {
      if (currentIndex === null || pages.length === 0) return currentIndex;

      if (direction === "previous") {
        return currentIndex === 0 ? pages.length - 1 : currentIndex - 1;
      }

      return currentIndex === pages.length - 1 ? 0 : currentIndex + 1;
    });
  };

  const handlePreviewTouchStart = (event: React.TouchEvent) => {
    previewTouchStartXRef.current = event.touches[0]?.clientX ?? null;
  };

  const handlePreviewTouchEnd = (event: React.TouchEvent) => {
    const startX = previewTouchStartXRef.current;
    previewTouchStartXRef.current = null;

    if (startX === null || !canSwitchPreview) return;

    const endX = event.changedTouches[0]?.clientX;
    if (typeof endX !== "number") return;

    const deltaX = endX - startX;
    if (Math.abs(deltaX) < 48) return;

    switchPreviewImage(deltaX > 0 ? "previous" : "next");
  };

  const openPagePreview = (index: number) => {
    if (isUploadingPages || isSavingNotebook || draggedItem !== null) return;
    setSelectedImageIndex(index);
  };

  const handlePageCardKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    index: number
  ) => {
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    openPagePreview(index);
  };

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
    if (isUploadingPages || isSavingNotebook) return;
    if (!confirm("确定要删除这个页面吗？")) return;

    try {
      await deletePage(pageId, notebook.id);
      const newPages = pages
        .filter((p) => p.id !== pageId)
        .map((page, order) => ({ ...page, order }));
      setPages(newPages);

      const updated = { ...notebook, pageCount: newPages.length };
      onNotebookUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除页面失败");
      console.error("删除页面错误:", err);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isSavingNotebook) return;

    const selectedFiles = Array.from(e.target.files ?? []);
    if (!selectedFiles.length) return;

    const imageFiles = selectedFiles.filter((file) => file.type.startsWith("image/"));
    const ignoredCount = selectedFiles.length - imageFiles.length;

    if (!imageFiles.length) {
      setError("请选择图片文件");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    const createdPages: JournalPageEntry[] = [];
    const failedFiles: string[] = [];
    const basePageCount = pages.length;

    try {
      setError(null);
      setIsUploadingPages(true);
      setUploadProgress({ done: 0, total: imageFiles.length });

      for (const [index, file] of imageFiles.entries()) {
        try {
          const imageUrl = await readFileAsDataUrl(file);

          const newPage = await addPageToNotebook(
            notebook.id,
            imageUrl,
            `第 ${basePageCount + createdPages.length + 1} 页`
          );

          createdPages.push(newPage);
        } catch (err) {
          failedFiles.push(file.name);
          console.error("上传页面错误:", err);
        } finally {
          setUploadProgress({ done: index + 1, total: imageFiles.length });
        }
      }

      if (createdPages.length) {
        const newPages = [...pages, ...createdPages];
        setPages(newPages);

        const updated = { ...notebook, pageCount: newPages.length };
        onNotebookUpdated(updated);
      }

      const messages: string[] = [];
      if (ignoredCount > 0) messages.push(`已忽略 ${ignoredCount} 个非图片文件`);
      if (failedFiles.length > 0) {
        messages.push(`${failedFiles.length} 张页面上传失败：${failedFiles.join("、")}`);
      }
      if (messages.length > 0) setError(messages.join("；"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传页面失败");
      console.error("上传页面错误:", err);
    } finally {
      setIsUploadingPages(false);
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDragStart = (index: number) => {
    if (isUploadingPages || isSavingNotebook) return;
    setDraggedItem(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetIndex: number) => {
    if (
      isUploadingPages ||
      isSavingNotebook ||
      draggedItem === null ||
      draggedItem === targetIndex
    ) {
      return;
    }

    const previousPages = pages;

    try {
      setIsReordering(true);

      const newPages = [...pages];
      const [removed] = newPages.splice(draggedItem, 1);
      newPages.splice(targetIndex, 0, removed);
      const reorderedPages = newPages.map((page, order) => ({ ...page, order }));
      setPages(reorderedPages);

      await reorderPages(
        notebook.id,
        reorderedPages.map((p) => p.id)
      );
    } catch (err) {
      setPages(previousPages);
      setError(err instanceof Error ? err.message : "调整顺序失败");
      console.error("调整顺序错误:", err);
    } finally {
      setDraggedItem(null);
      setIsReordering(false);
    }
  };

  const openNotebookEditor = () => {
    setEditName(notebook.name);
    setEditCoverPreview(notebook.coverImageUrl);
    setIsEditingNotebook(true);
    setError(null);
  };

  const closeNotebookEditor = () => {
    setEditName(notebook.name);
    setEditCoverPreview(notebook.coverImageUrl);
    setIsEditingNotebook(false);
    if (coverInputRef.current) {
      coverInputRef.current.value = "";
    }
  };

  const handleCoverSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件");
      if (coverInputRef.current) {
        coverInputRef.current.value = "";
      }
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("图片大小不能超过 10MB");
      if (coverInputRef.current) {
        coverInputRef.current.value = "";
      }
      return;
    }

    try {
      const imageUrl = await readFileAsDataUrl(file);
      setEditCoverPreview(imageUrl);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "读取封面失败");
      console.error("读取封面错误:", err);
    }
  };

  const handleSaveNotebook = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextName = editName.trim();
    if (!nextName) {
      setError("请输入手帐本名称");
      return;
    }

    if (!editCoverPreview) {
      setError("请选择封面图");
      return;
    }

    const updates: Partial<Pick<JournalNotebook, "name" | "coverImageUrl">> = {};
    if (nextName !== notebook.name) updates.name = nextName;
    if (editCoverPreview !== notebook.coverImageUrl) {
      updates.coverImageUrl = editCoverPreview;
    }

    if (Object.keys(updates).length === 0) {
      setIsEditingNotebook(false);
      return;
    }

    try {
      setIsSavingNotebook(true);
      setError(null);
      await updateNotebook(notebook.id, updates);

      const updatedNotebook: JournalNotebook = {
        ...notebook,
        ...updates,
        updatedAt: Date.now(),
      };
      onNotebookUpdated(updatedNotebook);
      setIsEditingNotebook(false);
      if (coverInputRef.current) {
        coverInputRef.current.value = "";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新手帐本失败");
      console.error("更新手帐本错误:", err);
    } finally {
      setIsSavingNotebook(false);
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
          <button
            type="button"
            onClick={isEditingNotebook ? closeNotebookEditor : openNotebookEditor}
            className="notebook-header-action-btn"
            title={isEditingNotebook ? "收起编辑" : "编辑封面和名称"}
            disabled={isSavingNotebook}
          >
            {isEditingNotebook ? <X size={20} /> : <Pencil size={20} />}
          </button>
        </header>

        {/* 错误提示 */}
        {error && (
          <div className="notebook-error-banner">
            {error}
          </div>
        )}

        {/* 内容区域 */}
        <div className="notebook-content">
          {isEditingNotebook && (
            <form onSubmit={handleSaveNotebook} className="notebook-edit-panel">
              <div className="notebook-edit-row">
                <button
                  type="button"
                  className="notebook-edit-cover"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={isSavingNotebook}
                >
                  <img src={editCoverPreview} alt={editName || notebook.name} />
                  <span className="notebook-edit-cover-action">
                    <Upload size={16} />
                    更换封面
                  </span>
                </button>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverSelect}
                  className="notebook-file-input"
                  disabled={isSavingNotebook}
                />

                <div className="notebook-edit-fields">
                  <label className="notebook-form-label" htmlFor="notebook-edit-name">
                    手帐本名称
                  </label>
                  <input
                    id="notebook-edit-name"
                    type="text"
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    className="notebook-form-input"
                    placeholder="输入新的手帐本名称"
                    disabled={isSavingNotebook}
                  />
                </div>
              </div>

              <div className="notebook-edit-actions">
                <button
                  type="button"
                  className="notebook-btn notebook-btn-secondary"
                  onClick={closeNotebookEditor}
                  disabled={isSavingNotebook}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="notebook-btn notebook-btn-primary"
                  disabled={isSavingNotebook || !editName.trim() || !editCoverPreview}
                >
                  {isSavingNotebook ? (
                    <Loader2 size={16} className="notebook-spinner-inline" />
                  ) : (
                    <Save size={16} />
                  )}
                  保存
                </button>
              </div>
            </form>
          )}

          {/* 上传按钮 */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="notebook-create-btn"
            disabled={isReordering || isUploadingPages || isSavingNotebook}
          >
            {isUploadingPages ? (
              <Loader2 className="notebook-spinner-inline" />
            ) : (
              <Plus size={20} />
            )}
            <span>
              {uploadProgress
                ? `上传中 ${uploadProgress.done}/${uploadProgress.total}`
                : "批量上传页面"}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="notebook-file-input"
            disabled={isUploadingPages || isSavingNotebook}
          />

          {/* 页面网格 */}
          {pages.length === 0 ? (
            <div className="notebook-empty">
              <p>✨ 还没有页面呢</p>
              <p className="notebook-empty-hint">可以一次选择多张页面</p>
            </div>
          ) : (
            <div className="notebook-pages-grid">
              {pages.map((page, index) => (
                <div
                  key={page.id}
                  draggable={!isUploadingPages && !isSavingNotebook}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(index)}
                  onClick={() => openPagePreview(index)}
                  onKeyDown={(event) => handlePageCardKeyDown(event, index)}
                  role="button"
                  tabIndex={0}
                  aria-label={`打开第 ${index + 1} 页大图`}
                  className={`notebook-page-card ${
                    draggedItem === index ? "dragging" : ""
                  }`}
                >
                  {/* 图片 */}
                  <div className="notebook-page-image">
                    <img
                      src={page.imageUrl}
                      alt={`第 ${index + 1} 页`}
                    />
                  </div>

                  {/* 拖动提示和操作 */}
                  <div className="notebook-page-overlay">
                    <GripVertical className="notebook-drag-icon" />
                    <button
                      onClick={(e) => handleDeletePage(page.id, e)}
                      className="notebook-page-delete"
                      title="删除"
                      disabled={isUploadingPages || isSavingNotebook}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {/* 页码 */}
                  <p className="notebook-page-number">第 {index + 1} 页</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 图片预览弹窗 */}
      {selectedPage && (
        <div
          className="notebook-image-preview-overlay"
          onClick={() => setSelectedImageIndex(null)}
        >
          <div
            className="notebook-image-preview-container"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handlePreviewTouchStart}
            onTouchEnd={handlePreviewTouchEnd}
          >
            {canSwitchPreview && (
              <button
                type="button"
                onClick={() => switchPreviewImage("previous")}
                className="notebook-preview-nav notebook-preview-nav-left"
                title="上一张"
                aria-label="上一张"
              >
                <ChevronLeft size={32} />
              </button>
            )}

            <img src={selectedPage.imageUrl} alt={`第 ${selectedPageNumber} 页预览`} />

            {canSwitchPreview && (
              <button
                type="button"
                onClick={() => switchPreviewImage("next")}
                className="notebook-preview-nav notebook-preview-nav-right"
                title="下一张"
                aria-label="下一张"
              >
                <ChevronRight size={32} />
              </button>
            )}

            <div className="notebook-preview-count">
              {selectedPageNumber} / {pages.length}
            </div>

            <button
              type="button"
              onClick={() => setSelectedImageIndex(null)}
              className="notebook-preview-close"
              title="关闭"
              aria-label="关闭预览"
            >
              <X size={28} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
