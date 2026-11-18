import { MATCH_STATUS } from "../validation/matches.js";
import { matches } from "../db/schema.js";
import { eq } from "drizzle-orm";

export function getMatchStatus(startTime, endTime, now = new Date()) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  if (now < start) {
    return MATCH_STATUS.SCHEDULED;
  }

  if (now >= end) {
    return MATCH_STATUS.FINISHED;
  }

  return MATCH_STATUS.LIVE;
}

export async function syncMatchStatus(match, dbInstance) {
  if (!match || !match.startTime || !match.endTime) {
    return match;
  }

  const computed = getMatchStatus(match.startTime, match.endTime);
  if (computed && computed !== match.status && dbInstance) {
    try {
      await dbInstance
        .update(matches)
        .set({ status: computed })
        .where(eq(matches.id, match.id));
      match.status = computed;
    } catch (err) {
      console.error(`Failed to sync status for match ${match.id}:`, err);
    }
  }

  return match;
}

export async function syncMatchesStatuses(matchesList, dbInstance) {
  if (!Array.isArray(matchesList) || matchesList.length === 0) {
    return matchesList;
  }

  const now = new Date();
  const updatePromises = [];

  for (const match of matchesList) {
    if (!match.startTime || !match.endTime) continue;
    const computed = getMatchStatus(match.startTime, match.endTime, now);

    if (computed && computed !== match.status) {
      match.status = computed;
      if (dbInstance) {
        updatePromises.push(
          dbInstance
            .update(matches)
            .set({ status: computed })
            .where(eq(matches.id, match.id))
            .catch((err) => {
              console.error(`Failed to update status for match ${match.id}:`, err);
            })
        );
      }
    }
  }

  if (updatePromises.length > 0) {
    await Promise.allSettled(updatePromises);
  }

  return matchesList;
}
