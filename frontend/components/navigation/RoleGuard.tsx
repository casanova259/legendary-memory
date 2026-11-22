import React, { ReactNode } from 'react';
import { useAuthUser } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { SignInButton } from '@clerk/react';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { Card } from '../ui/Card';
import { Link } from '../../lib/router';

export interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  fallbackUrl?: string;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles,
  fallbackUrl = '/',
}) => {
  const { isAuthLoaded, isLoadingProfile, isSignedIn, role, isActive, user, signOut } = useAuthUser();

  // 1. Loading State while Clerk or backend profile is loading
  if (!isAuthLoaded || (isSignedIn && isLoadingProfile && !user)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
        <Spinner size="lg" label="Verifying authorization and role permissions..." />
      </div>
    );
  }

  // 2. Unauthenticated State
  if (!isSignedIn) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 mx-auto bg-brand-yellow border-2 border-black rounded-2xl flex items-center justify-center text-xl font-black shadow-hard-sm">
            🔒
          </div>
          <h2 className="text-xl font-black text-brand-dark">Sign In Required</h2>
          <p className="text-xs text-gray-600">
            This area requires an authenticated account with permitted role access.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <SignInButton mode="modal">
              <Button variant="primary" className="w-full">
                Sign In to Continue
              </Button>
            </SignInButton>
            <Link to="/">
              <Button variant="ghost" size="sm" className="w-full">
                Back to Home
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // 3. Inactive Account State
  if (user && !isActive) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center space-y-4 bg-red-50 border-red-500">
          <div className="w-12 h-12 mx-auto bg-red-200 border-2 border-red-600 rounded-2xl flex items-center justify-center text-xl font-black shadow-hard-sm">
            ⚠️
          </div>
          <h2 className="text-xl font-black text-red-950">Account Deactivated</h2>
          <p className="text-xs text-red-800">
            Your account has been marked inactive by an administrator. Please contact your organization's support desk.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Button variant="danger" size="sm" onClick={() => signOut()}>
              Sign Out
            </Button>
            <Link to="/">
              <Button variant="ghost" size="sm">
                Back to Home
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // 4. Role Authorization Check
  const effectiveRole = role || 'viewer';
  const hasAccess = allowedRoles.includes(effectiveRole);

  if (!hasAccess) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 mx-auto bg-amber-200 border-2 border-black rounded-2xl flex items-center justify-center text-xl font-black shadow-hard-sm">
            🚫
          </div>
          <h2 className="text-xl font-black text-brand-dark">Access Denied</h2>
          <p className="text-xs text-gray-600">
            Your current role (<span className="font-bold uppercase">{effectiveRole}</span>) does not have access to this section.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            {effectiveRole === 'scorer' && (
              <Link to="/scorer">
                <Button variant="success" size="sm" className="w-full">
                  Go to Scorer Workspace
                </Button>
              </Link>
            )}
            {effectiveRole === 'admin' && (
              <Link to="/admin">
                <Button variant="primary" size="sm" className="w-full">
                  Go to Admin Panel
                </Button>
              </Link>
            )}
            <Link to={fallbackUrl}>
              <Button variant="secondary" size="sm" className="w-full">
                Return to Public App
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
