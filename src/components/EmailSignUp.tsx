import { useState } from 'react';
import { Mail, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function EmailSignUp() {
  const { signUpWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  
  // 状态管理
  const [step, setStep] = useState<'email' | 'verify'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 处理发送验证码
  const handleSendCode = async () => {
    setError(null);
    setSuccess(null);

    // 验证邮箱格式
    if (!email || !email.includes('@')) {
      setError('请输入有效的邮箱地址');
      return;
    }

    setIsLoading(true);
    try {
      // 这里调用 SDK 发送验证码
      // 根据 CloudBase 文档，先调用 signUp 获取验证码发送
      const { data, error: signUpError } = await signUpWithEmail(email);
      
      if (signUpError) {
        setError(signUpError.message || '发送验证码失败，请稍后重试');
        return;
      }

      setSuccess('验证码已发送到您的邮箱，请查收');
      setCodeSent(true);
      setStep('verify');
      setCountdown(60);

      // 倒计时
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理完成注册
  const handleVerifyAndRegister = async () => {
    setError(null);
    setSuccess(null);

    // 验证输入
    if (!verificationCode) {
      setError('请输入验证码');
      return;
    }
    if (!password) {
      setError('请设置密码');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    if (password.length < 6) {
      setError('密码长度至少 6 位');
      return;
    }

    setIsLoading(true);
    try {
      // 调用验证和注册
      const result = await signUpWithEmail(
        email,
        verificationCode,
        password,
        nickname
      );

      if (result.error) {
        setError(result.error.message || '注册失败，请稍后重试');
        return;
      }

      setSuccess('注册成功！');
      // 清空表单
      setEmail('');
      setVerificationCode('');
      setPassword('');
      setConfirmPassword('');
      setNickname('');
      setStep('email');
      setCodeSent(false);

      // 可选：在此处导航到主页或其他页面
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
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

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 成功提示 */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {/* 第一步：输入邮箱 */}
      {step === 'email' && (
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

      {/* 第二步：验证码和密码 */}
      {step === 'verify' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              验证码 {countdown > 0 && <span className="text-gray-500">({countdown}s)</span>}
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.trim())}
              placeholder="请输入邮箱验证码"
              maxLength={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              验证码已发送到 {email}
            </p>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              设置密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              确认密码
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入密码"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setStep('email');
                setVerificationCode('');
                setPassword('');
                setConfirmPassword('');
                setError(null);
                setSuccess(null);
              }}
              disabled={isLoading}
              className="flex-1 py-2 px-4 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              返回
            </button>
            <button
              onClick={handleVerifyAndRegister}
              disabled={isLoading}
              className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  注册中...
                </>
              ) : (
                '完成注册'
              )}
            </button>
          </div>

          {countdown > 0 && (
            <button
              onClick={handleSendCode}
              disabled={countdown > 0 || isLoading}
              className="w-full text-blue-600 text-sm hover:text-blue-700 disabled:text-gray-400"
            >
              重新发送
            </button>
          )}
        </div>
      )}
    </div>
  );
}
