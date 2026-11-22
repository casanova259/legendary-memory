import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Innings } from '../../types';
import { formatOvers, calculateRunRate, calculateRequiredRunRate } from '../../lib/cricket/calculations';

export interface LiveScoreboardProps {
  matchStatus: string;
  innings?: Innings | null;
  homeTeam: string;
  awayTeam: string;
}

export const LiveScoreboard: React.FC<LiveScoreboardProps> = ({
  matchStatus,
  innings,
  homeTeam,
  awayTeam,
}) => {
  const totalRuns = innings?.totalRuns ?? 0;
  const wickets = innings?.wickets ?? 0;
  const legalBalls = innings?.legalBalls ?? 0;
  const target = innings?.target ?? null;
  const battingTeam = innings?.battingTeam ?? homeTeam;
  const bowlingTeam = innings?.bowlingTeam ?? awayTeam;

  const oversFormatted = formatOvers(legalBalls);
  const crr = calculateRunRate(totalRuns, legalBalls);
  const rrr = target ? calculateRequiredRunRate(target, totalRuns, 20, legalBalls) : null;
  const runsNeeded = target ? target - totalRuns : null;

  return (
    <Card variant="white" className="p-4 sm:p-6 border-4 border-black shadow-hard-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-2 border-black">
        {/* Teams and Innings */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base sm:text-lg font-black text-brand-dark">
              {battingTeam} vs {bowlingTeam}
            </span>
            <Badge variant={matchStatus === 'live' ? 'live' : 'default'} className="uppercase">
              {matchStatus}
            </Badge>
          </div>
          <p className="text-xs text-gray-600 font-bold">
            {innings ? `Innings ${innings.inningsNumber}: ${battingTeam} Batting` : 'Match Not Started'}
          </p>
        </div>

        {/* Target summary if 2nd innings */}
        {target && (
          <div className="bg-amber-100 border-2 border-black rounded-xl px-3 py-1.5 text-xs font-bold text-amber-950 flex items-center gap-2">
            <span>🎯 Target: {target}</span>
            <span className="text-gray-400">|</span>
            <span>
              {runsNeeded && runsNeeded > 0
                ? `Need ${runsNeeded} runs to win`
                : 'Target Reached!'}
            </span>
          </div>
        )}
      </div>

      {/* Main Numbers: Runs, Wickets, Overs, CRR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-center">
        <div className="space-y-0.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
            Score (Runs / Wickets)
          </span>
          <div className="text-4xl sm:text-5xl font-black font-mono text-brand-dark">
            {totalRuns}<span className="text-gray-400">/</span>{wickets}
          </div>
          <span className="text-[11px] text-gray-600 font-medium">
            {wickets >= 10 ? 'All Out' : `${10 - wickets} wickets in hand`}
          </span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
            Overs Bowled
          </span>
          <div className="text-4xl sm:text-5xl font-black font-mono text-emerald-600">
            {oversFormatted}
          </div>
          <span className="text-[11px] text-gray-500 font-medium font-mono">
            {legalBalls} legal deliveries
          </span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
            Run Rate (CRR)
          </span>
          <div className="text-3xl sm:text-4xl font-black font-mono text-blue-600">
            {crr}
          </div>
          <span className="text-[11px] text-gray-500 font-medium">Runs per over</span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
            {target ? 'Req Run Rate (RRR)' : 'Extras'}
          </span>
          <div className="text-3xl sm:text-4xl font-black font-mono text-purple-600">
            {target ? rrr || '0.00' : innings?.extras || 0}
          </div>
          <span className="text-[11px] text-gray-500 font-medium">
            {target ? 'Required per over' : 'Total extras conceded'}
          </span>
        </div>
      </div>
    </Card>
  );
};
