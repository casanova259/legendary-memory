import React from 'react';
import { ScoringEvent } from '../../types';

export interface OverTimelineProps {
  events: ScoringEvent[];
  legalBallsInCurrentOver: number;
}

export const OverTimeline: React.FC<OverTimelineProps> = ({
  events,
  legalBallsInCurrentOver,
}) => {
  // Sort events chronologically
  const activeEvents = events
    .filter((e) => !e.isReversed)
    .sort((a, b) => a.eventSequence - b.eventSequence);

  // Take the last 12 events to display
  const recentEvents = activeEvents.slice(-12);

  const getBallBadge = (e: ScoringEvent, isLatest: boolean) => {
    let label = `${e.runsOffBat}`;
    let style = 'bg-gray-100 border-gray-400 text-gray-800';

    if (e.wicketType && e.wicketType !== 'none') {
      label = 'W';
      style = 'bg-red-600 border-red-800 text-white font-black';
    } else if (e.extrasType === 'wide') {
      label = e.extrasRuns > 1 ? `${e.extrasRuns}WD` : 'WD';
      style = 'bg-amber-400 border-amber-600 text-black font-black';
    } else if (e.extrasType === 'no_ball') {
      label = e.runsOffBat > 0 ? `${1 + e.runsOffBat}NB` : 'NB';
      style = 'bg-amber-500 border-amber-700 text-black font-black';
    } else if (e.extrasType === 'bye') {
      label = `${e.extrasRuns}B`;
      style = 'bg-blue-100 border-blue-400 text-blue-900 font-bold';
    } else if (e.extrasType === 'leg_bye') {
      label = `${e.extrasRuns}LB`;
      style = 'bg-blue-100 border-blue-400 text-blue-900 font-bold';
    } else if (e.runsOffBat === 4) {
      label = '4';
      style = 'bg-brand-yellow border-black text-black font-black';
    } else if (e.runsOffBat === 6) {
      label = '6';
      style = 'bg-purple-600 border-purple-900 text-white font-black';
    } else if (e.runsOffBat === 0) {
      label = '•';
      style = 'bg-gray-200 border-gray-400 text-gray-700 font-bold';
    }

    return (
      <div
        key={e.id}
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center text-xs font-mono transition-transform ${style} ${
          isLatest ? 'ring-2 ring-black scale-110 shadow-hard-xs animate-bounce' : ''
        }`}
        title={`Seq #${e.eventSequence}: ${e.bowler || 'Bowler'} to ${e.batter || 'Batter'} - ${label}`}
      >
        {label}
      </div>
    );
  };

  return (
    <div className="bg-white p-3 rounded-2xl border-2 border-black shadow-hard-xs space-y-2">
      <div className="flex items-center justify-between text-xs font-bold text-gray-600">
        <span className="flex items-center gap-1.5">
          <span>🎾</span>
          <span className="uppercase tracking-wider">This Over ({legalBallsInCurrentOver % 6}/6)</span>
        </span>
        <span className="text-[10px] text-gray-400">Recent Deliveries →</span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto py-1">
        {recentEvents.length === 0 ? (
          <span className="text-xs text-gray-400 italic py-2">No deliveries bowled yet.</span>
        ) : (
          recentEvents.map((e, idx) => getBallBadge(e, idx === recentEvents.length - 1))
        )}
      </div>
    </div>
  );
};
