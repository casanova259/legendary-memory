import React, { useEffect, useState } from 'react';
import { ScorerLayout } from '../../components/layouts/ScorerLayout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../../components/ui/Table';
import { useParams, Link } from '../../lib/router';
import { useAuthUser } from '../../context/AuthContext';
import { fetchAssignedMatchById, fetchScoringEvents } from '../../lib/api/scorer';
import { AssignedMatchDetails, ScoringEvent, Innings } from '../../types';
import {
  formatOvers,
  calculateRunRate,
  deriveBatterStats,
  deriveBowlerStats,
  deriveFallOfWickets,
  deriveExtrasBreakdown,
} from '../../lib/cricket/calculations';

export const ScorerScorecardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuthUser();
  const [details, setDetails] = useState<AssignedMatchDetails | null>(null);
  const [allEvents, setAllEvents] = useState<ScoringEvent[]>([]);
  const [selectedInningsNumber, setSelectedInningsNumber] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadScorecard = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const [matchRes, eventsRes] = await Promise.all([
        fetchAssignedMatchById(getToken, id),
        fetchScoringEvents(getToken, id, { limit: 200 }),
      ]);
      setDetails(matchRes.data);
      setAllEvents(eventsRes.data || []);
      if (matchRes.data.innings && matchRes.data.innings.length > 0) {
        // Default to latest innings
        setSelectedInningsNumber(matchRes.data.innings[matchRes.data.innings.length - 1].inningsNumber);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load match scorecard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadScorecard();
  }, [id, getToken]);

  if (isLoading) {
    return (
      <ScorerLayout>
        <div className="py-24 flex justify-center">
          <Spinner size="lg" label="Generating official match scorecard..." />
        </div>
      </ScorerLayout>
    );
  }

  if (error || !details) {
    return (
      <ScorerLayout>
        <Card className="p-8 bg-red-50 border-2 border-red-500 text-center space-y-4 max-w-lg mx-auto my-12">
          <h2 className="text-xl font-black text-red-950">Scorecard Unavailable</h2>
          <p className="text-xs text-red-800">{error || 'Could not load match data.'}</p>
          <Link to="/scorer/matches">
            <Button variant="secondary" size="sm">
              Back to My Matches
            </Button>
          </Link>
        </Card>
      </ScorerLayout>
    );
  }

  const { match, innings = [] } = details;
  const activeInnings: Innings | undefined = innings.find((inn) => inn.inningsNumber === selectedInningsNumber);
  const inningsEvents = allEvents.filter((e) => activeInnings && e.inningsId === activeInnings.id);

  const batterStats = deriveBatterStats(inningsEvents);
  const bowlerStats = deriveBowlerStats(inningsEvents);
  const fallOfWickets = deriveFallOfWickets(inningsEvents);
  const extrasBreakdown = deriveExtrasBreakdown(inningsEvents);

  const totalRuns = activeInnings?.totalRuns ?? 0;
  const wickets = activeInnings?.wickets ?? 0;
  const legalBalls = activeInnings?.legalBalls ?? 0;
  const crr = calculateRunRate(totalRuns, legalBalls);

  return (
    <ScorerLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-black">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link to={`/scorer/matches/${match.id}`} className="text-xs font-bold text-gray-500 hover:text-black">
                ← Match Overview
              </Link>
              <span className="text-xs text-gray-300">/</span>
              <h1 className="text-2xl font-black text-brand-dark">Match Scorecard #{match.id}</h1>
              <Badge variant={match.status === 'live' ? 'live' : 'default'} className="uppercase">
                {match.status}
              </Badge>
            </div>
            <p className="text-xs text-gray-600 font-medium">
              Official ball-by-ball certified scorecard for {match.homeTeam} vs {match.awayTeam}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(match.status === 'live' || match.status === 'paused') && (
              <Link to={`/scorer/matches/${match.id}/live`}>
                <Button variant="success" size="sm" className="font-black shadow-hard-xs">
                  Open Live Console ⚡
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="sm" onClick={loadScorecard}>
              ↻ Refresh
            </Button>
          </div>
        </div>

        {/* Hero Score Strip */}
        <Card variant="white" className="p-6 border-4 border-black shadow-hard-md space-y-4">
          <div className="flex items-center justify-between py-2 border-b-2 border-black">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-brand-dark">
                {match.homeTeam} vs {match.awayTeam}
              </h2>
              <p className="text-xs text-gray-500 font-bold">
                {match.sport.toUpperCase()} • {match.startTime ? new Date(match.startTime).toLocaleDateString() : ''}
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-black font-mono text-brand-dark">
                {match.homeScore} - {match.awayScore}
              </span>
            </div>
          </div>

          {/* Innings Selector Tabs */}
          <div className="flex items-center gap-2 pt-2">
            {innings.map((inn) => (
              <button
                key={inn.id}
                onClick={() => setSelectedInningsNumber(inn.inningsNumber)}
                className={`px-4 py-2 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                  selectedInningsNumber === inn.inningsNumber
                    ? 'bg-brand-yellow text-black border-black shadow-hard-xs'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-black'
                }`}
              >
                Innings {inn.inningsNumber} ({inn.battingTeam}) — {inn.totalRuns}/{inn.wickets}
              </button>
            ))}
          </div>
        </Card>

        {activeInnings ? (
          <div className="space-y-6">
            {/* Innings Banner */}
            <div className="p-4 bg-emerald-50 rounded-2xl border-2 border-black flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-hard-xs">
              <div>
                <span className="text-xs font-black uppercase text-emerald-900 tracking-wider">
                  Innings {activeInnings.inningsNumber}: {activeInnings.battingTeam} Batting
                </span>
                <div className="text-3xl font-black font-mono text-brand-dark">
                  {totalRuns}/{wickets} <span className="text-base text-gray-500 font-normal">({formatOvers(legalBalls)} ov)</span>
                </div>
              </div>
              <div className="text-right font-mono text-xs font-bold text-gray-700 space-y-0.5">
                <div>Current Run Rate: <strong className="text-blue-700 text-sm">{crr}</strong></div>
                {activeInnings.target && (
                  <div className="text-amber-800">Target: <strong>{activeInnings.target}</strong> runs</div>
                )}
              </div>
            </div>

            {/* Batting Scorecard */}
            <Card variant="white" className="p-4 sm:p-6 border-2 border-black space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-2 pb-2 border-b-2 border-black">
                <span>🏏 Batting</span>
              </h3>

              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Batter</TableHeaderCell>
                    <TableHeaderCell>Dismissal</TableHeaderCell>
                    <TableHeaderCell className="text-right">R</TableHeaderCell>
                    <TableHeaderCell className="text-right">B</TableHeaderCell>
                    <TableHeaderCell className="text-right">4s</TableHeaderCell>
                    <TableHeaderCell className="text-right">6s</TableHeaderCell>
                    <TableHeaderCell className="text-right">SR</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.values(batterStats).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-xs text-gray-400 py-6">
                        No batting records logged for this innings.
                      </TableCell>
                    </TableRow>
                  ) : (
                    Object.values(batterStats).map((b) => (
                      <TableRow key={b.name}>
                        <TableCell className="font-black text-brand-dark">{b.name}</TableCell>
                        <TableCell className="text-xs text-gray-500 font-medium">
                          {b.isOut ? b.dismissal || 'Out' : <span className="text-emerald-600 font-bold">not out</span>}
                        </TableCell>
                        <TableCell className="text-right font-mono font-black text-sm">{b.runs}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{b.balls}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-amber-700 font-bold">{b.fours}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-purple-700 font-bold">{b.sixes}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold">{b.strikeRate}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Extras and Total Row */}
              <div className="pt-3 border-t-2 border-gray-100 space-y-1.5 text-xs font-bold text-gray-700">
                <div className="flex justify-between">
                  <span>
                    Extras: <span className="font-normal text-gray-500">(WD {extrasBreakdown.wides}, NB {extrasBreakdown.noBalls}, B {extrasBreakdown.byes}, LB {extrasBreakdown.legByes})</span>
                  </span>
                  <span className="font-mono font-black text-sm">{extrasBreakdown.total}</span>
                </div>
                <div className="flex justify-between text-sm font-black border-t-2 border-black pt-1">
                  <span>Total</span>
                  <span className="font-mono text-base">{totalRuns}/{wickets} ({formatOvers(legalBalls)} ov)</span>
                </div>
              </div>
            </Card>

            {/* Bowling Scorecard */}
            <Card variant="white" className="p-4 sm:p-6 border-2 border-black space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-2 pb-2 border-b-2 border-black">
                <span>🎯 Bowling</span>
              </h3>

              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Bowler</TableHeaderCell>
                    <TableHeaderCell className="text-right">O</TableHeaderCell>
                    <TableHeaderCell className="text-right">M</TableHeaderCell>
                    <TableHeaderCell className="text-right">R</TableHeaderCell>
                    <TableHeaderCell className="text-right">W</TableHeaderCell>
                    <TableHeaderCell className="text-right">Econ</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.values(bowlerStats).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-xs text-gray-400 py-6">
                        No bowling spells recorded for this innings.
                      </TableCell>
                    </TableRow>
                  ) : (
                    Object.values(bowlerStats).map((bw) => (
                      <TableRow key={bw.name}>
                        <TableCell className="font-black text-brand-dark">{bw.name}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold">{bw.overs}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{bw.maidens}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-amber-800 font-bold">{bw.runsConceded}</TableCell>
                        <TableCell className="text-right font-mono font-black text-sm text-red-600">{bw.wickets}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold">{bw.economy}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>

            {/* Fall of Wickets */}
            {fallOfWickets.length > 0 && (
              <Card variant="white" className="p-4 border-2 border-black space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-700">
                  Fall of Wickets (FoW)
                </h4>
                <div className="flex flex-wrap gap-2 pt-1 font-mono text-xs">
                  {fallOfWickets.map((f) => (
                    <span
                      key={f.wicketNumber}
                      className="px-2.5 py-1 bg-red-50 border border-red-300 rounded-lg text-red-950 font-bold"
                    >
                      {f.score}/{f.wicketNumber} ({f.player}, {f.overs} ov)
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {/* Ball-by-Ball Event Ledger */}
            <Card variant="white" className="p-4 sm:p-6 border-2 border-black space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-2 pb-2 border-b-2 border-black">
                <span>📋 Ball-by-Ball Delivery Log ({inningsEvents.length})</span>
              </h3>

              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {inningsEvents.map((e) => (
                  <div
                    key={e.id}
                    className={`p-2 rounded-lg border text-xs flex items-center justify-between font-mono ${
                      e.isReversed ? 'bg-gray-100 opacity-60 line-through' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 font-bold">#{e.eventSequence}</span>
                      <span>{e.bowler || 'Bowler'} to {e.batter || 'Batter'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-brand-dark">
                        {e.wicketType && e.wicketType !== 'none'
                          ? `WKT: ${e.wicketType}`
                          : e.extrasType !== 'none'
                          ? `${e.extrasRuns} ${e.extrasType.toUpperCase()}`
                          : `${e.runsOffBat} runs`}
                      </span>
                      {e.isReversed && (
                        <span className="text-[10px] text-red-600 font-sans font-bold no-underline">
                          [REVERSED]
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : (
          <Card className="text-center py-12 space-y-2 border-2 border-black">
            <p className="text-sm font-bold text-gray-700">No innings recorded for this match.</p>
          </Card>
        )}
      </div>
    </ScorerLayout>
  );
};
