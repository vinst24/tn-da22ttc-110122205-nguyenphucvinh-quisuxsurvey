import type { Specialty } from '@prisma/client';
import { participantRepo } from '../repositories/participant.repo.js';
import { notFound } from '../utils/errors.js';

export const participantService = {
  list: async (opts: {
    page?: number;
    pageSize?: number;
    q?: string;
    isGuest?: boolean;
    specialty?: Specialty;
    surveyId?: number;
    createdFrom?: string;
    createdTo?: string;
  }) => {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.max(1, Math.min(100, opts.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      participantRepo.list({
        skip,
        take: pageSize,
        q: opts.q,
        isGuest: opts.isGuest,
        specialty: opts.specialty,
        surveyId: opts.surveyId,
        createdFrom: opts.createdFrom,
        createdTo: opts.createdTo,
      }),
      participantRepo.count({
        q: opts.q,
        isGuest: opts.isGuest,
        specialty: opts.specialty,
        surveyId: opts.surveyId,
        createdFrom: opts.createdFrom,
        createdTo: opts.createdTo,
      }),
    ]);

    return {
      items,
      meta: { page, pageSize, total },
    };
  },


  specialtyStats: async (opts: {
    q?: string;
    isGuest?: boolean;
    specialty?: Specialty;
    surveyId?: number;
    createdFrom?: string;
    createdTo?: string;
  }) => {
    const items = await participantRepo.listAll(opts);
    const counts = new Map<Specialty, number>();
    for (const item of items) {
      const key = (item.specialty ?? 'OTHER') as Specialty;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return {
      items: Array.from(counts.entries())
        .map(([specialty, count]) => ({ specialty, count }))
        .sort((a, b) => b.count - a.count),
      total: items.length,
    };
  },
  exportCsv: async (opts: {
    q?: string;
    isGuest?: boolean;
    specialty?: Specialty;
    surveyId?: number;
    createdFrom?: string;
    createdTo?: string;
  }) => {
    const items = await participantRepo.listAll(opts);
    return items;
  },

  getById: async (id: string) => {
    const pid = Number(id);
    const item = await participantRepo.findById(pid);
    if (!item) throw notFound('\u004b\u0068\u00f4ng t\u00ecm th\u1ea5y ng\u01b0\u1eddi tham gia');
    return item;
  },

  delete: async (id: string) => {
    const pid = Number(id);
    await participantService.getById(id); // ensure exists
    return participantRepo.delete(pid);
  },
};

export default participantService;
