import { http } from './client';
import { CommentaryResponse } from '../../types';

export async function fetchCommentary(
  matchId: string | number,
  limit = 100
): Promise<CommentaryResponse> {
  return http.get<CommentaryResponse>(`/matches/${matchId}/commentary`, {
    params: { limit },
  });
}
