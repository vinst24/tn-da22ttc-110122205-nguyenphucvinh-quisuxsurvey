import type { Prisma, Specialty } from '@prisma/client';
import { tTestTwoSample } from 'simple-statistics';
import { prisma } from '../prisma/client.js';
import { quisRepo } from '../repositories/quis.repo.js';
import { surveyService } from './survey.service.js';

const avg = (nums: number[]) => nums.reduce((a, b) => a + b, 0) / (nums.length || 1);
const round2 = (value: number) => Number(value.toFixed(2));
const round3 = (value: number) => Number(value.toFixed(3));

const variance = (nums: number[]) => {
  if (nums.length < 2) return 0;
  const mean = avg(nums);
  return nums.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (nums.length - 1);
};

const standardDeviation = (nums: number[]) => round2(Math.sqrt(variance(nums)));

const median = (nums: number[]) => {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return round2(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2);
  return round2(sorted[mid] ?? 0);
};

const confidenceInterval95 = (nums: number[]) => {
  if (!nums.length) return { lower: 0, upper: 0, marginOfError: 0 };
  const mean = avg(nums);
  if (nums.length < 2) return { lower: round2(mean), upper: round2(mean), marginOfError: 0 };
  const marginOfError = 1.96 * Math.sqrt(variance(nums)) / Math.sqrt(nums.length);
  return {
    lower: round2(Math.max(1, mean - marginOfError)),
    upper: round2(Math.min(9, mean + marginOfError)),
    marginOfError: round2(marginOfError),
  };
};

const scoreDistribution = (scores: number[]) => {
  const counts = Array.from({ length: 9 }, () => 0);
  for (const score of scores) {
    if (score >= 1 && score <= 9) {
      const index = score - 1;
      counts[index] = (counts[index] ?? 0) + 1;
    }
  }
  return counts;
};

const cronbachAlpha = (rows: number[][]) => {
  const itemCount = rows[0]?.length ?? 0;
  if (rows.length < 2 || itemCount < 2) return null;

  const itemVariances = Array.from({ length: itemCount }, (_, itemIndex) =>
    variance(rows.map((row) => row[itemIndex] ?? 0)),
  );
  const totalScores = rows.map((row) => row.reduce((sum, score) => sum + score, 0));
  const totalVariance = variance(totalScores);

  if (totalVariance === 0) return null;
  const alpha = (itemCount / (itemCount - 1)) * (1 - itemVariances.reduce((sum, v) => sum + v, 0) / totalVariance);
  return round3(alpha);
};

export type ParticipationType = 'guest' | 'registered';
export type AnalyticsStatus = 'completed' | 'partial' | 'all';

export type AnalyticsFilterOptions = {
  includePartial?: boolean;
  specialty?: Specialty;
  participationType?: ParticipationType;
  status?: AnalyticsStatus;
  dateFrom?: string;
  dateTo?: string;
};

const parseDateStart = (value?: string) => (value ? new Date(`${value}T00:00:00.000Z`) : undefined);
const parseDateEnd = (value?: string) => (value ? new Date(`${value}T23:59:59.999Z`) : undefined);

const responseFilter = (surveyId: number, opts: AnalyticsFilterOptions = {}): Prisma.ResponseWhereInput => {
  const where: Prisma.ResponseWhereInput = { surveyId };

  if (opts.status === 'completed') {
    where.completionPercent = 100;
  } else if (opts.status === 'partial') {
    where.completionPercent = { gte: 80, lt: 100 };
  } else if (opts.status === 'all') {
    where.completionPercent = { gte: 80 };
  } else if (opts.includePartial) {
    where.completionPercent = { gte: 80 };
  } else {
    where.completionPercent = 100;
  }

  const createdAt: Prisma.DateTimeFilter = {};
  const from = parseDateStart(opts.dateFrom);
  const to = parseDateEnd(opts.dateTo);
  if (from) createdAt.gte = from;
  if (to) createdAt.lte = to;
  if (from || to) where.createdAt = createdAt;

  const participant: Prisma.ParticipantWhereInput = {};
  if (opts.specialty) participant.specialty = opts.specialty;
  if (opts.participationType === 'guest') participant.isGuest = true;
  if (opts.participationType === 'registered') participant.isGuest = false;
  if (Object.keys(participant).length > 0) where.participant = participant;

  return where;
};

