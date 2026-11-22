import React from 'react';
import { Link, useLocation } from '../../lib/router';
import { cn } from '../../lib/utils/cn';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose }) => {
  const { pathname } = useLocation();

  const navItems = [
    { label: 'Overview', to: '/admin', exact: true, icon: '📊' },
    { label: 'Matches', to: '/admin/matches', icon: '🏏' },
    { label: 'Scorers', to: '/admin/scorers', icon: '👥' },
    { label: 'Assignments', to: '/admin/assignments', icon: '📋' },
    { label: 'Audit Logs', to: '/admin/audit-logs', icon: '📜' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed md:static inset-y-0 left-0 z-40 w-64 bg-white border-r-2 border-black flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div>
          {/* Logo Header */}
          <div className="p-5 border-b-2 border-black bg-brand-yellow flex items-center justify-between">
            <Link to="/admin" className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <div>
                <h2 className="text-lg font-black tracking-tight text-brand-dark leading-none">
                  LivSportz
                </h2>
                <span className="text-[10px] font-black uppercase tracking-widest text-red-700">
                  Admin Console
                </span>
              </div>
            </Link>
            <button
              onClick={onClose}
              className="md:hidden w-7 h-7 flex items-center justify-center border-2 border-black rounded-lg text-xs font-bold"
            >
              ✕
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1.5">
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.to
                : pathname.startsWith(item.to);

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer',
                    isActive
                      ? 'bg-brand-yellow text-brand-dark border-black shadow-hard-sm font-black'
                      : 'border-transparent text-gray-700 hover:border-black hover:bg-gray-100'
                  )}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Switcher */}
        <div className="p-4 border-t-2 border-black bg-gray-50 space-y-2">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-bold border-2 border-black bg-white hover:bg-gray-100 shadow-hard-sm transition-all"
          >
            <span>🏟️</span>
            <span>Switch to Public App</span>
          </Link>
        </div>
      </aside>
    </>
  );
};
