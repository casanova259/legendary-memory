import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layouts/AdminLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../../components/ui/Table';
import { useAuthUser } from '../../context/AuthContext';
import { fetchAdminScorers, toggleScorerStatus } from '../../lib/api/admin';
import { ScorerItem } from '../../types';

export const AdminScorersPage: React.FC = () => {
  const { getToken } = useAuthUser();
  const [scorers, setScorers] = useState<ScorerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadScorers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetchAdminScorers(getToken);
      setScorers(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch scorers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadScorers();
  }, [getToken]);

  const handleToggleStatus = async (scorer: ScorerItem) => {
    try {
      await toggleScorerStatus(getToken, scorer.id, !scorer.isActive);
      await loadScorers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-black">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-brand-dark">Scorer Management</h1>
              <Badge variant="admin">Route Foundation</Badge>
            </div>
            <p className="text-xs text-gray-600 font-medium">
              Manage official scorers, invite new scorers through Clerk, and control account activation.
            </p>
          </div>
          <Button variant="primary" size="sm">
            + Invite Scorer
          </Button>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Spinner size="md" label="Loading scorers from backend..." />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border-2 border-red-500 rounded-xl text-xs font-bold text-red-950">
            {error}
          </div>
        ) : scorers.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-sm font-bold text-gray-700">No scorers registered yet.</p>
          </Card>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>ID</TableHeaderCell>
                <TableHeaderCell>Display Name</TableHeaderCell>
                <TableHeaderCell>Email</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Active Matches</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {scorers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono font-bold text-gray-500">#{s.id}</TableCell>
                  <TableCell className="font-bold">{s.displayName || 'Unnamed'}</TableCell>
                  <TableCell className="font-mono text-xs">{s.email || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={s.isActive ? 'scorer' : 'default'}>
                      {s.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono font-bold">
                    {s.activeAssignmentsCount ?? 0}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant={s.isActive ? 'danger' : 'success'}
                      size="sm"
                      onClick={() => handleToggleStatus(s)}
                    >
                      {s.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </AdminLayout>
  );
};
