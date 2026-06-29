export type SubmitResponseResultDto = {
  responseId: string;
  overallAverage: number;
  categoryAverages: Record<string, { categoryName: string; average: number }>;
  interpretation?: null | { id: string; minScore: string; maxScore: string; level: string; description: string };
  guestCodeToSet?: string;
};

export type ResponseListItemDto = {
  id: string;
  surveyId: string;
  participantId: string;
  submittedAt: string;
  isComplete?: boolean;
  completionPercent?: number;
  participant: { id: string; fullName?: string | null; email?: string | null; type: 'GUEST' | 'REGISTERED' };
  quisScore?: null | { overallAverage: string; categoryAverages: unknown };
};

export type DraftDetailDto = {
  questionId: string;
  score: number;
};

export type DraftDto = {
  responseId: string;
  completionPercent: number;
  lastSavedAt: string | null;
  details: DraftDetailDto[];
};

export type SaveDraftResultDto = {
  responseId: string;
  completionPercent: number;
  guestCodeToSet?: string;
};

export type MyResponseAttemptDto = {
  responseId: string;
  attemptNumber: number;
  isComplete: boolean;
  completionPercent: number;
  submittedAt: string | null;
  lastSavedAt: string | null;
  createdAt: string;
};

export type MySurveyHistorySummaryDto = {
  surveyId: string;
  surveySlug: string | null;
  surveyTitle: string;
  surveyDescription: string | null;
  surveyIsActive: boolean;
  surveyIsPublic: boolean;
  attemptCount: number;
  hasOpenDraft: boolean;
  latestAttempt: MyResponseAttemptDto;
};

export type MyResponseItemDto = MySurveyHistorySummaryDto;