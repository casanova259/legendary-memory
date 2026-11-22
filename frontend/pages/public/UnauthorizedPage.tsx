import React from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Link } from '../../lib/router';
import { PublicLayout } from '../../components/layouts/PublicLayout';
import { useAuthUser } from '../../context/AuthContext';

export const UnauthorizedPage: React.FC = () => {
  const { role, signOut } = useAuthUser();

  return (
    <PublicLayout>
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 mx-auto bg-red-100 border-2 border-red-500 rounded-3xl flex items-center justify-center text-2xl font-black shadow-hard-sm text-red-600">
            🚫
          </div>
          <h2 className="text-2xl font-black text-brand-dark">Access Denied</h2>
          <p className="text-xs text-gray-600">
            You do not have the required permissions for this area. Your current role is{' '}
            <span className="font-bold uppercase text-red-600">{role || 'viewer'}</span>.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link to="/">
              <Button variant="primary" className="w-full">
                Return to Live Matches
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              Switch Account
            </Button>
          </div>
        </Card>
      </div>
    </PublicLayout>
  );
};
