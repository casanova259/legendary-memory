import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ScorerLayout } from '../../components/layouts/ScorerLayout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { useParams, Link } from '../../lib/router';
import { useAuthUser } from '../../context/AuthContext';
import { useWebSocket } from '../../hooks/useWebSocket';
import {
  fetchAssignedMatchById,
  recordScoringEvent,
  pauseMatch,
  resumeMatch,
  completeMatch,
  createInnings,
} from '../../lib/api/scorer';
import { fetchMatchCommentary } from '../../lib/api/matches';
import {
  AssignedMatchDetails,
  ScoringEvent,
  Commentary,
  Innings,
  Match,
} from '../../types';
import {
  deriveBatterStats,
  deriveBowlerStats,
  generateIdempotencyKey,
} from '../../lib/cricket/calculations';

// Subcomponents
import { LiveScoreboard } from '../../components/scorer/LiveScoreboard';
import { BatterPanel } from '../../components/scorer/BatterPanel';
import { BowlerPanel } from '../../components/scorer/BowlerPanel';
import { OverTimeline } from '../../components/scorer/OverTimeline';
import { ScoringControls } from '../../components/scorer/ScoringControls';
import { CommentaryFeed } from '../../components/scorer/CommentaryFeed';
import { WicketModal } from '../../components/scorer/WicketModal';
import { ExtrasModal } from '../../components/scorer/ExtrasModal';
import { StartInningsModal } from '../../components/scorer/StartInningsModal';
import { NewBowlerModal } from '../../components/scorer/NewBowlerModal';
import { MatchLifecycleModal } from '../../components/scorer/MatchLifecycleModal';

