import { existsSync } from 'node:fs';
import PDFDocument from 'pdfkit';
import { dashboardService, type AnalyticsFilterOptions } from './dashboard.service.js';

type Analytics = Awaited<ReturnType<typeof dashboardService.analyticsBySurvey>>;
type ExportFormat = 'csv' | 'pdf';
type ExportResult = { filename: string; contentType: string; body: Buffer | string };
type ExportCell = string | number | null | undefined;

type Recommendation = {
  categoryName: string;
  average: number;
  severity: 'critical' | 'optimize' | 'maintain';
  text: string;
};

const FONT_REGULAR_CANDIDATES = ['C:/Windows/Fonts/arial.ttf', 'C:/Windows/Fonts/segoeui.ttf'];
const FONT_BOLD_CANDIDATES = ['C:/Windows/Fonts/arialbd.ttf', 'C:/Windows/Fonts/segoeuib.ttf'];

const findFont = (candidates: string[]) => candidates.find((path) => existsSync(path));
const regularFont = findFont(FONT_REGULAR_CANDIDATES);
const boldFont = findFont(FONT_BOLD_CANDIDATES);

const formatNumber = (value: number, digits = 2) => (Number.isFinite(value) ? value.toFixed(digits) : '0.00');

const sanitizeFilename = (value: string) => {
  const safe = value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return safe.slice(0, 80) || 'survey';
};

