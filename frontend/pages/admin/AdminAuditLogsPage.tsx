import React from 'react';
import { AdminLayout } from '../../components/layouts/AdminLayout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export const AdminAuditLogsPage: React.FC = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-black">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-brand-dark">Audit Logs</h1>
              <Badge variant="admin">Route Foundation</Badge>
            </div>
            <p className="text-xs text-gray-600 font-medium">
              Chronological audit log tracking administrative interventions, scoring corrections, and status overrides.
            </p>
          </div>
        </div>

        <Card className="p-6 text-center space-y-3">
          <div className="w-12 h-12 mx-auto bg-brand-yellow border-2 border-black rounded-2xl flex items-center justify-center text-xl font-black shadow-hard-sm">
            📜
          </div>
          <h3 className="text-base font-black text-brand-dark">Audit History Pipeline Active</h3>
          <p className="text-xs text-gray-600 max-w-md mx-auto">
            All administrative scoring reversals and emergency status overrides are logged immutably in the PostgreSQL <code>audit_logs</code> table.
            Phase 2 will render searchable, filterable timeline views for match events.
          </p>
        </Card>
      </div>
    </AdminLayout>
  );
};
