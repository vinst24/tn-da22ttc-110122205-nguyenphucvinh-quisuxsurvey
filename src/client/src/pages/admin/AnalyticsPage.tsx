import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Activity, ArrowDownRight, ArrowUpRight, BarChart3, BriefcaseBusiness, ChevronDown, Download, Radar, Target, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { BarChart } from '../../charts/BarChart';
import { DoughnutChart } from '../../charts/DoughnutChart';
import { HorizontalBarChart } from '../../charts/HorizontalBarChart';
import { LineChart } from '../../charts/LineChart';
import { RadarChart } from '../../charts/RadarChart';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import {
  SPECIALTY_OPTIONS,
  getSpecialtyLabel,
  type SpecialtyValue,
} from '../../constants/specialties';
import type { ParticipantDto } from '../../services/admin.service';
import { adminService } from '../../services/admin.service';
import { dashboardService } from '../../services/dashboard.service';
import { CHART_PALETTE } from '../../theme/tokens';
import type { AnalyticsComparisonDto, AnalyticsDto, AnalyticsFilters, SurveySummaryDto } from '../../types/dashboard';

const SPECIALTY_STATS_PAGE_SIZE = 1000;

type ExportFormat = 'pdf' | 'csv' | 'excel' | 'json';
type AnalyticsStatusFilter = NonNullable<AnalyticsFilters['status']>;
type ExportCell = string | number | null | undefined;
type ExportSection = { title: string; headers: string[]; rows: ExportCell[][] };
type XlsxModule = typeof import('xlsx');

const EXPORT_FORMAT_OPTIONS: Array<{ value: ExportFormat; label: string }> = [
  { value: 'pdf', label: 'PDF' },
  { value: 'csv', label: 'CSV' },
  { value: 'excel', label: 'Excel (.xlsx)' },
  { value: 'json', label: 'JSON' },
];

const formatExportNumber = (value: number) => (Number.isFinite(value) ? value.toFixed(2) : '');

const sanitizeFilePart = (value: string) => {
  const invalidChars = '<>:"/\\|?*';
  const safe = Array.from(value.trim(), (char) => (char.charCodeAt(0) < 32 || invalidChars.includes(char) ? '-' : char))
    .join('')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return safe.slice(0, 80) || 'survey';
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};


const safeSheetName = (value: string, fallback: string) => {
  const sanitized = Array.from(value, (char) => ('\\/?*[]:'.includes(char) ? ' ' : char)).join('').trim().slice(0, 31);
  return sanitized || fallback;
};

const sectionsToWorkbook = (XLSX: XlsxModule, sections: ExportSection[]) => {
  const workbook = XLSX.utils.book_new();
  const usedNames = new Set<string>();

  for (const section of sections) {
    const rows = [section.headers, ...section.rows.map((row) => row.map((cell) => cell ?? ''))];
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const baseName = safeSheetName(section.title, 'Sheet');
    let sheetName = baseName;
    let counter = 2;
    while (usedNames.has(sheetName)) {
      const suffix = ` ${counter}`;
      sheetName = `${baseName.slice(0, 31 - suffix.length)}${suffix}`;
      counter += 1;
    }
    usedNames.add(sheetName);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  }

  return workbook;
};

const buildAnalyticsExportSections = (analytics: AnalyticsDto): ExportSection[] => [
  {
    title: 'Tổng quan',
    headers: ['Chỉ số', 'Giá trị'],
    rows: [
      ['Khảo sát', analytics.survey.title],
      ['Tổng phản hồi', analytics.stats.totalResponses],
      ['Hoàn thành', analytics.stats.completedCount],
      ['Chưa hoàn thành', analytics.stats.partialCount],
      ['Người tham gia duy nhất', analytics.stats.uniqueParticipants],
      ['Điểm trung bình', formatExportNumber(analytics.stats.overallAverage)],
      ['Độ lệch chuẩn', formatExportNumber(analytics.stats.standardDeviation)],
      ['Trung vị', formatExportNumber(analytics.stats.median)],
      [
        '95% CI',
        `${formatExportNumber(analytics.stats.confidenceInterval95.lower)} - ${formatExportNumber(analytics.stats.confidenceInterval95.upper)}`,
      ],
      ['Tổng số câu hỏi', analytics.stats.totalQuestions],
      ['Mức diễn giải', analytics.stats.interpretation?.level ?? ''],
      ['Mô tả diễn giải', analytics.stats.interpretation?.description ?? ''],
    ],
  },
  {
    title: 'Danh mục',
    headers: ['Mã danh mục', 'Danh mục', 'Điểm trung bình', 'SD', 'Trung vị', 'Cronbach alpha', 'Số phản hồi'],
    rows: analytics.categories.map((category) => [
      category.categoryId,
      category.categoryName,
      formatExportNumber(category.average),
      formatExportNumber(category.standardDeviation),
      formatExportNumber(category.median),
      category.cronbachAlpha === null ? '' : formatExportNumber(category.cronbachAlpha),
      category.responseCount,
    ]),
  },
  {
    title: 'Câu hỏi',
    headers: [
      'STT',
      'Mã câu hỏi',
      'Danh mục',
      'Nội dung câu hỏi',
      'Điểm trung bình',
      'SD',
      'Trung vị',
      '95% CI',
      'Số phản hồi',
      'Thiếu phản hồi',
      'Tỷ lệ thiếu (%)',
      'Min',
      'Max',
      'Mức diễn giải',
      'Mô tả diễn giải',
    ],
    rows: analytics.questions.map((question) => [
      question.sequence,
      question.questionId,
      question.categoryName,
      question.questionContent,
      formatExportNumber(question.average),
      formatExportNumber(question.standardDeviation),
      formatExportNumber(question.median),
      `${formatExportNumber(question.confidenceInterval95.lower)} - ${formatExportNumber(question.confidenceInterval95.upper)}`,
      question.responseCount,
      question.missingCount,
      formatExportNumber(question.missingRate),
      question.minScore,
      question.maxScore,
      question.interpretation?.level ?? '',
      question.interpretation?.description ?? '',
    ]),
  },
];