export const ScorerLiveConsolePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, getToken } = useAuthUser();
  const [details, setDetails] = useState<AssignedMatchDetails | null>(null);
  const [events, setEvents] = useState<ScoringEvent[]>([]);
  const [commentaryList, setCommentaryList] = useState<Commentary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Players State
  const [striker, setStriker] = useState<string>('Batter 1');
  const [nonStriker, setNonStriker] = useState<string>('Batter 2');
  const [bowler, setBowler] = useState<string>('Bowler 1');

  // Scoring Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingRetryPayload, setPendingRetryPayload] = useState<{
    payload: any;
    idempotencyKey: string;
    description: string;
  } | null>(null);

  // Dialog States
  const [isWicketModalOpen, setIsWicketModalOpen] = useState(false);
  const [isExtrasModalOpen, setIsExtrasModalOpen] = useState(false);
  const [isInningsModalOpen, setIsInningsModalOpen] = useState(false);
  const [isNewBowlerModalOpen, setIsNewBowlerModalOpen] = useState(false);
  const [lifecycleAction, setLifecycleAction] = useState<'pause' | 'resume' | 'complete' | null>(null);
  const [isLifecycleSubmitting, setIsLifecycleSubmitting] = useState(false);

  // WebSocket Integration
  const { isConnected, connectionStatus, subscribe } = useWebSocket({
    autoConnect: true,
    subscribeAll: false,
    onMessage: (msg) => {
      if (!details) return;
      if (msg.type === 'score_update' && String(msg.matchId) === String(id)) {
        setDetails((prev) =>
          prev
            ? {
                ...prev,
                match: {
                  ...prev.match,
                  homeScore: msg.data.homeScore,
                  awayScore: msg.data.awayScore,
                },
              }
            : null
        );
      } else if (msg.type === 'commentary' && String(msg.data.matchId) === String(id)) {
        setCommentaryList((prev) => [msg.data, ...prev.filter((c) => c.id !== msg.data.id)]);
      } else if (msg.type === 'score_corrected' && String(msg.data.matchId) === String(id)) {
        loadData(false); // Refresh authoritative state after admin correction
      }
    },
  });

  // Subscribe to match channel
  useEffect(() => {
    if (isConnected && id) {
      subscribe(id);
    }
  }, [isConnected, id, subscribe]);

  // Load Authoritative Match State
  const loadData = useCallback(
    async (showLoading = true) => {
      if (!id) return;
      try {
        if (showLoading) setIsLoading(true);
        setError(null);
        const [matchRes, commRes] = await Promise.all([
          fetchAssignedMatchById(getToken, id),
          fetchMatchCommentary(id, 30).catch(() => ({ data: [] })),
        ]);
        setDetails(matchRes.data);
        setEvents(matchRes.data.recentEvents || []);
        setCommentaryList(commRes.data || []);

        // Derive active batters/bowler if recent events exist
        if (matchRes.data.recentEvents && matchRes.data.recentEvents.length > 0) {
          const lastEvent = matchRes.data.recentEvents[0];
          if (lastEvent.batter) setStriker(lastEvent.batter);
          if (lastEvent.bowler) setBowler(lastEvent.bowler);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load match console');
      } finally {
        if (showLoading) setIsLoading(false);
      }
    },
    [id, getToken]
  );

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Calculate current innings
  const currentInnings: Innings | null =
    details?.innings?.find((i) => i.status === 'live') ||
    (details?.innings && details.innings.length > 0
      ? details.innings[details.innings.length - 1]
      : null);

  // Derive Statistics
  const batterStats = deriveBatterStats(events, currentInnings?.id);
  const bowlerStats = deriveBowlerStats(events, currentInnings?.id);
  const legalBallsInCurrentOver = (currentInnings?.legalBalls || 0) % 6;

  // Swap Strike Helper
  const handleSwapStrike = useCallback(() => {
    setStriker((prev) => {
      const oldStriker = prev;
      setNonStriker(oldStriker);
      return nonStriker;
    });
  }, [nonStriker]);

  // Submit Scoring Delivery (Transactional + Idempotent)
  const submitScoringEvent = async (
    eventParams: {
      eventType?: 'ball' | 'wicket' | 'extra';
      runsOffBat?: number;
      extrasType?: 'none' | 'wide' | 'no_ball' | 'bye' | 'leg_bye' | 'penalty';
      extrasRuns?: number;
      isLegalDelivery?: boolean;
      wicketType?: string;
      dismissedPlayer?: string | null;
      batter?: string | null;
      bowler?: string | null;
    },
    existingKey?: string,
    description = 'delivery'
  ) => {
    if (!id || !user) return;

    const idempotencyKey = existingKey || generateIdempotencyKey(user.id, id);
    const payload = {
      eventType: eventParams.eventType || 'ball',
      runsOffBat: eventParams.runsOffBat ?? 0,
      extrasType: eventParams.extrasType || 'none',
      extrasRuns: eventParams.extrasRuns ?? 0,
      isLegalDelivery: eventParams.isLegalDelivery,
      wicketType: eventParams.wicketType || 'none',
      dismissedPlayer: eventParams.dismissedPlayer || null,
      batter: eventParams.batter || striker,
      bowler: eventParams.bowler || bowler,
      idempotencyKey,
    };

    try {
      setIsSubmitting(true);
      setPendingRetryPayload(null);

      const res = await recordScoringEvent(getToken, id, payload);
      const { event: confirmedEvent, innings: updatedInnings, match: updatedMatch } = res.data;

      // Update Local State with Confirmed Backend Result
      setEvents((prev) => [confirmedEvent, ...prev.filter((e) => e.id !== confirmedEvent.id)]);
      setDetails((prev) => {
        if (!prev) return null;
        const updatedInningsList = prev.innings.map((inn) =>
          inn.id === updatedInnings.id ? updatedInnings : inn
        );
        return {
          ...prev,
          match: updatedMatch,
          innings: updatedInningsList,
        };
      });

      // Fetch commentary update
      fetchMatchCommentary(id, 20).then((cRes) => {
        if (cRes.data) setCommentaryList(cRes.data);
      });

      // Auto strike rotation on odd runs (1, 3, or singles off extras)
      const totalRunsScored = (payload.runsOffBat || 0) + (payload.extrasType === 'no_ball' ? 0 : 0);
      if (totalRunsScored % 2 === 1) {
        handleSwapStrike();
      }

      // Check if over completed (legal balls reached multiple of 6)
      if (confirmedEvent.isLegalDelivery && updatedInnings.legalBalls % 6 === 0) {
        handleSwapStrike(); // Automatic strike rotation at end of over
        setIsNewBowlerModalOpen(true); // Prompt for next bowler
      }

      // Check if innings completed (all out or target reached)
      if (updatedInnings.status === 'completed' && updatedInnings.inningsNumber === 1) {
        setIsInningsModalOpen(true);
      }
    } catch (err: unknown) {
      // Retain payload and key for safe retry!
      setPendingRetryPayload({
        payload: eventParams,
        idempotencyKey,
        description,
      });
      setError(err instanceof Error ? err.message : 'Scoring request failed. You can safely retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input, textarea, or if modal is open
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        isWicketModalOpen ||
        isExtrasModalOpen ||
        isInningsModalOpen ||
        isNewBowlerModalOpen ||
        lifecycleAction !== null ||
        isSubmitting ||
        details?.match.status !== 'live'
      ) {
        return;
      }

      if (['0', '1', '2', '3', '4', '6'].includes(e.key)) {
        e.preventDefault();
        submitScoringEvent({ runsOffBat: Number(e.key) }, undefined, `${e.key} run(s)`);
      } else if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        setIsWicketModalOpen(true);
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        setIsExtrasModalOpen(true);
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleSwapStrike();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isWicketModalOpen,
    isExtrasModalOpen,
    isInningsModalOpen,
    isNewBowlerModalOpen,
    lifecycleAction,
    isSubmitting,
    details?.match.status,
    handleSwapStrike,
  ]);

  // Lifecycle Transitions
  const handleConfirmLifecycle = async () => {
    if (!id || !lifecycleAction) return;
    try {
      setIsLifecycleSubmitting(true);
      if (lifecycleAction === 'pause') {
        await pauseMatch(getToken, id);
      } else if (lifecycleAction === 'resume') {
        await resumeMatch(getToken, id);
      } else if (lifecycleAction === 'complete') {
        await completeMatch(getToken, id);
      }
      await loadData(false);
      setLifecycleAction(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lifecycle action failed');
    } finally {
      setIsLifecycleSubmitting(false);
    }
  };

  // Innings 2 Start Handler
  const handleConfirmStartInnings = async (data: {
    inningsNumber: number;
    battingTeam: string;
    bowlingTeam: string;
    target?: number | null;
  }) => {
    if (!id) return;
    try {
      setIsSubmitting(true);
      await createInnings(getToken, id, data);
      setIsInningsModalOpen(false);
      await loadData(false);
      // Reset striker/non-striker for new innings
      setStriker(`${data.battingTeam} Opener 1`);
      setNonStriker(`${data.battingTeam} Opener 2`);
      setBowler(`${data.bowlingTeam} Bowler 1`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to initialize innings');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <ScorerLayout>
        <div className="py-24 flex justify-center">
          <Spinner size="lg" label="Connecting to live scoring terminal..." />
        </div>
      </ScorerLayout>
    );
  }

  if (error && !details) {
    return (
      <ScorerLayout>
        <Card className="p-8 bg-red-50 border-2 border-red-500 text-center space-y-4 max-w-lg mx-auto my-12">
          <h2 className="text-xl font-black text-red-950">Console Access Denied</h2>
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
  const isLive = match.status === 'live';
  const isPaused = match.status === 'paused';
  const isCompleted = match.status === 'completed' || match.status === 'finished';

  return (
    <ScorerLayout>
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Console Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-black">
          <div className="flex items-center gap-2">
            <Link to={`/scorer/matches/${match.id}`} className="text-xs font-bold text-gray-500 hover:text-black">
              ← Overview
            </Link>
            <span className="text-xs text-gray-300">/</span>
            <h1 className="text-xl sm:text-2xl font-black text-brand-dark">
              Live Console #{match.id}
            </h1>
            <div
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase ${
                isConnected
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-500'
                  : 'bg-amber-100 text-amber-900 border-amber-500'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span>{connectionStatus}</span>
            </div>
          </div>

          {/* Operational Controls */}
          <div className="flex items-center gap-2">
            {isLive && (
              <Button
                variant="warning"
                size="sm"
                onClick={() => setLifecycleAction('pause')}
                className="text-xs font-black"
              >
                ⏸ Pause Match
              </Button>
            )}

            {isPaused && (
              <Button
                variant="success"
                size="sm"
                onClick={() => setLifecycleAction('resume')}
                className="text-xs font-black shadow-hard-xs"
              >
                ▶ Resume Play
              </Button>
            )}

            {!isCompleted && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setLifecycleAction('complete')}
                className="text-xs font-bold"
              >
                🏁 Finish Match
              </Button>
            )}

            <Link to={`/scorer/matches/${match.id}/scorecard`}>
              <Button variant="secondary" size="sm" className="text-xs font-bold">
                Scorecard 📋
              </Button>
            </Link>
          </div>
        </div>

        {/* Retry Banner on Network Failure */}
        {pendingRetryPayload && (
          <div className="p-3 bg-red-100 border-2 border-red-600 rounded-xl text-xs font-bold text-red-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-hard-xs">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <span>
                Delivery submission failed: <strong>{pendingRetryPayload.description}</strong>. The delivery has NOT been discarded.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() =>
                  submitScoringEvent(
                    pendingRetryPayload.payload,
                    pendingRetryPayload.idempotencyKey,
                    pendingRetryPayload.description
                  )
                }
                disabled={isSubmitting}
                className="text-xs font-black"
              >
                Retry Same Delivery ↻
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPendingRetryPayload(null)}
                className="text-xs"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* Live Scoreboard */}
        <LiveScoreboard
          matchStatus={match.status}
          innings={currentInnings}
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
        />

        {/* Over Timeline Strip */}
        <OverTimeline
          events={events.filter((e) => e.inningsId === currentInnings?.id)}
          legalBallsInCurrentOver={legalBallsInCurrentOver}
        />

        {/* Batters & Bowler Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BatterPanel
            strikerName={striker}
            nonStrikerName={nonStriker}
            batterStats={batterStats}
            onSwapStrike={handleSwapStrike}
            onUpdateBatters={(s, ns) => {
              setStriker(s);
              setNonStriker(ns);
            }}
          />

          <BowlerPanel
            currentBowler={bowler}
            bowlerStats={bowlerStats}
            onUpdateBowler={(b) => setBowler(b)}
          />
        </div>

        {/* Official Scoring Keypad */}
        <ScoringControls
          onScoreRuns={(r) => submitScoringEvent({ runsOffBat: r }, undefined, `${r} run(s)`)}
          onOpenExtrasModal={() => setIsExtrasModalOpen(true)}
          onOpenWicketModal={() => setIsWicketModalOpen(true)}
          onSwapStrike={handleSwapStrike}
          isSubmitting={isSubmitting}
          disabled={!isLive}
        />

        {/* Live Commentary Feed */}
        <CommentaryFeed commentaryList={commentaryList} />

        {/* Wicket Modal */}
        <WicketModal
          isOpen={isWicketModalOpen}
          onClose={() => setIsWicketModalOpen(false)}
          strikerName={striker}
          nonStrikerName={nonStriker}
          isSubmitting={isSubmitting}
          onConfirm={async (data) => {
            setIsWicketModalOpen(false);
            await submitScoringEvent(
              {
                eventType: 'wicket',
                wicketType: data.wicketType,
                dismissedPlayer: data.dismissedPlayer,
                runsOffBat: data.runsOffBat,
                isLegalDelivery: true,
              },
              undefined,
              `Wicket (${data.wicketType})`
            );
            if (data.newBatter) {
              if (data.dismissedPlayer === striker) {
                setStriker(data.newBatter);
              } else {
                setNonStriker(data.newBatter);
              }
            }
          }}
        />

        {/* Extras Modal */}
        <ExtrasModal
          isOpen={isExtrasModalOpen}
          onClose={() => setIsExtrasModalOpen(false)}
          isSubmitting={isSubmitting}
          onConfirm={async (data) => {
            setIsExtrasModalOpen(false);
            await submitScoringEvent(
              {
                eventType: 'extra',
                extrasType: data.extrasType,
                extrasRuns: data.extrasRuns,
                runsOffBat: data.runsOffBat,
                isLegalDelivery: data.isLegalDelivery,
              },
              undefined,
              `${data.extrasRuns} ${data.extrasType}`
            );
          }}
        />

        {/* Next Bowler Prompt Modal */}
        <NewBowlerModal
          isOpen={isNewBowlerModalOpen}
          onClose={() => setIsNewBowlerModalOpen(false)}
          currentBowler={bowler}
          onConfirm={(newBowler) => {
            setBowler(newBowler);
            setIsNewBowlerModalOpen(false);
          }}
        />

        {/* Innings Transition Modal */}
        <StartInningsModal
          isOpen={isInningsModalOpen}
          onClose={() => setIsInningsModalOpen(false)}
          inningsNumber={currentInnings ? currentInnings.inningsNumber + 1 : 2}
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
          suggestedTarget={currentInnings ? currentInnings.totalRuns + 1 : null}
          isSubmitting={isSubmitting}
          onConfirm={handleConfirmStartInnings}
        />

        {/* Match Lifecycle Modal */}
        <MatchLifecycleModal
          isOpen={lifecycleAction !== null}
          onClose={() => setLifecycleAction(null)}
          action={lifecycleAction}
          matchTitle={`${match.homeTeam} vs ${match.awayTeam}`}
          isSubmitting={isLifecycleSubmitting}
          onConfirm={handleConfirmLifecycle}
        />
      </div>
    </ScorerLayout>
  );
};
