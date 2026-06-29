export type SurveySummaryDto = {
  surveyId: string;
  title: string;
  isActive: boolean;
  overallAverage: number;
  totalResponses: number;
};

type InterpretationDto = null | { id: string; minScore: string; maxScore: string; level: string; description: string };

type ConfidenceIntervalDto = {
  lower: number;
  upper: number;
  marginOfError: number;
};

export type AnalyticsDto = {
  survey: { id: string; title: string };
  stats: {
    totalResponses: number;
    completedCount: number;
    partialCount: number;
    uniqueParticipants: number;
    overallAverage: number;
    standardDeviation: number;
    median: number;
    confidenceInterval95: ConfidenceIntervalDto;
    totalQuestions: number;
    completionDistribution: [number, number, number];
    interpretation: InterpretationDto;
  };
  categories: Array<{
    categoryId: string;
    categoryName: string;
    average: number;
    standardDeviation: number;
    median: number;
    responseCount: number;
    cronbachAlpha: number | null;
  }>;
  questions: Array<{
    questionId: string;
    sequence: number;
    questionContent: string;
    categoryId: string;
    categoryName: string;
    average: number;
    standardDeviation: number;
    median: number;
    confidenceInterval95: ConfidenceIntervalDto;
    distribution: number[];
    responseCount: number;
    missingCount: number;
    missingRate: number;
    minScore: number;
    maxScore: number;
    interpretation: InterpretationDto;
  }>;
  charts: {
    radar: { labels: string[]; datasets: Array<{ label: string; data: number[] }> };
    bar: { labels: string[]; datasets: Array<{ label: string; data: number[] }> };
    pie: { labels: string[]; data: number[] };
    histogram: { labels: string[]; data: number[] };
  };
  questionCharts: {
    radar: { labels: string[]; datasets: Array<{ label: string; data: number[] }> };
    bar: { labels: string[]; datasets: Array<{ label: string; data: number[] }> };
  };
  dropOff: Array<{
    questionId: string;
    sequence: number;
    questionContent: string;
    missingCount: number;
    missingRate: number;
  }>;
};

export type AnalyticsStatus = 'completed' | 'partial' | 'all';
export type AnalyticsParticipationType = 'guest' | 'registered';

export type AnalyticsFilters = {
  includePartial?: boolean;
  specialty?: string;
  participationType?: AnalyticsParticipationType;
  status?: AnalyticsStatus;
  dateFrom?: string;
  dateTo?: string;
};

export type AnalyticsComparisonDto = {
  compareBy: 'specialty';
  groupA: {
    value: string;
    label: string;
    stats: AnalyticsDto['stats'];
    categories: AnalyticsDto['categories'];
  };
  groupB: {
    value: string;
    label: string;
    stats: AnalyticsDto['stats'];
    categories: AnalyticsDto['categories'];
  };
  difference: {
    overallAverage: number;
    totalResponses: number;
  };
  tTest: {
    statistic: number | null;
    sampleSizeA: number;
    sampleSizeB: number;
    available: boolean;
    note: string;
  };
};
