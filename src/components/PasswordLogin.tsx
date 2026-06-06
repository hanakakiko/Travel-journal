import { useState } from 'react';
import { LogIn, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface PasswordLoginProps {
  onSignUpClick?: () => void;
  onLoginSuccess?: () => void;
}

export function PasswordLogin({ onSignUpClick, onLoginSuccess }: PasswordLoginProps) {
  const { signInWithPassword, sendEmailLoginCode, verifyEmailLoginCode } = useAuth();
  
  // 登录方式选择
  const [loginMode, setLoginMode] = useState<'password' | 'email-otp'>('password');
  
  // 用户名密码登录
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // 邮箱 OTP 登录
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [otpStep, setOtpStep] = useState<'email' | 'code'>('email');
  const [countdown, setCountdown] = useState(0);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ===== 用户名密码登录 =====
  const handlePasswordLogin = async () => {
    setError(null);
    if (!identifier.trim()) {
      setError('请输入邮箱或用户名');
      return;
    }
    if (!password) {
      setError('请输入密码');
      return;
    }

    setIsLoading(true);
    try {
      const result = await signInWithPassword(identifier, password);
      if (result.error) {
        setError(result.error.message || '登录失败，请稍后重试');
        return;
      }

      console.log('[Login] password login success');
      setIdentifier('');
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

  // ===== 邮箱 OTP 登录 =====
  const handleSendOtpCode = async () => {
    setError(null);
    if (!email || !email.includes('@')) {
      setError('请输入有效的邮箱地址');
      return;
    }

    setIsLoading(true);
    try {
      const { error: sendError } = await sendEmailLoginCode(email);
      if (sendError) {
        setError(sendError.message || '发送验证码失败');
        return;
      }

      setOtpStep('code');
      startCountdown();
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtpCode = async () => {
    setError(null);
    if (!verificationCode) {
      setError('请输入验证码');
      return;
    }

    setIsLoading(true);
    try {
      const { error: verifyError } = await verifyEmailLoginCode(verificationCode);
      if (verifyError) {
        setError(verifyError.message || '验证失败');
        return;
      }

      console.log('[Login] email otp login success');
      setEmail('');
      setVerificationCode('');
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
      if (loginMode === 'password') {
        handlePasswordLogin();
      } else if (otpStep === 'email') {
        handleSendOtpCode();
      } else {
        handleVerifyOtpCode();
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-center gap-2 mb-6">
        <LogIn className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">账号登录</h2>
      </div>

      {/* 登录方式切换 */}
      <div className="flex gap-2 mb-6 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => {
            setLoginMode('password');
            setError(null);
          }}
          className={`flex-1 py-2 px-3 rounded text-sm font-medium transition ${
            loginMode === 'password'
              ? 'bg-blue-600 text-white'
              : 'bg-transparent text-gray-700 hover:bg-gray-200'
          }`}
        >
          密码登录
        </button>
        <button
          onClick={() => {
            setLoginMode('email-otp');
            setError(null);
          }}
          className={`flex-1 py-2 px-3 rounded text-sm font-medium transition ${
            loginMode === 'email-otp'
              ? 'bg-blue-600 text-white'
              : 'bg-transparent text-gray-700 hover:bg-gray-200'
          }`}
        >
          验证码登录
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 密码登录模式 */}
      {loginMode === 'password' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              邮箱 / 用户名
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
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

          <div>
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

          <button
            onClick={handlePasswordLogin}
            disabled={isLoading || !identifier || !password}
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
        </div>
      )}

      {/* 邮箱 OTP 登录模式 */}
      {loginMode === 'email-otp' && (
        <div className="space-y-4">
          {otpStep === 'email' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  邮箱地址
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="请输入邮箱地址"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>
              <button
                onClick={handleSendOtpCode}
                disabled={isLoading || !email}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    发送中...
                  </>
                ) : (
                  '发送验证码'
                )}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600 text-center">
                验证码已发送到 <span className="font-medium">{email}</span>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  验证码 {countdown > 0 && <span className="text-gray-500">({countdown}s)</span>}
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.trim())}
                  onKeyPress={handleKeyPress}
                  placeholder="请输入验证码"
                  maxLength={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setOtpStep('email');
                    setVerificationCode('');
                    setError(null);
                  }}
                  disabled={isLoading}
                  className="flex-1 py-2 px-4 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50"
                >
                  返回
                </button>
                <button
                  onClick={handleVerifyOtpCode}
                  disabled={isLoading || !verificationCode}
                  className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      验证中...
                    </>
                  ) : (
                    '登录'
                  )}
                </button>
              </div>
              <button
                onClick={handleSendOtpCode}
                disabled={countdown > 0 || isLoading}
                className="w-full text-blue-600 text-sm hover:text-blue-700 disabled:text-gray-400"
              >
                {countdown > 0 ? `${countdown}s 后可重新发送` : '重新发送验证码'}
              </button>
            </>
          )}
        </div>
      )}

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
