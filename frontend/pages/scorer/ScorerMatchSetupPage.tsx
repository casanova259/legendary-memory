import React, { useEffect, useState } from 'react';
import { ScorerLayout } from '../../components/layouts/ScorerLayout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { useParams, Link, useNavigate } from '../../lib/router';
import { useAuthUser } from '../../context/AuthContext';
import { fetchAssignedMatchById, startMatch, createInnings } from '../../lib/api/scorer';
import { AssignedMatchDetails } from '../../types';

export const ScorerMatchSetupPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getToken } = useAuthUser();
  const [details, setDetails] = useState<AssignedMatchDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Match setup form state
  const [tossWinner, setTossWinner] = useState<string>('');
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl'>('bat');
  const [battingTeam, setBattingTeam] = useState<string>('');
  const [oversLimit, setOversLimit] = useState<number>(20);

  useEffect(() => {
    let isMounted = true;
    const loadDetails = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetchAssignedMatchById(getToken, id);
        if (isMounted) {
          setDetails(res.data);
          const home = res.data.match.homeTeam;
          setTossWinner(home);
          setBattingTeam(home);
        }
      } catch (err: unknown) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to load match setup');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadDetails();
    return () => {
      isMounted = false;
    };
  }, [id, getToken]);

  const handleTossChange = (winner: string, decision: 'bat' | 'bowl') => {
    setTossWinner(winner);
    setTossDecision(decision);
    if (!details) return;
    const home = details.match.homeTeam;
    const away = details.match.awayTeam;
    const opponent = winner === home ? away : home;
    setBattingTeam(decision === 'bat' ? winner : opponent);
  };

  const handleStartMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !details) return;

    try {
      setIsStarting(true);
      setError(null);

      // Start match via backend endpoint
      await startMatch(getToken, id);

      // If away team was selected to bat first instead of home team,
      // initialize custom Innings 1 with the selected batting team.
      if (battingTeam && battingTeam !== details.match.homeTeam) {
        const bowlingTeam = battingTeam === details.match.homeTeam ? details.match.awayTeam : details.match.homeTeam;
        await createInnings(getToken, id, {
          inningsNumber: 1,
          battingTeam,
          bowlingTeam,
        });
      }

      // Navigate immediately to live scoring console
      navigate(`/scorer/matches/${id}/live`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start match and initialize innings');
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <ScorerLayout>
        <div className="py-20 flex justify-center">
          <Spinner size="lg" label="Loading match setup wizard..." />
        </div>
      </ScorerLayout>
    );
  }

  if (error && !details) {
    return (
      <ScorerLayout>
        <Card className="p-8 bg-red-50 border-2 border-red-500 text-center space-y-4 max-w-lg mx-auto my-12">
          <h2 className="text-xl font-black text-red-950">Setup Error</h2>
          <p className="text-xs text-red-800">{error}</p>
          <Link to="/scorer/matches">
            <Button variant="secondary" size="sm">
              Back to My Matches
            </Button>
          </Link>
        </Card>
      </ScorerLayout>
    );
  }

  const { match } = details!;
  const home = match.homeTeam;
  const away = match.awayTeam;
  const bowlingTeam = battingTeam === home ? away : home;

  return (
    <ScorerLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-black">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link to={`/scorer/matches/${match.id}`} className="text-xs font-bold text-gray-500 hover:text-black">
                ← Match #{match.id}
              </Link>
              <span className="text-xs text-gray-300">/</span>
              <h1 className="text-2xl font-black text-brand-dark">Match Setup & Toss</h1>
              <Badge variant="scorer">Cricket Pre-Match</Badge>
            </div>
            <p className="text-xs text-gray-600 font-medium">
              Configure toss outcome, batting order, and initialize the official match scoring session.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border-2 border-red-500 rounded-xl text-xs font-bold text-red-950">
            {error}
          </div>
        )}

        <form onSubmit={handleStartMatch} className="space-y-6">
          {/* Match Fixture Summary */}
          <Card variant="white" className="p-6 border-4 border-black shadow-hard-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-gray-500">Fixture Confirmation</span>
              <Badge variant="default" className="uppercase">{match.status}</Badge>
            </div>

            <div className="flex items-center justify-between py-3 border-y-2 border-black text-center">
              <div className="flex-1">
                <span className="text-xs font-bold text-gray-500 block">HOME</span>
                <span className="text-xl font-black text-brand-dark">{home}</span>
              </div>
              <span className="text-sm font-black px-3 py-1 bg-brand-yellow border-2 border-black rounded-lg">
                VS
              </span>
              <div className="flex-1">
                <span className="text-xs font-bold text-gray-500 block">AWAY</span>
                <span className="text-xl font-black text-brand-dark">{away}</span>
              </div>
            </div>

            {/* Toss Winner */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-gray-700">
                1. Toss Winner
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleTossChange(home, tossDecision)}
                  className={`p-3 rounded-xl border-2 text-xs font-black transition-all ${
                    tossWinner === home
                      ? 'border-black bg-brand-yellow shadow-hard-xs'
                      : 'border-gray-200 hover:border-black'
                  }`}
                >
                  🪙 {home} (Home)
                </button>
                <button
                  type="button"
                  onClick={() => handleTossChange(away, tossDecision)}
                  className={`p-3 rounded-xl border-2 text-xs font-black transition-all ${
                    tossWinner === away
                      ? 'border-black bg-brand-yellow shadow-hard-xs'
                      : 'border-gray-200 hover:border-black'
                  }`}
                >
                  🪙 {away} (Away)
                </button>
              </div>
            </div>

            {/* Toss Decision */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-gray-700">
                2. Toss Decision
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleTossChange(tossWinner, 'bat')}
                  className={`p-3 rounded-xl border-2 text-xs font-black transition-all ${
                    tossDecision === 'bat'
                      ? 'border-black bg-emerald-400 shadow-hard-xs'
                      : 'border-gray-200 hover:border-black'
                  }`}
                >
                  🏏 Elected to Bat First
                </button>
                <button
                  type="button"
                  onClick={() => handleTossChange(tossWinner, 'bowl')}
                  className={`p-3 rounded-xl border-2 text-xs font-black transition-all ${
                    tossDecision === 'bowl'
                      ? 'border-black bg-emerald-400 shadow-hard-xs'
                      : 'border-gray-200 hover:border-black'
                  }`}
                >
                  🎯 Elected to Bowl (Field First)
                </button>
              </div>
            </div>

            {/* Resolved Batting & Bowling Teams */}
            <div className="p-4 bg-gray-50 rounded-2xl border-2 border-black space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block">
                Innings 1 Teams (Derived from Toss)
              </span>
              <div className="flex items-center justify-between text-xs font-bold">
                <span>
                  Batting First: <strong className="text-emerald-700 text-sm">{battingTeam}</strong>
                </span>
                <span>
                  Bowling First: <strong className="text-gray-900 text-sm">{bowlingTeam}</strong>
                </span>
              </div>
            </div>

            {/* Overs Format */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-gray-700">
                3. Match Format / Maximum Overs
              </label>
              <div className="flex gap-3">
                {[10, 20, 50].map((overs) => (
                  <button
                    key={overs}
                    type="button"
                    onClick={() => setOversLimit(overs)}
                    className={`flex-1 py-2 rounded-xl border-2 text-xs font-black transition-all ${
                      oversLimit === overs
                        ? 'border-black bg-black text-white shadow-hard-xs'
                        : 'border-gray-200 hover:border-black'
                    }`}
                  >
                    {overs} Overs (T{overs})
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-500">
                Backend manages legal balls and wickets dynamically.
              </p>
            </div>
          </Card>

          {/* Start Actions */}
          <div className="flex items-center justify-between pt-2">
            <Link to={`/scorer/matches/${match.id}`}>
              <Button variant="ghost" size="md">
                Cancel
              </Button>
            </Link>
            <Button
              variant="success"
              size="lg"
              type="submit"
              disabled={isStarting}
              className="font-black text-base shadow-hard-md"
            >
              {isStarting ? 'Starting Match & Launching...' : 'Start Match & Launch Console ⚡'}
            </Button>
          </div>
        </form>
      </div>
    </ScorerLayout>
  );
};
