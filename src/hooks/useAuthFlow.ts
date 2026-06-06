import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface UseAuthFlowOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function useAuthFlow(options?: UseAuthFlowOptions) {
  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(
    async (username: string, password: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await auth.signInWithPassword(username, password);
        if (result.error) {
          const errorMsg = result.error.message || '登录失败';
          setError(errorMsg);
          options?.onError?.(errorMsg);
          return false;
        }
        options?.onSuccess?.();
        return true;
      } catch (err: any) {
        const errorMsg = err?.message || '登录失败，请稍后重试';
        setError(errorMsg);
        options?.onError?.(errorMsg);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [auth, options]
  );

  // 第一步：发送注册验证码
  const sendSignUpCode = useCallback(
    async (email: string, password: string, nickname?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await auth.sendSignUpCode(email, password, nickname);
        if (result.error) {
          const errorMsg = result.error.message || '发送验证码失败';
          setError(errorMsg);
          options?.onError?.(errorMsg);
          return false;
        }
        return true;
      } catch (err: any) {
        const errorMsg = err?.message || '发送验证码失败，请稍后重试';
        setError(errorMsg);
        options?.onError?.(errorMsg);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [auth, options]
  );

  // 第二步：验证码验证，完成注册
  const verifyAndSignup = useCallback(
    async (token: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await auth.verifySignUpCode(token);
        if (result.error) {
          const errorMsg = result.error.message || '验证失败';
          setError(errorMsg);
          options?.onError?.(errorMsg);
          return false;
        }
        options?.onSuccess?.();
        return true;
      } catch (err: any) {
        const errorMsg = err?.message || '验证失败，请稍后重试';
        setError(errorMsg);
        options?.onError?.(errorMsg);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [auth, options]
  );

  const logout = useCallback(async () => {
    try {
      await auth.signOut();
      options?.onSuccess?.();
    } catch (err: any) {
      const errorMsg = err?.message || '登出失败';
      setError(errorMsg);
      options?.onError?.(errorMsg);
    }
  }, [auth, options]);

  return {
    isLoading,
    error,
    setError,
    login,
    sendSignUpCode,
    verifyAndSignup,
    logout,
    user: auth.user,
    session: auth.session,
  };
}
