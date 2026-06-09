import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { getApp } from '../lib/cloudbase';
import { initializeUserSettings, clearAllLocalSettings } from '../lib/userSettings';
import { getAllTemplatesAsync, clearLocalCache as clearTemplateCache } from '../lib/templateManager';

interface User {
  id: string;
  email?: string;
  phone?: string;
  username?: string;
  nickname?: string;
  email_confirmed_at?: string;
  phone_confirmed_at?: string;
  is_anonymous?: boolean;
}

interface Session {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user: User;
}

interface AuthContextType {
   user: User | null;
   session: Session | null;
   isLoading: boolean;
   
   // ===== 邮箱 OTP 注册（无密码）=====
   sendEmailSignUpCode: (email: string, nickname?: string) => Promise<{ data?: any; error?: any }>;
   verifyEmailSignUpCode: (token: string, username?: string) => Promise<{ data?: any; error?: any }>;
  
  // ===== 邮箱 OTP 登录（无密码）=====
  sendEmailLoginCode: (email: string) => Promise<{ data?: any; error?: any }>;
  verifyEmailLoginCode: (token: string) => Promise<{ data?: any; error?: any }>;
  
  // ===== 用户名密码注册 =====
  signUpWithUsername: (
    username: string,
    password: string,
    email?: string,
    nickname?: string
  ) => Promise<{ data?: any; error?: any }>;
  
  // ===== 用户名密码登录 =====
  signInWithPassword: (
    identifier: string,
    password: string
  ) => Promise<{ data?: any; error?: any }>;
  
