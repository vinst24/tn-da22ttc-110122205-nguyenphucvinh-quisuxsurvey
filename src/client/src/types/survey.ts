export type SurveyDto = {
  id: string;
  title: string;
  description?: string | null;
  isActive: boolean;
  isPublic: boolean;
  expiresAt?: string | null;
  slug?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SurveyListItemDto = SurveyDto & {
  _count?: { categories: number; questions?: number; responses: number };
};

export type CategoryDto = {
  id: string;
  name: string;
  description?: string | null;
  order: number;
};

export type QuestionDto = {
  id: string;
  categoryId: string;
  content: string;
  order: number;
  isRequired: boolean;
};

export type SurveyDetailDto = SurveyDto & {
  categories: Array<CategoryDto & { questions: QuestionDto[] }>;
  _count?: { responses: number };
};

export type SurveyTokenValidationDto = {
  surveyId: string;
  surveySlug: string;
  title: string;
  description?: string | null;
  questionCount: number;
  isActive: boolean;
  isPublic: boolean;
  expiresAt?: string | null;
};

export type SurveyTokenDto = {
  id: string;
  surveyId: string;
  participantId: string | null;
  code: string;
  maxUsage: number | null;
  usageCount: number;
  validFrom: string | null;
  validTo: string | null;
  usedAt: string | null;
  createdAt: string;
  participant: null | {
    id: string;
    nickname?: string | null;
    participantCode: string;
  };
};
