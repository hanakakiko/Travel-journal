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
  signUpWithEmail: (
    email: string,
    verificationCode?: string,
    password?: string,
    nickname?: string
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
  const verifyOtpFunctionRef = useRef<any>(null);

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

  // 邮箱验证码注册
  const signUpWithEmail = async (
    email: string,
    verificationCode?: string,
    password?: string,
    nickname?: string
  ): Promise<{ data?: any; error?: any }> => {
    try {
      const app = getCloudbaseApp();
      const auth = app.auth({ persistence: 'local' });

      // 如果没有提供验证码，则发送验证码
      if (!verificationCode) {
        const { data, error } = await auth.signUp({ email });
        
        if (error) {
          return { error };
        }

        // 保存 verifyOtp 函数供后续使用
        verifyOtpFunctionRef.current = data?.verifyOtp;

        return { 
          data: {
            verifyOtp: data?.verifyOtp,
            email,
          }
        };
      }

      // 如果提供了验证码，则使用保存的 verifyOtp 函数进行验证
      if (!verifyOtpFunctionRef.current) {
        return { 
          error: {
            message: '验证码已过期，请重新发送'
          }
        };
      }

      try {
        // 使用保存的 verifyOtp 函数验证码，这会完成注册
        const verifyResult = await verifyOtpFunctionRef.current({ 
          token: verificationCode,
          password,
          name: nickname || undefined
        });
        
        if (verifyResult?.error) {
          return { error: verifyResult.error };
        }

        // 清除保存的 verifyOtp 函数
        verifyOtpFunctionRef.current = null;

        // 更新用户状态
        await checkAuthStatus();
        return { data: verifyResult?.data };
      } catch (verifyError: any) {
        return {
          error: {
            message: verifyError?.message || '验证码验证失败'
          }
        };
      }
    } catch (error: any) {
      return { 
        error: {
          message: error?.message || '注册失败，请稍后重试'
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
            // 用户不存在
            return { 
              error: {
                message: '该用户名不存在',
                code: 'USERNAME_NOT_FOUND'
              }
            };
          } else {
            // 用户存在，但密码错误
            return { 
              error: {
                message: '密码错误，请重试',
                code: 'INVALID_PASSWORD'
              }
            };
          }
        } catch (checkError) {
          // 如果检查失败，返回原始错误
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
    signUpWithEmail,
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
