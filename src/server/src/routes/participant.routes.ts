import { Router } from 'express';
import { deleteParticipant, exportParticipants, getGuestInfo, getParticipantById, listParticipants, participantSpecialtyStats } from '../controllers/participant.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { participantIdParams, participantListQuery } from '../validations/participant.validation.js';

export const participantRouter = Router();

// Guest info (no auth required — reads cookie)
participantRouter.get('/participants/guest/info', getGuestInfo);

// Admin endpoints
participantRouter.get('/admin/participants', requireAuth, requireRole('ADMIN'), validate({ query: participantListQuery }), listParticipants);
participantRouter.get('/admin/participants/export', requireAuth, requireRole('ADMIN'), validate({ query: participantListQuery }), exportParticipants);
participantRouter.get('/admin/participants/specialty-stats', requireAuth, requireRole('ADMIN'), validate({ query: participantListQuery }), participantSpecialtyStats);
participantRouter.get('/admin/participants/:id', requireAuth, requireRole('ADMIN'), validate({ params: participantIdParams }), getParticipantById);
participantRouter.delete('/admin/participants/:id', requireAuth, requireRole('ADMIN'), validate({ params: participantIdParams }), deleteParticipant);
