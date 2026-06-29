import { GUEST_COOKIE_TTL_SECONDS } from '../constants/guestCookie.js';
import { participantRepo } from '../repositories/participant.repo.js';
import { refreshTokenRepo } from '../repositories/refreshToken.repo.js';
import { responseRepo } from '../repositories/response.repo.js';

const STALE_DRAFT_AGE_DAYS = 7;
const REFRESH_TOKEN_REVOKED_RETENTION_DAYS = 7;
const RUN_INTERVAL_MS = 24 * 60 * 60 * 1000;

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

export const runDraftCleanup = async () => {
  try {
    const beforeDate = daysAgo(STALE_DRAFT_AGE_DAYS);
    const { count } = await responseRepo.deleteStaleDraftsBelow80({ beforeDate });
    if (count > 0) {
      console.log(`[draft-cleanup] removed ${count} stale draft(s) below 80% older than ${STALE_DRAFT_AGE_DAYS} days`);
    }
  } catch (err) {
    console.warn('[draft-cleanup] failed:', err);
  }
};

export const runGuestParticipantCleanup = async () => {
  try {
    const beforeDate = new Date(Date.now() - GUEST_COOKIE_TTL_SECONDS * 1000);
    const { count } = await participantRepo.deleteExpiredEmptyGuests(beforeDate);
    if (count > 0) {
      console.log(`[guest-cleanup] removed ${count} empty guest participant(s) after guest cookie expiry`);
    }
  } catch (err) {
    console.warn('[guest-cleanup] failed:', err);
  }
};

export const runRefreshTokenCleanup = async () => {
  try {
    const { count } = await refreshTokenRepo.deleteExpiredOrOldRevoked({
      now: new Date(),
      revokedBefore: daysAgo(REFRESH_TOKEN_REVOKED_RETENTION_DAYS),
    });
    if (count > 0) {
      console.log(`[refresh-token-cleanup] removed ${count} expired or old revoked refresh token(s)`);
    }
  } catch (err) {
    console.warn('[refresh-token-cleanup] failed:', err);
  }
};

export const runScheduledCleanup = async () => {
  await runDraftCleanup();
  await runGuestParticipantCleanup();
  await runRefreshTokenCleanup();
};

export const scheduleDraftCleanup = () => {
  void runScheduledCleanup();
  setInterval(() => {
    void runScheduledCleanup();
  }, RUN_INTERVAL_MS).unref();
};