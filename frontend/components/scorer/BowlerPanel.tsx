import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { BowlerStats } from '../../lib/cricket/calculations';

export interface BowlerPanelProps {
  currentBowler: string;
  bowlerStats: Record<string, BowlerStats>;
  onUpdateBowler: (bowlerName: string) => void;
}

export const BowlerPanel: React.FC<BowlerPanelProps> = ({
  currentBowler,
  bowlerStats,
  onUpdateBowler,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newBowlerName, setNewBowlerName] = useState(currentBowler);

  const stats = bowlerStats[currentBowler] || {
    name: currentBowler,
    overs: '0.0',
    maidens: 0,
    runsConceded: 0,
    wickets: 0,
    economy: '0.00',
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBowlerName.trim()) {
      onUpdateBowler(newBowlerName.trim());
      setIsEditing(false);
    }
  };

  return (
    <Card variant="white" className="p-4 border-2 border-black space-y-3">
      <div className="flex items-center justify-between pb-2 border-b-2 border-black">
        <div className="flex items-center gap-2">
          <span className="text-base">🎯</span>
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-700">
            Current Bowler
          </h3>
        </div>
        <button
          type="button"
          onClick={() => {
            setNewBowlerName(currentBowler);
            setIsEditing(!isEditing);
          }}
          className="text-[10px] font-bold text-gray-500 hover:text-black underline cursor-pointer"
        >
          {isEditing ? 'Cancel' : 'Change Bowler'}
        </button>
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="flex gap-2">
          <input
            type="text"
            value={newBowlerName}
            onChange={(e) => setNewBowlerName(e.target.value)}
            placeholder="Enter bowler name"
            className="flex-1 px-3 py-1.5 rounded-lg border-2 border-black text-xs font-bold"
          />
          <Button variant="primary" size="sm" type="submit">
            Save
          </Button>
        </form>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-black text-brand-dark flex items-center gap-2">
              <span>{currentBowler || 'Bowler'}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                BOWLING
              </span>
            </h4>
          </div>

          <div className="flex items-center gap-4 text-center font-mono">
            <div>
              <span className="text-[10px] font-bold text-gray-500 block uppercase">Overs</span>
              <span className="text-base font-black">{stats.overs}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-500 block uppercase">Maidens</span>
              <span className="text-base font-black">{stats.maidens}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-500 block uppercase">Runs</span>
              <span className="text-base font-black text-amber-700">{stats.runsConceded}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-500 block uppercase">Wickets</span>
              <span className="text-base font-black text-red-600">{stats.wickets}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-500 block uppercase">Econ</span>
              <span className="text-base font-black text-blue-600">{stats.economy}</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
