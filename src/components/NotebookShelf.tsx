/**
 * 手帐展示架 - 主页面
 * 全屏模态，展示所有手帐本
 */

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Plus, Trash2, Loader2, ArrowLeft } from "lucide-react";
import type { JournalNotebook } from "../types";
import { getAllNotebooks, deleteNotebook } from "../lib/notebookManager";
import { NotebookCreateModal } from "./NotebookCreateModal";
import { NotebookDetailModal } from "./NotebookDetailModal";
import "../styles/notebook-shelf.css";

interface NotebookShelfProps {
  onClose: () => void;
  navigate?: (path: string) => void;
}

export function NotebookShelf({ onClose, navigate }: NotebookShelfProps) {
  const location = useLocation();
  const [notebooks, setNotebooks] = useState<JournalNotebook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedNotebook, setSelectedNotebook] = useState<JournalNotebook | null>(null);

  useEffect(() => {
    loadNotebooks();
  }, []);

  // 初始化时，若 URL 已是 /notebook/:id，尝试从列表中找到对应手帐本并选中
  // 这里只做 URL → state 的单向同步（组件挂载时）
  // 注意：notebooks 加载完成后才能匹配，所以放在 notebooks 变化的 effect 里处理
  useEffect(() => {
    if (!location.pathname.startsWith('/notebook/') || notebooks.length === 0) return;
    if (selectedNotebook) return; // 已有选中，不重复处理

    const idFromUrl = location.pathname.replace('/notebook/', '');
    const found = notebooks.find((n) => n.id === idFromUrl);
    if (found) {
      setSelectedNotebook(found);
    }
  }, [notebooks, location.pathname]);

  const loadNotebooks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getAllNotebooks();
      setNotebooks(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "加载手帐本失败";
      console.error("加载手帐本错误:", err);
      
      // 检查是否是集合不存在的错误
      if (errorMessage.includes("not exist") || errorMessage.includes("集合")) {
        setError("❌ CloudBase 集合未创建。请按以下步骤操作:\n\n1. 打开 CloudBase 控制台\n2. 创建集合: journals_notebooks\n3. 创建集合: journals_pages\n4. 刷新页面\n\n详见: CLOUDBASE_QUICK_SETUP.md");
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNotebook = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("确定要删除这个手帐本及其所有页面吗？")) return;

    try {
      await deleteNotebook(id);
      setNotebooks(notebooks.filter((n) => n.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除手帐本失败");
      console.error("删除手帐本错误:", err);
    }
  };

  const handleCreateSuccess = (newNotebook: JournalNotebook) => {
    setNotebooks([newNotebook, ...notebooks]);
    setShowCreateModal(false);
  };

  if (isLoading) {
    return (
      <div className="notebook-modal-overlay">
        <div className="notebook-modal-content notebook-loading">
          <Loader2 className="notebook-spinner" />
          <p>加载手帐本中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notebook-modal-overlay">
      <div className="notebook-modal-content">
        {/* 头部 */}
        <header className="notebook-header">
          <button
            onClick={() => {
              if (selectedNotebook) {
                // 从手帐本详情返回列表：先清除选中状态，再更新 URL
                setSelectedNotebook(null);
                if (navigate) {
                  navigate('/notebook');
                }
              } else {
                // 从列表返回主页
                onClose();
              }
            }}
            className="notebook-back-btn"
            title="返回"
          >
            <ArrowLeft size={24} />
          </button>
          <h2 className="notebook-title">我的手帐本</h2>
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
          {/* 新建按钮 */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="notebook-create-btn"
          >
            <Plus size={20} />
            <span>新建手帐本</span>
          </button>

          {/* 手帐本网格 */}
          {notebooks.length === 0 ? (
            <div className="notebook-empty">
              <p>✨ 还没有手帐本呢</p>
              <p className="notebook-empty-hint">创建一个新的手帐本开始收集吧</p>
            </div>
          ) : (
            <div className="notebook-grid">
              {notebooks.map((notebook) => (
                <div
                  key={notebook.id}
                  className="notebook-card"
                  onClick={() => {
                    setSelectedNotebook(notebook);
                    if (navigate) {
                      navigate(`/notebook/${notebook.id}`);
                    }
                  }}
                >
                  {/* 封面 */}
                  <div className="notebook-card-cover">
                    <img
                      src={notebook.coverImageUrl}
                      alt={notebook.name}
                    />
                  </div>

                  {/* 信息 */}
                  <div className="notebook-card-info">
                    <h3 className="notebook-card-title">{notebook.name}</h3>
                    <p className="notebook-card-count">{notebook.pageCount} 页</p>
                  </div>

                  {/* 删除按钮 */}
                  <button
                    onClick={(e) => handleDeleteNotebook(notebook.id, e)}
                    className="notebook-card-delete"
                    title="删除"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
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

      {/* 手帐本详情弹窗 */}
      {selectedNotebook && (
        <NotebookDetailModal
          notebook={selectedNotebook}
          onClose={() => {
            setSelectedNotebook(null);
            if (navigate) {
              navigate('/notebook');
            }
          }}
          onNotebookUpdated={(updated: JournalNotebook) => {
            setNotebooks(
              notebooks.map((n) => (n.id === updated.id ? updated : n))
            );
            setSelectedNotebook(updated);
          }}
        />
      )}
    </div>
  );
}
