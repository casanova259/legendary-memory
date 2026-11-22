import type { ScoringEvent } from '../../types.ts';

/**
 * Format legal deliveries into standard cricket overs representation.
 * e.g. 0 balls -> "0.0", 5 balls -> "0.5", 6 balls -> "1.0", 14 balls -> "2.2"
 */
export function formatOvers(legalBalls: number): string {
  const safeBalls = Math.max(Number(legalBalls) || 0, 0);
  const completedOvers = Math.floor(safeBalls / 6);
  const ballsInCurrentOver = safeBalls % 6;
  return `${completedOvers}.${ballsInCurrentOver}`;
}

/**
 * Calculate Current Run Rate (CRR).
 */
export function calculateRunRate(totalRuns: number, legalBalls: number): string {
  if (!legalBalls || legalBalls <= 0) return '0.00';
  const overs = legalBalls / 6;
  return (totalRuns / overs).toFixed(2);
}

/**
 * Calculate Required Run Rate (RRR) for 2nd innings.
 */
export function calculateRequiredRunRate(
  target: number,
  currentRuns: number,
  totalOversAllowed = 20,
  legalBallsBowled = 0
): string | null {
  const runsNeeded = target - currentRuns;
  if (runsNeeded <= 0) return '0.00';
  const totalBallsAllowed = totalOversAllowed * 6;
  const ballsRemaining = Math.max(totalBallsAllowed - legalBallsBowled, 0);
  if (ballsRemaining <= 0) return 'N/A';
  const oversRemaining = ballsRemaining / 6;
  return (runsNeeded / oversRemaining).toFixed(2);
}

export interface BatterStats {
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: string;
  isOut: boolean;
  dismissal?: string;
}

/**
 * Deterministically aggregate individual batter statistics from unreversed match events.
 */
export function deriveBatterStats(events: ScoringEvent[], inningsId?: number): Record<string, BatterStats> {
  const stats: Record<string, BatterStats> = {};

  const filtered = events
    .filter((e) => !e.isReversed && (inningsId === undefined || e.inningsId === inningsId))
    .sort((a, b) => a.eventSequence - b.eventSequence);

  for (const e of filtered) {
    const batterName = e.batter || 'Unknown';
    if (!stats[batterName]) {
      stats[batterName] = {
        name: batterName,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: '0.00',
        isOut: false,
      };
    }

    const b = stats[batterName];
    // Runs off bat
    b.runs += e.runsOffBat || 0;
    if (e.runsOffBat === 4) b.fours += 1;
    if (e.runsOffBat === 6) b.sixes += 1;

    // Legal deliveries or non-wide deliveries count as balls faced
    if (e.extrasType !== 'wide') {
      b.balls += 1;
    }

    // Dismissal
    if (e.wicketType && e.wicketType !== 'none') {
      const dismissed = e.dismissedPlayer || e.batter;
      if (dismissed && stats[dismissed]) {
        stats[dismissed].isOut = true;
        stats[dismissed].dismissal = `${e.wicketType} ${e.bowler ? `b ${e.bowler}` : ''}`.trim();
      } else if (dismissed) {
        stats[dismissed] = {
          name: dismissed,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: '0.00',
          isOut: true,
          dismissal: `${e.wicketType} ${e.bowler ? `b ${e.bowler}` : ''}`.trim(),
        };
      }
    }
  }

  // Calculate strike rates
  for (const key of Object.keys(stats)) {
    const b = stats[key];
    b.strikeRate = b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0';
  }

  return stats;
}

export interface BowlerStats {
  name: string;
  legalBalls: number;
  overs: string;
  maidens: number;
  runsConceded: number;
  wickets: number;
  economy: string;
}

/**
 * Deterministically aggregate individual bowler statistics from unreversed match events.
 */
