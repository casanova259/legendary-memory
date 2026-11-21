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
    <div className="flex flex-wrap items-center gap-2 md:gap-3">
      {/* Clickable Role Badge */}
      {isLoadingUser ? (
        <span className="text-xs font-mono text-gray-600 animate-pulse">Syncing role...</span>
      ) : (
        <button
          onClick={onToggleAdmin}
          title="Click to open Admin & Role panel"
          className="flex items-center gap-1.5 cursor-pointer hover:opacity-90 active:translate-y-0.5 transition-all"
        >
          {activeRole && (
            <span
              className={`text-[11px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full border-2 shadow-hard-sm ${
                roleColors[activeRole] || roleColors.viewer
              }`}
            >
              {activeRole} ⚙️
            </span>
          )}
        </button>
      )}

      {/* Scorer Controls Toggle (Admins and Scorers) */}
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

      {/* Admin Console Toggle (Always visible when signed in) */}
      <button
        onClick={onToggleAdmin}
        className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 border-black transition-all shadow-hard-sm cursor-pointer ${
          isAdminOpen
            ? 'bg-brand-blue text-white'
            : activeRole === 'admin'
            ? 'bg-white hover:bg-blue-50 text-brand-dark'
            : 'bg-white hover:bg-yellow-100 text-brand-dark border-dashed'
        }`}
      >
        {isAdminOpen
          ? '✕ Close Admin'
          : activeRole === 'admin'
          ? '🛠️ Admin Console'
          : '🛠️ Admin / Setup'}
      </button>

      {/* User profile & email */}
      <div className="flex items-center gap-2 bg-white/60 border border-black/20 rounded-xl px-2.5 py-1">
        {appUser?.email && (
          <span className="text-xs font-medium text-gray-700 hidden sm:inline max-w-[160px] truncate">
            {appUser.email}
          </span>
        )}
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'w-7 h-7 border-2 border-black',
            },
          }}
        />
      </div>
    </div>
  );
};
