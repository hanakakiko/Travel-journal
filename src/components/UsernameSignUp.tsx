import { useState } from 'react';
import { User, Loader2, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface UsernameSignUpProps {
  onSignUpSuccess?: () => void;
}

export function UsernameSignUp({ onSignUpSuccess }: UsernameSignUpProps) {
  const { signUpWithUsername } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const validateForm = (): boolean => {
    setError(null);

    if (!username.trim()) {
      setError('请输入用户名');
      return false;
    }

    if (username.length < 3) {
      setError('用户名至少需要 3 个字符');
      return false;
    }

    if (username.length > 20) {
      setError('用户名最多 20 个字符');
      return false;
    }

    // 用户名只能包含字母、数字和下划线
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('用户名只能包含字母、数字和下划线');
      return false;
    }

    if (!password) {
      setError('请输入密码');
      return false;
    }

    if (password.length < 6) {
      setError('密码至少需要 6 个字符');
      return false;
    }

    if (password.length > 50) {
      setError('密码最多 50 个字符');
      return false;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return false;
    }

    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const { error: signUpError } = await signUpWithUsername(
        username,
        password,
        nickname || undefined
      );

      if (signUpError) {
        setError(signUpError.message || '注册失败，请稍后重试');
        return;
      }

      setSuccess('注册成功！');
      setTimeout(() => {
        if (onSignUpSuccess) {
          onSignUpSuccess();
        } else {
          window.location.href = '/';
        }
      }, 1500);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-center gap-2 mb-6">
        <User className="w-6 h-6 text-indigo-600" />
        <h2 className="text-2xl font-bold text-gray-800">用户名注册</h2>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* 用户名 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            用户名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="3-20 个字符，支持字母、数字和下划线"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={isLoading}
            maxLength={20}
          />
          <p className="text-xs text-gray-500 mt-1">
            {username.length > 0 ? `${username.length}/20` : ''}
          </p>
        </div>

        {/* 密码 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            密码 <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 个字符"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-10"
              disabled={isLoading}
              maxLength={50}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {password.length > 0 ? `${password.length}/50` : ''}
          </p>
        </div>

        {/* 确认密码 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            确认密码 <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入密码"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-10"
              disabled={isLoading}
              maxLength={50}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 昵称（可选） */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            昵称（可选）
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="输入您的昵称"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={isLoading}
          />
        </div>

        {/* 注册按钮 */}
        <button
          onClick={handleSignUp}
          disabled={isLoading || !username || !password || !confirmPassword}
          className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              注册中...
            </>
          ) : (
            '立即注册'
          )}
        </button>

        {/* 条款提示 */}
        <p className="text-xs text-gray-600 text-center">
          注册即表示同意我们的服务条款和隐私政策
        </p>
      </div>
    </div>
  );
}
