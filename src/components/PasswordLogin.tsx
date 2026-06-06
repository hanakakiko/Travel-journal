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
     <div style={{
       width: '100%',
     }}>
       {/* 登录方式切换 */}
       <div className="segmented" style={{
         display: 'grid',
         gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
         gap: '10px',
         marginBottom: '20px',
       }}>
         <button
           onClick={() => {
             setLoginMode('password');
             setError(null);
           }}
           style={{
             minHeight: '42px',
             padding: '8px 12px',
             border: loginMode === 'password' ? '2px solid var(--ink)' : '2px solid rgba(23, 18, 15, 0.3)',
             borderRadius: '14px',
             background: loginMode === 'password' ? 'var(--ink)' : '#fffaf0',
             color: loginMode === 'password' ? '#fff7eb' : 'var(--ink)',
             fontWeight: 900,
             fontSize: '14px',
             cursor: 'pointer',
             transition: 'all 0.2s ease',
           }}
           onMouseEnter={(e) => {
             if (loginMode !== 'password') {
               e.currentTarget.style.background = '#fff0e0';
             }
           }}
           onMouseLeave={(e) => {
             if (loginMode !== 'password') {
               e.currentTarget.style.background = '#fffaf0';
             }
           }}
         >
           密码登录
         </button>
         <button
           onClick={() => {
             setLoginMode('email-otp');
             setError(null);
           }}
           style={{
             minHeight: '42px',
             padding: '8px 12px',
             border: loginMode === 'email-otp' ? '2px solid var(--ink)' : '2px solid rgba(23, 18, 15, 0.3)',
             borderRadius: '14px',
             background: loginMode === 'email-otp' ? 'var(--ink)' : '#fffaf0',
             color: loginMode === 'email-otp' ? '#fff7eb' : 'var(--ink)',
             fontWeight: 900,
             fontSize: '14px',
             cursor: 'pointer',
             transition: 'all 0.2s ease',
           }}
           onMouseEnter={(e) => {
             if (loginMode !== 'email-otp') {
               e.currentTarget.style.background = '#fff0e0';
             }
           }}
           onMouseLeave={(e) => {
             if (loginMode !== 'email-otp') {
               e.currentTarget.style.background = '#fffaf0';
             }
           }}
         >
           验证码登录
         </button>
       </div>

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

       {/* 密码登录模式 */}
       {loginMode === 'password' && (
         <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
           <div>
             <label style={{
               display: 'block',
               fontSize: '14px',
               fontWeight: 900,
               color: 'var(--ink)',
               marginBottom: '8px',
             }}>
               邮箱 / 用户名
             </label>
             <input
               type="text"
               value={identifier}
               onChange={(e) => setIdentifier(e.target.value)}
               onKeyPress={handleKeyPress}
               placeholder="请输入邮箱或用户名"
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
               autoComplete="username"
             />
             <p style={{
               fontSize: '12px',
               color: 'var(--muted)',
               margin: '6px 0 0 0',
             }}>
               邮箱注册的用户请输入邮箱地址
             </p>
           </div>

           <div>
             <label style={{
               display: 'block',
               fontSize: '14px',
               fontWeight: 900,
               color: 'var(--ink)',
               marginBottom: '8px',
             }}>
               密码
             </label>
             <div style={{ position: 'relative' }}>
               <input
                 type={showPassword ? 'text' : 'password'}
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 onKeyPress={handleKeyPress}
                 placeholder="请输入密码"
                 style={{
                   width: '100%',
                   padding: '10px 40px 10px 12px',
                   border: '2px solid var(--ink)',
                   borderRadius: '14px',
                   background: '#fffcf7',
                   fontSize: '16px',
                   fontFamily: 'inherit',
                   color: 'var(--ink)',
                   boxShadow: '3px 4px 0 rgba(38, 29, 26, 0.07)',
                 }}
                 disabled={isLoading}
                 autoComplete="current-password"
               />
               <button
                 type="button"
                 onClick={() => setShowPassword(!showPassword)}
                 style={{
                   position: 'absolute',
                   right: '10px',
                   top: '50%',
                   transform: 'translateY(-50%)',
                   background: 'transparent',
                   border: 'none',
                   cursor: 'pointer',
                   color: 'var(--muted)',
                   padding: '0',
                   display: 'flex',
                   alignItems: 'center',
                 }}
                 tabIndex={-1}
               >
                 {showPassword ? (
                   <EyeOff size={18} />
                 ) : (
                   <Eye size={18} />
                 )}
               </button>
             </div>
           </div>

           <button
             onClick={handlePasswordLogin}
             disabled={isLoading || !identifier || !password}
             style={{
               width: '100%',
               minHeight: '52px',
               padding: '12px 16px',
               marginTop: '8px',
               background: isLoading || !identifier || !password ? '#dcd6cc' : 'var(--ink)',
               color: isLoading || !identifier || !password ? 'rgba(38, 29, 26, 0.54)' : '#fff7eb',
               border: '2px solid var(--ink)',
               borderRadius: '999px',
               fontWeight: 900,
               fontSize: '16px',
               cursor: isLoading || !identifier || !password ? 'not-allowed' : 'pointer',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               gap: '8px',
               transition: 'all 0.2s ease',
               boxShadow: isLoading || !identifier || !password ? 'none' : '5px 6px 0 rgba(38, 29, 26, 0.1)',
             }}
             onMouseDown={(e) => {
               if (!isLoading && identifier && password) {
                 e.currentTarget.style.transform = 'translate(3px, 3px)';
                 e.currentTarget.style.boxShadow = '1px 1px 0 rgba(38, 29, 26, 0.18)';
               }
             }}
             onMouseUp={(e) => {
               if (!isLoading && identifier && password) {
                 e.currentTarget.style.transform = 'none';
                 e.currentTarget.style.boxShadow = '5px 6px 0 rgba(38, 29, 26, 0.1)';
               }
             }}
           >
             {isLoading ? (
               <>
                 <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                 <span>登录中...</span>
               </>
             ) : (
               <>
                 <LogIn size={18} />
                 <span>登录</span>
               </>
             )}
           </button>
         </div>
       )}

       {/* 邮箱 OTP 登录模式 */}
       {loginMode === 'email-otp' && (
         <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
           {otpStep === 'email' ? (
             <>
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
                   onKeyPress={handleKeyPress}
                   placeholder="请输入邮箱地址"
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
                 onClick={handleSendOtpCode}
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
             </>
           ) : (
             <>
               <p style={{
                 fontSize: '14px',
                 color: 'var(--muted)',
                 textAlign: 'center',
                 margin: '0',
               }}>
                 验证码已发送到 <span style={{ fontWeight: 900 }}>{email}</span>
               </p>
               <div>
                 <label style={{
                   display: 'block',
                   fontSize: '14px',
                   fontWeight: 900,
                   color: 'var(--ink)',
                   marginBottom: '8px',
                 }}>
                   验证码 {countdown > 0 && <span style={{ color: 'var(--muted)', fontSize: '12px' }}>({countdown}s)</span>}
                 </label>
                 <input
                   type="text"
                   value={verificationCode}
                   onChange={(e) => setVerificationCode(e.target.value.trim())}
                   onKeyPress={handleKeyPress}
                   placeholder="请输入验证码"
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
                     setOtpStep('email');
                     setVerificationCode('');
                     setError(null);
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
                   返回
                 </button>
                 <button
                   onClick={handleVerifyOtpCode}
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
                     <span>登录</span>
                   )}
                 </button>
               </div>
               <button
                 onClick={handleSendOtpCode}
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
             </>
           )}
         </div>
       )}

       {/* 底部链接 */}
       <div style={{
         marginTop: '24px',
         textAlign: 'center',
         display: 'flex',
         flexDirection: 'column',
         gap: '12px',
       }}>
         <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '0' }}>
           没有账号？
           <button
             onClick={onSignUpClick}
             style={{
               marginLeft: '4px',
               background: 'transparent',
               border: 'none',
               color: 'var(--ink)',
               fontWeight: 900,
               cursor: 'pointer',
               padding: '0',
             }}
           >
             立即注册
           </button>
         </p>
         <p style={{ fontSize: '14px', margin: '0' }}>
           <a href="/reset-password" style={{
             color: 'var(--ink)',
             textDecoration: 'none',
             fontWeight: 600,
             transition: 'opacity 0.2s',
           }} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
             忘记密码？
           </a>
         </p>
       </div>
     </div>
   );
 }
