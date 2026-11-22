import React, { useEffect, useState } from 'react';
import { ScorerLayout } from '../../components/layouts/ScorerLayout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Link } from '../../lib/router';
import { useAuthUser } from '../../context/AuthContext';
import { fetchAssignedMatches } from '../../lib/api/scorer';
import { Match } from '../../types';

export const ScorerDashboardPage: React.FC = () => {
  const { user, getToken } = useAuthUser();
  const [assignedMatches, setAssignedMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadAssigned = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetchAssignedMatches(getToken);
        if (isMounted) setAssignedMatches(res.data);
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch assigned matches');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadAssigned();
    return () => {
      isMounted = false;
    };
  }, [getToken]);

  const liveMatches = assignedMatches.filter((m) => m.status === 'live');
  const scheduledMatches = assignedMatches.filter((m) => m.status === 'scheduled');

  return (
    <ScorerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-black">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-brand-dark">Scorer Workspace</h1>
              <Badge variant="scorer">Phase 1 Foundation</Badge>
            </div>
            <p className="text-xs text-gray-600 font-medium">
              Welcome back, <strong>{user?.displayName || user?.email || 'Scorer'}</strong>. Here are your assigned matches.
            </p>
          </div>
          <Link to="/scorer/matches">
            <Button variant="success" size="sm">
              View All Assigned Matches ({assignedMatches.length})
            </Button>
          </Link>
        </div>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="white" className="p-4 space-y-1">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Assigned Matches
            </span>
            <p className="text-3xl font-black text-brand-dark">{assignedMatches.length}</p>
            <span className="text-[10px] text-gray-500">Total assigned to you</span>
          </Card>

          <Card variant="white" className="p-4 space-y-1">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
              Active / Live
            </span>
            <p className="text-3xl font-black text-emerald-600">{liveMatches.length}</p>
            <span className="text-[10px] text-emerald-700 font-bold">Ready for scoring</span>
          </Card>

          <Card variant="white" className="p-4 space-y-1">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
              Upcoming
            </span>
            <p className="text-3xl font-black text-blue-600">{scheduledMatches.length}</p>
            <span className="text-[10px] text-gray-500">Scheduled matches</span>
          </Card>
        </div>

        {/* Active Matches List */}
        <div className="space-y-3">
          <h2 className="text-base font-black text-brand-dark flex items-center gap-2">
            <span>⚡ Active Assignments</span>
          </h2>

          {isLoading ? (
            <div className="py-12 flex justify-center">
              <Spinner size="md" label="Loading your assigned matches..." />
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border-2 border-red-500 rounded-xl text-xs font-bold text-red-950">
              Notice: {error}
            </div>
          ) : assignedMatches.length === 0 ? (
            <Card className="text-center py-10 space-y-2">
              <p className="text-sm font-bold text-gray-700">No matches currently assigned.</p>
              <p className="text-xs text-gray-500">
                Ask an administrator to assign you to an upcoming cricket match.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignedMatches.map((match) => (
                <Card key={match.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-gray-500">#{match.id}</span>
                    <Badge variant={match.status === 'live' ? 'live' : 'default'}>
                      {match.status}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-base font-black text-brand-dark">
                      {match.homeTeam} vs {match.awayTeam}
                    </h3>
                    <p className="text-xs font-medium text-gray-500">{match.sport}</p>
                  </div>
                  <div className="pt-2 flex items-center justify-between border-t border-gray-100">
                    <span className="text-xs font-mono font-bold">
                      Score: {match.homeScore} - {match.awayScore}
                    </span>
                    <Link to={`/scorer/matches/${match.id}`}>
                      <Button variant="success" size="sm">
                        Open Scoring Desk →
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </ScorerLayout>
  );
};
