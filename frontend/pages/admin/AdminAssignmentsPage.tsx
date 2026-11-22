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
import { Link } from '../../lib/router';
import { useAuthUser } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import {
  fetchAdminMatches,
  fetchAdminScorers,
  assignScorer,
  reassignScorer,
  revokeAssignment,
  fetchAssignmentHistory,
} from '../../lib/api/admin';
import { Match, MatchAssignment, ScorerItem } from '../../types';

export const AdminAssignmentsPage: React.FC = () => {
  const { getToken } = useAuthUser();
  const { addToast } = useToast();

  const [matches, setMatches] = useState<Array<Match & { activeAssignment?: MatchAssignment | null }>>([]);
  const [scorers, setScorers] = useState<ScorerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<'all' | 'unassigned' | 'assigned' | 'live' | 'scheduled'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Assign / Reassign Modal
  const [selectedMatch, setSelectedMatch] = useState<(Match & { activeAssignment?: MatchAssignment | null }) | null>(null);
  const [selectedScorerId, setSelectedScorerId] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Revoke Modal
  const [revokingMatch, setRevokingMatch] = useState<(Match & { activeAssignment?: MatchAssignment | null }) | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  // Assignment History Modal
  const [historyMatch, setHistoryMatch] = useState<Match | null>(null);
  const [historyList, setHistoryList] = useState<MatchAssignment[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [matchesRes, scorersRes] = await Promise.all([
        fetchAdminMatches(getToken, { limit: 100 }),
        fetchAdminScorers(getToken),
      ]);
      setMatches(matchesRes.data);
      setScorers(scorersRes.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load assignment data');
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Active scorers only for assignment
  const activeScorers = useMemo(() => scorers.filter((s) => s.isActive), [scorers]);

  // Filtered matches
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !query ||
        String(m.id).includes(query) ||
        m.homeTeam.toLowerCase().includes(query) ||
        m.awayTeam.toLowerCase().includes(query) ||
        (m.activeAssignment?.scorer?.displayName &&
          m.activeAssignment.scorer.displayName.toLowerCase().includes(query));

      let matchesFilter = true;
      if (filterType === 'unassigned') matchesFilter = !m.activeAssignment;
      else if (filterType === 'assigned') matchesFilter = !!m.activeAssignment;
      else if (filterType === 'live') matchesFilter = m.status === 'live' || m.status === 'paused';
      else if (filterType === 'scheduled') matchesFilter = m.status === 'scheduled';

      return matchesQuery && matchesFilter;
    });
  }, [matches, searchQuery, filterType]);

  const handleAssignOrReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch || !selectedScorerId) return;

    try {
      setIsSubmitting(true);
      setModalError(null);

      if (selectedMatch.activeAssignment) {
        // Reassignment
        await reassignScorer(getToken, selectedMatch.id, Number(selectedScorerId), reason.trim() || 'Admin reassignment');
        addToast(`Match #${selectedMatch.id} reassigned to new scorer`, 'success');
      } else {
        // First assignment
        await assignScorer(getToken, selectedMatch.id, Number(selectedScorerId));
        addToast(`Scorer assigned to match #${selectedMatch.id}`, 'success');
      }

      setSelectedMatch(null);
      setSelectedScorerId('');
      setReason('');
      loadData();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Assignment operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revokingMatch) return;

    try {
      setIsRevoking(true);
      setRevokeError(null);

      await revokeAssignment(getToken, revokingMatch.id, revokeReason.trim() || undefined);
      addToast(`Assignment revoked for Match #${revokingMatch.id}`, 'info');
      setRevokingMatch(null);
      setRevokeReason('');
      loadData();
    } catch (err: unknown) {
      setRevokeError(err instanceof Error ? err.message : 'Revocation failed');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleOpenHistory = async (m: Match) => {
    setHistoryMatch(m);
    try {
      setIsLoadingHistory(true);
      const res = await fetchAssignmentHistory(getToken, m.id);
      setHistoryList(res.data);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to fetch history');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-black">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-brand-dark">Match Assignments</h1>
              <Badge variant="admin">DISPATCH DESK</Badge>
            </div>
            <p className="text-xs text-gray-600 font-medium">
              Assign and reassign primary official scorers with strict single-scorer enforcement.
            </p>
          </div>
        </div>

        {/* Quick Assignment Statistics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-3.5 bg-white space-y-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Matches</span>
            <p className="text-2xl font-black text-brand-dark">{matches.length}</p>
          </Card>
          <Card className="p-3.5 bg-amber-50 border-amber-300 space-y-1">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Unassigned</span>
            <p className="text-2xl font-black text-amber-800">
              {matches.filter((m) => !m.activeAssignment && m.status !== 'completed' && m.status !== 'finished').length}
            </p>
          </Card>
          <Card className="p-3.5 bg-emerald-50 border-emerald-300 space-y-1">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Assigned</span>
            <p className="text-2xl font-black text-emerald-800">
              {matches.filter((m) => m.activeAssignment).length}
            </p>
          </Card>
          <Card className="p-3.5 bg-blue-50 border-blue-300 space-y-1">
            <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Active Scorers</span>
            <p className="text-2xl font-black text-blue-800">{activeScorers.length}</p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 bg-white space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Input
                placeholder="Search by team, match #ID, or scorer name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select
              label=""
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              options={[
                { value: 'all', label: 'All Matches' },
                { value: 'unassigned', label: 'Unassigned Matches Only' },
                { value: 'assigned', label: 'Assigned Matches Only' },
                { value: 'live', label: 'Live Matches' },
                { value: 'scheduled', label: 'Scheduled / Upcoming' },
              ]}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 font-medium pt-1">
            <span>Showing {filteredMatches.length} of {matches.length} matches</span>
            {(searchQuery || filterType !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterType('all');
                }}
                className="text-blue-600 hover:underline font-bold cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        </Card>

        {/* Table */}
        {isLoading && matches.length === 0 ? (
          <div className="py-16 flex justify-center">
            <Spinner size="lg" label="Loading match assignments..." />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border-2 border-red-500 rounded-xl text-xs font-bold text-red-950 flex items-center justify-between">
            <span>Error: {error}</span>
            <Button variant="secondary" size="sm" onClick={loadData}>
              Retry
            </Button>
          </div>
        ) : filteredMatches.length === 0 ? (
          <EmptyState
            title="No matches match the filter"
            description="All matches might already have assigned scorers or filter criteria yielded no matches."
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Match ID</TableHeaderCell>
                <TableHeaderCell>Teams & Sport</TableHeaderCell>
                <TableHeaderCell>Match Status</TableHeaderCell>
                <TableHeaderCell>Current Scorer</TableHeaderCell>
                <TableHeaderCell>Assignment Status</TableHeaderCell>
                <TableHeaderCell>Assigned Date</TableHeaderCell>
                <TableHeaderCell className="text-right">Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMatches.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono font-bold text-gray-500">#{m.id}</TableCell>
                  <TableCell>
                    <div className="font-bold text-brand-dark">
                      {m.homeTeam} vs {m.awayTeam}
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono">{m.sport}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.status === 'live' ? 'live' : m.status === 'paused' ? 'paused' : 'default'}>
                      {m.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {m.activeAssignment ? (
                      <div>
                        <p className="font-bold text-xs text-brand-dark">
                          {m.activeAssignment.scorer?.displayName || `Scorer #${m.activeAssignment.scorerId}`}
                        </p>
                        <p className="text-[10px] font-mono text-gray-500">{m.activeAssignment.scorer?.email}</p>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded">
                        Not Assigned
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {m.activeAssignment ? (
                      <Badge variant="scorer">ACTIVE</Badge>
                    ) : (
                      <Badge variant="default">UNASSIGNED</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-gray-500">
                    {m.activeAssignment ? new Date(m.activeAssignment.assignedAt).toLocaleString() : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant={m.activeAssignment ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => {
                          setSelectedMatch(m);
                          setSelectedScorerId('');
                          setReason('');
                          setModalError(null);
                        }}
                      >
                        {m.activeAssignment ? 'Reassign' : 'Assign Scorer'}
                      </Button>

                      {m.activeAssignment && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setRevokingMatch(m);
                            setRevokeReason('');
                            setRevokeError(null);
                          }}
                        >
                          Revoke
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        title="View Assignment History"
                        onClick={() => handleOpenHistory(m)}
                      >
                        📋 History
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modal: Assign or Reassign Scorer */}
      <Modal
        isOpen={!!selectedMatch}
        onClose={() => setSelectedMatch(null)}
        title={selectedMatch?.activeAssignment ? `Reassign Scorer: Match #${selectedMatch?.id}` : `Assign Scorer: Match #${selectedMatch?.id}`}
      >
        <form onSubmit={handleAssignOrReassign} className="space-y-4">
          {modalError && (
            <div className="p-3 bg-red-50 border-2 border-red-500 rounded-xl text-xs font-bold text-red-900">
              {modalError}
            </div>
          )}

          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-1">
            <p className="font-bold text-gray-800">
              Match: {selectedMatch?.homeTeam} vs {selectedMatch?.awayTeam} ({selectedMatch?.sport})
            </p>
            {selectedMatch?.activeAssignment && (
              <p className="text-amber-800 font-bold">
                Current Active Scorer: {selectedMatch.activeAssignment.scorer?.displayName || `User #${selectedMatch.activeAssignment.scorerId}`}
              </p>
            )}
          </div>

          <Select
            label="Select Active Scorer"
            value={selectedScorerId}
            onChange={(e) => setSelectedScorerId(Number(e.target.value) || '')}
            options={[
              { value: '', label: '-- Choose Active Scorer --' },
              ...activeScorers.map((s) => ({
                value: s.id,
                label: `${s.displayName || s.email} (${s.activeAssignmentsCount ?? 0} active assignments)`,
              })),
            ]}
            required
          />

          {selectedMatch?.activeAssignment && (
            <Input
              label="Reassignment Reason / Shift Handover (min 3 chars)"
              placeholder="e.g. Scorer emergency shift handover"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          )}

          <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setSelectedMatch(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!selectedScorerId}
              isLoading={isSubmitting}
            >
              {selectedMatch?.activeAssignment ? 'Confirm Reassignment' : 'Confirm Assignment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Revoke Assignment */}
      <Modal
        isOpen={!!revokingMatch}
        onClose={() => setRevokingMatch(null)}
        title={`Revoke Scorer Assignment: Match #${revokingMatch?.id}`}
      >
        <form onSubmit={handleRevokeSubmit} className="space-y-4">
          {revokeError && (
            <div className="p-3 bg-red-50 border-2 border-red-500 rounded-xl text-xs font-bold text-red-900">
              {revokeError}
            </div>
          )}

          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-1">
            <p className="font-bold">⚠️ Revocation Warning</p>
            <p>
              Revoking this assignment removes the scorer's authorization to operate live scoring for Match #{revokingMatch?.id}. The match will become unassigned until a new scorer is assigned.
            </p>
          </div>

          <p className="text-xs font-bold text-gray-800">
            Current Scorer: {revokingMatch?.activeAssignment?.scorer?.displayName || `User #${revokingMatch?.activeAssignment?.scorerId}`}
          </p>

          <Input
            label="Optional Revocation Reason"
            placeholder="e.g. Match delayed or scorer requested break"
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
          />

          <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setRevokingMatch(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              isLoading={isRevoking}
            >
              Confirm Revocation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Assignment History */}
      <Modal
        isOpen={!!historyMatch}
        onClose={() => setHistoryMatch(null)}
        title={`Assignment History: Match #${historyMatch?.id}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-600">
            Audit trail of all previous and active scorers assigned to <strong>{historyMatch?.homeTeam} vs {historyMatch?.awayTeam}</strong>.
          </p>

          {isLoadingHistory ? (
            <div className="py-8 flex justify-center">
              <Spinner size="md" label="Fetching assignment history..." />
            </div>
          ) : historyList.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-500">
              This match has never been assigned to any scorer.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
              {historyList.map((a) => (
                <div key={a.id} className="py-2.5 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-brand-dark">
                      {a.scorer?.displayName || `User #${a.scorerId}`}
                    </span>
                    <span className="text-[10px] text-gray-500 block">
                      Assigned: {new Date(a.assignedAt).toLocaleString()}
                    </span>
                    {a.revokedAt && (
                      <span className="text-[10px] text-red-500 block">
                        Revoked: {new Date(a.revokedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div>
                    <Badge variant={a.status === 'active' ? 'scorer' : 'default'}>
                      {a.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 flex justify-end border-t border-gray-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setHistoryMatch(null)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
};
