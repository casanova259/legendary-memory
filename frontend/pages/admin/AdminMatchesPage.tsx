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
  createAdminMatch,
  overrideMatchStatus,
} from '../../lib/api/admin';
import { Match, MatchAssignment, WSMessage } from '../../types';
import { useWebSocket } from '../../hooks/useWebSocket';

export const AdminMatchesPage: React.FC = () => {
  const { getToken } = useAuthUser();
  const { addToast } = useToast();

  const [matches, setMatches] = useState<Array<Match & { activeAssignment?: MatchAssignment | null }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sportFilter, setSportFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'startTime' | 'id'>('startTime');

  // Create Match Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sport, setSport] = useState('Cricket');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [endTime, setEndTime] = useState(() => {
    const d = new Date(Date.now() + 3 * 3600 * 1000);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Status Override Modal
  const [overrideMatch, setOverrideMatch] = useState<Match | null>(null);
  const [newStatus, setNewStatus] = useState<string>('paused');
  const [overrideReason, setOverrideReason] = useState('');
  const [isOverriding, setIsOverriding] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);

  const loadMatches = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetchAdminMatches(getToken, { limit: 100 });
      setMatches(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch match records');
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  // WebSocket live updates
  const handleWsMessage = useCallback((msg: WSMessage) => {
    if (
      msg.type === 'match_created' ||
      msg.type === 'match_started' ||
      msg.type === 'match_paused' ||
      msg.type === 'match_resumed' ||
      msg.type === 'match_completed' ||
      msg.type === 'score_update'
    ) {
      loadMatches();
    }
  }, [loadMatches]);

  useWebSocket(handleWsMessage);

  // Filter & Sort
  const filteredMatches = useMemo(() => {
    return matches
      .filter((m) => {
        // Search
        const query = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !query ||
          String(m.id).includes(query) ||
          m.homeTeam.toLowerCase().includes(query) ||
          m.awayTeam.toLowerCase().includes(query) ||
          m.sport.toLowerCase().includes(query);

        // Status filter
        const matchesStatus =
          statusFilter === 'all' ||
          m.status.toLowerCase() === statusFilter.toLowerCase();

        // Sport filter
        const matchesSport =
          sportFilter === 'all' ||
          m.sport.toLowerCase() === sportFilter.toLowerCase();

        return matchesQuery && matchesStatus && matchesSport;
      })
      .sort((a, b) => {
        if (sortBy === 'startTime') {
          return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
        }
        return Number(b.id) - Number(a.id);
      });
  }, [matches, searchQuery, statusFilter, sportFilter, sortBy]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeTeam.trim() || !awayTeam.trim()) {
      setFormError('Both Home Team and Away Team names are required');
      return;
    }
    if (new Date(endTime) <= new Date(startTime)) {
      setFormError('End time must be later than start time');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      const res = await createAdminMatch(getToken, {
        sport,
        homeTeam: homeTeam.trim(),
        awayTeam: awayTeam.trim(),
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      });

      addToast(`Match #${res.data.id} (${res.data.homeTeam} vs ${res.data.awayTeam}) created`, 'success');
      setIsCreateOpen(false);
      setHomeTeam('');
      setAwayTeam('');
      loadMatches();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create match');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideMatch) return;
    if (!overrideReason.trim() || overrideReason.trim().length < 3) {
      setOverrideError('A mandatory audit reason (at least 3 characters) is required');
      return;
    }

    try {
      setIsOverriding(true);
      setOverrideError(null);

      await overrideMatchStatus(getToken, overrideMatch.id, newStatus, overrideReason.trim());
      addToast(`Match #${overrideMatch.id} status overridden to "${newStatus}"`, 'success');
      setOverrideMatch(null);
      setOverrideReason('');
      loadMatches();
    } catch (err: unknown) {
      setOverrideError(err instanceof Error ? err.message : 'Status override failed');
    } finally {
      setIsOverriding(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-black">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-brand-dark">Match Management</h1>
              <Badge variant="admin">ADMINISTRATION</Badge>
            </div>
            <p className="text-xs text-gray-600 font-medium">
              Create, filter, monitor and intervene in live or scheduled matches.
            </p>
          </div>

          <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
            + Create New Match
          </Button>
        </div>

        {/* Filters and Search Bar */}
        <Card className="p-4 bg-white space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Input
              placeholder="Search team, sport or #ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <Select
              label=""
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'live', label: 'Live' },
                { value: 'paused', label: 'Paused' },
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'completed', label: 'Completed' },
                { value: 'abandoned', label: 'Abandoned' },
              ]}
            />

            <Select
              label=""
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Sports' },
                { value: 'cricket', label: 'Cricket' },
                { value: 'football', label: 'Football' },
                { value: 'basketball', label: 'Basketball' },
                { value: 'tennis', label: 'Tennis' },
              ]}
            />

            <Select
              label=""
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              options={[
                { value: 'startTime', label: 'Sort by Start Time' },
                { value: 'id', label: 'Sort by Match ID' },
              ]}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 font-medium pt-1">
            <span>
              Showing {filteredMatches.length} of {matches.length} matches
            </span>
            {(searchQuery || statusFilter !== 'all' || sportFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setSportFilter('all');
                }}
                className="text-blue-600 hover:underline font-bold cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        </Card>

        {/* Matches Data Table */}
        {isLoading && matches.length === 0 ? (
          <div className="py-16 flex justify-center">
            <Spinner size="lg" label="Loading match database..." />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border-2 border-red-500 rounded-xl text-xs font-bold text-red-950 flex items-center justify-between">
            <span>Error: {error}</span>
            <Button variant="secondary" size="sm" onClick={loadMatches}>
              Retry
            </Button>
          </div>
        ) : filteredMatches.length === 0 ? (
          <EmptyState
            title="No matches found"
            description="Try adjusting your search filters or create a new match."
            action={
              <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
                + Create First Match
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>ID</TableHeaderCell>
                <TableHeaderCell>Sport</TableHeaderCell>
                <TableHeaderCell>Teams & Score</TableHeaderCell>
                <TableHeaderCell>Start Time</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Assigned Scorer</TableHeaderCell>
                <TableHeaderCell className="text-right">Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMatches.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono font-bold text-gray-500">#{m.id}</TableCell>
                  <TableCell className="font-bold">{m.sport}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-brand-dark">{m.homeTeam}</span>
                      <span className="font-mono font-black text-xs bg-gray-100 px-1.5 py-0.5 rounded border border-gray-300">
                        {m.homeScore} - {m.awayScore}
                      </span>
                      <span className="font-black text-brand-dark">{m.awayTeam}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-gray-600 whitespace-nowrap">
                    {new Date(m.startTime).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        m.status === 'live'
                          ? 'live'
                          : m.status === 'paused'
                          ? 'paused'
                          : m.status === 'scheduled'
                          ? 'scheduled'
                          : 'finished'
                      }
                    >
                      {m.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {m.activeAssignment ? (
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                        {m.activeAssignment.scorer?.displayName || `Scorer #${m.activeAssignment.scorerId}`}
                      </span>
                    ) : (
                      <Link to="/admin/assignments">
                        <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 hover:bg-amber-100 cursor-pointer">
                          + Assign Scorer
                        </span>
                      </Link>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link to={`/admin/matches/${m.id}`}>
                        <Button variant="secondary" size="sm">
                          Monitor / Details →
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Override Status"
                        onClick={() => {
                          setOverrideMatch(m);
                          setNewStatus(m.status === 'live' ? 'paused' : 'live');
                          setOverrideReason('');
                          setOverrideError(null);
                        }}
                      >
                        ⚙️ Override
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modal: Create Match */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Match"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border-2 border-red-500 rounded-xl text-xs font-bold text-red-900">
              {formError}
            </div>
          )}

          <Select
            label="Sport"
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            options={[
              { value: 'Cricket', label: 'Cricket' },
              { value: 'Football', label: 'Football' },
              { value: 'Basketball', label: 'Basketball' },
              { value: 'Tennis', label: 'Tennis' },
            ]}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Home Team"
              placeholder="e.g. India"
              value={homeTeam}
              onChange={(e) => setHomeTeam(e.target.value)}
              required
            />
            <Input
              label="Away Team"
              placeholder="e.g. Australia"
              value={awayTeam}
              onChange={(e) => setAwayTeam(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Time"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
            <Input
              label="Estimated End Time"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>

          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
            <span className="text-[11px] font-bold text-gray-500">Quick Time Presets:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setStartTime(new Date(now.getTime() - 5 * 60000 - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
                  setEndTime(new Date(now.getTime() + 3 * 3600000 - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
                }}
                className="text-xs bg-white border border-black px-2 py-1 rounded font-bold hover:bg-yellow-100 cursor-pointer"
              >
                Start Live Now
              </button>
              <button
                type="button"
                onClick={() => {
                  const tomorrow = new Date(Date.now() + 24 * 3600000);
                  setStartTime(new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
                  setEndTime(new Date(tomorrow.getTime() + 3 * 3600000 - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
                }}
                className="text-xs bg-white border border-black px-2 py-1 rounded font-bold hover:bg-blue-100 cursor-pointer"
              >
                Schedule Tomorrow
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
            >
              Create Match
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Status Override */}
      <Modal
        isOpen={!!overrideMatch}
        onClose={() => setOverrideMatch(null)}
        title={`Status Intervention: Match #${overrideMatch?.id}`}
      >
        <form onSubmit={handleOverrideSubmit} className="space-y-4">
          {overrideError && (
            <div className="p-3 bg-red-50 border-2 border-red-500 rounded-xl text-xs font-bold text-red-900">
              {overrideError}
            </div>
          )}

          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-1">
            <p className="font-bold">⚠️ Administrative Intervention Warning</p>
            <p>
              Overriding a match's status bypasses regular scorer operations. This action will be broadcast over WebSockets and written to the immutable audit log with your mandatory reason.
            </p>
          </div>

          <div className="flex items-center justify-between text-xs font-bold">
            <span>Match: {overrideMatch?.homeTeam} vs {overrideMatch?.awayTeam}</span>
            <span>Current: <Badge variant="default">{overrideMatch?.status}</Badge></span>
          </div>

          <Select
            label="New Target Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            options={[
              { value: 'live', label: 'live (Active Match)' },
              { value: 'paused', label: 'paused (Rain / Technical Interruption)' },
              { value: 'scheduled', label: 'scheduled (Upcoming)' },
              { value: 'completed', label: 'completed (Finished Match)' },
              { value: 'abandoned', label: 'abandoned (Cancelled / Forfeited)' },
            ]}
          />

          <Input
            label="Mandatory Audit Reason (min 3 characters)"
            placeholder="e.g. Rain interruption declared by umpire"
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            required
          />

          <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setOverrideMatch(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              isLoading={isOverriding}
            >
              Confirm Status Override
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
};
