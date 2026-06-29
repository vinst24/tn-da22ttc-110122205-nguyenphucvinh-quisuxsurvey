import { describe, expect, it } from 'vitest';
import { surveyServiceInternals } from './survey.service.js';

describe('surveyServiceInternals.resolveSurveyTitleForPersistence', () => {
  it('keeps original title when there is no duplicate', () => {
    const result = surveyServiceInternals.resolveSurveyTitleForPersistence({
      requestedTitle: 'Survey A',
      requestedDescription: 'Desc',
      candidates: [],
    });

    expect(result).toEqual({ title: 'Survey A', hasActiveDuplicate: false });
  });

  it('flags active exact duplicates', () => {
    const result = surveyServiceInternals.resolveSurveyTitleForPersistence({
      requestedTitle: 'Survey A',
      requestedDescription: 'Desc',
      candidates: [{ id: 1, title: 'Survey A', description: 'Desc', expiresAt: null }],
    });

    expect(result).toEqual({ title: 'Survey A', hasActiveDuplicate: true });
  });

  it('appends the first suffix when only expired exact duplicates exist', () => {
    const result = surveyServiceInternals.resolveSurveyTitleForPersistence({
      requestedTitle: 'Survey A',
      requestedDescription: 'Desc',
      candidates: [
        { id: 1, title: 'Survey A', description: 'Desc', expiresAt: new Date('2026-01-01T00:00:00.000Z') },
      ],
      now: new Date('2026-06-25T00:00:00.000Z').getTime(),
    });

    expect(result).toEqual({ title: 'Survey A (1)', hasActiveDuplicate: false });
  });

  it('uses the next highest suffix from the same title family and description', () => {
    const result = surveyServiceInternals.resolveSurveyTitleForPersistence({
      requestedTitle: 'Survey A',
      requestedDescription: 'Desc',
      candidates: [
        { id: 1, title: 'Survey A', description: 'Desc', expiresAt: new Date('2026-01-01T00:00:00.000Z') },
        { id: 2, title: 'Survey A (1)', description: 'Desc', expiresAt: new Date('2026-02-01T00:00:00.000Z') },
        { id: 3, title: 'Survey A (2)', description: 'Desc', expiresAt: new Date('2026-03-01T00:00:00.000Z') },
      ],
      now: new Date('2026-06-25T00:00:00.000Z').getTime(),
    });

    expect(result).toEqual({ title: 'Survey A (3)', hasActiveDuplicate: false });
  });

  it('ignores surveys with different descriptions', () => {
    const result = surveyServiceInternals.resolveSurveyTitleForPersistence({
      requestedTitle: 'Survey A',
      requestedDescription: 'Desc',
      candidates: [
        { id: 1, title: 'Survey A', description: 'Other desc', expiresAt: null },
        { id: 2, title: 'Survey A (1)', description: 'Other desc', expiresAt: null },
      ],
    });

    expect(result).toEqual({ title: 'Survey A', hasActiveDuplicate: false });
  });

  it('treats missing and empty descriptions consistently', () => {
    const result = surveyServiceInternals.resolveSurveyTitleForPersistence({
      requestedTitle: 'Survey A',
      requestedDescription: undefined,
      candidates: [
        { id: 1, title: 'Survey A', description: '', expiresAt: new Date('2026-01-01T00:00:00.000Z') },
      ],
      now: new Date('2026-06-25T00:00:00.000Z').getTime(),
    });

    expect(result).toEqual({ title: 'Survey A (1)', hasActiveDuplicate: false });
  });
});
