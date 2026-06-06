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

           {/* 标签切换 - 使用全局 segmented 风格 */}
           <div className="segmented" style={{
             display: 'grid',
             gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
             gap: '10px',
             marginBottom: '24px',
             marginLeft: '0',
             marginRight: '0',
           }}>
             <button
               onClick={() => setMode('login')}
               className={mode === 'login' ? 'is-active' : ''}
               style={{
                 minHeight: '44px',
                 padding: '8px 12px',
                 border: mode === 'login' ? '2px solid var(--ink)' : '2px solid rgba(23, 18, 15, 0.3)',
                 borderRadius: '14px',
                 background: mode === 'login' ? 'var(--ink)' : '#fffaf0',
                 color: mode === 'login' ? '#fff7eb' : 'var(--ink)',
                 fontWeight: 900,
                 fontSize: '14px',
                 cursor: 'pointer',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 gap: '6px',
                 transition: 'all 0.2s ease',
                 boxShadow: mode === 'login' ? '3px 4px 0 rgba(38, 29, 26, 0.15)' : 'none',
               }}
               onMouseEnter={(e) => {
                 if (mode !== 'login') {
                   e.currentTarget.style.background = '#fff0e0';
                 }
               }}
               onMouseLeave={(e) => {
                 if (mode !== 'login') {
                   e.currentTarget.style.background = '#fffaf0';
                 }
               }}
             >
               <LogIn size={16} />
               <span>登录</span>
             </button>
             <button
               onClick={() => setMode('signup')}
               className={mode === 'signup' ? 'is-active' : ''}
               style={{
                 minHeight: '44px',
                 padding: '8px 12px',
                 border: mode === 'signup' ? '2px solid var(--ink)' : '2px solid rgba(23, 18, 15, 0.3)',
                 borderRadius: '14px',
                 background: mode === 'signup' ? 'var(--ink)' : '#fffaf0',
                 color: mode === 'signup' ? '#fff7eb' : 'var(--ink)',
                 fontWeight: 900,
                 fontSize: '14px',
                 cursor: 'pointer',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 gap: '6px',
                 transition: 'all 0.2s ease',
                 boxShadow: mode === 'signup' ? '3px 4px 0 rgba(38, 29, 26, 0.15)' : 'none',
               }}
               onMouseEnter={(e) => {
                 if (mode !== 'signup') {
                   e.currentTarget.style.background = '#fff0e0';
                 }
               }}
               onMouseLeave={(e) => {
                 if (mode !== 'signup') {
                   e.currentTarget.style.background = '#fffaf0';
                 }
               }}
             >
               <Mail size={16} />
               <span>注册</span>
             </button>
           </div>

         {/* 内容区域 */}
          <div>
            {mode === 'login' ? (
              <PasswordLogin onSignUpClick={() => setMode('signup')} onLoginSuccess={onAuthSuccess} />
            ) : (
              <>
                {/* 注册方式选择 */}
                <div className="segmented" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '10px',
                  marginBottom: '24px',
                  marginLeft: '0',
                  marginRight: '0',
                }}>
                  <button
                    onClick={() => setSignUpMethod('email')}
                    style={{
                      minHeight: '42px',
                      padding: '8px 12px',
                      border: signUpMethod === 'email' ? '2px solid var(--ink)' : '2px solid rgba(23, 18, 15, 0.3)',
                      borderRadius: '14px',
                      background: signUpMethod === 'email' ? 'var(--ink)' : '#fffaf0',
                      color: signUpMethod === 'email' ? '#fff7eb' : 'var(--ink)',
                      fontWeight: 900,
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (signUpMethod !== 'email') {
                        e.currentTarget.style.background = '#fff0e0';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (signUpMethod !== 'email') {
                        e.currentTarget.style.background = '#fffaf0';
                      }
                    }}
                  >
                    <Mail size={16} />
                    <span>邮箱</span>
                  </button>
                  <button
                    onClick={() => setSignUpMethod('username')}
                    style={{
                      minHeight: '42px',
                      padding: '8px 12px',
                      border: signUpMethod === 'username' ? '2px solid var(--ink)' : '2px solid rgba(23, 18, 15, 0.3)',
                      borderRadius: '14px',
                      background: signUpMethod === 'username' ? 'var(--ink)' : '#fffaf0',
                      color: signUpMethod === 'username' ? '#fff7eb' : 'var(--ink)',
                      fontWeight: 900,
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (signUpMethod !== 'username') {
                        e.currentTarget.style.background = '#fff0e0';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (signUpMethod !== 'username') {
                        e.currentTarget.style.background = '#fffaf0';
                      }
                    }}
                  >
                    <User size={16} />
                    <span>用户名</span>
                  </button>
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
