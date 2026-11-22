import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { AdminLayout } from '../../components/layouts/AdminLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../../components/ui/Table';
import { useAuthUser } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { fetchAdminScorers, inviteScorer, toggleScorerStatus } from '../../lib/api/admin';
import { ScorerItem } from '../../types';

export const AdminScorersPage: React.FC = () => {
  const { getToken, user: currentAdmin } = useAuthUser();
  const { addToast } = useToast();

  const [scorers, setScorers] = useState<ScorerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Invite Modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Status Change Confirmation Modal
  const [targetScorer, setTargetScorer] = useState<ScorerItem | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const loadScorers = useCallback(async () => {
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
  }, [getToken]);

  useEffect(() => {
    loadScorers();
  }, [loadScorers]);

  // Filter scorers
  const filteredScorers = useMemo(() => {
    return scorers.filter((s) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !query ||
        String(s.id).includes(query) ||
        (s.displayName && s.displayName.toLowerCase().includes(query)) ||
        (s.email && s.email.toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && s.isActive) ||
        (statusFilter === 'inactive' && !s.isActive);

      return matchesQuery && matchesStatus;
    });
  }, [scorers, searchQuery, statusFilter]);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      setInviteError('Please provide a valid email address');
      return;
    }

    try {
      setIsInviting(true);
      setInviteError(null);

      await inviteScorer(getToken, { email: inviteEmail.trim() });
      addToast(`Scorer invitation sent to ${inviteEmail.trim()}`, 'success');
      setIsInviteOpen(false);
      setInviteEmail('');
      loadScorers();
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : 'Invitation failed');
    } finally {
      setIsInviting(false);
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!targetScorer) return;

    if (currentAdmin && currentAdmin.id === targetScorer.id) {
      setToggleError('Administrators cannot toggle their own account status');
      return;
    }

    try {
      setIsToggling(true);
      setToggleError(null);

      const nextStatus = !targetScorer.isActive;
      await toggleScorerStatus(getToken, targetScorer.id, nextStatus);

      addToast(
        `Scorer ${targetScorer.displayName || targetScorer.email} ${nextStatus ? 'activated' : 'deactivated'}`,
        nextStatus ? 'success' : 'info'
      );
      setTargetScorer(null);
      loadScorers();
    } catch (err: unknown) {
      setToggleError(err instanceof Error ? err.message : 'Status update failed');
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-black">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-brand-dark">Scorer Management</h1>
              <Badge variant="admin">ROSTER</Badge>
            </div>
            <p className="text-xs text-gray-600 font-medium">
              Manage official scorers, dispatch Clerk email invites, and control account activation status.
            </p>
          </div>

          <Button variant="primary" size="sm" onClick={() => setIsInviteOpen(true)}>
            + Invite Scorer
          </Button>
        </div>

        {/* Filter & Search Bar */}
        <Card className="p-4 bg-white space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Input
                placeholder="Search scorer by name, email, or #ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div>
              <Select
                label=""
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                options={[
                  { value: 'all', label: 'All Accounts' },
                  { value: 'active', label: 'Active Only' },
                  { value: 'inactive', label: 'Inactive / Suspended' },
                ]}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 font-medium pt-1">
            <span>
              Showing {filteredScorers.length} of {scorers.length} registered scorers
            </span>
            {(searchQuery || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="text-blue-600 hover:underline font-bold cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        </Card>

        {/* Scorers Table */}
        {isLoading && scorers.length === 0 ? (
          <div className="py-16 flex justify-center">
            <Spinner size="lg" label="Loading official scorer roster..." />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border-2 border-red-500 rounded-xl text-xs font-bold text-red-950 flex items-center justify-between">
            <span>Error: {error}</span>
            <Button variant="secondary" size="sm" onClick={loadScorers}>
              Retry
            </Button>
          </div>
        ) : filteredScorers.length === 0 ? (
          <EmptyState
            title="No scorers found"
            description="Invite scorers via email to grant scoring permissions."
            action={
              <Button variant="primary" size="sm" onClick={() => setIsInviteOpen(true)}>
                + Invite First Scorer
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>ID</TableHeaderCell>
                <TableHeaderCell>Scorer Name</TableHeaderCell>
                <TableHeaderCell>Email Address</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Active Assignments</TableHeaderCell>
                <TableHeaderCell>Member Since</TableHeaderCell>
                <TableHeaderCell className="text-right">Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredScorers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono font-bold text-gray-500">#{s.id}</TableCell>
                  <TableCell className="font-bold text-brand-dark">{s.displayName || 'Unnamed Scorer'}</TableCell>
                  <TableCell className="font-mono text-xs text-gray-700">{s.email || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={s.isActive ? 'scorer' : 'default'}>
                      {s.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono font-bold">
                    <span
                      className={`px-2 py-0.5 rounded text-xs border ${
                        (s.activeAssignmentsCount ?? 0) > 0
                          ? 'bg-blue-50 text-blue-700 border-blue-300'
                          : 'bg-gray-50 text-gray-500 border-gray-200'
                      }`}
                    >
                      {s.activeAssignmentsCount ?? 0} match{(s.activeAssignmentsCount ?? 0) === 1 ? '' : 'es'}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-gray-500">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant={s.isActive ? 'danger' : 'success'}
                      size="sm"
                      onClick={() => {
                        setTargetScorer(s);
                        setToggleError(null);
                      }}
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

      {/* Modal: Invite Scorer */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Invite Official Match Scorer"
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          {inviteError && (
            <div className="p-3 bg-red-50 border-2 border-red-500 rounded-xl text-xs font-bold text-red-900">
              {inviteError}
            </div>
          )}

          <p className="text-xs text-gray-600">
            The backend will issue a Clerk invitation email with the pre-assigned role <strong>scorer</strong>. The user can sign up and will immediately have scorer privileges.
          </p>

          <Input
            label="Scorer Email Address"
            type="email"
            placeholder="scorer@domain.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />

          <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsInviteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isInviting}
            >
              Dispatch Invitation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Activate / Deactivate Confirmation */}
      <Modal
        isOpen={!!targetScorer}
        onClose={() => setTargetScorer(null)}
        title={targetScorer?.isActive ? 'Deactivate Scorer Account' : 'Activate Scorer Account'}
      >
        <div className="space-y-4">
          {toggleError && (
            <div className="p-3 bg-red-50 border-2 border-red-500 rounded-xl text-xs font-bold text-red-900">
              {toggleError}
            </div>
          )}

          <div
            className={`p-3.5 border-2 rounded-xl text-xs space-y-1 ${
              targetScorer?.isActive
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : 'bg-emerald-50 border-emerald-300 text-emerald-950'
            }`}
          >
            <p className="font-bold">
              {targetScorer?.isActive ? '⚠️ Deactivation Warning' : '✅ Account Reactivation'}
            </p>
            <p>
              {targetScorer?.isActive
                ? 'Deactivating this scorer account immediately prevents them from logging in or performing any match scoring operations. Existing match assignments remain intact unless explicitly revoked or reassigned by an administrator.'
                : 'Activating this scorer account restores their ability to sign in and record scoring events on their assigned matches.'}
            </p>
          </div>

          <p className="text-xs font-bold text-gray-800">
            Target Scorer: {targetScorer?.displayName || targetScorer?.email} (User #{targetScorer?.id})
          </p>

          <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setTargetScorer(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={targetScorer?.isActive ? 'danger' : 'success'}
              size="sm"
              isLoading={isToggling}
              onClick={handleConfirmToggleStatus}
            >
              {targetScorer?.isActive ? 'Confirm Deactivation' : 'Confirm Activation'}
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
};
