import React, { ReactNode } from 'react';
import { ScorerHeader } from '../navigation/ScorerHeader';
import { RoleGuard } from '../navigation/RoleGuard';

export interface ScorerLayoutProps {
  children: ReactNode;
}

export const ScorerLayout: React.FC<ScorerLayoutProps> = ({ children }) => {
  return (
    <RoleGuard allowedRoles={['scorer', 'admin']}>
      <div className="min-h-screen flex flex-col bg-emerald-50/30 font-sans">
        <ScorerHeader />
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </RoleGuard>
  );
};
