import React, { ReactNode } from 'react';
import { useAuthUser } from '../../context/AuthContext';
import { AuthBar } from '../AuthBar';
import { StatusIndicator } from '../StatusIndicator';
import { ConnectionStatus } from '../../types';

export interface PublicLayoutProps {
  children: ReactNode;
  connectionStatus?: ConnectionStatus;
  wsError?: string | null;
  onToggleAdmin?: () => void;
  onToggleScorer?: () => void;
  isAdminOpen?: boolean;
  isScorerOpen?: boolean;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({
  children,
  connectionStatus = 'connected',
  wsError = null,
  onToggleAdmin,
  onToggleScorer,
  isAdminOpen = false,
  isScorerOpen = false,
}) => {
  const { user, role, isLoadingProfile } = useAuthUser();

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans bg-[#FAFAFA]">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-brand-yellow border-2 border-black rounded-2xl p-6 shadow-hard">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-brand-dark mb-1">
              LivSportz
            </h1>
            <p className="text-sm font-medium opacity-80">
              Live Sports with Clerk RBAC (Viewer, Scorer, Admin)
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <AuthBar
              appUser={user}
              isLoadingUser={isLoadingProfile}
              activeRole={role}
              onToggleAdmin={onToggleAdmin}
              onToggleScorer={onToggleScorer}
              isAdminOpen={isAdminOpen}
              isScorerOpen={isScorerOpen}
            />

            <div className="flex flex-col items-end gap-1 pl-3 md:border-l-2 md:border-black">
              <StatusIndicator status={connectionStatus} />
              {wsError && (
                <span className="text-[11px] font-mono bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded">
                  WS: {wsError}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        {children}
      </div>
    </div>
  );
};
