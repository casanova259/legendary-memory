import { http, TokenProvider } from './client';
import { AppUser, ApiResponse } from '../../types';

export async function fetchCurrentUser(tokenOrProvider: string | TokenProvider): Promise<ApiResponse<AppUser>> {
  const options =
    typeof tokenOrProvider === 'string'
      ? { token: tokenOrProvider }
      : { getToken: tokenOrProvider };

  return http.get<ApiResponse<AppUser>>('/auth/me', options);
}

export async function syncUserProfile(
  tokenOrProvider: string | TokenProvider,
  payload: { email?: string; displayName?: string }
): Promise<ApiResponse<AppUser>> {
  const options =
    typeof tokenOrProvider === 'string'
      ? { token: tokenOrProvider }
      : { getToken: tokenOrProvider };

  return http.post<ApiResponse<AppUser>>('/auth/sync', payload, options);
}
