import React, { useEffect, useState } from 'react';
import { ScorerLayout } from '../../components/layouts/ScorerLayout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { useParams, Link, useNavigate } from '../../lib/router';
import { useAuthUser } from '../../context/AuthContext';
import { fetchAssignedMatchById, startMatch } from '../../lib/api/scorer';
import { fetchMatchCommentary } from '../../lib/api/matches';
import { AssignedMatchDetails, Commentary } from '../../types';
import { formatOvers } from '../../lib/cricket/calculations';

export const ScorerMatchOverviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getToken } = useAuthUser();
  const [details, setDetails] = useState<AssignedMatchDetails | null>(null);
  const [commentaryList, setCommentaryList] = useState<Commentary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const [matchRes, commRes] = await Promise.all([
        fetchAssignedMatchById(getToken, id),
        fetchMatchCommentary(id, 20).catch(() => ({ data: [] })),
      ]);
      setDetails(matchRes.data);
      setCommentaryList(commRes.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load match details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, getToken]);

  const handleStartMatch = async () => {
    if (!id) return;
    try {
      setIsStarting(true);
      await startMatch(getToken, id);
      navigate(`/scorer/matches/${id}/live`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start match');
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <ScorerLayout>
        <div className="py-20 flex justify-center">
          <Spinner size="lg" label="Loading match details..." />
        </div>
      </ScorerLayout>
    );
  }

  if (error || !details) {
    return (
      <ScorerLayout>
        <Card className="p-8 bg-red-50 border-2 border-red-500 text-center space-y-4 max-w-lg mx-auto my-12">
          <h2 className="text-xl font-black text-red-950">Match Access Restricted</h2>
          <p className="text-xs text-red-800">
            {error || 'Unable to access this match. Please verify your assignment.'}
          </p>
          <Link to="/scorer/matches">
            <Button variant="secondary" size="sm">
              Back to My Matches
            </Button>
          </Link>
        </Card>
      </ScorerLayout>
    );
  }

  const { match, assignment, innings, recentEvents = [] } = details;
  const isScheduled = match.status === 'scheduled';
  const isLive = match.status === 'live' || match.status === 'paused';
  const isCompleted = match.status === 'completed' || match.status === 'finished';

  return (
    <ScorerLayout>
      <div className="space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-black">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link to="/scorer/matches" className="text-xs font-bold text-gray-500 hover:text-black">
                ← Assigned Matches
              </Link>
              <span className="text-xs text-gray-300">/</span>
              <h1 className="text-2xl font-black text-brand-dark">Match Overview #{match.id}</h1>
              <Badge variant={isLive ? 'live' : 'default'} className="uppercase">
                {match.status}
              </Badge>
            </div>
            <p className="text-xs text-gray-600 font-medium">
              Official scoring desk and fixture operations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isScheduled && (
              <>
                <Link to={`/scorer/matches/${match.id}/setup`}>
                  <Button variant="primary" size="sm" className="font-black">
                    Match Setup ⚙️
                  </Button>
                </Link>
                <Button variant="success" size="sm" onClick={handleStartMatch} disabled={isStarting} className="font-black shadow-hard-xs">
                  {isStarting ? 'Starting...' : 'Quick Start Match ▶'}
                </Button>
              </>
            )}

            {isLive && (
              <Link to={`/scorer/matches/${match.id}/live`}>
                <Button variant="success" size="sm" className="font-black shadow-hard-xs">
                  Open Scoring Console ⚡
                </Button>
              </Link>
            )}

            <Link to={`/scorer/matches/${match.id}/scorecard`}>
              <Button variant="secondary" size="sm" className="font-bold">
                View Scorecard 📋
              </Button>
            </Link>
          </div>
        </div>

        {/* Hero Card */}
        <Card variant="white" className="p-6 border-4 border-black shadow-hard-md space-y-4">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-gray-500">
            <span>{match.sport.toUpperCase()} • ID: #{match.id}</span>
            <span>Assignment: {assignment.status.toUpperCase()}</span>
          </div>

          <div className="flex items-center justify-between py-4 border-y-2 border-black">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase text-gray-500">Home Team</span>
              <h2 className="text-2xl sm:text-3xl font-black text-brand-dark">{match.homeTeam}</h2>
              <span className="text-3xl font-black font-mono">{match.homeScore}</span>
            </div>
            <div className="text-center px-4">
              <div className="w-10 h-10 rounded-full border-2 border-black bg-brand-yellow flex items-center justify-center font-black text-xs shadow-hard-xs mx-auto">
                VS
              </div>
            </div>
            <div className="text-right space-y-1">
              <span className="text-xs font-bold uppercase text-gray-500">Away Team</span>
              <h2 className="text-2xl sm:text-3xl font-black text-brand-dark">{match.awayTeam}</h2>
              <span className="text-3xl font-black font-mono">{match.awayScore}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1 text-gray-600">
            <div>
              <span className="font-bold block text-gray-400 uppercase text-[10px]">Start Time</span>
              <span className="font-bold">{match.startTime ? new Date(match.startTime).toLocaleString() : 'Not specified'}</span>
            </div>
            <div>
              <span className="font-bold block text-gray-400 uppercase text-[10px]">Active Scorer</span>
              <span className="font-bold text-emerald-700">You (Assigned ID #{assignment.scorerId})</span>
            </div>
            <div>
              <span className="font-bold block text-gray-400 uppercase text-[10px]">Innings Recorded</span>
              <span className="font-bold">{innings.length} Innings</span>
            </div>
          </div>
        </Card>

        {/* Innings Summaries */}
        <div className="space-y-3">
          <h2 className="text-base font-black text-brand-dark flex items-center gap-2">
            <span>🏏 Innings Breakdown</span>
          </h2>

          {innings.length === 0 ? (
            <Card className="p-6 text-center text-xs text-gray-500 border-2 border-dashed border-gray-300">
              Innings have not been started yet. Click &quot;Match Setup&quot; or &quot;Quick Start Match&quot; to begin.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {innings.map((inn) => (
                <Card key={inn.id} className="p-4 space-y-2 border-2 border-black">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-brand-dark">
                      Innings {inn.inningsNumber}: {inn.battingTeam}
                    </span>
                    <Badge variant={inn.status === 'live' ? 'live' : 'default'}>
                      {inn.status}
                    </Badge>
                  </div>
                  <div className="flex items-baseline justify-between pt-2 border-t border-gray-100 font-mono">
                    <span className="text-3xl font-black">
                      {inn.totalRuns}/{inn.wickets}
                    </span>
                    <span className="text-xs text-gray-600 font-bold">
                      Overs: {formatOvers(inn.legalBalls)} • Extras: {inn.extras}
                    </span>
                  </div>
                  {inn.target && (
                    <p className="text-[11px] font-bold text-amber-800 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                      🎯 Target: {inn.target} runs
                    </p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Recent Events & Commentary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Deliveries */}
          <Card variant="white" className="p-4 border-2 border-black space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <span>🎾 Recent Deliveries ({recentEvents.length})</span>
            </h3>

            {recentEvents.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4 text-center">No deliveries recorded yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {recentEvents.map((e) => (
                  <div
                    key={e.id}
                    className="p-2 rounded-lg border border-gray-200 text-xs flex items-center justify-between font-mono"
                  >
                    <span>
                      Ball #{e.eventSequence}: {e.bowler || 'Bowler'} to {e.batter || 'Batter'}
                    </span>
                    <span className="font-black text-brand-dark">
                      {e.wicketType && e.wicketType !== 'none'
                        ? `WKT (${e.wicketType})`
                        : e.extrasType !== 'none'
                        ? `${e.extrasRuns} ${e.extrasType.toUpperCase()}`
                        : `${e.runsOffBat} runs`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Commentary */}
          <Card variant="white" className="p-4 border-2 border-black space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <span>🎙️ Recent Commentary</span>
            </h3>

            {commentaryList.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4 text-center">No commentary logged yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {commentaryList.slice(0, 10).map((c) => (
                  <div key={c.id} className="p-2 rounded-lg bg-gray-50 border border-gray-200 text-xs space-y-0.5">
                    <span className="text-[10px] font-mono font-bold text-gray-500 block">
                      {c.period || 'Over'}
                    </span>
                    <p className="text-gray-800 font-medium">{c.message}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </ScorerLayout>
  );
};
