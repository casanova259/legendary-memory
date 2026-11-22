import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export interface ExtrasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    extrasType: 'wide' | 'no_ball' | 'bye' | 'leg_bye' | 'penalty';
    extrasRuns: number;
    runsOffBat: number;
    isLegalDelivery?: boolean;
  }) => void;
  isSubmitting?: boolean;
}

export const ExtrasModal: React.FC<ExtrasModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
}) => {
  const [extrasType, setExtrasType] = useState<'wide' | 'no_ball' | 'bye' | 'leg_bye' | 'penalty'>('wide');
  const [extrasRuns, setExtrasRuns] = useState<number>(1);
  const [runsOffBat, setRunsOffBat] = useState<number>(0);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      extrasType,
      extrasRuns: Math.max(extrasRuns, 1),
      runsOffBat: extrasType === 'no_ball' ? runsOffBat : 0,
      isLegalDelivery: extrasType !== 'wide' && extrasType !== 'no_ball',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <Card variant="white" className="max-w-md w-full p-6 space-y-5 border-4 border-black shadow-hard-lg">
        <div className="flex items-center justify-between pb-3 border-b-2 border-black">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚠️</span>
            <div>
              <h2 className="text-xl font-black text-amber-600">Record Extras</h2>
              <p className="text-xs text-gray-500 font-medium">Wides, No Balls, Byes & Leg Byes</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-black font-mono text-xl font-bold p-1 leading-none"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Extras Type Selector */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-2">
              Extras Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: 'wide', label: 'Wide Ball (WD)', desc: '+1 Extra, Illegal ball' },
                { type: 'no_ball', label: 'No Ball (NB)', desc: '+1 Extra + bat runs, Illegal' },
                { type: 'bye', label: 'Bye (B)', desc: 'Extra runs, Legal ball' },
                { type: 'leg_bye', label: 'Leg Bye (LB)', desc: 'Off pads, Legal ball' },
                { type: 'penalty', label: 'Penalty (PEN)', desc: 'Fielding violation' },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => {
                    setExtrasType(item.type as any);
                    if (item.type === 'wide' || item.type === 'no_ball') {
                      setExtrasRuns(1);
                    }
                  }}
                  className={`p-2.5 rounded-xl text-left border-2 transition-all ${
                    extrasType === item.type
                      ? 'border-amber-500 bg-amber-50 text-amber-950 font-black shadow-hard-sm'
                      : 'border-gray-200 hover:border-black text-gray-800 font-bold'
                  }`}
                >
                  <div className="text-xs">{item.label}</div>
                  <div className="text-[10px] text-gray-500 font-normal">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Runs configuration */}
          {extrasType === 'no_ball' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1">
                  Runs Off Bat (scored off no-ball)
                </label>
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4, 6].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRunsOffBat(r)}
                      className={`flex-1 py-2 rounded-xl border-2 text-xs font-black transition-all ${
                        runsOffBat === r
                          ? 'bg-black text-white border-black shadow-hard-xs'
                          : 'border-gray-200 hover:border-black'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-gray-500 font-bold">
                Total event yield: <strong>{1 + runsOffBat} runs</strong> (1 NB penalty + {runsOffBat} off bat).
              </p>
            </div>
          ) : extrasType === 'wide' ? (
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1">
                Total Wide Extras (including boundaries/overthrows)
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setExtrasRuns(r)}
                    className={`flex-1 py-2 rounded-xl border-2 text-xs font-black transition-all ${
                      extrasRuns === r
                        ? 'bg-amber-400 text-black border-black shadow-hard-xs'
                        : 'border-gray-200 hover:border-black'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                Standard wide is 1 run. 5 runs = wide that went for 4 overthrows.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1">
                Extra Runs
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setExtrasRuns(r)}
                    className={`flex-1 py-2 rounded-xl border-2 text-xs font-black transition-all ${
                      extrasRuns === r
                        ? 'bg-amber-400 text-black border-black shadow-hard-xs'
                        : 'border-gray-200 hover:border-black'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t-2 border-gray-100">
            <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="warning" size="sm" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Recording Extra...' : 'Confirm Extras Delivery'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
