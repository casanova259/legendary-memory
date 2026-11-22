import React from 'react';
import { useAuthUser } from '../../context/AuthContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Link } from '../../lib/router';
import { UserButton } from '@clerk/react';

interface AdminHeaderProps {
  onToggleSidebar: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ onToggleSidebar }) => {
  const { user, signOut } = useAuthUser();

  return (
    <header className="h-16 px-4 md:px-6 bg-white border-b-2 border-black flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 rounded-xl border-2 border-black bg-white hover:bg-gray-100 font-bold text-xs"
          title="Open Menu"
        >
          ☰
        </button>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-block text-xs font-bold text-gray-500 uppercase tracking-wider">
            Role:
          </span>
          <Badge variant="admin">ADMIN</Badge>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link to="/" className="hidden sm:inline-flex">
          <Button variant="ghost" size="sm">
            View Public Site ↗
          </Button>
        </Link>

        {user && (
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-bold text-gray-900 leading-tight">
              {user.displayName || user.email || 'Admin User'}
            </span>
            <span className="text-[10px] font-mono text-gray-500 truncate max-w-[160px]">
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
    </header>
  );
};