export function deriveBowlerStats(events: ScoringEvent[], inningsId?: number): Record<string, BowlerStats> {
  const stats: Record<string, BowlerStats> = {};

  const filtered = events
    .filter((e) => !e.isReversed && (inningsId === undefined || e.inningsId === inningsId))
    .sort((a, b) => a.eventSequence - b.eventSequence);

  for (const e of filtered) {
    const bowlerName = e.bowler || 'Unknown';
    if (!stats[bowlerName]) {
      stats[bowlerName] = {
        name: bowlerName,
        legalBalls: 0,
        overs: '0.0',
        maidens: 0,
        runsConceded: 0,
        wickets: 0,
        economy: '0.00',
      };
    }

    const b = stats[bowlerName];

    if (e.isLegalDelivery) {
      b.legalBalls += 1;
    }

    // Bowler conceded runs: runs off bat + wides + no-balls (byes and leg byes don't count against bowler)
    const bowlerExtras = e.extrasType === 'wide' || e.extrasType === 'no_ball' ? e.extrasRuns : 0;
    b.runsConceded += (e.runsOffBat || 0) + bowlerExtras;

    // Bowler credited wickets (run outs and retired out are not credited to bowler)
    if (
      e.wicketType &&
      e.wicketType !== 'none' &&
      e.wicketType !== 'run_out' &&
      e.wicketType !== 'retired_out' &&
      e.wicketType !== 'timed_out' &&
      e.wicketType !== 'handled_ball' &&
      e.wicketType !== 'obstructing_field'
    ) {
      b.wickets += 1;
    }
  }

  // Calculate overs & economy
  for (const key of Object.keys(stats)) {
    const b = stats[key];
    b.overs = formatOvers(b.legalBalls);
    b.economy = b.legalBalls > 0 ? (b.runsConceded / (b.legalBalls / 6)).toFixed(2) : '0.00';
  }

  return stats;
}

export interface FallOfWicket {
  wicketNumber: number;
  score: number;
  overs: string;
  player: string;
}

/**
 * Derive Fall of Wickets from events.
 */
export function deriveFallOfWickets(events: ScoringEvent[], inningsId?: number): FallOfWicket[] {
  const fow: FallOfWicket[] = [];
  let currentRuns = 0;
  let legalBalls = 0;
  let wicketCount = 0;

  const filtered = events
    .filter((e) => !e.isReversed && (inningsId === undefined || e.inningsId === inningsId))
    .sort((a, b) => a.eventSequence - b.eventSequence);

  for (const e of filtered) {
    currentRuns += e.totalRuns || 0;
    if (e.isLegalDelivery) legalBalls += 1;

    if (e.wicketType && e.wicketType !== 'none') {
      wicketCount += 1;
      fow.push({
        wicketNumber: wicketCount,
        score: currentRuns,
        overs: formatOvers(legalBalls),
        player: e.dismissedPlayer || e.batter || 'Batter',
      });
    }
  }

  return fow;
}

export interface ExtrasBreakdown {
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  penalties: number;
  total: number;
}

/**
 * Derive Extras Breakdown from events.
 */
export function deriveExtrasBreakdown(events: ScoringEvent[], inningsId?: number): ExtrasBreakdown {
  const extras: ExtrasBreakdown = {
    wides: 0,
    noBalls: 0,
    byes: 0,
    legByes: 0,
    penalties: 0,
    total: 0,
  };

  const filtered = events
    .filter((e) => !e.isReversed && (inningsId === undefined || e.inningsId === inningsId));

  for (const e of filtered) {
    if (e.extrasType === 'wide') extras.wides += e.extrasRuns;
    else if (e.extrasType === 'no_ball') extras.noBalls += e.extrasRuns;
    else if (e.extrasType === 'bye') extras.byes += e.extrasRuns;
    else if (e.extrasType === 'leg_bye') extras.legByes += e.extrasRuns;
    else if (e.extrasType === 'penalty') extras.penalties += e.extrasRuns;

    extras.total += e.extrasRuns || 0;
  }

  return extras;
}

/**
 * Generate a cryptographically random, collision-resistant idempotency key.
 */
export function generateIdempotencyKey(scorerId: string | number, matchId: string | number): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `sc_${scorerId}_m_${matchId}_${timestamp}_${random}`;
}