  signOut: () => Promise<void>;
  getSession: () => Promise<{ data?: any; error?: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 使用 cloudbase.ts 中的统一单例，避免多实例导致 auth token 错乱
function getCloudbaseApp() {
  return getApp();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // 邮箱 OTP 注册和登录的 verifyOtp 函数
  const emailSignUpVerifyOtpRef = useRef<((params: { token: string }) => Promise<any>) | null>(null);
  const emailLoginVerifyOtpRef = useRef<((params: { token: string }) => Promise<any>) | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const auth = getCloudbaseApp().auth({ persistence: 'local' });
      
      // 首先尝试从 localStorage 恢复会话信息
      const savedSession = localStorage.getItem('cloudbase_session_backup');
      const savedUser = localStorage.getItem('cloudbase_user_backup');
      
      // 尝试从 CloudBase 获取当前会话
      const { data } = await auth.getSession();
      
      if (data?.session) {
        console.log('[Auth] checkAuthStatus: session found from CloudBase, user=' + data.session.user?.id);
        setSession(data.session);
        setUser(data.session.user);
        // 备份会话信息到 localStorage，以便刷新时恢复
        localStorage.setItem('cloudbase_session_backup', JSON.stringify(data.session));
        localStorage.setItem('cloudbase_user_backup', JSON.stringify(data.session.user));
      } else if (savedSession && savedUser) {
        // 如果 CloudBase 没有会话，但本地有备份，尝试恢复
        try {
          const restoredSession = JSON.parse(savedSession);
          const restoredUser = JSON.parse(savedUser);
          console.log('[Auth] checkAuthStatus: restored session from localStorage, user=' + restoredUser?.id);
          setSession(restoredSession);
          setUser(restoredUser);
        } catch (parseErr) {
          console.warn('[Auth] Failed to parse saved session:', parseErr);
          setSession(null);
          setUser(null);
          localStorage.removeItem('cloudbase_session_backup');
          localStorage.removeItem('cloudbase_user_backup');
        }
      } else {
        console.log('[Auth] checkAuthStatus: no session found');
        setSession(null);
        setUser(null);
      }
    } catch (err) {
      console.error('[Auth] checkAuthStatus failed:', err);
      // 即使出错，也尝试从本地恢复
      try {
        const savedSession = localStorage.getItem('cloudbase_session_backup');
        const savedUser = localStorage.getItem('cloudbase_user_backup');
        if (savedSession && savedUser) {
          const restoredSession = JSON.parse(savedSession);
          const restoredUser = JSON.parse(savedUser);
          console.log('[Auth] Recovered session from localStorage after error');
          setSession(restoredSession);
          setUser(restoredUser);
        } else {
          setSession(null);
          setUser(null);
        }
      } catch (fallbackErr) {
        console.error('[Auth] Fallback recovery failed:', fallbackErr);
        setSession(null);
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 清理本地存储中的旧会话数据
  const clearLocalAuthStorage = () => {
    try {
      // 清理 CloudBase 相关的本地存储键
      const keysToRemove = [
        'cloudbase_session',
        'cloudbase_access_token',
        'cloudbase_refresh_token',
        'cloudbase_user',
        'cloudbase_login_state',
        'cloudbase_anonymous_uid',
      ];
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      // 清理所有以 cloudbase 开头的键，但保留备份
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.toLowerCase().includes('cloudbase') &&
            !key.includes('_backup')) {
          localStorage.removeItem(key);
        }
      }
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key && key.toLowerCase().includes('cloudbase') &&
            !key.includes('_backup')) {
          sessionStorage.removeItem(key);
        }
      }
      console.log('[Auth] Cleared local auth storage');
    } catch (err) {
      console.error('[Auth] Failed to clear local auth storage:', err);
    }
  };

  // ===== 邮箱 OTP 注册 =====
  
  const sendEmailSignUpCode = async (
    email: string,
    nickname?: string
  ): Promise<{ data?: any; error?: any }> => {
    try {
      // 发送验证码前清理旧会话（但保留备份）
      // 注意：不调用 clearLocalAuthStorage()，因为它会删除备份
      // 改为只清理特定的键
      const keysToRemove = [
        'cloudbase_session',
        'cloudbase_access_token',
        'cloudbase_refresh_token',
        'cloudbase_user',
        'cloudbase_login_state',
        'cloudbase_anonymous_uid',
      ];
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      const auth = getCloudbaseApp().auth({ persistence: 'local' });
      const params: any = { email };
      if (nickname) params.nickname = nickname;
      console.log('[Auth] sendEmailSignUpCode params:', params);
      const { data, error } = await auth.signUp(params);
      console.log('[Auth] sendEmailSignUpCode result - data keys:', data ? Object.keys(data) : null, 'error:', error);
      if (error) return { error };
      emailSignUpVerifyOtpRef.current = data?.verifyOtp ?? null;
      return { data };
    } catch (err: any) {
      return { error: { message: err?.message || '发送验证码失败' } };
    }
  };

  const verifyEmailSignUpCode = async (token: string, username?: string): Promise<{ data?: any; error?: any }> => {
    if (!emailSignUpVerifyOtpRef.current) {
      return { error: { message: '验证码已过期，请重新发送' } };
    }
    try {
      console.log('[Auth] verifyEmailSignUpCode token:', token);
      const { data, error } = await emailSignUpVerifyOtpRef.current({ token });
      console.log('[Auth] verifyEmailSignUpCode result - data:', JSON.stringify(data), 'error:', JSON.stringify(error));
      if (error) return { error };
      emailSignUpVerifyOtpRef.current = null;
      await checkAuthStatus();
      
      // 如果提供了用户名，尝试更新用户的用户名
      if (username) {
        try {
          const auth = getCloudbaseApp().auth({ persistence: 'local' });
          const userRes = await auth.getUser();
          console.log('[Auth] Got user after OTP verification:', userRes?.data?.user?.id);
          
          // 尝试多种方式更新用户名
          if (userRes?.data?.user) {
            const user = userRes.data.user as any;
            
            // 方式1：尝试 updateUsername 方法
            if (typeof user.updateUsername === 'function') {
              console.log('[Auth] Updating username to:', username);
              await user.updateUsername(username);
              console.log('[Auth] Username updated successfully via updateUsername');
            }
            // 方式2：尝试 update 方法
            else if (typeof user.update === 'function') {
              console.log('[Auth] Updating username to:', username);
              await user.update({ username });
              console.log('[Auth] Username updated successfully via update');
            }
            // 方式3：尝试 setUserInfo 方法
            else if (typeof user.setUserInfo === 'function') {
              console.log('[Auth] Updating username to:', username);
              await user.setUserInfo({ username });
              console.log('[Auth] Username updated successfully via setUserInfo');
            }
            // 方式4：通过数据库存储用户名映射
            else {
              console.log('[Auth] User object does not have update methods, storing username in database');
              const db = getCloudbaseApp().database();
              const userCollection = db.collection('users');
              await userCollection.doc(user.id).set({
                username,
                email: user.email,
                updatedAt: new Date(),
              });
              console.log('[Auth] Username stored in database');
            }
          }
        } catch (err: any) {
          console.warn('[Auth] Failed to update username:', err?.message);
          // 不阻断注册流程，静默处理
        }
      }
      
      // 注册成功后，从云端拉取用户设置和模板
      try {
        await Promise.all([
          initializeUserSettings(),
          getAllTemplatesAsync(),
        ]);
        console.log('[Auth] Successfully synced user data after signup');
      } catch (syncErr) {
        console.warn('[Auth] Failed to sync user data after signup:', syncErr);
        // 不阻断登录流程，静默处理
      }
      
      return { data };
    } catch (err: any) {
      return { error: { message: err?.message || '验证码错误' } };
    }
  };

  // ===== 邮箱 OTP 登录 =====
  
  const sendEmailLoginCode = async (email: string): Promise<{ data?: any; error?: any }> => {
    try {
      // 发送登录验证码前清理旧会话（但保留备份）
      // 注意：不调用 clearLocalAuthStorage()，因为它会删除备份
      // 改为只清理特定的键
      const keysToRemove = [
        'cloudbase_session',
        'cloudbase_access_token',
        'cloudbase_refresh_token',
        'cloudbase_user',
        'cloudbase_login_state',
        'cloudbase_anonymous_uid',
      ];
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      const auth = getCloudbaseApp().auth({ persistence: 'local' });
      console.log('[Auth] sendEmailLoginCode email:', email);
      const { data, error } = await auth.signInWithOtp({ email });
      console.log('[Auth] sendEmailLoginCode result - data keys:', data ? Object.keys(data) : null, 'error:', error);
      if (error) return { error };
      emailLoginVerifyOtpRef.current = data?.verifyOtp ?? null;
      return { data };
    } catch (err: any) {
      return { error: { message: err?.message || '发送登录验证码失败' } };
    }
  };

  const verifyEmailLoginCode = async (token: string): Promise<{ data?: any; error?: any }> => {
    if (!emailLoginVerifyOtpRef.current) {
      return { error: { message: '验证码已过期，请重新发送' } };
    }
    try {
      console.log('[Auth] verifyEmailLoginCode token:', token);
      const { data, error } = await emailLoginVerifyOtpRef.current({ token });
      console.log('[Auth] verifyEmailLoginCode result - data:', JSON.stringify(data), 'error:', JSON.stringify(error));
      if (error) return { error };
      emailLoginVerifyOtpRef.current = null;
      if (data?.session) {
        console.log('[Auth] email login success, user:', data.session.user?.id, data.session.user?.email);
        setSession(data.session);
        setUser(data.session.user);
        // 备份会话信息到 localStorage，以便刷新时恢复
        localStorage.setItem('cloudbase_session_backup', JSON.stringify(data.session));
        localStorage.setItem('cloudbase_user_backup', JSON.stringify(data.session.user));
      } else {
        await checkAuthStatus();
      }
      
      // 登录成功后，从云端拉取用户设置和模板（覆盖本地缓存）
      try {
        await Promise.all([
          initializeUserSettings(),
          getAllTemplatesAsync(),
        ]);
        console.log('[Auth] Successfully synced user data after email login');
      } catch (syncErr) {
        console.warn('[Auth] Failed to sync user data after email login:', syncErr);
        // 不阻断登录流程，静默处理
      }
      
      return { data };
    } catch (err: any) {
      return { error: { message: err?.message || '验证码错误' } };
    }
  };

  // ===== 用户名密码注册 =====
  
  const signUpWithUsername = async (
    username: string,
    password: string,
    email?: string,
    nickname?: string
  ): Promise<{ data?: any; error?: any }> => {
    try {
      console.log('[Auth] signUpWithUsername called with:', { username, email, password: '***', nickname });
      
      // 注册前先清理旧会话，避免新注册的用户被旧会话覆盖（但保留备份）
      // 注意：不调用 clearLocalAuthStorage()，因为它会删除备份
      // 改为只清理特定的键
      const keysToRemove = [
        'cloudbase_session',
        'cloudbase_access_token',
        'cloudbase_refresh_token',
        'cloudbase_user',
        'cloudbase_login_state',
        'cloudbase_anonymous_uid',
      ];
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      const auth = getCloudbaseApp().auth({ persistence: 'local' });
      
      // CloudBase 的认证系统需要邮箱 OTP 验证
      // 即使提供了密码，也需要通过邮箱验证来完成注册
      if (!email) {
        console.error('[Auth] signUpWithUsername: email is required');
        return { error: { message: '邮箱地址是必需的' } };
      }
      
      console.log('[Auth] signUpWithUsername calling signUpWithEmailAndPassword with:', { email, password: '***', username });
      
      // 使用 signUpWithEmailAndPassword 方法进行密码注册
      // 这会返回一个 verifyOtp 函数，需要用户输入邮箱验证码
      // 注意：CloudBase 的 signUpWithEmailAndPassword 可能不支持直接设置 username
      // 所以我们需要在 OTP 验证后通过其他方式设置用户名
      const { data, error } = await (auth as any).signUpWithEmailAndPassword(email, password);
      console.log('[Auth] signUpWithUsername result - data:', data, 'error:', error);
      if (error) {
        console.error('[Auth] signUpWithUsername error:', error);
        return { error };
      }
      
      // 保存 verifyOtp 函数到 ref，以便 verifyEmailSignUpCode 可以使用
      emailSignUpVerifyOtpRef.current = data?.verifyOtp ?? null;
      console.log('[Auth] Saved verifyOtp function to emailSignUpVerifyOtpRef');
      
      // 返回 verifyOtp 函数和用户信息，以便 UI 层可以处理 OTP 验证
      return {
        data: {
          verifyOtp: data?.verifyOtp,
          username,
          email,
          password,
          nickname,
        }
      };
    } catch (err: any) {
      console.error('[Auth] signUpWithUsername exception:', err);
      return { error: { message: err?.message || '注册失败' } };
    }
  };

  // ===== 用户名密码登录 =====
  
  const signInWithPassword = async (
    identifier: string,
    password: string
  ): Promise<{ data?: any; error?: any }> => {
    try {
      // 登录前清理本地存储，确保不会被旧会话干扰（但保留备份）
      // 注意：不调用 clearLocalAuthStorage()，因为它会删除备份
      // 改为只清理特定的键
      const keysToRemove = [
        'cloudbase_session',
        'cloudbase_access_token',
        'cloudbase_refresh_token',
        'cloudbase_user',
        'cloudbase_login_state',
        'cloudbase_anonymous_uid',
      ];
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      const auth = getCloudbaseApp().auth({ persistence: 'local' });

      // 自动判断：包含 @ 则视为邮箱，否则为用户名
      const credentials = identifier.includes('@')
        ? { email: identifier, password }
        : { username: identifier, password };

      console.log('[Auth] signInWithPassword, using', identifier.includes('@') ? 'email' : 'username');
      const { data, error } = await auth.signInWithPassword(credentials);
      console.log('[Auth] signInWithPassword result - data:', JSON.stringify(data), 'error:', JSON.stringify(error));

      if (error) {
        return { error: { message: error.message || '用户名或密码错误，请重试' } };
      }

      // 更新用户状态
      if (data?.session) {
        console.log('[Auth] password login success, user:', data.session.user?.id);
        setSession(data.session);
        setUser(data.session.user);
        // 备份会话信息到 localStorage，以便刷新时恢复
        localStorage.setItem('cloudbase_session_backup', JSON.stringify(data.session));
        localStorage.setItem('cloudbase_user_backup', JSON.stringify(data.session.user));
      } else {
        console.warn('[Auth] password login returned no error but also no session');
      }

      // 登录成功后，从云端拉取用户设置和模板（覆盖本地缓存）
      try {
        await Promise.all([
          initializeUserSettings(),
          getAllTemplatesAsync(),
        ]);
        console.log('[Auth] Successfully synced user data after password login');
      } catch (syncErr) {
        console.warn('[Auth] Failed to sync user data after password login:', syncErr);
        // 不阻断登录流程，静默处理
      }

      return { data };
    } catch (err: any) {
      return { error: { message: err?.message || '登录失败，请稍后重试' } };
    }
  };

  const signOut = async () => {
    try {
      const auth = getCloudbaseApp().auth({ persistence: 'local' });
      await auth.signOut();
      
      // 清理本地存储中的所有会话数据
      clearLocalAuthStorage();
      
      // 清理会话备份
      localStorage.removeItem('cloudbase_session_backup');
      localStorage.removeItem('cloudbase_user_backup');
      
      // 清理用户设置和模板的本地缓存，防止数据泄露
      clearAllLocalSettings();
      clearTemplateCache();
      
      setUser(null);
      setSession(null);
      console.log('[Auth] signed out and cleared all local user data');
    } catch (err) {
      console.error('[Auth] signOut failed:', err);
      // 即使 signOut 失败，也要清理本地存储
      clearLocalAuthStorage();
      localStorage.removeItem('cloudbase_session_backup');
      localStorage.removeItem('cloudbase_user_backup');
      clearAllLocalSettings();
      clearTemplateCache();
      setUser(null);
      setSession(null);
      throw err;
    }
  };

  const getSession = async (): Promise<{ data?: any; error?: any }> => {
    try {
      const auth = getCloudbaseApp().auth({ persistence: 'local' });
      return await auth.getSession();
    } catch (err: any) {
      return { error: { message: err?.message || '获取会话失败' } };
    }
  };

  return (
    <AuthContext.Provider value={{
      user, session, isLoading,
      sendEmailSignUpCode, verifyEmailSignUpCode,
      sendEmailLoginCode, verifyEmailLoginCode,
      signUpWithUsername,
      signInWithPassword,
      signOut, getSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth 必须在 AuthProvider 内使用');
  }
  return context;
}
