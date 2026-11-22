import React from 'react';
import { AdminLayout } from '../../components/layouts/AdminLayout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const AdminAssignmentsPage: React.FC = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-black">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-brand-dark">Match Assignments</h1>
              <Badge variant="admin">Route Foundation</Badge>
            </div>
            <p className="text-xs text-gray-600 font-medium">
              Assign and reassign scorers to matches. Backend guarantees strictly one active scorer per match.
            </p>
          </div>
          <Button variant="primary" size="sm">
            + Assign Scorer
          </Button>
        </div>

        <Card className="p-6 text-center space-y-3">
          <div className="w-12 h-12 mx-auto bg-brand-yellow border-2 border-black rounded-2xl flex items-center justify-center text-xl font-black shadow-hard-sm">
            📋
          </div>
          <h3 className="text-base font-black text-brand-dark">Assignment Management Ready</h3>
          <p className="text-xs text-gray-600 max-w-md mx-auto">
            The backend assignment engine enforces atomic assignments and reassignments with PostgreSQL partial unique indexing.
            Phase 2 will provide interactive dropdown assignment controls and shift handovers.
          </p>
        </Card>
      </div>
    </AdminLayout>
  );
};
