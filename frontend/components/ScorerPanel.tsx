import React, { useState } from 'react';
import { Match } from '../types';
import { createCommentary, updateScore } from '../services/api';

interface ScorerPanelProps {
  activeMatch: Match | null;
  getToken: () => Promise<string | null>;
  onScoreUpdated: (updatedMatch: Match) => void;
  onCommentaryPosted: () => void;
}

export const ScorerPanel: React.FC<ScorerPanelProps> = ({
  activeMatch,
  getToken,
  onScoreUpdated,
  onCommentaryPosted,
}) => {
  const [isUpdatingScore, setIsUpdatingScore] = useState(false);
  const [isPostingCommentary, setIsPostingCommentary] = useState(false);
  const [message, setMessage] = useState('');
  const [eventType, setEventType] = useState('point');
  const [minute, setMinute] = useState<number>(10);
  const [period, setPeriod] = useState('1st Half');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!activeMatch) {
    return (
      <div className="bg-emerald-50 border-2 border-emerald-600 rounded-2xl p-6 shadow-hard mb-6">
        <h3 className="text-lg font-black text-emerald-950 mb-2">⚡ Scorer Desk</h3>
        <p className="text-sm text-emerald-800">
          Please select a match from the list below by clicking <strong>"Watch Live"</strong> to enable score updates and live commentary.
        </p>
      </div>
    );
  }

  const handleScoreChange = async (deltaHome: number, deltaAway: number) => {
    try {
      setIsUpdatingScore(true);
      setErrorMessage(null);
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const nextHome = Math.max(0, activeMatch.homeScore + deltaHome);
      const nextAway = Math.max(0, activeMatch.awayScore + deltaAway);

      const res = await updateScore(token, activeMatch.id, nextHome, nextAway);
      onScoreUpdated(res.data);
      setStatusMessage(`Score updated: ${res.data.homeTeam} ${nextHome} - ${nextAway} ${res.data.awayTeam}`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update score');
    } finally {
      setIsUpdatingScore(false);
    }
  };

  const handlePostCommentary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      setIsPostingCommentary(true);
      setErrorMessage(null);
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      await createCommentary(token, activeMatch.id, {
        minute,
        period,
        sequence: Date.now() % 100000,
        eventType,
        message: message.trim(),
      });

      setMessage('');
      setStatusMessage('Live commentary broadcast successfully!');
      setTimeout(() => setStatusMessage(null), 3000);
      onCommentaryPosted();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to post commentary');
    } finally {
      setIsPostingCommentary(false);
    }
  };

  return (
    <div className="bg-emerald-50 border-2 border-emerald-600 rounded-2xl p-6 shadow-hard mb-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b-2 border-emerald-200 pb-4">
        <div>
          <span className="text-xs font-mono font-bold uppercase bg-emerald-600 text-white px-2 py-0.5 rounded">
            Authorized Scorer Desk
          </span>
          <h3 className="text-xl font-black text-emerald-950 mt-1">
            Active: {activeMatch.homeTeam} vs {activeMatch.awayTeam} ({activeMatch.sport})
          </h3>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black font-mono">
            {activeMatch.homeScore} - {activeMatch.awayScore}
          </span>
        </div>
      </div>

      {statusMessage && (
        <div className="bg-emerald-100 border border-emerald-400 text-emerald-900 text-xs font-bold px-3 py-2 rounded-xl">
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-900 text-xs font-bold px-3 py-2 rounded-xl">
          {errorMessage}
        </div>
      )}

      {/* Score Controls */}
      <div>
        <h4 className="text-xs font-bold uppercase text-emerald-900 mb-3">Live Score Adjustments</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border-2 border-black rounded-xl p-3 text-center">
            <span className="text-xs font-bold block mb-2">{activeMatch.homeTeam}</span>
            <div className="flex justify-center gap-2">
              <button
                disabled={isUpdatingScore}
                onClick={() => handleScoreChange(-1, 0)}
                className="w-10 h-10 border-2 border-black rounded-lg font-black text-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
              >
                -1
              </button>
              <button
                disabled={isUpdatingScore}
                onClick={() => handleScoreChange(1, 0)}
                className="w-10 h-10 border-2 border-black rounded-lg font-black text-lg bg-emerald-400 hover:bg-emerald-500 disabled:opacity-50"
              >
                +1
              </button>
            </div>
          </div>

          <div className="bg-white border-2 border-black rounded-xl p-3 text-center">
            <span className="text-xs font-bold block mb-2">{activeMatch.awayTeam}</span>
            <div className="flex justify-center gap-2">
              <button
                disabled={isUpdatingScore}
                onClick={() => handleScoreChange(0, -1)}
                className="w-10 h-10 border-2 border-black rounded-lg font-black text-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
              >
                -1
              </button>
              <button
                disabled={isUpdatingScore}
                onClick={() => handleScoreChange(0, 1)}
                className="w-10 h-10 border-2 border-black rounded-lg font-black text-lg bg-emerald-400 hover:bg-emerald-500 disabled:opacity-50"
              >
                +1
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Live Commentary Form */}
      <div>
        <h4 className="text-xs font-bold uppercase text-emerald-900 mb-3">Publish Live Commentary</h4>
        <form onSubmit={handlePostCommentary} className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">Minute</label>
              <input
                type="number"
                min="0"
                value={minute}
                onChange={(e) => setMinute(Number(e.target.value))}
                className="w-full text-xs p-2 border-2 border-black rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">Period</label>
              <input
                type="text"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full text-xs p-2 border-2 border-black rounded-lg"
                placeholder="1st Half"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">Event</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full text-xs p-2 border-2 border-black rounded-lg bg-white"
              >
                <option value="goal">Goal / Point</option>
                <option value="foul">Foul</option>
                <option value="card">Card</option>
                <option value="boundary">Boundary</option>
                <option value="wicket">Wicket</option>
                <option value="substitution">Substitution</option>
                <option value="comment">General Commentary</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">Commentary Message</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Brilliant shot into the top corner!"
                className="flex-1 text-xs p-2.5 border-2 border-black rounded-lg"
              />
              <button
                type="submit"
                disabled={isPostingCommentary || !message.trim()}
                className="px-5 py-2.5 bg-black text-white rounded-lg text-xs font-bold border-2 border-black hover:bg-gray-800 disabled:opacity-50 shadow-hard-sm"
              >
                {isPostingCommentary ? 'Publishing...' : 'Broadcast'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
