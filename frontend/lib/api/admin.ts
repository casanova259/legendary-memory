import { http, TokenProvider } from './client';
import {
  AdminDashboardStats,
  ScorerItem,
  MatchAssignment,
  AuditLogItem,
  Match,
  AppUser,
  UserListResponse,
  UserRole,
  ApiResponse,
} from '../../types';

export async function fetchAdminDashboard(
  tokenOrProvider: string | TokenProvider
): Promise<ApiResponse<AdminDashboardStats>> {
  const options =
    typeof tokenOrProvider === 'string'
      ? { token: tokenOrProvider }
      : { getToken: tokenOrProvider };

  return http.get<ApiResponse<AdminDashboardStats>>('/api/admin/dashboard', options);
}

export async function fetchAdminScorers(
  tokenOrProvider: string | TokenProvider
): Promise<ApiResponse<ScorerItem[]>> {
  const options =
    typeof tokenOrProvider === 'string'
      ? { token: tokenOrProvider }
      : { getToken: tokenOrProvider };

  return http.get<ApiResponse<ScorerItem[]>>('/api/admin/scorers', options);
}

export async function inviteScorer(
  tokenOrProvider: string | TokenProvider,
  payload: { email: string; displayName?: string }
): Promise<ApiResponse<ScorerItem>> {
  const options =
    typeof tokenOrProvider === 'string'
      ? { token: tokenOrProvider }
      : { getToken: tokenOrProvider };

  return http.post<ApiResponse<ScorerItem>>('/api/admin/scorers/invite', payload, options);
}

export async function toggleScorerStatus(
  tokenOrProvider: string | TokenProvider,
  scorerId: number,
  isActive: boolean
): Promise<ApiResponse<ScorerItem>> {
  const options =
    typeof tokenOrProvider === 'string'
      ? { token: tokenOrProvider }
      : { getToken: tokenOrProvider };

  return http.patch<ApiResponse<ScorerItem>>(
    `/api/admin/scorers/${scorerId}/status`,
    { isActive },
    options
  );
}

export async function createAdminMatch(
  tokenOrProvider: string | TokenProvider,
  payload: {
    sport: string;
    homeTeam: string;
    awayTeam: string;
    startTime: string;
    endTime: string;
  }
): Promise<ApiResponse<Match>> {
  const options =
    typeof tokenOrProvider === 'string'
      ? { token: tokenOrProvider }
      : { getToken: tokenOrProvider };

  return http.post<ApiResponse<Match>>('/api/admin/matches', payload, options);
}

export async function assignScorer(
  tokenOrProvider: string | TokenProvider,
  matchId: number | string,
  scorerId: number
): Promise<ApiResponse<MatchAssignment>> {
  const options =
    typeof tokenOrProvider === 'string'
      ? { token: tokenOrProvider }
      : { getToken: tokenOrProvider };

  return http.post<ApiResponse<MatchAssignment>>(
    `/api/admin/matches/${matchId}/assign`,
    { scorerId },
    options
  );
}

export async function revokeAssignment(
  tokenOrProvider: string | TokenProvider,
  matchId: number | string,
  reason?: string
): Promise<ApiResponse<MatchAssignment>> {
  const options =
    typeof tokenOrProvider === 'string'
      ? { token: tokenOrProvider }
      : { getToken: tokenOrProvider };

  return http.post<ApiResponse<MatchAssignment>>(
    `/api/admin/matches/${matchId}/revoke`,
    { reason },
    options
  );
}

export async function reassignScorer(
  tokenOrProvider: string | TokenProvider,
  matchId: number | string,
  newScorerId: number,
  reason?: string
): Promise<ApiResponse<MatchAssignment>> {
  const options =
    typeof tokenOrProvider === 'string'
      ? { token: tokenOrProvider }
      : { getToken: tokenOrProvider };

  return http.post<ApiResponse<MatchAssignment>>(
    `/api/admin/matches/${matchId}/reassign`,
    { newScorerId, reason },
    options
  );
}

export async function fetchAssignmentHistory(
  tokenOrProvider: string | TokenProvider,
  matchId: number | string
): Promise<ApiResponse<MatchAssignment[]>> {
  const options =
    typeof tokenOrProvider === 'string'
      ? { token: tokenOrProvider }
      : { getToken: tokenOrProvider };

  return http.get<ApiResponse<MatchAssignment[]>>(
    `/api/admin/matches/${matchId}/assignments`,
    options
  );
}

export async function overrideMatchStatus(
  tokenOrProvider: string | TokenProvider,
  matchId: number | string,
  status: string,
  reason: string
): Promise<ApiResponse<Match>> {
  const options =
    typeof tokenOrProvider === 'string'
      ? { token: tokenOrProvider }
      : { getToken: tokenOrProvider };

  return http.post<ApiResponse<Match>>(
    `/api/admin/matches/${matchId}/status-override`,
    { status, reason },
    options
  );
}

export async function correctScoringEvent(
  tokenOrProvider: string | TokenProvider,
  matchId: number | string,
  eventId: number | string,
  reason: string
): Promise<ApiResponse<any>> {
  const options =
    typeof tokenOrProvider === 'string'
      ? { token: tokenOrProvider }
      : { getToken: tokenOrProvider };

  return http.post<ApiResponse<any>>(
    `/api/admin/matches/${matchId}/events/${eventId}/correct`,
    { reason },
    options
  );
}

export async function fetchAdminAuditLogs(
  tokenOrProvider: string | TokenProvider,
  matchId?: number | string
): Promise<ApiResponse<AuditLogItem[]>> {
  const options =
    typeof tokenOrProvider === 'string'
      ? { token: tokenOrProvider }
      : { getToken: tokenOrProvider };

  const endpoint = matchId
    ? `/api/admin/matches/${matchId}/audit-logs`
    : '/api/admin/audit-logs';

  return http.get<ApiResponse<AuditLogItem[]>>(endpoint, options);
}

// User role & bootstrap administration (existing compatibility)
export async function fetchUsers(
  tokenOrProvider: string | TokenProvider
): Promise<UserListResponse> {
  const options =
    typeof tokenOrProvider === 'string'
      ? { token: tokenOrProvider }
      : { getToken: tokenOrProvider };

  return http.get<UserListResponse>('/admin/users', options);
}

export async function updateUserRole(
  tokenOrProvider: string | TokenProvider,
  userId: number,
  role: UserRole
): Promise<ApiResponse<AppUser>> {
  const options =
    typeof tokenOrProvider === 'string'
      ? { token: tokenOrProvider }
      : { getToken: tokenOrProvider };

  return http.patch<ApiResponse<AppUser>>(
    `/admin/users/${userId}/role`,
    { role },
    options
  );
}

export async function bootstrapAdmin(
  tokenOrProvider: string | TokenProvider,
  secret: string
): Promise<ApiResponse<AppUser>> {
  const options =
    typeof tokenOrProvider === 'string'
      ? { token: tokenOrProvider }
      : { getToken: tokenOrProvider };

  return http.post<ApiResponse<AppUser>>(
    '/admin/bootstrap',
    { secret },
    options
  );
}