const truncate = (value: string, length = 72) =>
  value.length > length ? `${value.slice(0, length).trimEnd()}...` : value;

const levelColor = (level?: string | null) => {
  if (!level) return 'default' as const;
  const v = level.toLowerCase();
  if (v.includes('excellent') || v.includes('xuất sắc') || v.includes('tốt')) return 'success' as const;
  if (v.includes('good') || v.includes('khá')) return 'primary' as const;
  if (v.includes('fair') || v.includes('trung bình')) return 'warning' as const;
  return 'error' as const;
};

const scoreColor = (score: number) => {
  if (score >= 7) return 'success' as const;
  if (score >= 5) return 'primary' as const;
  if (score >= 3) return 'warning' as const;
  return 'error' as const;
};

const formatMetric = (value: number) => (Number.isFinite(value) ? value.toFixed(2) : '0.00');
const formatAlpha = (value: number | null) => (value === null ? 'N/A' : value.toFixed(3));
const specialtyLabel = (value: string) => getSpecialtyLabel(value);


const cohenInterpretation = (value: number | null) => {
  if (value === null) return 'N/A';
  const magnitude = Math.abs(value);
  if (magnitude < 0.2) return 'negligible';
  if (magnitude < 0.5) return 'small';
  if (magnitude < 0.8) return 'medium';
  return 'large';
};
const cohenD = (comparison: AnalyticsComparisonDto | null) => {
  if (!comparison) return null;
  const nA = comparison.tTest.sampleSizeA;
  const nB = comparison.tTest.sampleSizeB;
  const sdA = comparison.groupA.stats.standardDeviation;
  const sdB = comparison.groupB.stats.standardDeviation;
  if (nA < 2 || nB < 2 || !Number.isFinite(sdA) || !Number.isFinite(sdB)) return null;
  const pooledVariance = (((nA - 1) * sdA ** 2) + ((nB - 1) * sdB ** 2)) / (nA + nB - 2);
  if (!Number.isFinite(pooledVariance) || pooledVariance <= 0) return null;
  return comparison.difference.overallAverage / Math.sqrt(pooledVariance);
};
const buildStrengthSuggestion = (question: AnalyticsDto['questions'][number]) => {
  if (question.average >= 8.5 && question.missingRate <= 5) {
    return 'Có thể dùng làm bằng chứng điểm mạnh UX: điểm cao, ít bị bỏ sót và phù hợp để nêu trong phần kết quả khóa luận.';
  }
  if (question.missingRate > 10) {
    return 'Điểm cao nhưng vẫn có người bỏ sót; nên giữ nội dung chính và kiểm tra lại vị trí/cách trình bày câu hỏi.';
  }
  return 'Nên duy trì thiết kế hiện tại và xem câu này như mẫu tham chiếu cho các khu vực liên quan.';
};

const buildImprovementSuggestion = (question: AnalyticsDto['questions'][number]) => {
  if (question.missingRate >= 20) {
    return 'Ưu tiên rà soát cách diễn đạt hoặc vị trí câu hỏi vì tỷ lệ bỏ sót cao có thể làm giảm độ tin cậy dữ liệu.';
  }
  if (question.average < 5) {
    return 'Cần kiểm tra nguyên nhân bằng phỏng vấn nhanh hoặc log thao tác; đây là điểm có nguy cơ ảnh hưởng trực tiếp tới trải nghiệm.';
  }
  if (question.standardDeviation >= 2) {
    return 'Điểm phân tán cao, nên phân tích thêm theo nhóm người tham gia để xem có khác biệt giữa các chuyên môn hay không.';
  }
  return 'Có thể cải thiện vi mô: làm rõ nhãn, phản hồi lỗi, hướng dẫn thao tác hoặc giảm số bước ở khu vực liên quan.';
};

