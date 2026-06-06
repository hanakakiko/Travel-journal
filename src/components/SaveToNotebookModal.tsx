/**
 * 保存到手帐本的弹窗
 */

import { useEffect, useState } from "react";
import { Plus, Loader2, Check, ArrowLeft } from "lucide-react";
import type { JournalNotebook } from "../types";
import { getAllNotebooks, addPageToNotebook } from "../lib/notebookManager";
import { NotebookCreateModal } from "./NotebookCreateModal";
import "../styles/notebook-modals.css";

interface SaveToNotebookModalProps {
  imageUrl: string;
  imageTitle: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SaveToNotebookModal({
  imageUrl,
  imageTitle,
  onClose,
  onSuccess,
}: SaveToNotebookModalProps) {
  const [notebooks, setNotebooks] = useState<JournalNotebook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(
    null
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [savedTo, setSavedTo] = useState<string | null>(null);

  useEffect(() => {
    loadNotebooks();
  }, []);

  const loadNotebooks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getAllNotebooks();
      setNotebooks(data);
      if (data.length > 0) {
        setSelectedNotebookId(data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载手帐本失败");
      console.error("加载手帐本错误:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedNotebookId) {
      setError("请选择一个手帐本");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      await addPageToNotebook(selectedNotebookId, imageUrl, imageTitle);
      setSavedTo(selectedNotebookId);

      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
      console.error("保存到手帐本错误:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateSuccess = (newNotebook: JournalNotebook) => {
    setNotebooks([newNotebook, ...notebooks]);
    setSelectedNotebookId(newNotebook.id);
    setShowCreateModal(false);
  };

  if (isLoading) {
    return (
      <div className="notebook-modal-overlay">
        <div className="notebook-modal-content notebook-loading">
          <Loader2 className="notebook-spinner" />
          <p>加载手帐本...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notebook-modal-overlay">
      <div className="notebook-modal-content notebook-save-modal">
        {/* 头部 */}
        <header className="notebook-header">
          <button onClick={onClose} className="notebook-back-btn" title="返回">
            <ArrowLeft size={24} />
          </button>
          <h2 className="notebook-title">保存到手帐本</h2>
          <div style={{ width: 24 }} />
        </header>

        {/* 内容 */}
        <div className="notebook-form">
          {error && (
            <div className="notebook-error-banner">
              {error}
            </div>
          )}

          {savedTo ? (
            <div className="notebook-success-banner">
              <Check size={20} />
              <span>保存成功！</span>
            </div>
          ) : (
            <>
              {notebooks.length === 0 ? (
                <div className="notebook-empty-save">
                  <p>✨ 还没有手帐本</p>
                  <p className="notebook-empty-hint">创建一个新的手帐本来保存吧</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="notebook-create-btn"
                  >
                    <Plus size={20} />
                    创建新手帐本
                  </button>
                </div>
              ) : (
                <>
                  <label className="notebook-form-label">选择手帐本</label>
                  <div className="notebook-notebooks-list">
                    {notebooks.map((notebook) => (
                      <button
                        key={notebook.id}
                        onClick={() => setSelectedNotebookId(notebook.id)}
                        className={`notebook-item ${
                          selectedNotebookId === notebook.id ? "active" : ""
                        }`}
                      >
                        <img
                          src={notebook.coverImageUrl}
                          alt={notebook.name}
                          className="notebook-item-cover"
                        />
                        <div className="notebook-item-info">
                          <p className="notebook-item-name">{notebook.name}</p>
                          <p className="notebook-item-count">{notebook.pageCount} 页</p>
                        </div>
                        {selectedNotebookId === notebook.id && (
                          <Check size={20} className="notebook-item-check" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* 创建新手帐本选项 */}
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="notebook-create-link-btn"
                  >
                    <Plus size={16} />
                    或创建新手帐本
                  </button>

                  {/* 操作按钮 */}
                  <div className="notebook-form-actions">
                    <button
                      onClick={onClose}
                      className="notebook-btn notebook-btn-secondary"
                      disabled={isSaving}
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSave}
                      className="notebook-btn notebook-btn-primary"
                      disabled={isSaving || !selectedNotebookId}
                    >
                      {isSaving && <Loader2 size={16} className="notebook-spinner-inline" />}
                      保存
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* 创建手帐本弹窗 */}
      {showCreateModal && (
        <NotebookCreateModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
}