const responseAverageSamples = async (surveyId: string, opts: AnalyticsFilterOptions = {}) => {
  const responses = await prisma.response.findMany({
    where: responseFilter(Number(surveyId), opts),
    select: { responseDetails: { select: { score: true } } },
  });

  return responses
    .map((response) => response.responseDetails.map((detail) => detail.score))
    .filter((scores) => scores.length > 0)
    .map((scores) => avg(scores));
};

export const dashboardService = {
  surveysSummary: async (opts: { includePartial?: boolean } = {}) => {
    const includePartial = Boolean(opts.includePartial);
    const surveys = await prisma.survey.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, isActive: true },
    });

    const responseWhere = includePartial
      ? { completionPercent: { gte: 80 } }
      : { completionPercent: 100 };

    const scores = await prisma.responseDetail.findMany({
      where: { response: responseWhere },
      select: { score: true, response: { select: { surveyId: true } } },
    });

    const bySurvey = new Map<number, number[]>();
    for (const s of scores) {
      const arr = bySurvey.get(s.response.surveyId) ?? [];
      arr.push(s.score);
      bySurvey.set(s.response.surveyId, arr);
    }

    const responseCounts = await prisma.response.groupBy({
      by: ['surveyId'],
      where: responseWhere,
      _count: { _all: true },
    });
    const countIndex = new Map<number, number>(responseCounts.map((r) => [r.surveyId, r._count._all]));

    return surveys.map((s) => {
      const arr = bySurvey.get(s.id) ?? [];
      return {
        surveyId: String(s.id),
        title: s.title,
        isActive: s.isActive,
        overallAverage: arr.length ? round2(avg(arr)) : 0,
        totalResponses: countIndex.get(s.id) ?? 0,
      };
    });
  },

  analyticsBySurvey: async (surveyId: string, opts: AnalyticsFilterOptions = {}) => {
    const survey = await surveyService.getById(surveyId);
    const surveyIdNum = Number(surveyId);

    const responses = await prisma.response.findMany({
      where: responseFilter(surveyIdNum, opts),
      include: { responseDetails: { include: { question: { include: { category: true } } } } },
    });

    const totalResponses = responses.length;
    const completedCount = responses.filter((r) => r.completionPercent === 100).length;
    const partialCount = responses.filter((r) => r.completionPercent >= 80 && r.completionPercent < 100).length;
    const uniqueParticipants = new Set(responses.map((r) => r.participantId)).size;

    const allScores: number[] = [];
    const categoryScores = new Map<string, { name: string; scores: number[]; responseIds: Set<number> }>();
    const questionScores = new Map<
      string,
      {
        questionId: string;
        sequence: number;
        content: string;
        categoryId: string;
        categoryName: string;
        scores: number[];
      }
    >();
    const responseAverages: number[] = [];
    const responseScoreMaps: Array<{ responseId: number; scores: Map<string, number> }> = [];

    let questionSequence = 1;
    const orderedQuestions = survey.categories.flatMap((category) =>
      category.questions.map((question) => ({
        questionId: String(question.id),
        sequence: questionSequence++,
        content: question.content,
        categoryId: String(category.id),
        categoryName: category.name,
      })),
    );

    const categoryQuestionIds = new Map<string, string[]>();
    for (const question of orderedQuestions) {
      questionScores.set(question.questionId, {
        ...question,
        scores: [],
      });
      const ids = categoryQuestionIds.get(question.categoryId) ?? [];
      ids.push(question.questionId);
      categoryQuestionIds.set(question.categoryId, ids);
    }

    for (const r of responses) {
      const perResponseScores: number[] = [];
      const scoreMap = new Map<string, number>();

      for (const d of r.responseDetails) {
        const questionId = String(d.questionId);
        allScores.push(d.score);
        perResponseScores.push(d.score);
        scoreMap.set(questionId, d.score);

        const catId = String(d.question.categoryId);
        const catName = d.question.category.name;
        const curr = categoryScores.get(catId) ?? { name: catName, scores: [], responseIds: new Set<number>() };
        curr.scores.push(d.score);
        curr.responseIds.add(r.id);
        categoryScores.set(catId, curr);

        const question = questionScores.get(questionId);
        if (question) {
          question.scores.push(d.score);
        }
      }

      responseScoreMaps.push({ responseId: r.id, scores: scoreMap });
      if (perResponseScores.length) responseAverages.push(avg(perResponseScores));
    }

    const overallAverage = allScores.length ? round2(avg(allScores)) : 0;

    const categories = survey.categories.map((c) => {
      const categoryId = String(c.id);
      const data = categoryScores.get(categoryId);
      const questionIds = categoryQuestionIds.get(categoryId) ?? [];
      const completeRows = responseScoreMaps
        .map(({ scores }) => questionIds.map((questionId) => scores.get(questionId)))
        .filter((row): row is number[] => row.length > 1 && row.every((score) => typeof score === 'number'));

      return {
        categoryId,
        categoryName: c.name,
        average: data?.scores.length ? round2(avg(data.scores)) : 0,
        standardDeviation: data?.scores.length ? standardDeviation(data.scores) : 0,
        median: data?.scores.length ? median(data.scores) : 0,
        responseCount: data?.responseIds.size ?? 0,
        cronbachAlpha: cronbachAlpha(completeRows),
      };
    });

    const questions = orderedQuestions.map((question) => {
      const data = questionScores.get(question.questionId);
      const scores = data?.scores ?? [];
      const average = scores.length ? round2(avg(scores)) : 0;
      const interpretation = scores.length ? quisRepo.findInterpretationByScore(average) : null;
      const missingCount = Math.max(totalResponses - scores.length, 0);

      return {
        questionId: question.questionId,
        sequence: question.sequence,
        questionContent: question.content,
        categoryId: question.categoryId,
        categoryName: question.categoryName,
        average,
        standardDeviation: scores.length ? standardDeviation(scores) : 0,
        median: scores.length ? median(scores) : 0,
        confidenceInterval95: confidenceInterval95(scores),
        distribution: scoreDistribution(scores),
        responseCount: scores.length,
        missingCount,
        missingRate: totalResponses ? round2((missingCount / totalResponses) * 100) : 0,
        minScore: scores.length ? Math.min(...scores) : 0,
        maxScore: scores.length ? Math.max(...scores) : 0,
        interpretation,
      };
    });

    const interpretation = totalResponses ? quisRepo.findInterpretationByScore(overallAverage) : null;
    const overallStandardDeviation = allScores.length ? standardDeviation(allScores) : 0;
    const overallMedian = allScores.length ? median(allScores) : 0;
    const overallConfidenceInterval95 = confidenceInterval95(allScores);

    const radar = {
      labels: categories.map((c) => c.categoryName),
      datasets: [
        {
          label: 'Average score',
          data: categories.map((c) => c.average),
        },
      ],
    };

    const bar = radar;

    const completionBuckets = [0, 0, 0];
    for (const response of responses) {
      if (response.completionPercent === 100) {
        completionBuckets[0] = (completionBuckets[0] ?? 0) + 1;
      } else if (response.completionPercent >= 80) {
        completionBuckets[1] = (completionBuckets[1] ?? 0) + 1;
      } else {
        completionBuckets[2] = (completionBuckets[2] ?? 0) + 1;
      }
    }

    const pieBuckets = [0, 0, 0, 0];
    const bucketize = (x: number) => {
      if (x <= 3) return 0;
      if (x <= 5) return 1;
      if (x <= 7) return 2;
      return 3;
    };
    for (const x of responseAverages) {
      const idx = bucketize(x);
      pieBuckets[idx] = (pieBuckets[idx] ?? 0) + 1;
    }

    const pie = {
      labels: ['Poor (1-3)', 'Fair (3-5)', 'Good (5-7)', 'Excellent (7-9)'],
      data: pieBuckets,
    };

    const histogram = {
      labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
      data: scoreDistribution(allScores),
    };

    const questionChartLabels = questions.map((q) => `Q${q.sequence}`);
    const questionChartData = questions.map((q) => q.average);
    const questionCharts = {
      radar: {
        labels: questionChartLabels,
        datasets: [
          {
            label: 'Average score',
            data: questionChartData,
          },
        ],
      },
      bar: {
        labels: questionChartLabels,
        datasets: [
          {
            label: 'Average score',
            data: questionChartData,
          },
        ],
      },
    };

    const dropOff = questions
      .map((question) => ({
        questionId: question.questionId,
        sequence: question.sequence,
        questionContent: question.questionContent,
        missingCount: question.missingCount,
        missingRate: question.missingRate,
      }))
      .sort((a, b) => b.missingCount - a.missingCount || a.sequence - b.sequence);

    return {
      survey: { id: String(survey.id), title: survey.title },
      stats: {
        totalResponses,
        completedCount,
        partialCount,
        uniqueParticipants,
        overallAverage,
        standardDeviation: overallStandardDeviation,
        median: overallMedian,
        confidenceInterval95: overallConfidenceInterval95,
        interpretation,
        totalQuestions: questions.length,
        completionDistribution: completionBuckets,
      },
      categories,
      questions,
      charts: { radar, bar, pie, histogram },
      questionCharts,
      dropOff,
    };
  },

  compareAnalyticsBySurvey: async (
    surveyId: string,
    opts: AnalyticsFilterOptions & { groupA: Specialty; groupB: Specialty },
  ) => {
    const [groupA, groupB, sampleA, sampleB] = await Promise.all([
      dashboardService.analyticsBySurvey(surveyId, { ...opts, specialty: opts.groupA }),
      dashboardService.analyticsBySurvey(surveyId, { ...opts, specialty: opts.groupB }),
      responseAverageSamples(surveyId, { ...opts, specialty: opts.groupA }),
      responseAverageSamples(surveyId, { ...opts, specialty: opts.groupB }),
    ]);

    const canRunTTest = sampleA.length >= 2 && sampleB.length >= 2;
    let tStatistic: number | null = null;

    if (canRunTTest) {
      try {
        const value = tTestTwoSample(sampleA, sampleB, 0);
        tStatistic = typeof value === 'number' && Number.isFinite(value) ? round3(value) : null;
      } catch {
        tStatistic = null;
      }
    }

    return {
      compareBy: 'specialty' as const,
      groupA: {
        value: opts.groupA,
        label: opts.groupA,
        stats: groupA.stats,
        categories: groupA.categories,
      },
      groupB: {
        value: opts.groupB,
        label: opts.groupB,
        stats: groupB.stats,
        categories: groupB.categories,
      },
      difference: {
        overallAverage: round2(groupA.stats.overallAverage - groupB.stats.overallAverage),
        totalResponses: groupA.stats.totalResponses - groupB.stats.totalResponses,
      },
      tTest: {
        statistic: tStatistic,
        sampleSizeA: sampleA.length,
        sampleSizeB: sampleB.length,
        available: tStatistic !== null,
        note: tStatistic === null ? 'Not enough data or zero variance to calculate t-test.' : 'Welch two-sample t-test on per-response average scores.',
      },
    };
  },
};
