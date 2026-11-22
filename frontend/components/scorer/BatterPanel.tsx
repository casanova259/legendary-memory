import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { BatterStats } from '../../lib/cricket/calculations';

export interface BatterPanelProps {
  strikerName: string;
  nonStrikerName: string;
  batterStats: Record<string, BatterStats>;
  onSwapStrike: () => void;
  onUpdateBatters: (striker: string, nonStriker: string) => void;
}

export const BatterPanel: React.FC<BatterPanelProps> = ({
  strikerName,
  nonStrikerName,
  batterStats,
  onSwapStrike,
  onUpdateBatters,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editStriker, setEditStriker] = useState(strikerName);
  const [editNonStriker, setEditNonStriker] = useState(nonStrikerName);

  const strikerStat = batterStats[strikerName] || {
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    strikeRate: '0.0',
  };

  const nonStrikerStat = batterStats[nonStrikerName] || {
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    strikeRate: '0.0',
  };

  const handleSaveBatters = (e: React.FormEvent) => {
    e.preventDefault();
    if (editStriker.trim() && editNonStriker.trim()) {
      onUpdateBatters(editStriker.trim(), editNonStriker.trim());
      setIsEditing(false);
    }
  };

  return (
    <Card variant="white" className="p-4 border-2 border-black space-y-3">
      <div className="flex items-center justify-between pb-2 border-b-2 border-black">
        <div className="flex items-center gap-2">
          <span className="text-base">🏏</span>
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-700">
            Batters at the Crease
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onSwapStrike}
            className="text-[11px] py-1 px-2.5 h-auto flex items-center gap-1"
            title="Swap active striker and non-striker"
          >
            <span>⇄</span> Swap Strike
          </Button>
          <button
            type="button"
            onClick={() => {
              setEditStriker(strikerName);
              setEditNonStriker(nonStrikerName);
              setIsEditing(!isEditing);
            }}
            className="text-[10px] font-bold text-gray-500 hover:text-black underline cursor-pointer"
          >
            {isEditing ? 'Cancel' : 'Edit Names'}
          </button>
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleSaveBatters} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[10px] font-bold text-gray-600 mb-1">Striker Name</label>
            <input
              type="text"
              value={editStriker}
              onChange={(e) => setEditStriker(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border-2 border-black text-xs font-bold"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-600 mb-1">Non-Striker Name</label>
            <input
              type="text"
              value={editNonStriker}
              onChange={(e) => setEditNonStriker(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border-2 border-black text-xs font-bold"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button variant="success" size="sm" type="submit">
              Save Batter Names
            </Button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Active Striker */}
          <div className="p-3 rounded-xl border-2 border-black bg-brand-yellow/30 shadow-hard-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-brand-dark flex items-center gap-1.5">
                <span className="text-sm">⚡</span> {strikerName || 'Striker'}
              </span>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-brand-yellow border border-black text-black">
                ON STRIKE
              </span>
            </div>
            <div className="flex items-baseline justify-between pt-1 font-mono">
              <span className="text-xl font-black">
                {strikerStat.runs}{' '}
                <span className="text-xs font-normal text-gray-600">({strikerStat.balls}b)</span>
              </span>
              <span className="text-xs text-gray-600 font-bold">
                4s: {strikerStat.fours} • 6s: {strikerStat.sixes} • SR: {strikerStat.strikeRate}
              </span>
            </div>
          </div>

          {/* Non-Striker */}
          <div className="p-3 rounded-xl border-2 border-gray-200 bg-gray-50/50 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">
                {nonStrikerName || 'Non-Striker'}
              </span>
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">
                NON-STRIKER
              </span>
            </div>
            <div className="flex items-baseline justify-between pt-1 font-mono">
              <span className="text-xl font-black text-gray-800">
                {nonStrikerStat.runs}{' '}
                <span className="text-xs font-normal text-gray-500">({nonStrikerStat.balls}b)</span>
              </span>
              <span className="text-xs text-gray-500 font-bold">
                4s: {nonStrikerStat.fours} • 6s: {nonStrikerStat.sixes} • SR: {nonStrikerStat.strikeRate}
              </span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
