import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import cloudbase from '@cloudbase/js-sdk';

// 环境变量 - 根据你的实际环境修改
const ENV_ID = 'my-travel-journal-d5d06m1a517f14';
const REGION = 'ap-shanghai';

// 注意：需要在 CloudBase 控制台获取 publishable key
// 临时用空值，实际使用时请替换
const ACCESS_KEY = '';

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
  // 第一步：发送验证码（同时提交 email + password + nickname）
  sendSignUpCode: (
    email: string,
    password: string,
    nickname?: string
  ) => Promise<{ data?: any; error?: any }>;
  // 第二步：验证码验证完成注册
  verifySignUpCode: (
    token: string
  ) => Promise<{ data?: any; error?: any }>;
  signInWithPassword: (
    username: string,
    password: string
  ) => Promise<{ data?: any; error?: any }>;
  signOut: () => Promise<void>;
  getSession: () => Promise<{ data?: any; error?: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 初始化 CloudBase App
let app: ReturnType<typeof cloudbase.init> | null = null;

function getCloudbaseApp() {
  if (!app) {
    app = cloudbase.init({
      env: ENV_ID,
      region: REGION,
      accessKey: ACCESS_KEY,
      auth: { detectSessionInUrl: true },
    });
  }
  return app;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // 保存 signUp 返回的 verifyOtp 函数，用 ref 避免重渲染导致引用失效
  const verifyOtpRef = useRef<((params: { token: string }) => Promise<any>) | null>(null);

  // 初始化时检查登录状态
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const app = getCloudbaseApp();
      const auth = app.auth({ persistence: 'local' });
      
      const { data } = await auth.getSession();
      
      if (data?.session) {
        setSession(data.session);
        setUser(data.session.user);
      } else {
        setSession(null);
        setUser(null);
      }
    } catch (error) {
      console.error('检查认证状态失败:', error);
      setSession(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 第一步：发送邮箱注册验证码
   * 根据 CloudBase 文档，signUp 时一次性传入 email + password + nickname，
   * 并将返回的 verifyOtp 函数保存到 ref 中供第二步使用。
   */
  const sendSignUpCode = async (
    email: string,
    password: string,
    nickname?: string
  ): Promise<{ data?: any; error?: any }> => {
    try {
      const app = getCloudbaseApp();
      const auth = app.auth({ persistence: 'local' });

      const signUpParams: any = { email, password };
      if (nickname) signUpParams.nickname = nickname;

      const { data, error } = await auth.signUp(signUpParams);

      if (error) {
        return { error };
      }

      // 保存 verifyOtp 函数，供第二步调用
      verifyOtpRef.current = data?.verifyOtp ?? null;

      return { data };
    } catch (error: any) {
      return {
        error: {
          message: error?.message || '发送验证码失败，请稍后重试'
        }
      };
    }
  };

  /**
   * 第二步：验证邮箱验证码，完成注册
   * 根据 CloudBase 文档，verifyOtp 只接受 { token }
   */
  const verifySignUpCode = async (
    token: string
  ): Promise<{ data?: any; error?: any }> => {
    if (!verifyOtpRef.current) {
      return {
        error: {
          message: '验证码已过期，请重新发送'
        }
      };
    }

    try {
      const { data, error } = await verifyOtpRef.current({ token });

      if (error) {
        return { error };
      }

      // 验证成功，清除 ref
      verifyOtpRef.current = null;

      // 更新用户状态
      await checkAuthStatus();
      return { data };
    } catch (error: any) {
      return {
        error: {
          message: error?.message || '验证码错误，请重新输入'
        }
      };
    }
  };

  // 账号密码登录
  const signInWithPassword = async (
    username: string,
    password: string
  ): Promise<{ data?: any; error?: any }> => {
    try {
      const app = getCloudbaseApp();
      const auth = app.auth({ persistence: 'local' });

      const { data, error } = await auth.signInWithPassword({
        username,
        password,
      });

      if (error) {
        // 登录失败时，先检查用户是否存在
        try {
          const isRegistered = await auth.isUsernameRegistered(username);
          
          if (!isRegistered) {
            return { 
              error: {
                message: '该用户名不存在',
                code: 'USERNAME_NOT_FOUND'
              }
            };
          } else {
            return { 
              error: {
                message: '密码错误，请重试',
                code: 'INVALID_PASSWORD'
              }
            };
          }
        } catch (checkError) {
          return { error };
        }
      }

      // 更新用户状态
      if (data?.session) {
        setSession(data.session);
        setUser(data.session.user);
      }

      return { data };
    } catch (error: any) {
      return { 
        error: {
          message: error?.message || '登录失败，请稍后重试'
        }
      };
    }
  };

  // 登出
  const signOut = async () => {
    try {
      const app = getCloudbaseApp();
      const auth = app.auth({ persistence: 'local' });
      await auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('登出失败:', error);
      throw error;
    }
  };

  // 获取当前会话
  const getSession = async (): Promise<{ data?: any; error?: any }> => {
    try {
      const app = getCloudbaseApp();
      const auth = app.auth({ persistence: 'local' });
      const result = await auth.getSession();
      return result;
    } catch (error: any) {
      return {
        error: {
          message: error?.message || '获取会话失败'
        }
      };
    }
  };

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    sendSignUpCode,
    verifySignUpCode,
    signInWithPassword,
    signOut,
    getSession,
  };

  return (
    <AuthContext.Provider value={value}>
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
