import { useState } from 'react';
import { Mail, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface EmailSignUpProps {
  onSignUpSuccess?: () => void;
}

export function EmailSignUp({ onSignUpSuccess }: EmailSignUpProps) {
  const { sendEmailSignUpCode, verifyEmailSignUpCode } = useAuth();
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [nickname, setNickname] = useState('');
  
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

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

  const handleSendCode = async () => {
    setError(null);
    setSuccess(null);

    if (!email || !email.includes('@')) {
      setError('请输入有效的邮箱地址');
      return;
    }

    setIsLoading(true);
    try {
      const { error: sendError } = await sendEmailSignUpCode(email, nickname || undefined);

      if (sendError) {
        setError(sendError.message || '发送验证码失败，请稍后重试');
        return;
      }

      setSuccess('验证码已发送到您的邮箱，请查收');
      setStep('verify');
      startCountdown();
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    setError(null);
    setSuccess(null);

    if (!verificationCode) {
      setError('请输入验证码');
      return;
    }

    setIsLoading(true);
    try {
      const { error: verifyError } = await verifyEmailSignUpCode(verificationCode);

      if (verifyError) {
        setError(verifyError.message || '验证失败，请重新输入');
        return;
      }

      console.log('[SignUp] success, calling onSignUpSuccess');
      setSuccess('注册成功！请登录您的账号');
      if (onSignUpSuccess) {
        onSignUpSuccess();
      } else {
        setTimeout(() => { window.location.href = '/'; }, 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-center gap-2 mb-6">
        <Mail className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">邮箱注册</h2>
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

      {step === 'form' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              邮箱地址
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入您的邮箱"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              昵称（可选）
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="请输入您的昵称"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          <button
            onClick={handleSendCode}
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

          <p className="text-xs text-gray-600 text-center">
            注册即表示同意我们的服务条款和隐私政策
          </p>
        </div>
      )}

      {step === 'verify' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 text-center">
            验证码已发送到 <span className="font-medium text-gray-800">{email}</span>
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              验证码
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.trim())}
              placeholder="请输入邮箱验证码"
              maxLength={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setStep('form');
                setVerificationCode('');
                setError(null);
                setSuccess(null);
              }}
              disabled={isLoading}
              className="flex-1 py-2 px-4 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              返回修改
            </button>
            <button
              onClick={handleVerify}
              disabled={isLoading || !verificationCode}
              className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  验证中...
                </>
              ) : (
                '完成注册'
              )}
            </button>
          </div>

          <button
            onClick={handleSendCode}
            disabled={countdown > 0 || isLoading}
            className="w-full text-blue-600 text-sm hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {countdown > 0 ? `${countdown}s 后可重新发送` : '重新发送验证码'}
          </button>
        </div>
      )}
    </div>
  );
}
