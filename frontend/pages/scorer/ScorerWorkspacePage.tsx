import React, { useEffect, useState } from 'react';
import { ScorerLayout } from '../../components/layouts/ScorerLayout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { useParams, Link } from '../../lib/router';
import { useAuthUser } from '../../context/AuthContext';
import { fetchAssignedMatchById } from '../../lib/api/scorer';
import { AssignedMatchDetails } from '../../types';

export const ScorerWorkspacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuthUser();
  const [details, setDetails] = useState<AssignedMatchDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadMatchDetails = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetchAssignedMatchById(getToken, id);
        if (isMounted) setDetails(res.data);
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load match scoring details');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadMatchDetails();
    return () => {
      isMounted = false;
    };
  }, [id, getToken]);

  return (
    <ScorerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-black">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link to="/scorer/matches" className="text-xs font-bold text-gray-500 hover:text-black">
                ← Back to Matches
              </Link>
              <span className="text-xs text-gray-300">/</span>
              <h1 className="text-2xl font-black text-brand-dark">Match Workspace #{id}</h1>
              <Badge variant="scorer">Route Foundation</Badge>
            </div>
            <p className="text-xs text-gray-600 font-medium">
              Assigned match scoring terminal and ball-by-ball operations.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Spinner size="md" label="Loading match scoring workspace..." />
          </div>
        ) : error ? (
          <Card className="bg-red-50 border-red-500 p-6 text-center space-y-3">
            <h3 className="text-base font-black text-red-950">Access Error</h3>
            <p className="text-xs text-red-800">{error}</p>
            <Link to="/scorer/matches">
              <Button variant="secondary" size="sm">
                Back to Assigned Matches
              </Button>
            </Link>
          </Card>
        ) : details ? (
          <div className="space-y-6">
            {/* Match Header Card */}
            <Card className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-gray-500">
                  {details.match.sport} • Match #{details.match.id}
                </span>
                <Badge variant={details.match.status === 'live' ? 'live' : 'default'}>
                  {details.match.status}
                </Badge>
              </div>

              <div className="flex items-center justify-between py-2 border-y-2 border-black">
                <div className="text-center sm:text-left">
                  <h2 className="text-xl font-black">{details.match.homeTeam}</h2>
                  <span className="text-2xl font-black font-mono">{details.match.homeScore}</span>
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  VS
                </div>
                <div className="text-center sm:text-right">
                  <h2 className="text-xl font-black">{details.match.awayTeam}</h2>
                  <span className="text-2xl font-black font-mono">{details.match.awayScore}</span>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                Assignment ID: #{details.assignment.id} (Status: {details.assignment.status})
              </p>
            </Card>

            {/* Phase 3 Placeholder */}
            <Card className="p-8 text-center space-y-3 bg-emerald-50/50">
              <div className="w-12 h-12 mx-auto bg-emerald-400 border-2 border-black rounded-2xl flex items-center justify-center text-xl font-black shadow-hard-sm">
                🏏
              </div>
              <h3 className="text-base font-black text-brand-dark">Cricket Scoring Controls Ready</h3>
              <p className="text-xs text-gray-600 max-w-md mx-auto">
                The backend cricket scoring engine (dot ball, 1-6 runs, boundary 4/6, wides, no-balls, wickets, idempotency keys, and over calculations) is live.
                Phase 3 will mount the interactive ball-by-ball keypad and live scorecard here.
              </p>
            </Card>
          </div>
        ) : null}
      </div>
    </ScorerLayout>
  );
};
