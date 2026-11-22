import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { useAuth, useUser, useClerk } from '@clerk/react';
import { AppUser, UserRole } from '../types';
import { fetchCurrentUser } from '../lib/api/auth';
import { ApiError } from '../lib/api/client';

export interface AuthContextValue {
  user: AppUser | null;
  role: UserRole | null;
  isActive: boolean;
  isAuthLoaded: boolean;
  isLoadingProfile: boolean;
  isSignedIn: boolean;
  clerkUser: ReturnType<typeof useUser>['user'];
  error: string | null;
  getToken: () => Promise<string | null>;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isLoaded: isClerkLoaded, isSignedIn: isClerkSignedIn, getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const { signOut: clerkSignOut } = useClerk();

  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadUserProfile = useCallback(async () => {
    if (!isClerkSignedIn) {
      setUser(null);
      setError(null);
      return;
    }

    try {
      setIsLoadingProfile(true);
      setError(null);

      const token = await getToken();
      if (!token) {
        setUser(null);
        return;
      }

      const response = await fetchCurrentUser(token);
      setUser(response.data);
    } catch (err: unknown) {
      console.error('AuthContext: Failed to load user profile from backend:', err);
      if (err instanceof ApiError) {
        if (err.status === 403 && typeof err.data === 'object' && err.data !== null && 'error' in err.data) {
          setError('Account inactive: Your account has been deactivated. Please contact an administrator.');
          // Retain basic user representation with isActive: false if possible
          setUser((prev) =>
            prev ? { ...prev, isActive: false } : null
          );
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to synchronize user profile.');
      }
    } finally {
      setIsLoadingProfile(false);
    }
  }, [isClerkSignedIn, getToken]);

  useEffect(() => {
    if (isClerkLoaded) {
      loadUserProfile();
    }
  }, [isClerkLoaded, isClerkSignedIn, loadUserProfile]);

  const signOut = useCallback(async () => {
    setUser(null);
    setError(null);
    await clerkSignOut();
  }, [clerkSignOut]);

  const value = useMemo<AuthContextValue>(() => {
    const role = user?.role || (isClerkSignedIn ? 'viewer' : null);
    const isActive = user ? user.isActive : true;

    return {
      user,
      role,
      isActive,
      isAuthLoaded: isClerkLoaded,
      isLoadingProfile,
      isSignedIn: !!isClerkSignedIn,
      clerkUser,
      error,
      getToken,
      refreshUser: loadUserProfile,
      signOut,
    };
  }, [
    user,
    isClerkLoaded,
    isLoadingProfile,
    isClerkSignedIn,
    clerkUser,
    error,
    getToken,
    loadUserProfile,
    signOut,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthUser = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthUser must be used within an AuthProvider');
  }
  return context;
};
