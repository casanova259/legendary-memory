import { http, TokenProvider } from './client';
import { Match, MatchResponse, Commentary, CommentaryResponse, ApiResponse } from '../../types';

export async function fetchMatches(limit = 50): Promise<MatchResponse> {
  return http.get<MatchResponse>('/matches', { params: { limit } });
}

export async function fetchMatchById(matchId: string | number): Promise<ApiResponse<Match>> {
  return http.get<ApiResponse<Match>>(`/matches/${matchId}`);
}

export async function fetchMatchCommentary(
  matchId: string | number,
  limit = 100
): Promise<CommentaryResponse> {
  return http.get<CommentaryResponse>(`/matches/${matchId}/commentary`, {
    params: { limit },
  });
}

export async function createMatch(
  tokenOrProvider: string | TokenProvider,
  payload: {
    sport: string;
    homeTeam: string;
    awayTeam: string;
    startTime: string;
    endTime: string;
    homeScore?: number;
    awayScore?: number;
  }
): Promise<ApiResponse<Match>> {
  const options =
    typeof tokenOrProvider === 'string'
      ? { token: tokenOrProvider }
      : { getToken: tokenOrProvider };

  return http.post<ApiResponse<Match>>('/matches', payload, options);
}

export async function updateScore(
  tokenOrProvider: string | TokenProvider,
  matchId: string | number,
  homeScore: number,
  awayScore: number
): Promise<ApiResponse<Match>> {
  const options =
    typeof tokenOrProvider === 'string'
      ? { token: tokenOrProvider }
      : { getToken: tokenOrProvider };

  return http.patch<ApiResponse<Match>>(
    `/matches/${matchId}/score`,
    { homeScore, awayScore },
    options
  );
}

export async function createCommentary(
  tokenOrProvider: string | TokenProvider,
  matchId: string | number,
  payload: {
    minute?: number;
    sequence: number;
    period?: string;
    eventType: string;
    message: string;
    actor?: string;
    team?: string;
  }
): Promise<ApiResponse<Commentary>> {
  const options =
    typeof tokenOrProvider === 'string'
      ? { token: tokenOrProvider }
      : { getToken: tokenOrProvider };

  return http.post<ApiResponse<Commentary>>(
    `/matches/${matchId}/commentary`,
    payload,
    options
  );
}
