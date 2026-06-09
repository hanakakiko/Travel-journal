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

  // ===== 用户名密码登录 =====
  const login = useCallback(
    async (identifier: string, password: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await auth.signInWithPassword(identifier, password);
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

  // ===== 邮箱 OTP 注册：第一步发验证码 =====
  const sendEmailSignUpCode = useCallback(
    async (email: string, nickname?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await auth.sendEmailSignUpCode(email, nickname);
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

  // ===== 邮箱 OTP 注册：第二步验证码验证 =====
  const verifyEmailSignUpCode = useCallback(
    async (token: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await auth.verifyEmailSignUpCode(token);
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

  // ===== 用户名密码注册 =====
  const signUpWithUsername = useCallback(
    async (username: string, password: string, email?: string, nickname?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await auth.signUpWithUsername(username, password, email, nickname);
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

  // ===== 邮箱 OTP 登录：第一步发验证码 =====
  const sendEmailLoginCode = useCallback(
    async (email: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await auth.sendEmailLoginCode(email);
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

  // ===== 邮箱 OTP 登录：第二步验证码验证 =====
  const verifyEmailLoginCode = useCallback(
    async (token: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await auth.verifyEmailLoginCode(token);
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
    sendEmailSignUpCode,
    verifyEmailSignUpCode,
    signUpWithUsername,
    sendEmailLoginCode,
    verifyEmailLoginCode,
    logout,
    user: auth.user,
    session: auth.session,
  };
}
