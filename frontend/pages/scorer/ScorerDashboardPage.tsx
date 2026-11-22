import React, { useEffect, useState } from 'react';
import { ScorerLayout } from '../../components/layouts/ScorerLayout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Link } from '../../lib/router';
import { useAuthUser } from '../../context/AuthContext';
import { fetchScorerDashboard, fetchAssignedMatches } from '../../lib/api/scorer';
import { Match, ScorerDashboardStats } from '../../types';

export const ScorerDashboardPage: React.FC = () => {
  const { user, getToken } = useAuthUser();
  const [stats, setStats] = useState<ScorerDashboardStats | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [filter, setFilter] = useState<'all' | 'live' | 'scheduled' | 'completed'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [dashRes, matchesRes] = await Promise.all([
        fetchScorerDashboard(getToken),
        fetchAssignedMatches(getToken),
      ]);
      setStats(dashRes.data);
      setMatches(matchesRes.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch scorer dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [getToken]);

  const filteredMatches = matches.filter((m) => {
    if (filter === 'live') return m.status === 'live' || m.status === 'paused';
    if (filter === 'scheduled') return m.status === 'scheduled';
    if (filter === 'completed') return m.status === 'completed' || m.status === 'finished';
    return true;
  });

  return (
    <ScorerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-black">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-brand-dark">Scorer Workspace</h1>
              <Badge variant="scorer">Official Console</Badge>
            </div>
            <p className="text-xs text-gray-600 font-medium">
              Welcome back, <strong>{user?.displayName || user?.email || 'Scorer'}</strong>. You have exclusive scoring access to your assigned fixtures.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/scorer/matches">
              <Button variant="secondary" size="sm">
                View All Matches ({matches.length})
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={loadDashboardData}>
              ↻ Refresh
            </Button>
          </div>
        </div>

        {/* Operational Statistics Deck */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card variant="white" className="p-4 space-y-1 border-2 border-black shadow-hard-xs">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Total Assigned
            </span>
            <p className="text-3xl font-black text-brand-dark">
              {stats?.totalAssigned ?? matches.length}
            </p>
            <span className="text-[10px] text-gray-500">Fixtures dispatched to you</span>
          </Card>

          <Card variant="white" className="p-4 space-y-1 border-2 border-black shadow-hard-xs">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
              Active / Live
            </span>
            <p className="text-3xl font-black text-emerald-600">
              {stats?.liveMatches ?? matches.filter((m) => m.status === 'live').length}
            </p>
            <span className="text-[10px] text-emerald-700 font-bold">Currently in progress</span>
          </Card>

          <Card variant="white" className="p-4 space-y-1 border-2 border-black shadow-hard-xs">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
              Upcoming
            </span>
            <p className="text-3xl font-black text-blue-600">
              {stats?.scheduledMatches ?? matches.filter((m) => m.status === 'scheduled').length}
            </p>
            <span className="text-[10px] text-gray-500">Scheduled fixtures</span>
          </Card>

          <Card variant="white" className="p-4 space-y-1 border-2 border-black shadow-hard-xs">
            <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">
              Completed
            </span>
            <p className="text-3xl font-black text-purple-600">
              {stats?.completedMatches ?? matches.filter((m) => m.status === 'completed' || m.status === 'finished').length}
            </p>
            <span className="text-[10px] text-gray-500">Official results recorded</span>
          </Card>
        </div>

        {/* Filter Navigation Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'all', label: `All Matches (${matches.length})` },
            { id: 'live', label: `Live / In Progress (${matches.filter((m) => m.status === 'live' || m.status === 'paused').length})` },
            { id: 'scheduled', label: `Upcoming (${matches.filter((m) => m.status === 'scheduled').length})` },
            { id: 'completed', label: `Completed (${matches.filter((m) => m.status === 'completed' || m.status === 'finished').length})` },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setFilter(chip.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer whitespace-nowrap ${
                filter === chip.id
                  ? 'bg-black text-white border-black shadow-hard-xs font-black'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-black'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Matches Grid */}
        <div>
          {isLoading ? (
            <div className="py-16 flex justify-center">
              <Spinner size="md" label="Loading your assigned match fixtures..." />
            </div>
          ) : error ? (
            <Card className="p-6 bg-red-50 border-red-500 text-center space-y-3">
              <h3 className="text-base font-black text-red-950">Failed to Load Dashboard</h3>
              <p className="text-xs text-red-800">{error}</p>
              <Button variant="secondary" size="sm" onClick={loadDashboardData}>
                Try Again
              </Button>
            </Card>
          ) : filteredMatches.length === 0 ? (
            <Card className="text-center py-12 space-y-2 border-2 border-black">
              <p className="text-sm font-bold text-gray-700">No matches found in this category.</p>
              <p className="text-xs text-gray-500">
                Contact your administrator if you are expecting a match assignment.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMatches.map((m) => {
                const isLive = m.status === 'live';
                const isPaused = m.status === 'paused';
                const isScheduled = m.status === 'scheduled';
                const isCompleted = m.status === 'completed' || m.status === 'finished';

                return (
                  <Card
                    key={m.id}
                    className={`p-4 space-y-3 border-2 ${
                      isLive ? 'border-emerald-600 bg-emerald-50/20 shadow-hard-sm' : 'border-black'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-gray-500">
                        {m.sport.toUpperCase()} • #{m.id}
                      </span>
                      <Badge variant={isLive ? 'live' : 'default'} className="uppercase">
                        {m.status}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="text-base font-black text-brand-dark">
                        {m.homeTeam} vs {m.awayTeam}
                      </h3>
                      <p className="text-[11px] text-gray-500 font-medium">
                        {m.startTime ? new Date(m.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Time not specified'}
                      </p>
                    </div>

                    <div className="py-2 px-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between font-mono">
                      <span className="text-xs text-gray-600 font-bold">Current Score:</span>
                      <span className="text-base font-black text-brand-dark">
                        {m.homeScore} - {m.awayScore}
                      </span>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-gray-100 gap-2">
                      <Link to={`/scorer/matches/${m.id}`}>
                        <Button variant="ghost" size="sm" className="text-xs">
                          Overview
                        </Button>
                      </Link>

                      {isLive || isPaused ? (
                        <Link to={`/scorer/matches/${m.id}/live`}>
                          <Button variant="success" size="sm" className="text-xs font-black shadow-hard-xs">
                            Score Console ⚡
                          </Button>
                        </Link>
                      ) : isScheduled ? (
                        <Link to={`/scorer/matches/${m.id}/setup`}>
                          <Button variant="primary" size="sm" className="text-xs font-black">
                            Setup & Start ▶
                          </Button>
                        </Link>
                      ) : isCompleted ? (
                        <Link to={`/scorer/matches/${m.id}/scorecard`}>
                          <Button variant="secondary" size="sm" className="text-xs font-bold">
                            Scorecard 📋
                          </Button>
                        </Link>
                      ) : null}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ScorerLayout>
  );
};
