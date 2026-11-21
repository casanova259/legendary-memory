import { API_BASE_URL } from "../constants";
import {
  AppUser,
  Commentary,
  CommentaryResponse,
  Match,
  MatchResponse,
  UserListResponse,
  UserRole,
} from "../types";

export const fetchMatches = async (limit = 50): Promise<MatchResponse> => {
  const response = await fetch(`${API_BASE_URL}/matches?limit=${limit}`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

export const fetchMatchCommentary = async (
  matchId: string | number,
  limit = 100
): Promise<CommentaryResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/matches/${matchId}/commentary?limit=${limit}`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

export const fetchCurrentUser = async (token: string): Promise<{ data: AppUser }> => {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || `Failed to fetch current user profile: ${response.status}`);
  }

  return response.json();
};

export const createMatch = async (
  token: string,
  payload: {
    sport: string;
    homeTeam: string;
    awayTeam: string;
    startTime: string;
    endTime: string;
    homeScore?: number;
    awayScore?: number;
  }
): Promise<{ data: Match }> => {
  const response = await fetch(`${API_BASE_URL}/matches`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || errorBody.error || `Failed to create match: ${response.status}`);
  }

  return response.json();
};

export const updateScore = async (
  token: string,
  matchId: string | number,
  homeScore: number,
  awayScore: number
): Promise<{ data: Match }> => {
  const response = await fetch(`${API_BASE_URL}/matches/${matchId}/score`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ homeScore, awayScore }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || errorBody.error || `Failed to update score: ${response.status}`);
  }

  return response.json();
};

export const createCommentary = async (
  token: string,
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
): Promise<{ data: Commentary }> => {
  const response = await fetch(`${API_BASE_URL}/matches/${matchId}/commentary`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || errorBody.error || `Failed to create commentary: ${response.status}`);
  }

  return response.json();
};

export const fetchUsers = async (token: string): Promise<UserListResponse> => {
  const response = await fetch(`${API_BASE_URL}/admin/users`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || errorBody.error || `Failed to fetch users: ${response.status}`);
  }

  return response.json();
};

export const updateUserRole = async (
  token: string,
  userId: number,
  role: UserRole
): Promise<{ data: AppUser; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/role`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ role }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || errorBody.error || `Failed to update user role: ${response.status}`);
  }

  return response.json();
};

export const bootstrapAdmin = async (
  token: string,
  secret: string
): Promise<{ data: AppUser; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/admin/bootstrap`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ secret }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || errorBody.error || `Bootstrap failed: ${response.status}`);
  }

  return response.json();
};
