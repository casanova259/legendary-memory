import React from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Link } from '../../lib/router';
import { PublicLayout } from '../../components/layouts/PublicLayout';

export const NotFoundPage: React.FC = () => {
  return (
    <PublicLayout>
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-brand-yellow border-2 border-black rounded-3xl flex items-center justify-center text-2xl font-black shadow-hard-sm">
            404
          </div>
          <h2 className="text-2xl font-black text-brand-dark">Page Not Found</h2>
          <p className="text-xs text-gray-600">
            The page you are looking for does not exist or has been moved.
          </p>
          <div className="pt-2">
            <Link to="/">
              <Button variant="primary" className="w-full">
                Back to Public Matches
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </PublicLayout>
  );
};
