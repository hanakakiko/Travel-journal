/**
 * 手帐本创建弹窗
 */

import { useState, useRef } from "react";
import { Upload, Loader2, X, ArrowLeft } from "lucide-react";
import type { JournalNotebook } from "../types";
import { createNotebook } from "../lib/notebookManager";
import "../styles/notebook-modals.css";

interface NotebookCreateModalProps {
  onClose: () => void;
  onSuccess: (notebook: JournalNotebook) => void;
}

export function NotebookCreateModal({
  onClose,
  onSuccess,
}: NotebookCreateModalProps) {
  const [name, setName] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("图片大小不能超过 10MB");
      return;
    }

    setCoverImage(file);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      setCoverPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadImageToCOS = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("请输入手帐本名称");
      return;
    }

    if (!coverImage) {
      setError("请上传封面图");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const coverImageUrl = await uploadImageToCOS(coverImage);
      const notebook = await createNotebook(name.trim(), coverImageUrl);
      onSuccess(notebook);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建手帐本失败");
      console.error("创建手帐本错误:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="notebook-modal-overlay">
      <div className="notebook-modal-content notebook-create-modal">
        {/* 头部 */}
        <header className="notebook-header">
          <button onClick={onClose} className="notebook-back-btn" title="返回">
            <ArrowLeft size={24} />
          </button>
          <h2 className="notebook-title">新建手帐本</h2>
          <div style={{ width: 24 }} />
        </header>

        {/* 内容 */}
        <form onSubmit={handleSubmit} className="notebook-form">
          {error && (
            <div className="notebook-error-banner">
              {error}
            </div>
          )}

          {/* 名称输入 */}
          <div className="notebook-form-group">
            <label className="notebook-form-label">手帐本名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：2024年秋季"
              className="notebook-form-input"
              disabled={isLoading}
            />
          </div>

          {/* 封面图上传 */}
          <div className="notebook-form-group">
            <label className="notebook-form-label">选择封面</label>

            {coverPreview ? (
              <div className="notebook-cover-preview">
                <img src={coverPreview} alt="预览" />
                <button
                  type="button"
                  onClick={() => {
                    setCoverImage(null);
                    setCoverPreview("");
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  className="notebook-cover-remove"
                  title="移除"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="notebook-upload-btn"
              >
                <Upload size={32} />
                <p>选择图片</p>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="notebook-file-input"
              disabled={isLoading}
            />
          </div>

          {/* 按钮 */}
          <div className="notebook-form-actions">
            <button
              type="button"
              onClick={onClose}
              className="notebook-btn notebook-btn-secondary"
              disabled={isLoading}
            >
              取消
            </button>
            <button
              type="submit"
              className="notebook-btn notebook-btn-primary"
              disabled={isLoading || !name.trim() || !coverImage}
            >
              {isLoading && <Loader2 size={16} className="notebook-spinner-inline" />}
              创建
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
