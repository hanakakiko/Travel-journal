import { useState } from 'react';
import { Mail, LogIn, User } from 'lucide-react';
import { EmailSignUp } from './EmailSignUp';
import { UsernameSignUp } from './UsernameSignUp';
import { PasswordLogin } from './PasswordLogin';

export type AuthMode = 'login' | 'signup';
export type SignUpMethod = 'email' | 'username';

interface AuthPageProps {
  initialMode?: AuthMode;
  onAuthSuccess?: () => void;
}

export function AuthPage({ initialMode = 'login', onAuthSuccess }: AuthPageProps) {
   const [mode, setMode] = useState<AuthMode>(initialMode);
   const [signUpMethod, setSignUpMethod] = useState<SignUpMethod>('email');

   // 调试日志
   console.log('[AuthPage] mode:', mode, 'signUpMethod:', signUpMethod);

   return (
     <div style={{
       minHeight: '100vh',
       background: 'linear-gradient(180deg, #fff8b8 0 136px, #fffdf4 136px 100%)',
       display: 'flex',
       alignItems: 'center',
       justifyContent: 'center',
       padding: '4px 16px',
     }}>
       <div style={{
         width: '100%',
         maxWidth: '430px',
       }}>
         {/* 标题区域 */}
         <div style={{
           textAlign: 'center',
           marginBottom: '32px',
         }}>
           <p style={{
             margin: '0 0 12px 0',
             color: 'var(--accent-alt)',
             fontSize: '11px',
             fontWeight: 800,
             letterSpacing: '0.5px',
             textTransform: 'uppercase',
           }}>
             日志系统
           </p>
           <h1 style={{
             margin: '0',
             color: 'var(--ink)',
             fontSize: 'clamp(28px, 8vw, 36px)',
             fontWeight: 950,
             lineHeight: '1',
           }}>
             {mode === 'login' ? '欢迎回来' : '开启手账'}
           </h1>
         </div>

           {/* 主标签页切换 - 登录 / 注册 */}
           <div style={{
             display: 'flex',
             borderBottom: '2px solid rgba(23, 18, 15, 0.12)',
             marginBottom: '28px',
             gap: '0',
           }}>
             <button
               onClick={() => setMode('login')}
               style={{
                 flex: 1,
                 minHeight: '48px',
                 padding: '10px 16px',
                 border: 'none',
                 borderBottom: mode === 'login' ? '3px solid var(--ink)' : '3px solid transparent',
                 borderRadius: '0',
                 background: 'transparent',
                 color: mode === 'login' ? 'var(--ink)' : 'rgba(23, 18, 15, 0.4)',
                 fontWeight: mode === 'login' ? 900 : 600,
                 fontSize: '16px',
                 cursor: 'pointer',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 gap: '7px',
                 transition: 'all 0.2s ease',
                 marginBottom: '-2px',
               }}
               onMouseEnter={(e) => {
                 if (mode !== 'login') {
                   e.currentTarget.style.color = 'rgba(23, 18, 15, 0.7)';
                 }
               }}
               onMouseLeave={(e) => {
                 if (mode !== 'login') {
                   e.currentTarget.style.color = 'rgba(23, 18, 15, 0.4)';
                 }
               }}
             >
               <LogIn size={17} />
               <span>登录</span>
             </button>
             <button
               onClick={() => setMode('signup')}
               style={{
                 flex: 1,
                 minHeight: '48px',
                 padding: '10px 16px',
                 border: 'none',
                 borderBottom: mode === 'signup' ? '3px solid var(--ink)' : '3px solid transparent',
                 borderRadius: '0',
                 background: 'transparent',
                 color: mode === 'signup' ? 'var(--ink)' : 'rgba(23, 18, 15, 0.4)',
                 fontWeight: mode === 'signup' ? 900 : 600,
                 fontSize: '16px',
                 cursor: 'pointer',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 gap: '7px',
                 transition: 'all 0.2s ease',
                 marginBottom: '-2px',
               }}
               onMouseEnter={(e) => {
                 if (mode !== 'signup') {
                   e.currentTarget.style.color = 'rgba(23, 18, 15, 0.7)';
                 }
               }}
               onMouseLeave={(e) => {
                 if (mode !== 'signup') {
                   e.currentTarget.style.color = 'rgba(23, 18, 15, 0.4)';
                 }
               }}
             >
               <Mail size={17} />
               <span>注册</span>
             </button>
           </div>

         {/* 内容区域 */}
          <div>
            {mode === 'login' ? (
              <PasswordLogin onSignUpClick={() => setMode('signup')} onLoginSuccess={onAuthSuccess} />
            ) : (
              <>
                {/* 注册方式选择 - 次级 pill 风格 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '20px',
                }}>
                  <span style={{
                    fontSize: '12px',
                    color: 'rgba(23, 18, 15, 0.45)',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}>注册方式</span>
                  <div style={{
                    display: 'flex',
                    background: 'rgba(23, 18, 15, 0.06)',
                    borderRadius: '20px',
                    padding: '3px',
                    gap: '2px',
                  }}>
                    <button
                      onClick={() => setSignUpMethod('email')}
                      style={{
                        padding: '5px 14px',
                        border: 'none',
                        borderRadius: '17px',
                        background: signUpMethod === 'email' ? 'var(--ink)' : 'transparent',
                        color: signUpMethod === 'email' ? '#ffffff' : 'rgba(23, 18, 15, 0.55)',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.18s ease',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Mail size={13} />
                      <span>邮箱注册</span>
                    </button>
                    <button
                      onClick={() => setSignUpMethod('username')}
                      style={{
                        padding: '5px 14px',
                        border: 'none',
                        borderRadius: '17px',
                        background: signUpMethod === 'username' ? 'var(--ink)' : 'transparent',
                        color: signUpMethod === 'username' ? '#ffffff' : 'rgba(23, 18, 15, 0.55)',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.18s ease',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <User size={13} />
                      <span>密码注册</span>
                    </button>
                  </div>
                </div>

                {/* 注册表单 */}
                {signUpMethod === 'email' ? (
                  <EmailSignUp onSignUpSuccess={onAuthSuccess} />
                ) : (
                  <UsernameSignUp onSignUpSuccess={onAuthSuccess} />
                )}
              </>
            )}
          </div>

         {/* 页脚 */}
         <div style={{
           marginTop: '32px',
           textAlign: 'center',
           fontSize: '12px',
           color: 'var(--muted)',
         }}>
           <p style={{ margin: '0' }}>© 2024 旅程日志 (Travel Journal)</p>
           <p style={{ margin: '8px 0 0 0' }}>
             <a href="/terms" style={{
               color: 'var(--ink)',
               textDecoration: 'none',
               fontWeight: 600,
               transition: 'opacity 0.2s',
             }} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
               服务条款
             </a>
             {' • '}
             <a href="/privacy" style={{
               color: 'var(--ink)',
               textDecoration: 'none',
               fontWeight: 600,
               transition: 'opacity 0.2s',
             }} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
               隐私政策
             </a>
           </p>
         </div>
       </div>
     </div>
   );
 }
