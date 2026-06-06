import { useState } from 'react';
import { LogIn, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface PasswordLoginProps {
  onSignUpClick?: () => void;
  onLoginSuccess?: () => void;
}

export function PasswordLogin({ onSignUpClick, onLoginSuccess }: PasswordLoginProps) {
  const { signInWithPassword } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);

    // 验证输入
    if (!username.trim()) {
      setError('请输入用户名');
      return;
    }
    if (!password) {
      setError('请输入密码');
      return;
    }

    setIsLoading(true);
    try {
      const result = await signInWithPassword(username, password);

      if (result.error) {
        setError(result.error.message || '登录失败，请稍后重试');
        return;
      }

      setError(null);
      console.log('[Login] success, calling onLoginSuccess');
      // 登录成功，清空表单
      setUsername('');
      setPassword('');

      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        window.location.href = '/';
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-center gap-2 mb-6">
        <LogIn className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">账号登录</h2>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 邮箱/用户名输入 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          邮箱 / 用户名
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="请输入邮箱或用户名"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isLoading}
          autoComplete="username"
        />
        <p className="text-xs text-gray-500 mt-1">
          邮箱注册的用户请输入邮箱地址
        </p>
      </div>

      {/* 密码输入 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          密码
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="请输入密码"
            className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* 登录按钮 */}
      <button
        onClick={handleLogin}
        disabled={isLoading || !username || !password}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            登录中...
          </>
        ) : (
          <>
            <LogIn className="w-4 h-4" />
            登录
          </>
        )}
      </button>

      {/* 底部链接 */}
      <div className="mt-6 text-center space-y-2">
        <p className="text-sm text-gray-600">
          没有账号？
          <button
            onClick={onSignUpClick}
            className="text-blue-600 hover:text-blue-700 font-medium bg-none border-none cursor-pointer p-0 m-0"
          >
            立即注册
          </button>
        </p>
        <p className="text-sm text-gray-600">
          <a href="/reset-password" className="text-blue-600 hover:text-blue-700">
            忘记密码？
          </a>
        </p>
      </div>
    </div>
  );
}
