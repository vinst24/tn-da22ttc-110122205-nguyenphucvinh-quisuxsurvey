import { MenuItem, TextField } from '@mui/material';
import { BriefcaseBusiness, Download, Eye, Search, UserCheck, UserX, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DoughnutChart } from '../../charts/DoughnutChart';
import { HorizontalBarChart } from '../../charts/HorizontalBarChart';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { FieldLabel } from '../../components/FormControls';
import {
  SPECIALTY_FILTER_ALL_LABEL,
  SPECIALTY_OPTIONS,
  getSpecialtyLabel,
  type SpecialtyValue,
} from '../../constants/specialties';
import type { ParticipantDetailDto, ParticipantDto, SpecialtyStatDto } from '../../services/admin.service';
import { adminService } from '../../services/admin.service';
import { surveyService } from '../../services/survey.service';
import { CHART_PALETTE } from '../../theme/tokens';
import type { SurveyListItemDto } from '../../types/survey';

const PAGE_SIZE = 8;
const STATS_PAGE_SIZE = 1000;

type AppliedFilters = { q: string; major: SpecialtyValue | ''; surveyId: string };
type ExportFormat = 'csv' | 'excel' | 'json';
type XlsxModule = typeof import('xlsx');

type ParticipantExportRow = {
  id: number;
  participantCode: string;
  nickname: string;
  email: string;
  type: string;
  specialty: string;
  createdAt: string;
  updatedAt: string;
  submittedAt: string;
};

const EXPORT_FORMAT_OPTIONS: Array<{ value: ExportFormat; label: string }> = [
  { value: 'csv', label: 'CSV' },
  { value: 'excel', label: 'Excel (.xlsx)' },
  { value: 'json', label: 'JSON' },
];

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

const sanitizeFilePart = (value: string) => {
  const invalidChars = '<>:"/\\|?*';
  const safe = Array.from(value.trim(), (char) => (char.charCodeAt(0) < 32 || invalidChars.includes(char) ? '-' : char))
    .join('')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return safe.slice(0, 80) || 'participants';
};

const formatDateTimeForExport = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
};

const buildParticipantExportRows = (participants: ParticipantDto[]): ParticipantExportRow[] =>
  participants.map((participant) => ({
    id: participant.id,
    participantCode: participant.participantCode,
    nickname: participant.nickname ?? participant.user?.fullname ?? '',
    email: participant.user?.email ?? '',
    type: participant.isGuest ? 'Khách' : 'Đã đăng ký',
    specialty: participant.major ? getSpecialtyLabel(participant.major) : '',
    createdAt: formatDateTimeForExport(participant.createdAt),
    updatedAt: formatDateTimeForExport(participant.updatedAt),
    submittedAt: formatDateTimeForExport(participant.responses?.[0]?.submittedAt),
  }));

const participantExportHeaders: Array<{ key: keyof ParticipantExportRow; label: string }> = [
  { key: 'id', label: 'ID' },
  { key: 'participantCode', label: 'Mã người tham gia' },
  { key: 'nickname', label: 'Biệt danh' },
  { key: 'email', label: 'Email' },
  { key: 'type', label: 'Loại' },
  { key: 'specialty', label: 'Lĩnh vực chuyên môn' },
  { key: 'createdAt', label: 'Ngày tạo' },
  { key: 'updatedAt', label: 'Cập nhật lúc' },
  { key: 'submittedAt', label: 'Thời gian hoàn thành khảo sát' },
];

const rowsToWorkbook = (XLSX: XlsxModule, rows: ParticipantExportRow[]) => {
  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: participantExportHeaders.map((header) => header.key),
  });
  XLSX.utils.sheet_add_aoa(worksheet, [participantExportHeaders.map((header) => header.label)], { origin: 'A1' });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Nguoi tham gia');
  return workbook;
};

