import { useState } from 'react';
import { Mail, LogIn } from 'lucide-react';
import { EmailSignUp } from './EmailSignUp';
import { PasswordLogin } from './PasswordLogin';

export type AuthMode = 'login' | 'signup';

interface AuthPageProps {
  initialMode?: AuthMode;
  onAuthSuccess?: () => void;
}

export function AuthPage({ initialMode = 'login', onAuthSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 标签切换 */}
        <div className="flex gap-2 mb-8 bg-white rounded-lg p-1 shadow-md">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              mode === 'login'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <LogIn className="w-4 h-4" />
            登录
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              mode === 'signup'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Mail className="w-4 h-4" />
            注册
          </button>
        </div>

        {/* 内容区域 */}
        <div>
          {mode === 'login' ? (
            <PasswordLogin />
          ) : (
            <EmailSignUp />
          )}
        </div>

        {/* 页脚 */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>© 2024 旅程日志 (Travel Journal)</p>
          <p className="mt-2">
            <a href="/terms" className="text-blue-600 hover:text-blue-700">
              服务条款
            </a>
            {' • '}
            <a href="/privacy" className="text-blue-600 hover:text-blue-700">
              隐私政策
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
