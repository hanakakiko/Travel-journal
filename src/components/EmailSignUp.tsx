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
     <div style={{ width: '100%' }}>
       {/* 错误提示 */}
       {error && (
         <div style={{
           marginBottom: '16px',
           padding: '12px 14px',
           background: '#fff8b8',
           border: '2px solid var(--accent-main)',
           borderRadius: '8px',
           display: 'flex',
           alignItems: 'flex-start',
           gap: '8px',
         }}>
           <AlertCircle size={18} style={{ color: 'var(--ink)', flexShrink: 0, marginTop: '2px' }} />
           <p style={{ fontSize: '14px', color: 'var(--ink)', margin: '0' }}>{error}</p>
         </div>
       )}

       {/* 成功提示 */}
       {success && (
         <div style={{
           marginBottom: '16px',
           padding: '12px 14px',
           background: '#f0f7f4',
           border: '2px solid var(--accent-alt)',
           borderRadius: '8px',
           display: 'flex',
           alignItems: 'flex-start',
           gap: '8px',
         }}>
           <CheckCircle size={18} style={{ color: 'var(--accent-alt)', flexShrink: 0, marginTop: '2px' }} />
           <p style={{ fontSize: '14px', color: 'var(--ink)', margin: '0' }}>{success}</p>
         </div>
       )}

       {step === 'form' && (
         <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
           <div>
             <label style={{
               display: 'block',
               fontSize: '14px',
               fontWeight: 900,
               color: 'var(--ink)',
               marginBottom: '8px',
             }}>
               邮箱地址
             </label>
             <input
               type="email"
               value={email}
               onChange={(e) => setEmail(e.target.value)}
               placeholder="请输入您的邮箱"
               style={{
                 width: '100%',
                 padding: '10px 12px',
                 border: '2px solid var(--ink)',
                 borderRadius: '14px',
                 background: '#fffcf7',
                 fontSize: '16px',
                 fontFamily: 'inherit',
                 color: 'var(--ink)',
                 boxShadow: '3px 4px 0 rgba(38, 29, 26, 0.07)',
               }}
               disabled={isLoading}
             />
           </div>

           <div>
             <label style={{
               display: 'block',
               fontSize: '14px',
               fontWeight: 900,
               color: 'var(--ink)',
               marginBottom: '8px',
             }}>
               昵称（可选）
             </label>
             <input
               type="text"
               value={nickname}
               onChange={(e) => setNickname(e.target.value)}
               placeholder="请输入您的昵称"
               style={{
                 width: '100%',
                 padding: '10px 12px',
                 border: '2px solid var(--ink)',
                 borderRadius: '14px',
                 background: '#fffcf7',
                 fontSize: '16px',
                 fontFamily: 'inherit',
                 color: 'var(--ink)',
                 boxShadow: '3px 4px 0 rgba(38, 29, 26, 0.07)',
               }}
               disabled={isLoading}
             />
           </div>

           <button
             onClick={handleSendCode}
             disabled={isLoading || !email}
             style={{
               width: '100%',
               minHeight: '48px',
               padding: '10px 16px',
               marginTop: '8px',
               background: isLoading || !email ? '#dcd6cc' : 'var(--ink)',
               color: isLoading || !email ? 'rgba(38, 29, 26, 0.54)' : '#fff7eb',
               border: '2px solid var(--ink)',
               borderRadius: '999px',
               fontWeight: 900,
               fontSize: '16px',
               cursor: isLoading || !email ? 'not-allowed' : 'pointer',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               gap: '8px',
               transition: 'all 0.2s ease',
               boxShadow: isLoading || !email ? 'none' : '5px 6px 0 rgba(38, 29, 26, 0.1)',
             }}
           >
             {isLoading ? (
               <>
                 <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                 <span>发送中...</span>
               </>
             ) : (
               <span>发送验证码</span>
             )}
           </button>

           <p style={{
             fontSize: '12px',
             color: 'var(--muted)',
             textAlign: 'center',
             margin: '0',
           }}>
             注册即表示同意我们的服务条款和隐私政策
           </p>
         </div>
       )}

       {step === 'verify' && (
         <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
           <p style={{
             fontSize: '14px',
             color: 'var(--muted)',
             textAlign: 'center',
             margin: '0',
           }}>
             验证码已发送到 <span style={{ fontWeight: 900, color: 'var(--ink)' }}>{email}</span>
           </p>

           <div>
             <label style={{
               display: 'block',
               fontSize: '14px',
               fontWeight: 900,
               color: 'var(--ink)',
               marginBottom: '8px',
             }}>
               验证码
             </label>
             <input
               type="text"
               value={verificationCode}
               onChange={(e) => setVerificationCode(e.target.value.trim())}
               placeholder="请输入邮箱验证码"
               maxLength={6}
               style={{
                 width: '100%',
                 padding: '10px 12px',
                 border: '2px solid var(--ink)',
                 borderRadius: '14px',
                 background: '#fffcf7',
                 fontSize: '16px',
                 fontFamily: 'inherit',
                 color: 'var(--ink)',
                 boxShadow: '3px 4px 0 rgba(38, 29, 26, 0.07)',
                 letterSpacing: '4px',
               }}
               disabled={isLoading}
               autoFocus
             />
           </div>

           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
             <button
               onClick={() => {
                 setStep('form');
                 setVerificationCode('');
                 setError(null);
                 setSuccess(null);
               }}
               disabled={isLoading}
               style={{
                 minHeight: '44px',
                 padding: '8px 12px',
                 background: '#fffcf7',
                 color: 'var(--ink)',
                 border: '2px solid var(--ink)',
                 borderRadius: '999px',
                 fontWeight: 900,
                 fontSize: '14px',
                 cursor: isLoading ? 'not-allowed' : 'pointer',
                 opacity: isLoading ? 0.6 : 1,
                 transition: 'all 0.2s ease',
               }}
             >
               返回修改
             </button>
             <button
               onClick={handleVerify}
               disabled={isLoading || !verificationCode}
               style={{
                 minHeight: '44px',
                 padding: '8px 12px',
                 background: isLoading || !verificationCode ? '#dcd6cc' : 'var(--ink)',
                 color: isLoading || !verificationCode ? 'rgba(38, 29, 26, 0.54)' : '#fff7eb',
                 border: '2px solid var(--ink)',
                 borderRadius: '999px',
                 fontWeight: 900,
                 fontSize: '14px',
                 cursor: isLoading || !verificationCode ? 'not-allowed' : 'pointer',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 gap: '6px',
                 transition: 'all 0.2s ease',
                 boxShadow: isLoading || !verificationCode ? 'none' : '3px 4px 0 rgba(38, 29, 26, 0.1)',
               }}
             >
               {isLoading ? (
                 <>
                   <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                   <span>验证中...</span>
                 </>
               ) : (
                 <span>完成注册</span>
               )}
             </button>
           </div>

           <button
             onClick={handleSendCode}
             disabled={countdown > 0 || isLoading}
             style={{
               width: '100%',
               padding: '8px',
               background: 'transparent',
               color: countdown > 0 || isLoading ? 'var(--muted)' : 'var(--ink)',
               border: 'none',
               fontSize: '14px',
               fontWeight: 600,
               cursor: countdown > 0 || isLoading ? 'not-allowed' : 'pointer',
               transition: 'all 0.2s ease',
             }}
           >
             {countdown > 0 ? `${countdown}s 后可重新发送` : '重新发送验证码'}
           </button>
         </div>
       )}
     </div>
   );
 }