export const ParticipantsPage = () => {
  const [items, setItems] = useState<ParticipantDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Bộ lọc đơn giản như Figma: ô tìm kiếm + dropdown lĩnh vực + chọn khảo sát
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMajor, setFilterMajor] = useState<string>('__all__');
  const [filterSurvey, setFilterSurvey] = useState('__all__');
  const [surveys, setSurveys] = useState<SurveyListItemDto[]>([]);
  const [applied, setApplied] = useState<AppliedFilters>({ q: '', major: '', surveyId: '' });

  // Toàn bộ người tham gia (theo q + surveyId, bỏ qua filterMajor) để vẽ biểu đồ phân bố lĩnh vực
  const [specialtyStats, setSpecialtyStats] = useState<SpecialtyStatDto[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [exporting, setExporting] = useState(false);

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<ParticipantDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const openParticipantDetail = useCallback(async (id: number) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    try {
      const data = await adminService.getParticipantById(id);
      setDetail(data);
    } catch {
      setDetailError('Không thể tải chi tiết người tham gia');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeParticipantDetail = useCallback(() => {
    setDetailOpen(false);
    setDetail(null);
    setDetailError(null);
  }, []);

  // Danh sách khảo sát cho dropdown "Đã khảo sát" — load đủ (pageSize=100)
  useEffect(() => {
    surveyService
      .list({ pageSize: 100 })
      .then((res) => setSurveys(res.items))
      .catch(() => setSurveys([]));
  }, []);

  // Debounce: tự áp dụng bộ lọc (không cần nút "Áp dụng")
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setApplied({ q: searchTerm.trim(), major: filterMajor === '__all__' ? '' : filterMajor as SpecialtyValue | '', surveyId: filterSurvey === '__all__' ? '' : filterSurvey });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, filterMajor, filterSurvey]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.listParticipants({
        page,
        pageSize: PAGE_SIZE,
        q: applied.q || undefined,
        major: applied.major || undefined,
        surveyId: applied.surveyId ? Number(applied.surveyId) : undefined,
      });
      setItems(res.items);
      setTotal(Number(res.meta?.total ?? 0));
    } catch {
      setItems([]);
      setTotal(0);
      setError('Không thể tải dữ liệu người tham gia cho khảo sát đã chọn');
    } finally {
      setLoading(false);
    }
  }, [page, applied]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Lấy toàn bộ người tham gia (theo q + surveyId + major) để tính phân bố lĩnh vực
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setStatsLoading(true);
      try {
        const res = await adminService.participantSpecialtyStats({
          q: applied.q || undefined,
          major: applied.major || undefined,
          surveyId: applied.surveyId ? Number(applied.surveyId) : undefined,
        });
        if (!cancelled) setSpecialtyStats(res.items);
      } catch {
        if (!cancelled) setSpecialtyStats([]);
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [applied.q, applied.major, applied.surveyId]);

  const specialtyDistribution = useMemo(() => {
    const entries = specialtyStats.filter((item) => item.count > 0);
    const labels = entries.map((item) => getSpecialtyLabel(item.specialty));
    const data = entries.map((item) => item.count);
    const totalSamples = data.reduce((sum, value) => sum + value, 0);
    return { labels, data, totalSamples, fieldCount: entries.length };
  }, [specialtyStats]);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    const filters = {
      q: applied.q || undefined,
      major: applied.major || undefined,
      surveyId: applied.surveyId ? Number(applied.surveyId) : undefined,
    };
    const dateStamp = new Date().toISOString().slice(0, 10);
    const surveyTitle = applied.surveyId ? surveys.find((survey) => survey.id === applied.surveyId)?.title : '';
    const baseFilename = `participants-${sanitizeFilePart(surveyTitle || 'all')}-${dateStamp}`;

    try {
      if (exportFormat === 'csv') {
        const blob = await adminService.exportParticipants(filters);
        downloadBlob(blob, `${baseFilename}.csv`);
        return;
      }

      const res = await adminService.listParticipants({
        page: 1,
        pageSize: Math.max(total, STATS_PAGE_SIZE, 1),
        ...filters,
      });
      const rows = buildParticipantExportRows(res.items);

      if (exportFormat === 'excel') {
        const XLSX = await import('xlsx');
        XLSX.writeFile(rowsToWorkbook(XLSX, rows), `${baseFilename}.xlsx`, { compression: true });
        return;
      }

      downloadBlob(
        new Blob([
          JSON.stringify(
            {
              exportedAt: new Date().toISOString(),
              filters: {
                q: applied.q || null,
                major: applied.major || null,
                surveyId: applied.surveyId || null,
                surveyTitle: surveyTitle || null,
              },
              total: Number(res.meta?.total ?? rows.length),
              participants: rows,
            },
            null,
            2,
          ),
        ], { type: 'application/json;charset=utf-8' }),
        `${baseFilename}.json`,
      );
    } catch {
      setError('Không thể xuất dữ liệu người tham gia');
    } finally {
      setExporting(false);
    }
  };
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);
  const visiblePages = useMemo(() => {
    const maxVisible = 5;
    const pages: (number | 'ellipsis_start' | 'ellipsis_end')[] = [];

    if (totalPages <= maxVisible + 2) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    // Always show first page
    pages.push(1);

    // Calculate sliding window around current page
    let windowStart = Math.max(2, page - 2);
    let windowEnd = Math.min(totalPages - 1, page + 2);

    // Adjust window to always show 5 pages (if possible)
    const windowSize = windowEnd - windowStart + 1;
    if (windowSize < maxVisible) {
      if (windowStart === 2) {
        windowEnd = Math.min(totalPages - 1, windowStart + maxVisible - 1);
      } else {
        windowStart = Math.max(2, windowEnd - maxVisible + 1);
      }
    }

    // Ellipsis before window
    if (windowStart > 2) {
      pages.push('ellipsis_start');
    }

    // Window pages
    for (let i = windowStart; i <= windowEnd; i++) {
      pages.push(i);
    }

    // Ellipsis after window
    if (windowEnd < totalPages - 1) {
      pages.push('ellipsis_end');
    }

    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  }, [page, totalPages]);
  const registeredCount = useMemo(() => items.filter((p) => !p.isGuest).length, [items]);
  const guestCount = useMemo(() => items.filter((p) => p.isGuest).length, [items]);
  const fieldCount = useMemo(() => new Set(items.map((p) => p.major).filter(Boolean)).size, [items]);
  const surveySelected = applied.surveyId !== '';

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Người tham gia"
        subtitle="Quản lý danh sách người tham gia khảo sát"
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
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
              disabled={exporting}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              {exporting ? 'Đang xuất...' : 'Xuất danh sách'}
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Tổng số người tham gia" value={total.toString()} />
        <StatCard label="Đã đăng ký (trang này)" value={registeredCount.toString()} />
        <StatCard label="Khách (trang này)" value={guestCount.toString()} />
        <StatCard label="Số lĩnh vực (trang này)" value={fieldCount.toString()} />
      </div>

      {/* Phân tích lĩnh vực chuyên môn */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <BriefcaseBusiness className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900">Phân bố lĩnh vực chuyên môn</h2>
            </div>
            <p className="text-sm text-slate-600">
              Thống kê {specialtyDistribution.totalSamples} người tham gia · {specialtyDistribution.fieldCount} lĩnh vực
              {applied.surveyId
                ? ` của khảo sát "${surveys.find((s) => s.id === applied.surveyId)?.title ?? 'đã chọn'}"`
                : ' trên toàn hệ thống'}
              {applied.q ? ` (tìm kiếm "${applied.q}")` : ''}.
            </p>
          </div>
        </div>
        {statsLoading ? (
          <div className="py-10 text-center text-sm text-slate-500">Đang tải dữ liệu biểu đồ...</div>
        ) : specialtyDistribution.totalSamples === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">Chưa có dữ liệu để hiển thị.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DoughnutChart
              labels={specialtyDistribution.labels}
              data={specialtyDistribution.data}
              height={300}
              centerLabel="Số lượng"
            />
            <HorizontalBarChart
              labels={specialtyDistribution.labels}
              data={specialtyDistribution.data}
              label="Số lượng"
              height={300}
              color={CHART_PALETTE.primaryBar}
              min={0}
              max={Math.max(...specialtyDistribution.data) + 1}
            />
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <FieldLabel htmlFor="participants-search" className="sr-only">Tìm kiếm người tham gia</FieldLabel>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              id="participants-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm theo mã, biệt danh, lĩnh vực..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
          </div>

          {/* Survey Filter — xem ai đã khảo sát */}
          <TextField
            select
            size="small"
            label="Khảo sát"
            value={filterSurvey}
            onChange={(e) => setFilterSurvey(e.target.value)}
            sx={{ width: { xs: '100%', sm: 400 } }}
            slotProps={{
              select: {
                renderValue: (selected: unknown) => {
                  const id = selected as string;
                  if (id === '__all__') return <span title="Tất cả khảo sát">Tất cả khảo sát</span>;
                  const survey = surveys.find((s) => s.id === id);
                  const title = survey?.title ?? id;
                  return <span title={title}>{title.length > 40 ? `${title.slice(0, 40).trimEnd()}...` : title}</span>;
                },
                MenuProps: {
                  slotProps: { paper: { sx: { maxHeight: 300, overflowX: 'auto' } } },
                },
              },
            }}
          >
            <MenuItem value="__all__" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <span title="Tất cả khảo sát">Tất cả khảo sát</span>
            </MenuItem>
            {surveys.map((survey) => (
              <MenuItem key={survey.id} value={survey.id} sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <span title={survey.title}>{survey.title.length > 40 ? `${survey.title.slice(0, 40).trimEnd()}...` : survey.title}</span>
              </MenuItem>
            ))}
          </TextField>

          {/* Field Filter */}
          <TextField
            select
            size="small"
            label="Lĩnh vực"
            value={filterMajor}
            onChange={(e) => setFilterMajor(e.target.value)}
            sx={{ minWidth: 200 }}
            slotProps={{
              select: {
                renderValue: (selected: unknown) => {
                  const val = selected as string;
                  if (val === '__all__') return <span>{SPECIALTY_FILTER_ALL_LABEL}</span>;
                  return <span>{getSpecialtyLabel(val)}</span>;
                },
                MenuProps: {
                  slotProps: { paper: { sx: { maxHeight: 300 } } },
                },
              },
            }}
          >
            <MenuItem value="__all__">{SPECIALTY_FILTER_ALL_LABEL}</MenuItem>
            {SPECIALTY_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </div>
        {surveySelected ? (
          <p className="mt-3 text-sm text-slate-500">
            Đang xem những người đã tham gia khảo sát:{' '}
            <span className="font-medium text-slate-700">
              {surveys.find((s) => s.id === applied.surveyId)?.title ?? 'đã chọn'}
            </span>
          </p>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-12">STT</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Mã người tham gia</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Biệt danh</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Lĩnh vực chuyên môn</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Loại</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {surveySelected ? 'Thời gian hoàn thành' : 'Ngày tạo'}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-6 text-center text-sm text-slate-500">
                    Đang tải...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-6 text-center text-sm text-slate-500">
                    Không có người tham gia
                  </td>
                </tr>
              ) : (
                items.map((participant, idx) => (
                  <tr key={participant.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-sm text-center">
                      {(page - 1) * PAGE_SIZE + idx + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-sm font-mono">
                        {participant.participantCode}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-700">
                      {participant.nickname ?? participant.user?.fullname ?? '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-700">
                      {participant.major ? getSpecialtyLabel(participant.major) : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <TypeBadge isGuest={participant.isGuest} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-700 text-sm">
                      {surveySelected
                        ? participant.responses?.[0]?.submittedAt
                          ? new Date(participant.responses[0].submittedAt).toLocaleString('vi-VN')
                          : '—'
                        : new Date(participant.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openParticipantDetail(participant.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Xem chi tiết"
                          aria-label={`Xem chi tiết ${participant.participantCode}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Hiển thị <span className="font-medium">{items.length}</span> trong{' '}
            <span className="font-medium">{total}</span> người tham gia
          </div>
          <div className="flex gap-1 items-center">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="px-3 py-1 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm disabled:opacity-50"
              disabled={page <= 1}
            >
              ← Trước
            </button>
            {visiblePages.map((item) => {
              if (item === 'ellipsis_start' || item === 'ellipsis_end') {
                return (
                  <span key={item} className="px-2 text-slate-400 text-sm">
                    ...
                  </span>
                );
              }
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPage(item)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    item === page
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {item}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="px-3 py-1 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm disabled:opacity-50"
              disabled={page >= totalPages}
            >
              Tiếp →
            </button>
          </div>
        </div>
      </div>

      {detailOpen && (
        <ParticipantDetailDialog
          loading={detailLoading}
          error={detailError}
          detail={detail}
          surveyTitleLookup={(surveyId) => surveys.find((s) => Number(s.id) === surveyId)?.title}
          onClose={closeParticipantDetail}
        />
      )}
    </div>
  );
};

type ParticipantDetailDialogProps = {
  loading: boolean;
  error: string | null;
  detail: ParticipantDetailDto | null;
  surveyTitleLookup: (surveyId: number) => string | undefined;
  onClose: () => void;
};

function ParticipantDetailDialog({ loading, error, detail, surveyTitleLookup, onClose }: ParticipantDetailDialogProps) {
  const formatDateTime = (value?: string | null) =>
    value ? new Date(value).toLocaleString('vi-VN') : '—';

  const displayName = detail?.nickname?.trim() || detail?.user?.fullname?.trim() || 'Chưa có biệt danh';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-slate-900 truncate">Chi tiết người tham gia</h3>
            {detail && (
              <p className="mt-1 text-sm text-slate-500 truncate">
                <code className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-mono mr-2">
                  {detail.participantCode}
                </code>
                {displayName}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500">Đang tải chi tiết...</div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : detail ? (
            <div className="space-y-6">
              <section>
                <h4 className="text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold mb-3">Thông tin cá nhân</h4>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <DetailRow label="Biệt danh" value={detail.nickname ?? detail.user?.fullname ?? '—'} />
                  <DetailRow
                    label="Loại"
                    value={<TypeBadge isGuest={detail.isGuest} />}
                  />
                  <DetailRow label="Email" value={detail.user?.email ?? (detail.isGuest ? 'Khách (không có email)' : '—')} />
                  <DetailRow label="Lĩnh vực chuyên môn" value={detail.major ? getSpecialtyLabel(detail.major) : '—'} />
                  <DetailRow label="Ngày tạo" value={formatDateTime(detail.createdAt)} />
                  <DetailRow label="Cập nhật lúc" value={formatDateTime(detail.updatedAt)} />
                </dl>
              </section>

              <section>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold">Lịch sử khảo sát</h4>
                  <span className="text-xs text-slate-500 tabular-nums">{detail.responses.length} lần phản hồi</span>
                </div>
                {detail.responses.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    Chưa có phản hồi nào.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium">Khảo sát</th>
                          <th className="px-4 py-2 text-left font-medium">Trạng thái</th>
                          <th className="px-4 py-2 text-right font-medium">Tiến độ</th>
                          <th className="px-4 py-2 text-left font-medium">Thời điểm</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {detail.responses.map((response) => {
                          const title = response.survey?.title ?? surveyTitleLookup(response.surveyId) ?? `Khảo sát #${response.surveyId}`;
                          const timestamp = response.submittedAt ?? response.lastSavedAt ?? response.updatedAt;
                          return (
                            <tr key={response.id} className="hover:bg-slate-50">
                              <td className="px-4 py-2 text-slate-700 max-w-[260px]">
                                <div className="truncate" title={title}>{title}</div>
                              </td>
                              <td className="px-4 py-2">
                                <ResponseStatusBadge
                                  isComplete={response.isComplete}
                                  completionPercent={response.completionPercent}
                                />
                              </td>
                              <td className="px-4 py-2 text-right text-slate-700 tabular-nums">
                                {response.completionPercent}%
                              </td>
                              <td className="px-4 py-2 text-slate-600 whitespace-nowrap">
                                {formatDateTime(timestamp)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          ) : null}
        </div>

        <div className="px-6 pb-5 pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition shadow-sm"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-800 break-words">{value}</dd>
    </div>
  );
}

function ResponseStatusBadge({ isComplete, completionPercent }: { isComplete: boolean; completionPercent: number }) {
  if (isComplete) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
        Hoàn thành
      </span>
    );
  }
  if (completionPercent >= 80) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        Phản hồi từng phần
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
      Nháp
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    'Tổng số người tham gia': <UserCheck className="w-5 h-5 text-blue-600" />,
    'Đã đăng ký (trang này)': <UserCheck className="w-5 h-5 text-green-600" />,
    'Khách (trang này)': <UserX className="w-5 h-5 text-amber-600" />,
    'Số lĩnh vực (trang này)': <BriefcaseBusiness className="w-5 h-5 text-purple-600" />,
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-1">
        {iconMap[label]}
        <div className="text-sm text-slate-600">{label}</div>
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function TypeBadge({ isGuest }: { isGuest: boolean }) {
  const colorClass = isGuest ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700';
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium ${colorClass}`}>
      {isGuest ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
      {isGuest ? 'Khách' : 'Đã đăng ký'}
    </span>
  );
}
