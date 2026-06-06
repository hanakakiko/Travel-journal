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

  const signup = useCallback(
    async (email: string, password: string, nickname?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await auth.signUpWithEmail(email, '', password, nickname);
        if (result.error) {
          const errorMsg = result.error.message || '注册失败';
          setError(errorMsg);
          options?.onError?.(errorMsg);
          return false;
        }
        options?.onSuccess?.();
        return true;
      } catch (err: any) {
        const errorMsg = err?.message || '注册失败，请稍后重试';
        setError(errorMsg);
        options?.onError?.(errorMsg);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [auth, options]
  );

  const verifyAndSignup = useCallback(
    async (
      email: string,
      verificationCode: string,
      password: string,
      nickname?: string
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await auth.signUpWithEmail(
          email,
          verificationCode,
          password,
          nickname
        );
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
    signup,
    verifyAndSignup,
    logout,
    user: auth.user,
    session: auth.session,
  };
}
