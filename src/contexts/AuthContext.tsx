import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { getApp } from '../lib/cloudbase';

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
  verifyEmailSignUpCode: (token: string) => Promise<{ data?: any; error?: any }>;
  
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
      const { data } = await auth.getSession();
      console.log('[Auth] checkAuthStatus:', data?.session ? `user=${data.session.user?.id} email=${data.session.user?.email}` : 'no session');
      if (data?.session) {
        setSession(data.session);
        setUser(data.session.user);
      } else {
        setSession(null);
        setUser(null);
      }
    } catch (err) {
      console.error('[Auth] checkAuthStatus failed:', err);
      setSession(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // ===== 邮箱 OTP 注册 =====
  
  const sendEmailSignUpCode = async (
    email: string,
    nickname?: string
  ): Promise<{ data?: any; error?: any }> => {
    try {
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

  const verifyEmailSignUpCode = async (token: string): Promise<{ data?: any; error?: any }> => {
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
      return { data };
    } catch (err: any) {
      return { error: { message: err?.message || '验证码错误' } };
    }
  };

  // ===== 邮箱 OTP 登录 =====
  
  const sendEmailLoginCode = async (email: string): Promise<{ data?: any; error?: any }> => {
    try {
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
      } else {
        await checkAuthStatus();
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
      const auth = getCloudbaseApp().auth({ persistence: 'local' });
      const params: any = { username, password };
      if (email) params.email = email;
      if (nickname) params.nickname = nickname;
      console.log('[Auth] signUpWithUsername params:', { username, password: '***', email, nickname });
      const { data, error } = await auth.signUp(params);
      console.log('[Auth] signUpWithUsername result - error:', error);
      if (error) return { error };
      await checkAuthStatus();
      return { data };
    } catch (err: any) {
      return { error: { message: err?.message || '注册失败' } };
    }
  };

  // ===== 用户名密码登录 =====
  
  const signInWithPassword = async (
    identifier: string,
    password: string
  ): Promise<{ data?: any; error?: any }> => {
    try {
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
      } else {
        console.warn('[Auth] password login returned no error but also no session');
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
      setUser(null);
      setSession(null);
      console.log('[Auth] signed out');
    } catch (err) {
      console.error('[Auth] signOut failed:', err);
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