const csvEscape = (value: ExportCell) => {
  const text = value === null || value === undefined ? '' : String(value);
  const normalized = text.replace(/\r?\n/g, ' ');
  return /[",\r\n,]/.test(normalized) ? `"${normalized.replace(/"/g, '""')}"` : normalized;
};

const sectionsToCsv = (sections: Array<{ title: string; headers: string[]; rows: ExportCell[][] }>) => {
  const lines: string[] = [];
  for (const section of sections) {
    if (lines.length > 0) lines.push('');
    lines.push(csvEscape(section.title));
    lines.push(section.headers.map(csvEscape).join(','));
    for (const row of section.rows) lines.push(row.map(csvEscape).join(','));
  }
  return `\uFEFF${lines.join('\r\n')}`;
};

const buildRecommendations = (analytics: Analytics): Recommendation[] => {
  const recommendations = analytics.categories.map((category) => {
    if (category.average < 5) {
      return {
        categoryName: category.categoryName,
        average: category.average,
        severity: 'critical' as const,
        text: `Cần cải thiện ${category.categoryName}: điểm trung bình ${formatNumber(category.average)} dưới ngưỡng 5/9. Nên rà soát các câu hỏi thấp nhất trong danh mục này trước.`,
      };
    }

    if (category.average < 7) {
      return {
        categoryName: category.categoryName,
        average: category.average,
        severity: 'optimize' as const,
        text: `Có thể tối ưu ${category.categoryName}: điểm trung bình ${formatNumber(category.average)} nằm trong vùng 5-7/9, nên ưu tiên cải thiện trải nghiệm ở các điểm còn gây lưỡng lự.`,
      };
    }

    return {
      categoryName: category.categoryName,
      average: category.average,
      severity: 'maintain' as const,
      text: `Duy trì ${category.categoryName}: điểm trung bình ${formatNumber(category.average)} đạt từ 7/9 trở lên.`,
    };
  });

  return recommendations.sort((a, b) => a.average - b.average);
};

const buildExportSections = (analytics: Analytics, recommendations: Recommendation[]) => [
  {
    title: 'Tong quan',
    headers: ['Chi so', 'Gia tri'],
    rows: [
      ['Khao sat', analytics.survey.title],
      ['Tong phan hoi', analytics.stats.totalResponses],
      ['Hoan thanh', analytics.stats.completedCount],
      ['Chua hoan thanh', analytics.stats.partialCount],
      ['Nguoi tham gia duy nhat', analytics.stats.uniqueParticipants],
      ['Diem trung binh', formatNumber(analytics.stats.overallAverage)],
      ['SD', formatNumber(analytics.stats.standardDeviation)],
      ['Median', formatNumber(analytics.stats.median)],
      ['95% CI', `${formatNumber(analytics.stats.confidenceInterval95.lower)} - ${formatNumber(analytics.stats.confidenceInterval95.upper)}`],
      ['Tong cau hoi', analytics.stats.totalQuestions],
      ['Muc dien giai', analytics.stats.interpretation?.level ?? ''],
      ['Mo ta', analytics.stats.interpretation?.description ?? ''],
    ],
  },
  {
    title: 'Danh muc',
    headers: ['Danh muc', 'Mean', 'SD', 'Median', 'Cronbach alpha', 'So phan hoi', 'Khuyen nghi'],
    rows: analytics.categories.map((category) => {
      const recommendation = recommendations.find((item) => item.categoryName === category.categoryName);
      return [
        category.categoryName,
        formatNumber(category.average),
        formatNumber(category.standardDeviation),
        formatNumber(category.median),
        category.cronbachAlpha === null ? '' : formatNumber(category.cronbachAlpha, 3),
        category.responseCount,
        recommendation?.text ?? '',
      ];
    }),
  },
  {
    title: 'Cau hoi',
    headers: ['STT', 'Danh muc', 'Cau hoi', 'Mean', 'SD', 'Median', '95% CI', 'Phan hoi', 'Thieu', 'Ty le thieu (%)', 'Min', 'Max'],
    rows: analytics.questions.map((question) => [
      question.sequence,
      question.categoryName,
      question.questionContent,
      formatNumber(question.average),
      formatNumber(question.standardDeviation),
      formatNumber(question.median),
      `${formatNumber(question.confidenceInterval95.lower)} - ${formatNumber(question.confidenceInterval95.upper)}`,
      question.responseCount,
      question.missingCount,
      formatNumber(question.missingRate),
      question.minScore,
      question.maxScore,
    ]),
  },
  {
    title: 'Histogram diem 1-9',
    headers: ['Diem', 'Tan suat'],
    rows: analytics.charts.histogram.labels.map((label, index) => [label, analytics.charts.histogram.data[index] ?? 0]),
  },
  {
    title: 'Drop-off',
    headers: ['STT', 'Cau hoi', 'Thieu phan hoi', 'Ty le thieu (%)'],
    rows: analytics.dropOff.map((item) => [item.sequence, item.questionContent, item.missingCount, formatNumber(item.missingRate)]),
  },
];

const addPageIfNeeded = (doc: PDFKit.PDFDocument, height = 80) => {
  if (doc.y + height > doc.page.height - doc.page.margins.bottom) doc.addPage();
};

const setFont = (doc: PDFKit.PDFDocument, bold = false) => {
  if (bold && boldFont) return doc.font('AppBold');
  if (!bold && regularFont) return doc.font('AppRegular');
  return doc.font(bold ? 'Helvetica-Bold' : 'Helvetica');
};

const sectionTitle = (doc: PDFKit.PDFDocument, title: string) => {
  addPageIfNeeded(doc, 70);
  doc.moveDown(0.8);
  setFont(doc, true).fontSize(15).fillColor('#0f172a').text(title);
  doc.moveTo(doc.x, doc.y + 4).lineTo(doc.page.width - doc.page.margins.right, doc.y + 4).strokeColor('#cbd5e1').stroke();
  doc.moveDown(0.8);
};

const drawKeyValueRows = (doc: PDFKit.PDFDocument, rows: Array<[string, string | number]>) => {
  const labelWidth = 170;
  const valueWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right - labelWidth;
  for (const [label, value] of rows) {
    addPageIfNeeded(doc, 30);
    const y = doc.y;
    setFont(doc, true).fontSize(10).fillColor('#334155').text(label, doc.page.margins.left, y, { width: labelWidth });
    setFont(doc).fontSize(10).fillColor('#0f172a').text(String(value), doc.page.margins.left + labelWidth, y, { width: valueWidth });
    doc.moveDown(0.7);
  }
};

const drawBarChart = (
  doc: PDFKit.PDFDocument,
  title: string,
  items: Array<{ label: string; value: number }>,
  maxValue?: number,
) => {
  sectionTitle(doc, title);
  const chartWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const labelWidth = 165;
  const barWidth = chartWidth - labelWidth - 45;
  const max = Math.max(maxValue ?? 0, ...items.map((item) => item.value), 1);

  for (const item of items) {
    addPageIfNeeded(doc, 28);
    const y = doc.y;
    setFont(doc).fontSize(9).fillColor('#334155').text(item.label, doc.page.margins.left, y, { width: labelWidth, ellipsis: true });
    doc.roundedRect(doc.page.margins.left + labelWidth, y + 2, barWidth, 10, 3).fill('#e2e8f0');
    doc.roundedRect(doc.page.margins.left + labelWidth, y + 2, Math.max(2, (item.value / max) * barWidth), 10, 3).fill('#2563eb');
    setFont(doc, true).fontSize(9).fillColor('#0f172a').text(formatNumber(item.value), doc.page.margins.left + labelWidth + barWidth + 8, y - 1, { width: 40 });
    doc.y = y + 23;
  }
};

const addWrappedList = (doc: PDFKit.PDFDocument, items: string[]) => {
  for (const item of items) {
    addPageIfNeeded(doc, 45);
    setFont(doc).fontSize(10).fillColor('#0f172a').text(`• ${item}`, { width: 500, continued: false });
    doc.moveDown(0.4);
  }
};

const createPdf = async (analytics: Analytics, recommendations: Recommendation[]) => new Promise<Buffer>((resolve, reject) => {
  const doc = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true, info: { Title: `QUIS Analytics - ${analytics.survey.title}` } });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);

  if (regularFont) doc.registerFont('AppRegular', regularFont);
  if (boldFont) doc.registerFont('AppBold', boldFont);

  setFont(doc, true).fontSize(22).fillColor('#0f172a').text('QUIS Analytics Report', { align: 'center' });
  doc.moveDown(0.6);
  setFont(doc).fontSize(13).fillColor('#334155').text(analytics.survey.title, { align: 'center' });
  doc.moveDown(0.5);
  setFont(doc).fontSize(10).fillColor('#64748b').text(`Generated at: ${new Date().toLocaleString('vi-VN')}`, { align: 'center' });
  doc.moveDown(2);

  sectionTitle(doc, 'Tom tat khao sat');
  drawKeyValueRows(doc, [
    ['Tong phan hoi', analytics.stats.totalResponses],
    ['Hoan thanh', analytics.stats.completedCount],
    ['Chua hoan thanh', analytics.stats.partialCount],
    ['Nguoi tham gia duy nhat', analytics.stats.uniqueParticipants],
    ['Diem trung binh', `${formatNumber(analytics.stats.overallAverage)}/9`],
    ['SD / Median', `${formatNumber(analytics.stats.standardDeviation)} / ${formatNumber(analytics.stats.median)}`],
    ['95% CI', `${formatNumber(analytics.stats.confidenceInterval95.lower)} - ${formatNumber(analytics.stats.confidenceInterval95.upper)}`],
    ['Muc UX', analytics.stats.interpretation?.level ?? '\u0043h\u01b0a c\u00f3'],
  ]);

  drawBarChart(
    doc,
    'Diem trung binh theo danh muc',
    analytics.categories.map((category) => ({ label: category.categoryName, value: category.average })),
    9,
  );

  drawBarChart(
    doc,
    'Histogram diem tra loi 1-9',
    analytics.charts.histogram.labels.map((label, index) => ({ label: `Diem ${label}`, value: analytics.charts.histogram.data[index] ?? 0 })),
  );

  const dropOffItems = analytics.dropOff.filter((item) => item.missingCount > 0).slice(0, 8);
  if (dropOffItems.length > 0) {
    drawBarChart(
      doc,
      'Drop-off theo cau hoi',
      dropOffItems.map((item) => ({ label: `Q${item.sequence}. ${item.questionContent}`, value: item.missingCount })),
    );
  }

  sectionTitle(doc, 'Nhan xet va khuyen nghi');
  const summaryComments = [
    analytics.stats.totalResponses < 30
      ? `Co mau n = ${analytics.stats.totalResponses}, can than trong dien giai vi n < 30.`
      : `Co mau n = ${analytics.stats.totalResponses}, du nguong tham khao co ban cho thong ke mo ta.`,
    analytics.stats.interpretation?.description ?? '\u0043h\u01b0a c\u00f3 di\u1ec5n gi\u1ea3i t\u1ed5ng quan.',
  ];
  addWrappedList(doc, [...summaryComments, ...recommendations.map((item) => item.text)]);

  sectionTitle(doc, 'Bang so lieu theo cau hoi');
  for (const question of analytics.questions) {
    addPageIfNeeded(doc, 46);
    setFont(doc, true).fontSize(9).fillColor('#0f172a').text(`Q${question.sequence}. ${question.questionContent}`);
    setFont(doc).fontSize(8.5).fillColor('#475569').text(
      `${question.categoryName} | Mean ${formatNumber(question.average)} | SD ${formatNumber(question.standardDeviation)} | Median ${formatNumber(question.median)} | n ${question.responseCount} | Missing ${question.missingCount}`,
    );
    doc.moveDown(0.45);
  }

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    setFont(doc).fontSize(8).fillColor('#94a3b8').text(
      `QUIS Survey Report - Page ${i + 1} / ${range.count}`,
      doc.page.margins.left,
      doc.page.height - 30,
      { align: 'center', width: doc.page.width - doc.page.margins.left - doc.page.margins.right },
    );
  }

  doc.end();
});

export const analyticsExportService = {
  buildRecommendations,

  exportAnalytics: async (opts: { surveyId: string; format: ExportFormat } & AnalyticsFilterOptions): Promise<ExportResult> => {
    const analytics = await dashboardService.analyticsBySurvey(opts.surveyId, opts);
    const recommendations = buildRecommendations(analytics);
    const dateStamp = new Date().toISOString().slice(0, 10);
    const baseFilename = `analytics-${sanitizeFilename(analytics.survey.title)}-${dateStamp}`;

    if (opts.format === 'csv') {
      return {
        filename: `${baseFilename}.csv`,
        contentType: 'text/csv; charset=utf-8',
        body: sectionsToCsv(buildExportSections(analytics, recommendations)),
      };
    }

    return {
      filename: `${baseFilename}.pdf`,
      contentType: 'application/pdf',
      body: await createPdf(analytics, recommendations),
    };
  },
};
