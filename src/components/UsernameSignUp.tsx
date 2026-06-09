import { useState } from 'react';
import { User, Loader2, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface UsernameSignUpProps {
  onSignUpSuccess?: () => void;
}

export function UsernameSignUp({ onSignUpSuccess }: UsernameSignUpProps) {
   const { signUpWithUsername, verifyEmailSignUpCode } = useAuth();
   const [username, setUsername] = useState('');
   const [email, setEmail] = useState('');
   const [password, setPassword] = useState('');
   const [confirmPassword, setConfirmPassword] = useState('');
   const [nickname, setNickname] = useState('');
   const [showPassword, setShowPassword] = useState(false);
   const [showConfirmPassword, setShowConfirmPassword] = useState(false);
   
   const [isLoading, setIsLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [success, setSuccess] = useState<string | null>(null);
   
   // OTP 验证相关状态
   const [verifyOtpFunc, setVerifyOtpFunc] = useState<((params: { token: string }) => Promise<any>) | null>(null);
   const [verificationCode, setVerificationCode] = useState('');
   const [isVerifying, setIsVerifying] = useState(false);

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

    if (!email.trim()) {
      setError('请输入邮箱地址');
      return false;
    }

    // 邮箱格式验证
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('请输入有效的邮箱地址');
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
      console.log('[UsernameSignUp] handleSignUp called with:', { username, email, password: '***', nickname });
      const { data, error: signUpError } = await signUpWithUsername(
        username,
        password,
        email,
        nickname || undefined
      );

      console.log('[UsernameSignUp] signUpWithUsername returned:', { data, error: signUpError });
      if (signUpError) {
        setError(signUpError.message || '注册失败，请稍后重试');
        return;
      }

      // 如果返回了 verifyOtp 函数，说明需要进行 OTP 验证
      if (data?.verifyOtp) {
        console.log('[UsernameSignUp] OTP verification required');
        setVerifyOtpFunc(() => data.verifyOtp);
        setError(null);
        setSuccess(null);
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

  const handleVerifyOtp = async () => {
    if (!verificationCode.trim()) {
      setError('请输入验证码');
      return;
    }

    setIsVerifying(true);
    try {
      console.log('[UsernameSignUp] handleVerifyOtp called with code:', verificationCode, 'username:', username);
      
      // 调用 AuthContext 中的 verifyEmailSignUpCode 方法，传递用户名
      const result = await verifyEmailSignUpCode(verificationCode, username);
      console.log('[UsernameSignUp] verifyEmailSignUpCode result:', result);

      if (result?.error) {
        setError(result.error.message || '验证码错误，请重试');
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
    } catch (err: any) {
      console.error('[UsernameSignUp] verifyOtp exception:', err);
      setError(err?.message || '验证失败，请稍后重试');
    } finally {
      setIsVerifying(false);
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

       <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 如果需要 OTP 验证，显示验证码输入界面 */}
          {verifyOtpFunc ? (
            <>
              <div style={{
                padding: '16px',
                background: '#f0f7f4',
                borderRadius: '8px',
                textAlign: 'center',
              }}>
                <p style={{ fontSize: '14px', color: 'var(--ink)', margin: '0 0 8px 0', fontWeight: 600 }}>
                  验证码已发送到
                </p>
                <p style={{ fontSize: '14px', color: 'var(--ink)', margin: '0', fontWeight: 900 }}>
                  {email}
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
                  验证码 <span style={{ color: '#ff4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="请输入邮箱中的验证码"
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
                  disabled={isVerifying}
                  maxLength={10}
                />
              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={isVerifying || !verificationCode.trim()}
                style={{
                  width: '100%',
                  minHeight: '48px',
                  padding: '10px 16px',
                  marginTop: '8px',
                  background: isVerifying || !verificationCode.trim() ? '#dcd6cc' : 'var(--ink)',
                  color: isVerifying || !verificationCode.trim() ? 'rgba(38, 29, 26, 0.54)' : '#fff7eb',
                  border: '2px solid var(--ink)',
                  borderRadius: '999px',
                  fontWeight: 900,
                  fontSize: '16px',
                  cursor: isVerifying || !verificationCode.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  boxShadow: isVerifying || !verificationCode.trim() ? 'none' : '5px 6px 0 rgba(38, 29, 26, 0.1)',
                }}
              >
                {isVerifying ? (
                  <>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>验证中...</span>
                  </>
                ) : (
                  <span>验证并完成注册</span>
                )}
              </button>

              <button
                onClick={() => {
                  setVerifyOtpFunc(null);
                  setVerificationCode('');
                  setError(null);
                }}
                style={{
                  width: '100%',
                  minHeight: '48px',
                  padding: '10px 16px',
                  background: 'transparent',
                  color: 'var(--ink)',
                  border: '2px solid var(--ink)',
                  borderRadius: '999px',
                  fontWeight: 900,
                  fontSize: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                返回修改
              </button>
            </>
          ) : (
            <>
              {/* 用户名 */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 900,
                  color: 'var(--ink)',
                  marginBottom: '8px',
                }}>
                  用户名 <span style={{ color: '#ff4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="3-20 个字符，支持字母、数字和下划线"
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
                  maxLength={20}
                />
                <p style={{
                  fontSize: '12px',
                  color: 'var(--muted)',
                  margin: '6px 0 0 0',
                }}>
                  {username.length > 0 ? `${username.length}/20` : ''}
                </p>
              </div>

              {/* 邮箱 */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 900,
                  color: 'var(--ink)',
                  marginBottom: '8px',
                }}>
                  邮箱地址 <span style={{ color: '#ff4444' }}>*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="输入您的邮箱地址"
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

              {/* 密码 */}
             <div>
               <label style={{
                 display: 'block',
                 fontSize: '14px',
                 fontWeight: 900,
                 color: 'var(--ink)',
                 marginBottom: '8px',
               }}>
                 密码 <span style={{ color: '#ff4444' }}>*</span>
               </label>
               <div style={{ position: 'relative' }}>
                 <input
                   type={showPassword ? 'text' : 'password'}
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   placeholder="至少 6 个字符"
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
                   maxLength={50}
                 />
                 <button
                   type="button"
                   onClick={() => setShowPassword(!showPassword)}
                   disabled={isLoading}
                   style={{
                     position: 'absolute',
                     right: '10px',
                     top: '50%',
                     transform: 'translateY(-50%)',
                     background: 'transparent',
                     border: 'none',
                     cursor: isLoading ? 'not-allowed' : 'pointer',
                     color: 'var(--muted)',
                     padding: '0',
                     display: 'flex',
                     alignItems: 'center',
                     opacity: isLoading ? 0.5 : 1,
                   }}
                 >
                   {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                 </button>
               </div>
               <p style={{
                 fontSize: '12px',
                 color: 'var(--muted)',
                 margin: '6px 0 0 0',
               }}>
                 {password.length > 0 ? `${password.length}/50` : ''}
               </p>
             </div>

             {/* 确认密码 */}
             <div>
               <label style={{
                 display: 'block',
                 fontSize: '14px',
                 fontWeight: 900,
                 color: 'var(--ink)',
                 marginBottom: '8px',
               }}>
                 确认密码 <span style={{ color: '#ff4444' }}>*</span>
               </label>
               <div style={{ position: 'relative' }}>
                 <input
                   type={showConfirmPassword ? 'text' : 'password'}
                   value={confirmPassword}
                   onChange={(e) => setConfirmPassword(e.target.value)}
                   placeholder="再次输入密码"
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
                   maxLength={50}
                 />
                 <button
                   type="button"
                   onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                   disabled={isLoading}
                   style={{
                     position: 'absolute',
                     right: '10px',
                     top: '50%',
                     transform: 'translateY(-50%)',
                     background: 'transparent',
                     border: 'none',
                     cursor: isLoading ? 'not-allowed' : 'pointer',
                     color: 'var(--muted)',
                     padding: '0',
                     display: 'flex',
                     alignItems: 'center',
                     opacity: isLoading ? 0.5 : 1,
                   }}
                 >
                   {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                 </button>
               </div>
             </div>

             {/* 昵称（可选） */}
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
                 placeholder="输入您的昵称"
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

              {/* 注册按钮 */}
              <button
                onClick={handleSignUp}
                disabled={isLoading || !username || !email || !password || !confirmPassword}
                style={{
                  width: '100%',
                  minHeight: '48px',
                  padding: '10px 16px',
                  marginTop: '8px',
                  background: isLoading || !username || !email || !password || !confirmPassword ? '#dcd6cc' : 'var(--ink)',
                  color: isLoading || !username || !email || !password || !confirmPassword ? 'rgba(38, 29, 26, 0.54)' : '#fff7eb',
                  border: '2px solid var(--ink)',
                  borderRadius: '999px',
                  fontWeight: 900,
                  fontSize: '16px',
                  cursor: isLoading || !username || !email || !password || !confirmPassword ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  boxShadow: isLoading || !username || !email || !password || !confirmPassword ? 'none' : '5px 6px 0 rgba(38, 29, 26, 0.1)',
                }}
              >
               {isLoading ? (
                 <>
                   <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                   <span>注册中...</span>
                 </>
               ) : (
                 <span>立即注册</span>
               )}
             </button>

             {/* 条款提示 */}
             <p style={{
               fontSize: '12px',
               color: 'var(--muted)',
               textAlign: 'center',
               margin: '0',
             }}>
               注册即表示同意我们的服务条款和隐私政策
             </p>
            </>
          )}
       </div>
     </div>
   );
 }
