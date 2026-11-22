import React from 'react';
import { useAuthUser } from '../../context/AuthContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Link, useLocation } from '../../lib/router';
import { UserButton } from '@clerk/react';
import { cn } from '../../lib/utils/cn';

export const ScorerHeader: React.FC = () => {
  const { user, signOut } = useAuthUser();
  const { pathname } = useLocation();

  const navItems = [
    { label: 'My Dashboard', to: '/scorer', exact: true, icon: '📊' },
    { label: 'My Matches', to: '/scorer/matches', icon: '🏏' },
  ];

  return (
    <header className="bg-white border-b-2 border-black sticky top-0 z-30 shadow-hard-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand & Badge */}
        <div className="flex items-center gap-4">
          <Link to="/scorer" className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight text-brand-dark leading-none">
                LivSportz
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                Scorer Workspace
              </span>
            </div>
          </Link>
          <Badge variant="scorer" className="hidden sm:inline-flex">SCORER</Badge>
        </div>

        {/* Central Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.to
              : pathname.startsWith(item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all flex items-center gap-1.5',
                  isActive
                    ? 'bg-emerald-400 text-black border-black shadow-hard-sm font-black'
                    : 'border-transparent text-gray-700 hover:border-black hover:bg-gray-100'
                )}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User & Actions */}
        <div className="flex items-center gap-3">
          <Link to="/" className="hidden md:inline-flex">
            <Button variant="ghost" size="sm">
              Public App ↗
            </Button>
          </Link>

          {user && (
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-xs font-bold text-gray-900 leading-tight">
                {user.displayName || user.email || 'Scorer'}
              </span>
              <span className="text-[10px] font-mono text-gray-500 truncate max-w-[140px]">
                {user.email}
              </span>
            </div>
          )}

          <UserButton />

          <Button
            variant="secondary"
            size="sm"
            onClick={() => signOut()}
            className="hidden sm:inline-flex text-xs"
          >
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
};
