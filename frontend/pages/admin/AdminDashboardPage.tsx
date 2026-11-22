import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { AdminLayout } from '../../components/layouts/AdminLayout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Link, useNavigate } from '../../lib/router';
import { useAuthUser } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import {
  fetchAdminDashboard,
  fetchAdminMatches,
  createAdminMatch,
  inviteScorer,
} from '../../lib/api/admin';
import { AdminDashboardStats, Match, MatchAssignment, WSMessage } from '../../types';
import { useWebSocket } from '../../hooks/useWebSocket';

export const AdminDashboardPage: React.FC = () => {
  const { getToken } = useAuthUser();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [matches, setMatches] = useState<Array<Match & { activeAssignment?: MatchAssignment | null }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isCreateMatchOpen, setIsCreateMatchOpen] = useState(false);
  const [isInviteScorerOpen, setIsInviteScorerOpen] = useState(false);

  // Create match form state
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
  const [isSubmittingMatch, setIsSubmittingMatch] = useState(false);
  const [createMatchError, setCreateMatchError] = useState<string | null>(null);

  // Invite scorer form state
  const [scorerEmail, setScorerEmail] = useState('');
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [statsRes, matchesRes] = await Promise.all([
        fetchAdminDashboard(getToken),
        fetchAdminMatches(getToken, { limit: 100 }),
      ]);
      setStats(statsRes.data);
      setMatches(matchesRes.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Real-time WebSocket listener
  const handleWsMessage = useCallback((msg: WSMessage) => {
    if (
      msg.type === 'match_created' ||
      msg.type === 'match_started' ||
      msg.type === 'match_paused' ||
      msg.type === 'match_resumed' ||
      msg.type === 'match_completed' ||
      msg.type === 'score_update' ||
      msg.type === 'score_corrected'
    ) {
      // Re-fetch dashboard stats and match list
      loadDashboardData();
    }
  }, [loadDashboardData]);

  useWebSocket(handleWsMessage);

  // Match category partitions
  const liveMatches = useMemo(() => matches.filter((m) => m.status === 'live' || m.status === 'paused'), [matches]);
  const scheduledMatches = useMemo(() => matches.filter((m) => m.status === 'scheduled'), [matches]);
  const completedMatches = useMemo(
    () => matches.filter((m) => m.status === 'completed' || m.status === 'finished' || m.status === 'abandoned'),
    [matches]
  );

  const handleCreateMatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeTeam.trim() || !awayTeam.trim()) {
      setCreateMatchError('Home and Away teams are required');
      return;
    }
    if (new Date(endTime) <= new Date(startTime)) {
      setCreateMatchError('End time must be after start time');
      return;
    }

    try {
      setIsSubmittingMatch(true);
      setCreateMatchError(null);

      const res = await createAdminMatch(getToken, {
        sport,
        homeTeam: homeTeam.trim(),
        awayTeam: awayTeam.trim(),
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      });

      addToast(`Match #${res.data.id} (${res.data.homeTeam} vs ${res.data.awayTeam}) created successfully`, 'success');
      setIsCreateMatchOpen(false);
      setHomeTeam('');
      setAwayTeam('');
      loadDashboardData();
    } catch (err: unknown) {
      setCreateMatchError(err instanceof Error ? err.message : 'Failed to create match');
    } finally {
      setIsSubmittingMatch(false);
    }
  };

  const handleInviteScorerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scorerEmail.trim() || !scorerEmail.includes('@')) {
      setInviteError('Please enter a valid email address');
      return;
    }

    try {
      setIsSubmittingInvite(true);
      setInviteError(null);

      await inviteScorer(getToken, { email: scorerEmail.trim() });
      addToast(`Invitation sent to ${scorerEmail.trim()}`, 'success');
      setIsInviteScorerOpen(false);
      setScorerEmail('');
      loadDashboardData();
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : 'Failed to invite scorer');
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header and Quick Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-2 border-black">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-brand-dark">Command Center</h1>
              <Badge variant="admin">LIVE ADMIN</Badge>
            </div>
            <p className="text-xs text-gray-600 font-medium">
              Live match monitoring, scorer operations, assignments, and audit management.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" size="sm" onClick={() => setIsCreateMatchOpen(true)}>
              + Create Match
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setIsInviteScorerOpen(true)}>
              + Invite Scorer
            </Button>
            <Link to="/admin/assignments">
              <Button variant="dark" size="sm">
                Manage Assignments →
              </Button>
            </Link>
          </div>
        </div>

        {/* Top Operational Statistics */}
        {isLoading && !stats ? (
          <div className="py-12 flex justify-center">
            <Spinner size="md" label="Loading live operational metrics..." />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border-2 border-red-500 rounded-xl text-xs font-bold text-red-950 flex items-center justify-between">
            <span>Notice: {error}</span>
            <Button variant="secondary" size="sm" onClick={loadDashboardData}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card variant="white" className="p-4 space-y-1">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Total Matches
              </span>
              <p className="text-3xl font-black text-brand-dark">{stats?.totalMatches ?? matches.length}</p>
              <span className="text-[10px] text-gray-500">Across all sports</span>
            </Card>

            <Card variant="white" className="p-4 space-y-1 border-emerald-500 bg-emerald-50/40">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                Live Matches
              </span>
              <p className="text-3xl font-black text-emerald-700">{stats?.liveMatches ?? liveMatches.length}</p>
              <span className="text-[10px] text-emerald-800 font-medium">Active ball-by-ball</span>
            </Card>

            <Card variant="white" className="p-4 space-y-1">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Active Scorers
              </span>
              <p className="text-3xl font-black text-brand-dark">{stats?.activeScorers ?? 0}</p>
              <span className="text-[10px] text-gray-500">of {stats?.totalScorers ?? 0} registered</span>
            </Card>

            <Card variant="white" className="p-4 space-y-1 border-blue-500 bg-blue-50/30">
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
                Active Assignments
              </span>
              <p className="text-3xl font-black text-blue-700">
                {stats?.activeAssignments ?? matches.filter((m) => m.activeAssignment).length}
              </p>
              <span className="text-[10px] text-blue-800 font-medium">Scorer deployed</span>
            </Card>
          </div>
        )}

        {/* Live Matches Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-brand-dark flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
              <span>Ongoing & Paused Matches ({liveMatches.length})</span>
            </h2>
            <Link to="/admin/matches" className="text-xs font-bold text-blue-600 hover:underline">
              View all matches →
            </Link>
          </div>

          {liveMatches.length === 0 ? (
            <Card className="text-center py-8 bg-gray-50 border-dashed border-gray-300">
              <p className="text-xs font-bold text-gray-500">No matches are currently LIVE.</p>
              <p className="text-[11px] text-gray-400 mt-1">
                Start a scheduled match or create a new live cricket match above.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveMatches.map((m) => (
                <Card
                  key={m.id}
                  className="p-4 space-y-3 bg-white hover:border-black transition-all shadow-hard-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-gray-500">
                      {m.sport} • #{m.id}
                    </span>
                    <Badge variant={m.status === 'live' ? 'live' : 'paused'}>
                      {m.status}
                    </Badge>
                  </div>

                  <div className="py-2 border-y border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="font-black text-sm text-brand-dark">{m.homeTeam}</p>
                      <p className="text-xs text-gray-500 font-bold">{m.awayTeam}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black font-mono">
                        {m.homeScore} - {m.awayScore}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="text-[11px]">
                      {m.activeAssignment ? (
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                          Scorer: {m.activeAssignment.scorer?.displayName || `User #${m.activeAssignment.scorerId}`}
                        </span>
                      ) : (
                        <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                          Unassigned
                        </span>
                      )}
                    </div>

                    <Link to={`/admin/matches/${m.id}`}>
                      <Button variant="primary" size="sm">
                        Monitor →
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Scheduled & Recent Activity Split */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Scheduled Matches */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-brand-dark flex items-center gap-2">
                <span>📅 Upcoming Matches ({scheduledMatches.length})</span>
              </h2>
            </div>

            <Card className="p-0 overflow-hidden bg-white">
              {scheduledMatches.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-500 font-medium">
                  No upcoming matches scheduled.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {scheduledMatches.slice(0, 5).map((m) => (
                    <div key={m.id} className="p-3.5 flex items-center justify-between hover:bg-gray-50">
                      <div>
                        <p className="text-xs font-black text-brand-dark">
                          {m.homeTeam} vs {m.awayTeam}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {m.sport} • {new Date(m.startTime).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {m.activeAssignment ? (
                          <Badge variant="scorer">Assigned</Badge>
                        ) : (
                          <Link to="/admin/assignments">
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded hover:bg-red-100 cursor-pointer">
                              + Assign
                            </span>
                          </Link>
                        )}
                        <Link to={`/admin/matches/${m.id}`}>
                          <Button variant="ghost" size="sm">
                            Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Completed Matches */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-brand-dark flex items-center gap-2">
                <span>🏁 Completed Matches ({completedMatches.length})</span>
              </h2>
            </div>

            <Card className="p-0 overflow-hidden bg-white">
              {completedMatches.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-500 font-medium">
                  No completed matches recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {completedMatches.slice(0, 5).map((m) => (
                    <div key={m.id} className="p-3.5 flex items-center justify-between hover:bg-gray-50">
                      <div>
                        <p className="text-xs font-black text-brand-dark">
                          {m.homeTeam} {m.homeScore} - {m.awayScore} {m.awayTeam}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {m.sport} • Ended {m.endTime ? new Date(m.endTime).toLocaleDateString() : 'Finished'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="finished">{m.status}</Badge>
                        <Link to={`/admin/matches/${m.id}`}>
                          <Button variant="ghost" size="sm">
                            Recap
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Quick Operational Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
          <Link to="/admin/matches" className="block">
            <Card className="hover:bg-yellow-50 transition-all cursor-pointer h-full border-black">
              <h3 className="text-sm font-black text-brand-dark mb-1">🏏 Match Management</h3>
              <p className="text-xs text-gray-600">
                Create matches, apply status overrides, and view live scorecards.
              </p>
            </Card>
          </Link>

          <Link to="/admin/scorers" className="block">
            <Card className="hover:bg-yellow-50 transition-all cursor-pointer h-full border-black">
              <h3 className="text-sm font-black text-brand-dark mb-1">👥 Scorer Management</h3>
              <p className="text-xs text-gray-600">
                Invite scorers via Clerk and toggle account activation status.
              </p>
            </Card>
          </Link>

          <Link to="/admin/assignments" className="block">
            <Card className="hover:bg-yellow-50 transition-all cursor-pointer h-full border-black">
              <h3 className="text-sm font-black text-brand-dark mb-1">📋 Match Assignments</h3>
              <p className="text-xs text-gray-600">
                Assign and reassign scorers with strictly one active scorer per match.
              </p>
            </Card>
          </Link>

          <Link to="/admin/audit-logs" className="block">
            <Card className="hover:bg-yellow-50 transition-all cursor-pointer h-full border-black">
              <h3 className="text-sm font-black text-brand-dark mb-1">📜 Audit Logs</h3>
              <p className="text-xs text-gray-600">
                View chronological audit history of interventions and scoring reversals.
              </p>
            </Card>
          </Link>
        </div>
      </div>

      {/* Modal: Create Match */}
      <Modal
        isOpen={isCreateMatchOpen}
        onClose={() => setIsCreateMatchOpen(false)}
        title="Create New Match"
      >
        <form onSubmit={handleCreateMatchSubmit} className="space-y-4">
          {createMatchError && (
            <div className="p-3 bg-red-50 border-2 border-red-500 rounded-xl text-xs font-bold text-red-900">
              {createMatchError}
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

          <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsCreateMatchOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmittingMatch}
            >
              Create Match
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Invite Scorer */}
      <Modal
        isOpen={isInviteScorerOpen}
        onClose={() => setIsInviteScorerOpen(false)}
        title="Invite Official Scorer"
      >
        <form onSubmit={handleInviteScorerSubmit} className="space-y-4">
          {inviteError && (
            <div className="p-3 bg-red-50 border-2 border-red-500 rounded-xl text-xs font-bold text-red-900">
              {inviteError}
            </div>
          )}

          <p className="text-xs text-gray-600">
            The backend will issue a Clerk invitation email with a pre-assigned <strong>scorer</strong> role.
          </p>

          <Input
            label="Scorer Email Address"
            type="email"
            placeholder="scorer@domain.com"
            value={scorerEmail}
            onChange={(e) => setScorerEmail(e.target.value)}
            required
          />

          <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsInviteScorerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="success"
              size="sm"
              isLoading={isSubmittingInvite}
            >
              Send Invitation
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
};