export function AnalyticsPage() {
  const [surveys, setSurveys] = useState<SurveySummaryDto[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState('');
  const [analytics, setAnalytics] = useState<AnalyticsDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [specialtyParticipants, setSpecialtyParticipants] = useState<ParticipantDto[]>([]);
  const [specialtyLoading, setSpecialtyLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<AnalyticsStatusFilter>('completed');
  const [specialtyFilter, setSpecialtyFilter] = useState<SpecialtyValue | ''>('');
  const [compareGroupA, setCompareGroupA] = useState<SpecialtyValue>('INFORMATION_TECHNOLOGY');
  const [compareGroupB, setCompareGroupB] = useState<SpecialtyValue>('UX_DESIGN');
  const [comparison, setComparison] = useState<AnalyticsComparisonDto | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [exporting, setExporting] = useState(false);

  const analyticsFilters = useMemo<AnalyticsFilters>(() => ({
    includePartial: statusFilter !== 'completed',
    status: statusFilter,
    ...(specialtyFilter ? { specialty: specialtyFilter } : {}),
  }), [specialtyFilter, statusFilter]);

  useEffect(() => {
    let mounted = true;

    const loadSurveys = async () => {
      try {
        const data = await dashboardService.surveys({ includePartial: statusFilter !== 'completed' });
        if (!mounted) return;
        setSurveys(data);
        setSelectedSurveyId((current) => current || data[0]?.surveyId || '');
      } catch {
        if (!mounted) return;
        setError('Không thể tải danh sách khảo sát');
      }
    };

    loadSurveys();

    return () => {
      mounted = false;
    };
  }, [statusFilter]);

  useEffect(() => {
    if (!selectedSurveyId) {
      setAnalytics(null);
      return;
    }

    let mounted = true;

    const loadAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await dashboardService.analytics(selectedSurveyId, analyticsFilters);
        if (!mounted) return;
        setAnalytics(data);
      } catch {
        if (!mounted) return;
        setError('Không thể tải dữ liệu phân tích');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadAnalytics();

    return () => {
      mounted = false;
    };
  }, [selectedSurveyId, analyticsFilters]);

  useEffect(() => {
    if (!selectedSurveyId || compareGroupA === compareGroupB) {
      setComparison(null);
      setComparisonLoading(false);
      return;
    }

    let mounted = true;

    const loadComparison = async () => {
      setComparisonLoading(true);
      try {
        const data = await dashboardService.compareAnalytics(selectedSurveyId, compareGroupA, compareGroupB, analyticsFilters);
        if (!mounted) return;
        setComparison(data);
      } catch {
        if (!mounted) return;
        setComparison(null);
      } finally {
        if (mounted) setComparisonLoading(false);
      }
    };

    void loadComparison();

    return () => {
      mounted = false;
    };
  }, [analyticsFilters, compareGroupA, compareGroupB, selectedSurveyId]);
  // Lấy danh sách người tham gia đã làm khảo sát đang chọn để vẽ biểu đồ lĩnh vực
  useEffect(() => {
    if (!selectedSurveyId) {
      setSpecialtyParticipants([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setSpecialtyLoading(true);
      try {
        const res = await adminService.listParticipants({
          page: 1,
          pageSize: SPECIALTY_STATS_PAGE_SIZE,
          surveyId: Number(selectedSurveyId),
          major: specialtyFilter || undefined,
        });
        if (!cancelled) setSpecialtyParticipants(res.items);
      } catch {
        if (!cancelled) setSpecialtyParticipants([]);
      } finally {
        if (!cancelled) setSpecialtyLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedSurveyId, specialtyFilter]);

  const specialtyDistribution = useMemo(() => {
    const counts = new Map<SpecialtyValue, number>();
    for (const option of SPECIALTY_OPTIONS) counts.set(option.value, 0);
    for (const p of specialtyParticipants) {
      const key = (p.major ?? 'OTHER') as SpecialtyValue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const entries = Array.from(counts.entries()).filter(([, value]) => value > 0);
    entries.sort((a, b) => b[1] - a[1]);
    const labels = entries.map(([key]) => getSpecialtyLabel(key));
    const data = entries.map(([, value]) => value);
    return { labels, data, total: specialtyParticipants.length };
  }, [specialtyParticipants]);

  const summaryCards = useMemo(() => {
    if (!analytics || analytics.questions.length === 0) return [];

    const firstQuestion = analytics.questions[0];
    if (!firstQuestion) return [];

    const highestQuestion = analytics.questions.slice(1).reduce(
      (max, question) => (question.average > max.average ? question : max),
      firstQuestion,
    );
    const lowestQuestion = analytics.questions.slice(1).reduce(
      (min, question) => (question.average < min.average ? question : min),
      firstQuestion,
    );

    return [
      {
        title: 'Điểm trung bình hệ thống',
        value: analytics.stats.overallAverage.toFixed(1),
        subtitle: `SD ${formatMetric(analytics.stats.standardDeviation)} · Median ${formatMetric(analytics.stats.median)} · CI ${formatMetric(analytics.stats.confidenceInterval95.lower)}-${formatMetric(analytics.stats.confidenceInterval95.upper)}`,
        trend: 'up' as const,
        change: '+0.3',
        icon: <Target className="w-5 h-5 text-blue-600" />,
      },
      {
        title: 'Câu hỏi cao nhất',
        value: highestQuestion.average.toFixed(1),
        subtitle: `Q${highestQuestion.sequence}: ${truncate(highestQuestion.questionContent, 44)}`,
        trend: 'up' as const,
        change: `Q${highestQuestion.sequence}`,
        icon: <ArrowUpRight className="w-5 h-5 text-green-600" />,
      },
      {
        title: 'Câu hỏi thấp nhất',
        value: lowestQuestion.average.toFixed(1),
        subtitle: `Q${lowestQuestion.sequence}: ${truncate(lowestQuestion.questionContent, 44)}`,
        trend: 'down' as const,
        change: `Q${lowestQuestion.sequence}`,
        icon: <ArrowDownRight className="w-5 h-5 text-red-600" />,
      },
      {
        title: 'Tổng người tham gia',
        value: analytics.stats.uniqueParticipants.toLocaleString(),
        subtitle: `${analytics.stats.completedCount} hoàn thành 100% · ${analytics.stats.partialCount} đạt ngưỡng 80-99%`,
        trend: 'up' as const,
        change: `+${analytics.stats.totalResponses}`,
        icon: <Users className="w-5 h-5 text-purple-600" />,
      },
    ];
  }, [analytics]);

  const questionsByCategory = useMemo(() => {
    if (!analytics) return [] as Array<{
      categoryId: string;
      categoryName: string;
      average: number;
      cronbachAlpha: number | null;
      questions: AnalyticsDto['questions'];
    }>;

    const map = new Map<string, AnalyticsDto['questions']>();
    for (const q of analytics.questions) {
      const arr = map.get(q.categoryId) ?? [];
      arr.push(q);
      map.set(q.categoryId, arr);
    }

    return analytics.categories.map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      average: c.average,
      cronbachAlpha: c.cronbachAlpha,
      questions: map.get(c.categoryId) ?? [],
    }));
  }, [analytics]);

  const questionLevelDistribution = useMemo<[number, number, number, number]>(() => {
    if (!analytics) return [0, 0, 0, 0];
    const buckets: [number, number, number, number] = [0, 0, 0, 0];
    for (const q of analytics.questions) {
      if (q.average <= 3) buckets[0]++;
      else if (q.average <= 5) buckets[1]++;
      else if (q.average <= 7) buckets[2]++;
      else buckets[3]++;
    }
    return buckets;
  }, [analytics]);

  const topDropOff = useMemo(() => {
    if (!analytics) return [];
    return analytics.dropOff.filter((item) => item.missingCount > 0).slice(0, 8);
  }, [analytics]);

  const questionRadarLabels = analytics?.questionCharts.radar.labels ?? [];
  const questionRadarData = analytics?.questionCharts.radar.datasets[0]?.data ?? [];
  const questionBarLabels = analytics?.questionCharts.bar.labels ?? [];
  const questionBarData = analytics?.questionCharts.bar.datasets[0]?.data ?? [];
  const effectSize = cohenD(comparison);
  const selectedExportLabel = EXPORT_FORMAT_OPTIONS.find((option) => option.value === exportFormat)?.label ?? 'báo cáo';

  const handleExport = async () => {
    if (!analytics) {
      setError('Chưa có dữ liệu phân tích để xuất báo cáo');
      return;
    }

    setExporting(true);
    setError(null);

    try {
      if (exportFormat === 'pdf' || exportFormat === 'csv') {
        const result = await dashboardService.exportAnalytics(selectedSurveyId, exportFormat, analyticsFilters);
        downloadBlob(result.blob, result.filename);
        return;
      }

      const sections = buildAnalyticsExportSections(analytics);
      const dateStamp = new Date().toISOString().slice(0, 10);
      const baseFilename = `analytics-${sanitizeFilePart(analytics.survey.title)}-${dateStamp}`;

      if (exportFormat === 'excel') {
        const XLSX = await import('xlsx');
        XLSX.writeFile(sectionsToWorkbook(XLSX, sections), `${baseFilename}.xlsx`, { compression: true });
        return;
      }

      downloadBlob(
        new Blob([
          JSON.stringify(
            {
              exportedAt: new Date().toISOString(),
              survey: analytics.survey,
              stats: analytics.stats,
              categories: analytics.categories,
              questions: analytics.questions,
            },
            null,
            2,
          ),
        ], { type: 'application/json;charset=utf-8' }),
        `${baseFilename}.json`,
      );
    } catch {
      setError('Không thể xuất báo cáo. Vui lòng thử lại sau.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        title="Phân tích chi tiết theo câu hỏi"
        subtitle="Phân tích sâu dữ liệu khảo sát QUIS theo từng danh mục và câu hỏi."
        actions={
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ alignItems: { xs: 'stretch', sm: 'center' }, width: { xs: '100%', sm: 'auto' } }}
          >
            <TextField
              select
              size="small"
              label="Định dạng"
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
              sx={{ minWidth: 140, bgcolor: 'background.paper' }}
            >
              {EXPORT_FORMAT_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <button
              type="button"
              onClick={handleExport}
              disabled={!analytics || loading || exporting}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Đang xuất...' : `Xuất ${selectedExportLabel}`}
            </button>
          </Stack>
        }
      />

      {/* Filter bar */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{
          alignItems: { md: 'center' },
          p: 2,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
        }}
      >
        <TextField
          select
          size="small"
          label="Khảo sát"
          value={selectedSurveyId}
          onChange={(e) => setSelectedSurveyId(e.target.value)}
          sx={{ minWidth: { xs: '100%', md: 360 }, flex: 1 }}
          slotProps={{
            select: {
              renderValue: (selected: unknown) => {
                const id = selected as string;
                const survey = surveys.find((s) => s.surveyId === id);
                const title = survey?.title ?? '';
                return <span title={title}>{title.length > 60 ? `${title.slice(0, 60).trimEnd()}...` : title}</span>;
              },
              MenuProps: {
                slotProps: { paper: { sx: { maxHeight: 300, overflowX: 'auto' } } },
              },
            },
          }}
        >
          {surveys.map((survey) => {
            const title = survey.title.length > 60
              ? `${survey.title.slice(0, 60).trimEnd()}...`
              : survey.title;
            return (
              <MenuItem
                key={survey.surveyId}
                value={survey.surveyId}
                sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                <span title={survey.title}>{title}</span>
              </MenuItem>
            );
          })}
        </TextField>

        <TextField
          select
          size="small"
          label="Lĩnh vực"
          value={specialtyFilter}
          onChange={(e) => setSpecialtyFilter(e.target.value as SpecialtyValue | '')}
          sx={{ minWidth: { xs: '100%', md: 240 } }}
        >
          <MenuItem value="">Tất cả lĩnh vực</MenuItem>
          {SPECIALTY_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Trạng thái"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AnalyticsStatusFilter)}
          sx={{ minWidth: { xs: '100%', md: 190 } }}
        >
          <MenuItem value="completed">Hoàn thành 100%</MenuItem>
          <MenuItem value="all">Tất cả phản hồi (&gt;=80%)</MenuItem>
        </TextField>
      </Stack>
      {/* Content area: loading / error / empty / data */}
      {!selectedSurveyId ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-slate-500">Không có khảo sát nào để phân tích.</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-slate-500">Đang tải dữ liệu...</p>
        </div>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : !analytics ? null : (
        <>
          {analytics.stats.totalResponses < 30 && (
            <Alert severity="warning">
              Cỡ mẫu hiện tại n = {analytics.stats.totalResponses}. Với n &lt; 30, mean/SD/CI chỉ nên xem như mô tả ban đầu, chưa đủ mạnh để kết luận thống kê.
            </Alert>
          )}

          {/* Summary cards */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {summaryCards.map((card) => (
              <Card key={card.title} sx={{ flex: 1 }}>
                <CardContent>
                   <div className="flex items-center gap-2">
                     {card.icon}
                     <Typography variant="body2" color="text.secondary">
                       {card.title}
                     </Typography>
                   </div>
                  <Typography variant="h3" sx={{ fontWeight: 900, my: 1 }}>
                    {card.value}
                  </Typography>
                  <div className="flex items-center justify-between gap-2">
                    <Typography variant="body2" color="text.secondary">
                      {card.subtitle}
                    </Typography>
                    <div className={`flex items-center gap-1 ${card.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {card.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {card.change}
                      </Typography>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </Stack>

          <Card>
            <CardContent>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', mb: 2 }}>
                <div>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    So sánh phân nhóm theo lĩnh vực
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Mean side-by-side và t-test giữa hai nhóm chuyên môn trên cùng bộ lọc hiện tại.
                  </Typography>
                </div>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    select
                    size="small"
                    label="Nhóm A"
                    value={compareGroupA}
                    onChange={(e) => setCompareGroupA(e.target.value as SpecialtyValue)}
                    sx={{ minWidth: 220 }}
                  >
                    {SPECIALTY_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    size="small"
                    label="Nhóm B"
                    value={compareGroupB}
                    onChange={(e) => setCompareGroupB(e.target.value as SpecialtyValue)}
                    sx={{ minWidth: 220 }}
                  >
                    {SPECIALTY_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                    ))}
                  </TextField>
                </Stack>
              </Stack>

              {compareGroupA === compareGroupB ? (
                <Alert severity="info">Chọn hai lĩnh vực khác nhau để so sánh.</Alert>
              ) : comparisonLoading ? (
                <Typography variant="body2" color="text.secondary">Đang tải dữ liệu so sánh...</Typography>
              ) : comparison ? (
                <Stack spacing={2}>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    {[comparison.groupA, comparison.groupB].map((group) => (
                      <Card key={group.value} variant="outlined" sx={{ flex: 1 }}>
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary">
                            {specialtyLabel(group.value)}
                          </Typography>
                          <Typography variant="h3" sx={{ fontWeight: 900, my: 1 }}>
                            {formatMetric(group.stats.overallAverage)}
                            <Typography component="span" variant="body2" color="text.secondary">/9</Typography>
                          </Typography>
                          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                            <Chip size="small" label={`n ${group.stats.totalResponses}`} variant="outlined" />
                            <Chip size="small" label={`SD ${formatMetric(group.stats.standardDeviation)}`} variant="outlined" />
                            <Chip size="small" label={`Median ${formatMetric(group.stats.median)}`} variant="outlined" />
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                    <Card variant="outlined" sx={{ flex: 1 }}>
                      <CardContent>
                        <Typography variant="subtitle2" color="text.secondary">Chênh lệch A - B</Typography>
                        <Typography variant="h3" sx={{ fontWeight: 900, my: 1 }}>
                          {comparison.difference.overallAverage > 0 ? '+' : ''}{formatMetric(comparison.difference.overallAverage)}
                        </Typography>
                        <Stack spacing={0.5}>
                          <Typography variant="body2" color="text.secondary">
                            Δ phản hồi: {comparison.difference.totalResponses > 0 ? '+' : ''}{comparison.difference.totalResponses}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            t-test: {comparison.tTest.available && comparison.tTest.statistic !== null ? formatMetric(comparison.tTest.statistic) : 'N/A'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Cohen's d: {effectSize === null ? 'N/A' : `${formatMetric(effectSize)} (${cohenInterpretation(effectSize)})`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Mẫu A/B: {comparison.tTest.sampleSizeA}/{comparison.tTest.sampleSizeB}. {comparison.tTest.note}
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Stack>

                  <Stack spacing={1}>
                    {comparison.groupA.categories.map((categoryA) => {
                      const categoryB = comparison.groupB.categories.find((item) => item.categoryId === categoryA.categoryId);
                      const valueB = categoryB?.average ?? 0;
                      return (
                        <Stack key={categoryA.categoryId} direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' } }}>
                          <Typography variant="body2" sx={{ minWidth: { md: 260 }, fontWeight: 700 }}>
                            {categoryA.categoryName}
                          </Typography>
                          <Stack direction="row" spacing={1} sx={{ flex: 1, alignItems: 'center' }}>
                            <Chip size="small" label={`A ${formatMetric(categoryA.average)}`} color="primary" variant="outlined" />
                            <LinearProgress variant="determinate" value={Math.max(0, Math.min(100, (categoryA.average / 9) * 100))} sx={{ flex: 1, height: 8, borderRadius: 4 }} />
                          </Stack>
                          <Stack direction="row" spacing={1} sx={{ flex: 1, alignItems: 'center' }}>
                            <Chip size="small" label={`B ${formatMetric(valueB)}`} color="success" variant="outlined" />
                            <LinearProgress variant="determinate" color="success" value={Math.max(0, Math.min(100, (valueB / 9) * 100))} sx={{ flex: 1, height: 8, borderRadius: 4 }} />
                          </Stack>
                        </Stack>
                      );
                    })}
                  </Stack>
                </Stack>
              ) : (
                <Alert severity="info">Chưa có đủ dữ liệu để so sánh hai nhóm này.</Alert>
              )}
            </CardContent>
          </Card>
          {/* Tổng quan tất cả câu hỏi - biểu đồ chi tiết, cao hơn */}
          <Card sx={{ minHeight: 480 }}>
            <CardContent>
              <div className="flex items-center gap-2 mb-1">
                 <BarChart3 className="w-5 h-5 text-blue-600" />
                 <Typography variant="h6" sx={{ fontWeight: 800 }}>
                   Tổng quan điểm trung bình theo từng câu hỏi
                 </Typography>
               </div>
              <Typography variant="caption" color="text.secondary">
                Toàn bộ câu hỏi xếp theo trình tự khảo sát (thang 1–9)
              </Typography>
              <BarChart labels={questionBarLabels} data={questionBarData} height={400} />
            </CardContent>
          </Card>

          {/* Hàng 2 chart cùng cấp: radar và xu hướng */}
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
            <Card sx={{ flex: 1, minHeight: 420 }}>
              <CardContent>
                <div className="flex items-center gap-2 mb-1">
                   <Radar className="w-5 h-5 text-blue-600" />
                   <Typography variant="h6" sx={{ fontWeight: 800 }}>
                     Radar tổng quan câu hỏi
                   </Typography>
                 </div>
                <Typography variant="caption" color="text.secondary">
                  Hình dạng tổng thể các câu hỏi
                </Typography>
                <RadarChart labels={questionRadarLabels} data={questionRadarData} height={320} />
              </CardContent>
            </Card>

            <Card sx={{ flex: 1, minHeight: 420 }}>
              <CardContent>
                <div className="flex items-center gap-2 mb-1">
                   <Activity className="w-5 h-5 text-blue-600" />
                   <Typography variant="h6" sx={{ fontWeight: 800 }}>
                     Xu hướng theo trình tự câu hỏi
                   </Typography>
                 </div>
                <Typography variant="caption" color="text.secondary">
                  Phát hiện đoạn khảo sát bị tụt điểm
                </Typography>
                <LineChart labels={questionBarLabels} data={questionBarData} height={320} />
              </CardContent>
            </Card>
          </Stack>

          {/* Phân bố */}
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
            <Card sx={{ flex: 1, minHeight: 340 }}>
              <CardContent>
                <div className="flex items-center gap-2 mb-1">
                   <BarChart3 className="w-5 h-5 text-blue-600" />
                   <Typography variant="h6" sx={{ fontWeight: 800 }}>
                     Histogram điểm trả lời
                   </Typography>
                 </div>
                <Typography variant="caption" color="text.secondary">
                  Tần suất điểm 1-9 trên toàn bộ câu trả lời
                </Typography>
                <BarChart
                  labels={analytics.charts.histogram.labels}
                  data={analytics.charts.histogram.data}
                  height={260}
                  label="Số lượt trả lời"
                  color={CHART_PALETTE.primaryBar}
                  min={0}
                  max={Math.max(...analytics.charts.histogram.data, 1)}
                />
              </CardContent>
            </Card>

            <Card sx={{ flex: 1, minHeight: 340 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Phân bố câu hỏi theo mức UX
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Mỗi câu hỏi được xếp vào một mức QUIS
                </Typography>
                <DoughnutChart
                  labels={['Kém (1-3)', 'Trung bình (3-5)', 'Tốt (5-7)', 'Xuất sắc (7-9)']}
                  data={questionLevelDistribution}
                  colors={CHART_PALETTE.categorical.slice(0, 4)}
                  height={260}
                />
              </CardContent>
            </Card>
          </Stack>

          <Card sx={{ minHeight: 320 }}>
            <CardContent>
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-5 h-5 text-orange-600" />
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Drop-off theo câu hỏi
                </Typography>
              </div>
              <Typography variant="caption" color="text.secondary">
                Các câu có số lượt thiếu phản hồi cao nhất trong tập dữ liệu đang phân tích
              </Typography>
              {topDropOff.length > 0 ? (
                <HorizontalBarChart
                  labels={topDropOff.map((item) => `Q${item.sequence}. ${truncate(item.questionContent, 42)}`)}
                  data={topDropOff.map((item) => item.missingCount)}
                  label="Số câu thiếu"
                  height={Math.max(260, topDropOff.length * 44)}
                  color={CHART_PALETTE.distribution[1]}
                  min={0}
                  max={Math.max(...topDropOff.map((item) => item.missingCount), 1) + 1}
                />
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Không có câu hỏi nào bị thiếu phản hồi trong tập dữ liệu hiện tại.
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Phân tích lĩnh vực chuyên môn của người tham gia khảo sát đang chọn */}
          <Card>
            <CardContent>
              <div className="flex items-center gap-2">
                <BriefcaseBusiness className="w-5 h-5 text-blue-600" />
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Lĩnh vực chuyên môn của người tham gia
                </Typography>
              </div>
              <Typography variant="caption" color="text.secondary">
                Phân bố lĩnh vực của {specialtyDistribution.total} người đã tham gia khảo sát "{
                  surveys.find((s) => s.surveyId === selectedSurveyId)?.title ?? 'đang chọn'
                }".
              </Typography>
              {specialtyLoading ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
                  Đang tải dữ liệu lĩnh vực...
                </Typography>
              ) : specialtyDistribution.total === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
                  Chưa có người tham gia nào để hiển thị.
                </Typography>
              ) : (
                <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ mt: 2 }}>
                  <div style={{ flex: 1 }}>
                    <DoughnutChart
                      labels={specialtyDistribution.labels}
                      data={specialtyDistribution.data}
                      height={320}
                      centerLabel="Số lượng"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <HorizontalBarChart
                      labels={specialtyDistribution.labels}
                      data={specialtyDistribution.data}
                      label="Số lượng"
                      height={320}
                      color={CHART_PALETTE.successBar}
                      min={0}
                      max={Math.max(...specialtyDistribution.data) + 1}
                    />
                  </div>
                </Stack>
              )}
            </CardContent>
          </Card>

          {/* Phân tích chi tiết theo từng danh mục - mỗi danh mục là 1 mục, câu hỏi là mục con */}
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
                Phân tích chi tiết theo danh mục
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Mở rộng từng danh mục để xem biểu đồ và phân tích cho từng câu hỏi bên trong.
              </Typography>

              <Stack spacing={1.5} sx={{ mt: 2 }}>
                {questionsByCategory.map((cat, idx) => {
                  const labels = cat.questions.map((q) => `Q${q.sequence}`);
                  const data = cat.questions.map((q) => q.average);
                  const totalResponses = cat.questions.reduce((acc, q) => acc + q.responseCount, 0);
                  const chartHeight = Math.max(260, cat.questions.length * 36);

                  return (
                    <Accordion key={cat.categoryId} defaultExpanded={idx === 0} disableGutters>
                      <AccordionSummary expandIcon={<ChevronDown className="w-5 h-5" />}>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={1.5}
                          sx={{ width: '100%', alignItems: { sm: 'center' }, justifyContent: 'space-between', pr: 2 }}
                        >
                          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                              {cat.categoryName}
                            </Typography>
                            <Chip
                              size="small"
                              label={`${cat.questions.length} câu`}
                              variant="outlined"
                            />
                            <Chip
                              size="small"
                              label={`α ${formatAlpha(cat.cronbachAlpha)}`}
                              color={cat.cronbachAlpha !== null && cat.cronbachAlpha >= 0.7 ? 'success' : 'warning'}
                              variant="outlined"
                            />
                          </Stack>
                          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                              {totalResponses} phản hồi
                            </Typography>
                            <Chip
                              size="small"
                              color={scoreColor(cat.average)}
                              label={`TB: ${cat.average.toFixed(1)}/9`}
                              sx={{ fontWeight: 700 }}
                            />
                          </Stack>
                        </Stack>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Stack spacing={2.5}>
                          {/* Biểu đồ ngang theo từng câu hỏi của danh mục - cao chi tiết hơn vì có thể nhiều câu */}
                          <Card variant="outlined">
                            <CardContent>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                                Điểm trung bình từng câu hỏi trong "{cat.categoryName}"
                              </Typography>
                              {cat.questions.length > 0 ? (
                                <HorizontalBarChart
                                  labels={labels}
                                  data={data}
                                  height={chartHeight}
                                  color={CHART_PALETTE.secondarySoft}
                                />
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  Chưa có câu hỏi trong danh mục này.
                                </Typography>
                              )}
                            </CardContent>
                          </Card>

                          {/* Sub-mục: từng câu hỏi với phân tích chi tiết */}
                          <Stack spacing={1.5}>
                            {cat.questions.map((q) => {
                              const percent = ((q.average - 1) / 8) * 100;
                              return (
                                <Card key={q.questionId} variant="outlined">
                                  <CardContent>
                                    <Stack
                                      direction={{ xs: 'column', md: 'row' }}
                                      spacing={2}
                                      sx={{
                                        alignItems: { md: 'flex-start' },
                                        justifyContent: 'space-between',
                                      }}
                                    >
                                      <Stack spacing={0.5} sx={{ flex: 1 }}>
                                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                          <Chip
                                            size="small"
                                            label={`Q${q.sequence}`}
                                            color="primary"
                                            sx={{ fontWeight: 700 }}
                                          />
                                          {q.interpretation?.level && (
                                            <Chip
                                              size="small"
                                              label={q.interpretation.level}
                                              color={levelColor(q.interpretation.level)}
                                              variant="outlined"
                                            />
                                          )}
                                        </Stack>
                                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                          {q.questionContent}
                                        </Typography>
                                        {q.interpretation?.description && (
                                          <Typography variant="body2" color="text.secondary">
                                            {q.interpretation.description}
                                          </Typography>
                                        )}
                                      </Stack>

                                      <Stack spacing={0.5} sx={{ minWidth: { md: 240 } }}>
                                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                                          <Typography variant="caption" color="text.secondary">
                                            Điểm TB
                                          </Typography>
                                          <Typography variant="h5" sx={{ fontWeight: 900 }}>
                                            {q.average.toFixed(1)}
                                            <Typography component="span" variant="body2" color="text.secondary">
                                              /9
                                            </Typography>
                                          </Typography>
                                        </Stack>
                                        <LinearProgress
                                          variant="determinate"
                                          value={Math.max(0, Math.min(100, percent))}
                                          color={scoreColor(q.average)}
                                          sx={{ height: 8, borderRadius: 4 }}
                                        />
                                        <Typography variant="caption" color="text.secondary">
                                          SD {formatMetric(q.standardDeviation)} · Median {formatMetric(q.median)}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          95% CI {formatMetric(q.confidenceInterval95.lower)}–{formatMetric(q.confidenceInterval95.upper)}
                                        </Typography>
                                        <Divider sx={{ my: 0.5 }} />
                                        <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                                          <Typography variant="caption" color="text.secondary">
                                            Min / Max
                                          </Typography>
                                          <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                            {q.minScore} – {q.maxScore}
                                          </Typography>
                                        </Stack>
                                        <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                                          <Typography variant="caption" color="text.secondary">
                                            Số phản hồi
                                          </Typography>
                                          <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                            {q.responseCount}
                                          </Typography>
                                        </Stack>
                                        <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                                          <Typography variant="caption" color="text.secondary">
                                            Thiếu phản hồi
                                          </Typography>
                                          <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                            {q.missingCount} ({formatMetric(q.missingRate)}%)
                                          </Typography>
                                        </Stack>
                                      </Stack>
                                    </Stack>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </Stack>
                        </Stack>
                      </AccordionDetails>
                    </Accordion>
                  );
                })}

                {questionsByCategory.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Không có dữ liệu để phân tích.
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* Điểm mạnh và cần cải thiện */}
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                Điểm mạnh và điểm cần cải thiện
              </Typography>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.main', mb: 1 }}>
                    Điểm mạnh
                  </Typography>
                  <ul className="space-y-2 text-sm text-blue-900">
                    {analytics.questions
                      .filter((question) => question.average >= 8)
                      .sort((a, b) => b.average - a.average || a.missingRate - b.missingRate)
                      .slice(0, 3)
                      .map((question) => (
                        <li key={question.questionId}>
                          <span className="font-semibold">Q{question.sequence}: {truncate(question.questionContent, 52)}</span>{' '}
                          đạt {question.average.toFixed(1)} (bỏ sót {question.missingRate.toFixed(1)}%).
                          <p className="mt-1 text-xs leading-5 text-blue-800/80">{buildStrengthSuggestion(question)}</p>
                        </li>
                      ))}
                    {analytics.stats.interpretation ? <li>• {analytics.stats.interpretation.description}</li> : null}
                  </ul>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'warning.main', mb: 1 }}>
                    Cần cải thiện
                  </Typography>
                  <ul className="space-y-2 text-sm text-orange-900">
                    {analytics.questions
                      .filter((question) => question.average < 8 || question.missingRate > 10)
                      .sort((a, b) => a.average - b.average || b.missingRate - a.missingRate)
                      .slice(0, 3)
                      .map((question) => (
                        <li key={question.questionId}>
                          <span className="font-semibold">Q{question.sequence}: {truncate(question.questionContent, 52)}</span>{' '}
                          hiện {question.average.toFixed(1)} (bỏ sót {question.missingRate.toFixed(1)}%).
                          <p className="mt-1 text-xs leading-5 text-orange-800/80">{buildImprovementSuggestion(question)}</p>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </Stack>
  );
}
