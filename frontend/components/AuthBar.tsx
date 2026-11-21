import React from 'react';
import {
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
} from '@clerk/react';
import { AppUser, UserRole } from '../types';

interface AuthBarProps {
  appUser: AppUser | null;
  isLoadingUser: boolean;
  activeRole: UserRole | null;
  onToggleAdmin: () => void;
  onToggleScorer: () => void;
  isAdminOpen: boolean;
  isScorerOpen: boolean;
}

export const AuthBar: React.FC<AuthBarProps> = ({
  appUser,
  isLoadingUser,
  activeRole,
  onToggleAdmin,
  onToggleScorer,
  isAdminOpen,
  isScorerOpen,
}) => {
  const { isLoaded, isSignedIn } = useAuth();

  const roleColors: Record<UserRole, string> = {
    admin: 'bg-red-500 text-white border-black',
    scorer: 'bg-emerald-500 text-white border-black',
    viewer: 'bg-gray-200 text-gray-800 border-gray-400',
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border-2 border-black">
        <span className="text-xs font-mono font-bold text-gray-700 animate-pulse">Loading auth...</span>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex items-center gap-2">
        <SignInButton mode="modal">
          <button className="px-4 py-2 rounded-xl text-xs font-black border-2 border-black bg-white hover:bg-gray-100 transition-all shadow-hard-sm cursor-pointer active:translate-y-0.5">
            Sign In
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="px-4 py-2 rounded-xl text-xs font-black border-2 border-black bg-black text-white hover:bg-gray-800 transition-all shadow-hard-sm cursor-pointer active:translate-y-0.5">
            Sign Up
          </button>
        </SignUpButton>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {isLoadingUser ? (
        <span className="text-xs font-mono text-gray-600 animate-pulse">Syncing role...</span>
      ) : (
        <div className="flex items-center gap-2">
          {activeRole && (
            <span
              className={`text-[11px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full border-2 ${
                roleColors[activeRole] || roleColors.viewer
              }`}
            >
              {activeRole}
            </span>
          )}
        </div>
      )}

      {/* Scorer Controls Toggle (Admins or Scorers) */}
      {(activeRole === 'admin' || activeRole === 'scorer') && (
        <button
          onClick={onToggleScorer}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 border-black transition-all shadow-hard-sm cursor-pointer ${
            isScorerOpen ? 'bg-emerald-400 text-black' : 'bg-white hover:bg-emerald-50'
          }`}
        >
          {isScorerOpen ? '✕ Close Scorer' : '⚡ Scorer Desk'}
        </button>
      )}

      {/* Admin Console Toggle */}
      {activeRole === 'admin' && (
        <button
          onClick={onToggleAdmin}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 border-black transition-all shadow-hard-sm cursor-pointer ${
            isAdminOpen ? 'bg-brand-blue text-white' : 'bg-white hover:bg-blue-50'
          }`}
        >
          {isAdminOpen ? '✕ Close Admin' : '🛠️ Admin Panel'}
        </button>
      )}

      {/* User Account Menu */}
      <div className="flex items-center gap-2 pl-2 border-l-2 border-black">
        <UserButton showName />
      </div>
    </div>
  );
};
