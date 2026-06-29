import type { Response } from 'express';
import { cookieOptions } from '../configs/cookies.js';
import { GUEST_COOKIE_TTL_SECONDS, GUEST_PARTICIPANT_COOKIE } from '../constants/guestCookie.js';

export const setGuestCookie = (res: Response, participantCode: string) => {
  res.cookie(GUEST_PARTICIPANT_COOKIE, participantCode, {
    ...cookieOptions,
    maxAge: GUEST_COOKIE_TTL_SECONDS * 1000,
  });
};

export const clearGuestCookie = (res: Response) => {
  res.clearCookie(GUEST_PARTICIPANT_COOKIE, { ...cookieOptions });
};
