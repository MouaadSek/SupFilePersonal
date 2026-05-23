import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@/types';
import {
  apiLogin,
  apiRegister,
  apiMe,
  apiGoogleAuth,
  apiForgotPassword,
  type AuthResponse,
} from '@/services/api/auth';
import { apiUpdateProfile, apiChangePassword, apiUploadAvatar } from '@/services/api/users';
import { mapApiUser } from '@/services/api/mappers';
import {
  loadStoredToken,
  persistToken,
  setAuthToken,
  ApiError,
} from '@/services/api/client';

const REMEMBER_ME_KEY = 'supfile_remember_me';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  loginWithGoogle: (idToken: string, rememberMe?: boolean) => Promise<void>;
  loginWithOAuthToken: (token: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, password: string, name: string, rememberMe?: boolean) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ message: string; dev_reset_token?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ ok: boolean; message?: string }>;
  /** Reload profile (quota, avatar, etc.) from `GET /auth/me`. */
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function storeSession(token: string, rememberMe: boolean) {
  setAuthToken(token);
  if (rememberMe) {
    await persistToken(token);
    await AsyncStorage.setItem(REMEMBER_ME_KEY, '1');
  } else {
    await persistToken(null);
    await AsyncStorage.removeItem(REMEMBER_ME_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const refreshUser = useCallback(async () => {
    const apiUser = await apiMe();
    setUser(mapApiUser(apiUser));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await loadStoredToken();
        if (cancelled) return;
        if (token) {
          setAuthToken(token);
          await refreshUser();
        }
      } catch {
        await persistToken(null);
        setAuthToken(null);
        setUser(null);
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  const completeAuth = useCallback(
    async (auth: Pick<AuthResponse, 'token' | 'user'>, rememberMe: boolean) => {
      await storeSession(auth.token, rememberMe);
      setUser(mapApiUser(auth.user));
      try {
        await refreshUser();
      } catch {
        /* garde l’utilisateur renvoyé par login/register si /auth/me échoue */
      }
    },
    [refreshUser],
  );

  const login = async (email: string, password: string, rememberMe = true) => {
    setIsLoading(true);
    try {
      const auth = await apiLogin(email, password);
      await completeAuth(auth, rememberMe);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (idToken: string, rememberMe = true) => {
    setIsLoading(true);
    try {
      const auth = await apiGoogleAuth(idToken);
      await completeAuth(auth, rememberMe);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithOAuthToken = async (token: string, rememberMe = true) => {
    setIsLoading(true);
    try {
      await storeSession(token, rememberMe);
      await refreshUser();
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string, rememberMe = true) => {
    setIsLoading(true);
    try {
      const auth = await apiRegister(email, password, name);
      await completeAuth(auth, rememberMe);
    } finally {
      setIsLoading(false);
    }
  };

  const requestPasswordReset = async (email: string) => {
    return apiForgotPassword(email);
  };

  const logout = async () => {
    setUser(null);
    setAuthToken(null);
    await persistToken(null);
    await AsyncStorage.removeItem(REMEMBER_ME_KEY);
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) return;
    setIsLoading(true);
    try {
      let apiUser;
      if (data.avatar && (data.avatar.startsWith('file:') || data.avatar.startsWith('content:'))) {
        apiUser = await apiUploadAvatar(data.avatar);
      }
      if (data.name !== undefined || data.email !== undefined) {
        apiUser = await apiUpdateProfile({
          ...(data.name !== undefined ? { display_name: data.name } : {}),
          ...(data.email !== undefined ? { email: data.email } : {}),
        });
      }
      if (apiUser) {
        setUser(mapApiUser(apiUser));
      } else {
        setUser({ ...user, ...data });
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Mise à jour impossible';
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string,
  ): Promise<{ ok: boolean; message?: string }> => {
    try {
      await apiChangePassword(currentPassword, newPassword);
      return { ok: true };
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Échec du changement de mot de passe.';
      return { ok: false, message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isInitializing,
        login,
        loginWithGoogle,
        loginWithOAuthToken,
        register,
        requestPasswordReset,
        logout,
        updateProfile,
        changePassword,
        refreshSession: refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
