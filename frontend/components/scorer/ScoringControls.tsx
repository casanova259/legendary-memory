import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export interface ScoringControlsProps {
  onScoreRuns: (runs: number) => void;
  onOpenExtrasModal: () => void;
  onOpenWicketModal: () => void;
  onSwapStrike: () => void;
  isSubmitting: boolean;
  disabled?: boolean;
}

export const ScoringControls: React.FC<ScoringControlsProps> = ({
  onScoreRuns,
  onOpenExtrasModal,
  onOpenWicketModal,
  onSwapStrike,
  isSubmitting,
  disabled = false,
}) => {
  return (
    <Card variant="white" className="p-4 sm:p-6 border-4 border-black shadow-hard-md space-y-4">
      <div className="flex items-center justify-between pb-2 border-b-2 border-black">
        <h3 className="text-xs font-black uppercase tracking-wider text-brand-dark flex items-center gap-2">
          <span>⚡</span>
          <span>Official Scoring Keypad</span>
        </h3>
        <span className="text-[10px] font-bold text-gray-500 hidden sm:inline">
          Keyboard shortcuts enabled [0-6, W, E, S]
        </span>
      </div>

      {/* Basic Run Buttons (0, 1, 2, 3, 4, 6) */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
        <Button
          variant="secondary"
          size="lg"
          disabled={disabled || isSubmitting}
          onClick={() => onScoreRuns(0)}
          className="h-16 text-xl font-black font-mono border-2 border-black hover:bg-gray-200"
          title="Dot ball (0 runs) [Shortcut: 0]"
        >
          <div className="flex flex-col items-center">
            <span>0</span>
            <span className="text-[9px] font-normal text-gray-500 uppercase">Dot</span>
          </div>
        </Button>

        <Button
          variant="secondary"
          size="lg"
          disabled={disabled || isSubmitting}
          onClick={() => onScoreRuns(1)}
          className="h-16 text-xl font-black font-mono border-2 border-black bg-blue-50 hover:bg-blue-100"
          title="1 Run (Single) [Shortcut: 1]"
        >
          <div className="flex flex-col items-center">
            <span>1</span>
            <span className="text-[9px] font-normal text-gray-500 uppercase">Single</span>
          </div>
        </Button>

        <Button
          variant="secondary"
          size="lg"
          disabled={disabled || isSubmitting}
          onClick={() => onScoreRuns(2)}
          className="h-16 text-xl font-black font-mono border-2 border-black bg-blue-50 hover:bg-blue-100"
          title="2 Runs (Double) [Shortcut: 2]"
        >
          <div className="flex flex-col items-center">
            <span>2</span>
            <span className="text-[9px] font-normal text-gray-500 uppercase">Double</span>
          </div>
        </Button>

        <Button
          variant="secondary"
          size="lg"
          disabled={disabled || isSubmitting}
          onClick={() => onScoreRuns(3)}
          className="h-16 text-xl font-black font-mono border-2 border-black bg-blue-50 hover:bg-blue-100"
          title="3 Runs [Shortcut: 3]"
        >
          <div className="flex flex-col items-center">
            <span>3</span>
            <span className="text-[9px] font-normal text-gray-500 uppercase">Three</span>
          </div>
        </Button>

        <Button
          variant="primary"
          size="lg"
          disabled={disabled || isSubmitting}
          onClick={() => onScoreRuns(4)}
          className="h-16 text-2xl font-black font-mono border-2 border-black bg-brand-yellow hover:bg-yellow-400 text-black shadow-hard-xs"
          title="Boundary FOUR! [Shortcut: 4]"
        >
          <div className="flex flex-col items-center">
            <span>4</span>
            <span className="text-[9px] font-black uppercase tracking-wider">FOUR!</span>
          </div>
        </Button>

        <Button
          variant="secondary"
          size="lg"
          disabled={disabled || isSubmitting}
          onClick={() => onScoreRuns(6)}
          className="h-16 text-2xl font-black font-mono border-2 border-black bg-purple-600 hover:bg-purple-700 text-white shadow-hard-xs"
          title="Maximum SIX! [Shortcut: 6]"
        >
          <div className="flex flex-col items-center">
            <span>6</span>
            <span className="text-[9px] font-black uppercase tracking-wider">SIX!</span>
          </div>
        </Button>
      </div>

      {/* Action Buttons: Extras, Wicket, Swap Strike */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <Button
          variant="warning"
          size="md"
          disabled={disabled || isSubmitting}
          onClick={onOpenExtrasModal}
          className="h-12 border-2 border-black font-black text-xs flex items-center justify-center gap-2"
          title="Open Extras dialog (Wide, No Ball, Bye, Leg Bye) [Shortcut: E]"
        >
          <span className="text-base">⚠️</span>
          <span>Extras (WD / NB / B / LB)</span>
        </Button>

        <Button
          variant="danger"
          size="md"
          disabled={disabled || isSubmitting}
          onClick={onOpenWicketModal}
          className="h-12 border-2 border-black font-black text-xs flex items-center justify-center gap-2 shadow-hard-xs"
          title="Record Wicket dismissal [Shortcut: W]"
        >
          <span className="text-base">☝️</span>
          <span>Wicket (Out)</span>
        </Button>

        <Button
          variant="secondary"
          size="md"
          disabled={disabled || isSubmitting}
          onClick={onSwapStrike}
          className="h-12 border-2 border-black font-black text-xs flex items-center justify-center gap-2"
          title="Manually swap active striker [Shortcut: S]"
        >
          <span className="text-base">⇄</span>
          <span>Swap Strike</span>
        </Button>
      </div>

      {isSubmitting && (
        <div className="p-2 bg-emerald-50 border-2 border-emerald-500 rounded-xl text-center text-xs font-bold text-emerald-950 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span>Recording delivery with backend engine...</span>
        </div>
      )}
    </Card>
  );
};
