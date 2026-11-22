export interface Match {
  id: string | number;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  status: string; // Allow flexible status strings from API
  startTime: string;
  endTime?: string;
  homeScore: number;
  awayScore: number;
  createdAt?: string;
}

export interface MatchResponse {
  data: Match[];
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface Commentary {
  id: string | number;
  matchId: string | number;
  minute?: number;
  sequence?: number;
  period?: string;
  eventType?: string;
  actor?: string;
  team?: string;
  message: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  createdAt?: string;
}

export interface CommentaryResponse {
  data: Commentary[];
}

// WebSocket Message Types
export interface WSMessageCommentary {
  type: 'commentary';
  data: Commentary;
}

export interface WSMessageScore {
  type: 'score_update';
  matchId: string | number;
  data: {
    homeScore: number;
    awayScore: number;
  };
}

export interface WSMessageWelcome {
  type: 'welcome';
  message?: string;
}

export interface WSMessagePong {
  type: 'pong';
}

export interface WSMessageError {
  type: 'error';
  code: string;
  message: string;
}

export interface WSMessageSubscribed {
  type: 'subscribed';
  matchId: string | number;
}

export interface WSMessageUnsubscribed {
  type: 'unsubscribed';
  matchId: string | number;
}

export interface WSMessageSubscriptions {
  type: 'subscriptions';
  matchIds: Array<string | number>;
}

export interface WSMessageSubscribedAll {
  type: 'subscribed_all';
}

export interface WSMessageUnsubscribedAll {
  type: 'unsubscribed_all';
}

export interface WSMessageMatchCreated {
  type: 'match_created';
  data: Match;
}

export interface WSMessageMatchStarted {
  type: 'match_started';
  data: {
    matchId: string | number;
    status: string;
    inningsId?: number;
  };
}

export interface WSMessageMatchPaused {
  type: 'match_paused';
  data: {
    matchId: string | number;
    status: string;
  };
}

export interface WSMessageMatchResumed {
  type: 'match_resumed';
  data: {
    matchId: string | number;
    status: string;
  };
}

export interface WSMessageMatchCompleted {
  type: 'match_completed';
  data: {
    matchId: string | number;
    status: string;
  };
}

export interface WSMessageWicketFallen {
  type: 'wicket_fallen';
  data: {
    matchId: string | number;
    inningsId: number;
    wicketType: string;
    dismissedPlayer?: string;
    totalWickets: number;
  };
}

export interface WSMessageScoreCorrected {
  type: 'score_corrected';
  data: {
    matchId: string | number;
    inningsId: number;
    reversedEventId: number;
    reason: string;
    innings?: {
      totalRuns: number;
      wickets: number;
      legalBalls: number;
      overs: string;
    };
  };
}

export type WSMessage =
  | WSMessageCommentary
  | WSMessageScore
  | WSMessageWelcome
  | WSMessagePong
  | WSMessageError
  | WSMessageSubscribed
  | WSMessageUnsubscribed
  | WSMessageSubscriptions
  | WSMessageSubscribedAll
  | WSMessageUnsubscribedAll
  | WSMessageMatchCreated
  | WSMessageMatchStarted
  | WSMessageMatchPaused
  | WSMessageMatchResumed
  | WSMessageMatchCompleted
  | WSMessageWicketFallen
  | WSMessageScoreCorrected;

export type UserRole = 'viewer' | 'admin' | 'scorer';

export interface AppUser {
  id: number;
  clerkId: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserListResponse {
  data: AppUser[];
  meta?: {
    total: number;
    limit: number;
    offset: number;
  };
}

// Admin Specific Types
export interface AdminDashboardStats {
  totalMatches: number;
  liveMatches: number;
  completedMatches?: number;
  scheduledMatches?: number;
  totalScorers: number;
  activeScorers?: number;
  totalUsers?: number;
  activeAssignments?: number;
}

export interface ScorerItem {
  id: number;
  clerkId: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  activeAssignmentsCount?: number;
}

export interface MatchAssignment {
  id: number;
  matchId: number;
  scorerId: number;
  assignedById: number;
  status: 'active' | 'revoked';
  assignedAt: string;
  revokedAt?: string | null;
  scorer?: ScorerItem;
}

export interface AuditLogItem {
  id: number;
  actorId?: number | null;
  action: string;
  matchId?: number | null;
  targetUserId?: number | null;
  eventId?: number | null;
  reason?: string | null;
  details?: Record<string, unknown> | null;
  createdAt: string;
  actor?: {
    id: number;
    email: string | null;
    displayName: string | null;
    role: UserRole;
  };
}

// Scorer Specific Types
export interface ScorerDashboardStats {
  totalAssigned: number;
  liveMatches: number;
  scheduledMatches: number;
  completedMatches: number;
  recentMatches?: Match[];
}

export interface Innings {
  id: number;
  matchId: number;
  inningsNumber: number;
  battingTeam: string;
  bowlingTeam: string;
  totalRuns: number;
  wickets: number;
  legalBalls: number;
  extras: number;
  target?: number | null;
  status: 'upcoming' | 'live' | 'completed';
  overs?: string;
}

export interface ScoringEvent {
  id: number;
  matchId: number;
  inningsId: number;
  eventSequence: number;
  eventType: 'ball' | 'wicket' | 'boundary' | 'extra' | 'over_end' | 'innings_completed' | 'match_completed' | 'correction';
  runsOffBat: number;
  extrasType: 'none' | 'wide' | 'no_ball' | 'bye' | 'leg_bye' | 'penalty';
  extrasRuns: number;
  totalRuns: number;
  isLegalDelivery: boolean;
  wicketType?: string;
  dismissedPlayer?: string | null;
  batter?: string | null;
  bowler?: string | null;
  scorerId?: number | null;
  idempotencyKey?: string;
  isReversed?: boolean;
  reversedBy?: number | null;
  reversalReason?: string | null;
  createdAt: string;
}

export interface AssignedMatchDetails {
  match: Match;
  assignment: MatchAssignment;
  innings: Innings[];
  recentEvents?: ScoringEvent[];
  currentInnings?: Innings | null;
}

// Generic API response
export interface ApiResponse<T> {
  data: T;
  message?: string;
  meta?: {
    total?: number;
    limit?: number;
    offset?: number;
  };
}

