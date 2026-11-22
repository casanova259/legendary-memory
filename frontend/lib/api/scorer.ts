import { http, TokenProvider } from './client';
import {
  ScorerDashboardStats,
  Match,
  AssignedMatchDetails,
  Innings,
  ScoringEvent,
  ApiResponse,
} from '../../types';

export async function fetchScorerDashboard(
  tokenOrProvider: string | TokenProvider
): Promise<ApiResponse<ScorerDashboardStats>> {
  const options =
    typeof tokenOrProvider === 'string'
      ? { token: tokenOrProvider }
      : { getToken: tokenOrProvider };

  return http.get<ApiResponse<ScorerDashboardStats>>('/api/scorer/dashboard', options);
}

export async function fetchAssignedMatches(
  tokenOrProvider: string | TokenProvider
): Promise<ApiResponse<Match[]>> {
  const options =
    typeof tokenOrProvider === 'string'
      ? { token: tokenOrProvider }
      : { getToken: tokenOrProvider };

  return http.get<ApiResponse<Match[]>>('/api/scorer/matches', options);
}

export async function fetchAssignedMatchById(
  tokenOrProvider: string | TokenProvider,
  matchId: string | number
): Promise<ApiResponse<AssignedMatchDetails>> {
  const options =
    typeof tokenOrProvider === 'string'
      ? { token: tokenOrProvider }
      : { getToken: tokenOrProvider };

  return http.get<ApiResponse<AssignedMatchDetails>>(
    `/api/scorer/matches/${matchId}`,
    options
  );
}

export async function startMatch(
  tokenOrProvider: string | TokenProvider,
  matchId: string | number
): Promise<ApiResponse<{ match: Match; innings: Innings }>> {
  const options =
    typeof tokenOrProvider === 'string'
      ? { token: tokenOrProvider }
      : { getToken: tokenOrProvider };

  return http.post<ApiResponse<{ match: Match; innings: Innings }>>(
    `/api/scorer/matches/${matchId}/start`,
    {},
    options
  );
}

export async function pauseMatch(
  tokenOrProvider: string | TokenProvider,
  matchId: string | number
): Promise<ApiResponse<Match>> {
  const options =
    typeof tokenOrProvider === 'string'
      ? { token: tokenOrProvider }
      : { getToken: tokenOrProvider };

  return http.post<ApiResponse<Match>>(
    `/api/scorer/matches/${matchId}/pause`,
    {},
    options
  );
}

export async function resumeMatch(
  tokenOrProvider: string | TokenProvider,
  matchId: string | number
): Promise<ApiResponse<Match>> {
  const options =
    typeof tokenOrProvider === 'string'
      ? { token: tokenOrProvider }
      : { getToken: tokenOrProvider };

  return http.post<ApiResponse<Match>>(
    `/api/scorer/matches/${matchId}/resume`,
    {},
    options
  );
}

export async function completeMatch(
  tokenOrProvider: string | TokenProvider,
  matchId: string | number
): Promise<ApiResponse<Match>> {
  const options =
    typeof tokenOrProvider === 'string'
      ? { token: tokenOrProvider }
      : { getToken: tokenOrProvider };

  return http.post<ApiResponse<Match>>(
    `/api/scorer/matches/${matchId}/complete`,
    {},
    options
  );
}

export async function createInnings(
  tokenOrProvider: string | TokenProvider,
  matchId: string | number,
  payload: { battingTeam: string; bowlingTeam: string; target?: number }
): Promise<ApiResponse<Innings>> {
  const options =
    typeof tokenOrProvider === 'string'
      ? { token: tokenOrProvider }
      : { getToken: tokenOrProvider };

  return http.post<ApiResponse<Innings>>(
    `/api/scorer/matches/${matchId}/innings`,
    payload,
    options
  );
}

export async function recordScoringEvent(
  tokenOrProvider: string | TokenProvider,
  matchId: string | number,
  payload: {
    inningsId?: number;
    eventType: 'ball' | 'wicket' | 'boundary' | 'extra' | 'over_end';
    runsOffBat?: number;
    extrasType?: 'none' | 'wide' | 'no_ball' | 'bye' | 'leg_bye' | 'penalty';
    extrasRuns?: number;
    wicketType?: string;
    dismissedPlayer?: string;
    batter?: string;
    bowler?: string;
    idempotencyKey?: string;
  }
): Promise<ApiResponse<{ event: ScoringEvent; innings: Innings; isIdempotentReplay: boolean }>> {
  const options =
    typeof tokenOrProvider === 'string'
      ? { token: tokenOrProvider }
      : { getToken: tokenOrProvider };

  return http.post<ApiResponse<{ event: ScoringEvent; innings: Innings; isIdempotentReplay: boolean }>>(
    `/api/scorer/matches/${matchId}/events`,
    payload,
    options
  );
}

export async function fetchScoringEvents(
  tokenOrProvider: string | TokenProvider,
  matchId: string | number,
  inningsId?: number
): Promise<ApiResponse<ScoringEvent[]>> {
  const options =
    typeof tokenOrProvider === 'string'
      ? { token: tokenOrProvider }
      : { getToken: tokenOrProvider };

  return http.get<ApiResponse<ScoringEvent[]>>(
    `/api/scorer/matches/${matchId}/events`,
    {
      ...options,
      params: inningsId ? { inningsId } : undefined,
    }
  );
}
