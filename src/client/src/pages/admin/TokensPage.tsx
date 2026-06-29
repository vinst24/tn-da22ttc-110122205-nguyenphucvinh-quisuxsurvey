import { MenuItem, TextField } from '@mui/material';
import { AlertCircle, Calendar, CheckCircle, Clock, Copy, ExternalLink, FileText, Lock, Plus, QrCode, RefreshCw, RotateCw, Search, ShieldCheck, Trash2, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { FieldLabel } from '../../components/FormControls';
import { PATHS } from '../../constants/paths';
import { useNow } from '../../hooks/useNow';
import { surveyService } from '../../services/survey.service';
import { ApiError } from '../../types/api';
import type { SurveyListItemDto, SurveyTokenDto } from '../../types/survey';

type TokenRow = SurveyTokenDto & {
  surveyTitle: string;
  surveyIsActive: boolean;
  surveyIsPublic: boolean;
  surveyQuestionCount: number;
};

type TokenFormState = {
  surveyId: string;
  codePrefix: string;
  validFromDate: string;
  validFromTime: string;
  validToDate: string;
  validToTime: string;
  maxUsage: string;
};

type FieldError = {
  validFromDate?: string;
  validFromTime?: string;
  validToDate?: string;
  validToTime?: string;
  general?: string;
};

const emptyTokenForm = (): TokenFormState => ({
  surveyId: '',
  codePrefix: '',
  validFromDate: '',
  validFromTime: '',
  validToDate: '',
  validToTime: '',
  maxUsage: '',
});

const emptyFieldErrors = (): FieldError => ({});

// ── Helpers ──────────────────────────────────────────────

/** Combine date (YYYY-MM-DD) + time (HH:mm) → ISO string, or null if either is empty */
const combineToISO = (date: string, time: string): string | null => {
  if (!date || !time) return null;
  return new Date(`${date}T${time}:00`).toISOString();
};

/** Format ISO string → DD/MM/YYYY, HH:mm display */
const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

// ── Shared validation ────────────────────────────────────

const isSurveyExpired = (expiresAt?: string | null) => {
  if (!expiresAt) return false;
  const time = new Date(expiresAt).getTime();
  return Number.isFinite(time) && time < Date.now();
};

const getStatus = (token: SurveyTokenDto) => {
  const now = Date.now();
  if (token.validFrom && new Date(token.validFrom).getTime() > now) return { label: 'Chờ kích hoạt', color: 'bg-amber-100 text-amber-800 border border-amber-300', icon: Clock };
  if (token.validTo && new Date(token.validTo).getTime() < now) return { label: 'Hết hạn', color: 'bg-red-100 text-red-800 border border-red-300', icon: AlertCircle };
  if (token.maxUsage !== null && token.usageCount >= token.maxUsage) return { label: 'Hết lượt', color: 'bg-red-100 text-red-800 border border-red-300', icon: XCircle };
  if (token.maxUsage === null && token.usedAt) return { label: 'Đã dùng', color: 'bg-slate-100 text-slate-800 border border-slate-300', icon: XCircle };
  return { label: 'Còn hiệu lực', color: 'bg-emerald-100 text-emerald-800 border border-emerald-300', icon: CheckCircle };
};

// ── Component ────────────────────────────────────────────

export default function TokensPage() {
  const [surveys, setSurveys] = useState<SurveyListItemDto[]>([]);
  const [tokenRows, setTokenRows] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [search, setSearch] = useState('');
  const [selectedSurveyId, setSelectedSurveyId] = useState('__all__');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TokenRow | null>(null);
  const [form, setForm] = useState<TokenFormState>(emptyTokenForm());
  const [fieldErrors, setFieldErrors] = useState<FieldError>(emptyFieldErrors());

  const now = useNow(1000);
  const todayStr = new Date(now).toISOString().slice(0, 10);
  const nowTimeStr = new Date(now).toISOString().slice(11, 16);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const surveyRes = await surveyService.list({ pageSize: 100 });
      setSurveys(surveyRes.items);

      const tokenSets = await Promise.all(
        surveyRes.items.map(async (survey) => {
          const tokens = await surveyService.listTokens(survey.id);
          return tokens.map<TokenRow>((token) => ({
            ...token,
            surveyTitle: survey.title,
            surveyIsActive: survey.isActive,
            surveyIsPublic: survey.isPublic,
            surveyQuestionCount: survey._count?.questions ?? 0,
          }));
        }),
      );

      setTokenRows(tokenSets.flat());
      const firstId = surveyRes.items[0]?.id || '';
      setSelectedSurveyId((current) => current || firstId);
      setForm((current) => ({
        ...current,
        surveyId: current.surveyId || firstId,
      }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không tải được dữ liệu mã khảo sát');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredTokens = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = tokenRows;

    if (selectedSurveyId && selectedSurveyId !== '__all__') {
      list = list.filter((token) => token.surveyId === selectedSurveyId);
    }

    if (!term) return list;

    return list.filter((token) => {
      const status = getStatus(token).label.toLowerCase();
      return (
        token.code.toLowerCase().includes(term) ||
        token.surveyTitle.toLowerCase().includes(term) ||
        (token.participant?.nickname ?? '').toLowerCase().includes(term) ||
        (token.participant?.participantCode ?? '').toLowerCase().includes(term) ||
        status.includes(term)
      );
    });
  }, [search, tokenRows, selectedSurveyId]);

  // Pagination
  const totalFiltered = filteredTokens.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const paginatedTokens = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredTokens.slice(start, start + PAGE_SIZE);
  }, [filteredTokens, page]);

  const visiblePages = useMemo(() => {
    const maxVisible = 5;
    const pages: (number | 'ellipsis_start' | 'ellipsis_end')[] = [];
    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    let windowStart = Math.max(2, page - 2);
    let windowEnd = Math.min(totalPages - 1, page + 2);
    const windowSize = windowEnd - windowStart + 1;
    if (windowSize < maxVisible) {
      if (windowStart === 2) {
        windowEnd = Math.min(totalPages - 1, windowStart + maxVisible - 1);
      } else {
        windowStart = Math.max(2, windowEnd - maxVisible + 1);
      }
    }
    if (windowStart > 2) pages.push('ellipsis_start');
    for (let i = windowStart; i <= windowEnd; i++) pages.push(i);
    if (windowEnd < totalPages - 1) pages.push('ellipsis_end');
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  }, [page, totalPages]);

  const summary = useMemo(() => {
    const total = tokenRows.length;
    const active = tokenRows.filter((token) => getStatus(token).label === 'Còn hiệu lực').length;
    const used = tokenRows.filter((token) => token.usedAt).length;
    const expired = tokenRows.filter((token) => getStatus(token).label === 'Hết hạn' || getStatus(token).label === 'Hết lượt').length;
    return { total, active, used, expired };
  }, [tokenRows]);

  const selectedSurvey = surveys.find((survey) => survey.id === form.surveyId) ?? surveys[0] ?? null;
  const selectedSurveyTokensCount = selectedSurvey
    ? tokenRows.filter((token) => token.surveyId === selectedSurvey.id).length
    : 0;

  // ── Validation ─────────────────────────────────────────

  const validateTokenForm = (f: TokenFormState): FieldError => {
    const errs: FieldError = {};

    // ValidFrom validation
    if (f.validFromDate) {
      if (f.validFromDate < todayStr) {
        errs.validFromDate = 'Ngày hiệu lực không được trong quá khứ';
      } else if (f.validFromDate === todayStr && f.validFromTime && f.validFromTime <= nowTimeStr) {
        errs.validFromTime = 'Giờ hiệu lực phải ở tương lai';
      }
    }

    // ValidTo validation
    if (f.validToDate) {
      if (f.validToDate < todayStr) {
        errs.validToDate = 'Ngày hết hạn không được trong quá khứ';
      } else if (f.validToDate === todayStr && f.validToTime && f.validToTime <= nowTimeStr) {
        errs.validToTime = 'Giờ hết hạn phải ở tương lai';
      }

      // ValidTo must be >= validFrom + 1 hour
      if (f.validFromDate && f.validFromTime && f.validToDate && f.validToTime) {
        const fromMs = new Date(`${f.validFromDate}T${f.validFromTime}:00`).getTime();
        const toMs = new Date(`${f.validToDate}T${f.validToTime}:00`).getTime();
        if (toMs - fromMs < 3600000) {
          errs.validToTime = 'Hết hạn phải cách hiệu lực từ ít nhất 1 giờ';
        }
      }

      // ValidTo must not exceed survey expiresAt
      if (selectedSurvey?.expiresAt) {
        const surveyMax = new Date(selectedSurvey.expiresAt);
        const surveyMaxDate = surveyMax.toISOString().slice(0, 10);
        const surveyMaxTime = surveyMax.toISOString().slice(11, 16);
        if (f.validToDate > surveyMaxDate) {
          errs.validToDate = 'Không được vượt quá hạn khảo sát';
        } else if (f.validToDate === surveyMaxDate && f.validToTime && f.validToTime > surveyMaxTime) {
          errs.validToTime = 'Không được vượt quá giờ hết hạn của khảo sát';
        }
      }
    }

    return errs;
  };

  // ── Derived min values ─────────────────────────────────

  const validFromTimeMin = form.validFromDate === todayStr ? nowTimeStr : undefined;
  const validToTimeMin = form.validToDate === todayStr ? nowTimeStr : undefined;

  const surveyMaxDate = selectedSurvey?.expiresAt ? new Date(selectedSurvey.expiresAt).toISOString().slice(0, 10) : undefined;
  const surveyMaxTime =
    selectedSurvey?.expiresAt && form.validToDate === surveyMaxDate
      ? new Date(selectedSurvey.expiresAt).toISOString().slice(11, 16)
      : undefined;

  // ── Handlers ───────────────────────────────────────────

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setNotice({ type: 'success', message: 'Đã sao chép mã khảo sát!' });
    } catch {
      setError('Không thể sao chép mã khảo sát, vui lòng thử lại.');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleSurveyFilterChange = useCallback((value: string) => {
    setSelectedSurveyId(value);
    setPage(1);
  }, []);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const tokenId = deleteTarget.id;
    setDeletingId(tokenId);
    setError(null);
    setNotice(null);
    try {
      await surveyService.removeToken(tokenId);
      setNotice({ type: 'success', message: 'Đã xóa mã khảo sát.' });
      setTokenRows((prev) => prev.filter((t) => t.id !== tokenId));
      setDeleteTarget(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Xóa mã khảo sát thất bại');
    } finally {
      setDeletingId(null);
    }
  };

  const handleFieldChange = (field: keyof TokenFormState, value: string) => {
    const next = { ...form, [field]: value };
    setForm(next);

    // Clear field error on change
    setFieldErrors((prev) => {
      const nextErr = { ...prev };
      delete (nextErr as Record<string, string | undefined>)[field];
      return nextErr;
    });

    // Validate after a small delay
    const errs = validateTokenForm(next);
    setFieldErrors(errs);
  };

  const handleCreateToken = async () => {
    if (!form.surveyId) return;

    // Validate all fields before submit
    const errs = validateTokenForm(form);
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const targetSurvey = surveys.find((s) => s.id === form.surveyId);
    if (targetSurvey && isSurveyExpired(targetSurvey.expiresAt)) {
      setError('Khảo sát đã hết hạn, không thể tạo mã mới.');
      return;
    }

    const validFromIso = combineToISO(form.validFromDate, form.validFromTime);
    const validToIso = combineToISO(form.validToDate, form.validToTime);

    setCreating(true);
    setError(null);
    setNotice(null);
    setFieldErrors(emptyFieldErrors());
    try {
      const maxUsage = form.maxUsage.trim() ? parseInt(form.maxUsage, 10) : undefined;
      await surveyService.createToken(form.surveyId, {
        validFrom: validFromIso ?? undefined,
        expiresAt: validToIso ?? undefined,
        codePrefix: form.codePrefix.trim() || undefined,
        maxUsage: maxUsage && !isNaN(maxUsage) ? maxUsage : undefined,
      });
      setNotice({ type: 'success', message: 'Đã tạo mã truy cập mới!' });
      setShowGenerateModal(false);
      setForm(emptyTokenForm());
      await loadData();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Tạo mã khảo sát thất bại');
    } finally {
      setCreating(false);
    }
  };

  // ── Render helpers ─────────────────────────────────────

  const renderDateTimeFields = (
    idPrefix: string,
    dateValue: string,
    timeValue: string,
    dateLabel: string,
    timeLabel: string,
    dateError: string | undefined,
    timeError: string | undefined,
    dateMax: string | undefined,
    timeMin: string | undefined,
    timeMax: string | undefined,
    onDateChange: (v: string) => void,
    onTimeChange: (v: string) => void,
  ) => (
    <div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <FieldLabel htmlFor={`${idPrefix}-date`} className="mb-1.5">{dateLabel}</FieldLabel>
          <input
            id={`${idPrefix}-date`}
            type="date"
            value={dateValue}
            min={todayStr}
            max={dateMax}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-invalid={Boolean(dateError)}
            aria-describedby={dateError ? `${idPrefix}-date-error` : undefined}
          />
          {dateError && <p id={`${idPrefix}-date-error`} className="text-xs text-red-500 mt-1">{dateError}</p>}
        </div>
        <div className="flex-1">
          <FieldLabel htmlFor={`${idPrefix}-time`} className="mb-1.5">{timeLabel}</FieldLabel>
          <input
            id={`${idPrefix}-time`}
            type="time"
            value={timeValue}
            min={timeMin}
            max={timeMax}
            onChange={(e) => onTimeChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-invalid={Boolean(timeError)}
            aria-describedby={timeError ? `${idPrefix}-time-error` : undefined}
          />
          {timeError && <p id={`${idPrefix}-time-error`} className="text-xs text-red-500 mt-1">{timeError}</p>}
        </div>
      </div>
    </div>
  );
  const renderTokenFormContent = (formIdPrefix: string) => (
    <>
      <div>
        <TextField
          select
          size="small"
          label="Khảo sát"
          value={form.surveyId}
          onChange={(e) => setForm((current) => ({ ...current, surveyId: e.target.value }))}
          fullWidth
          slotProps={{
            inputLabel: { shrink: true },
            select: {
              displayEmpty: true,
              renderValue: (selected: unknown) => {
                const id = selected as string;
                if (!id) return <span className="text-slate-400">-- Chọn khảo sát --</span>;
                const survey = surveys.find((s) => s.id === id);
                return survey?.title ?? id;
              },
              MenuProps: {
                slotProps: { paper: { sx: { maxHeight: 300 } } },
              },
            },
          }}
        >
          <MenuItem value="" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            -- Chọn khảo sát --
          </MenuItem>
          {surveys.map((survey) => (
            <MenuItem key={survey.id} value={survey.id} sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {survey.title.length > 40 ? `${survey.title.slice(0, 40).trimEnd()}...` : survey.title}
            </MenuItem>
          ))}
        </TextField>
      </div>

      <div>
        <FieldLabel htmlFor={`${formIdPrefix}-code-prefix`} className="mb-1.5">Tiền tố mã</FieldLabel>
        <input
          id={`${formIdPrefix}-code-prefix`}
          value={form.codePrefix}
          onChange={(e) => handleFieldChange('codePrefix', e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
          placeholder="Ví dụ: QUIS, LMS, UXA"
        />
        <p className="text-xs text-slate-400 mt-1">Tùy chọn — sẽ được viết hoa tự động</p>
      </div>

      {renderDateTimeFields(
        `${formIdPrefix}-valid-from`,
        form.validFromDate,
        form.validFromTime,
        'Hiệu lực từ (ngày)',
        'Hiệu lực từ (giờ)',
        fieldErrors.validFromDate,
        fieldErrors.validFromTime,
        undefined,
        validFromTimeMin,
        undefined,
        (v) => handleFieldChange('validFromDate', v),
        (v) => handleFieldChange('validFromTime', v),
      )}
      <p className="text-xs text-slate-400 -mt-2">Để trống nếu có hiệu lực ngay khi tạo</p>

      {renderDateTimeFields(
        `${formIdPrefix}-valid-to`,
        form.validToDate,
        form.validToTime,
        'Hết hạn (ngày)',
        'Hết hạn (giờ)',
        fieldErrors.validToDate,
        fieldErrors.validToTime,
        surveyMaxDate,
        validToTimeMin,
        surveyMaxTime,
        (v) => handleFieldChange('validToDate', v),
        (v) => handleFieldChange('validToTime', v),
      )}
      {selectedSurvey?.expiresAt && (
        <p className="text-xs text-slate-400 -mt-2">
          Không vượt quá hạn khảo sát ({formatDateTime(selectedSurvey.expiresAt)}). Để trống nếu không giới hạn.
        </p>
      )}
      {!selectedSurvey?.expiresAt && (
        <p className="text-xs text-slate-400 -mt-2">Để trống nếu không giới hạn thời gian</p>
      )}

      <div>
        <FieldLabel htmlFor={`${formIdPrefix}-max-usage`} className="mb-1.5">Số lượt tối đa</FieldLabel>
        <input
          id={`${formIdPrefix}-max-usage`}
          type="number"
          min="1"
          value={form.maxUsage}
          onChange={(e) => setForm((current) => ({ ...current, maxUsage: e.target.value }))}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Để trống nếu không giới hạn"
        />
        <p className="text-xs text-slate-400 mt-1">Số lần tối đa mã này có thể được dùng</p>
      </div>

      {selectedSurvey && isSurveyExpired(selectedSurvey.expiresAt) && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          Khảo sát đã hết hạn — không thể tạo mã truy cập mới.
        </div>
      )}

      {fieldErrors.general && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {fieldErrors.general}
        </div>
      )}
    </>
  );

  // ── Main render ────────────────────────────────────────

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Mã khảo sát"
        subtitle="Quản lý token truy cập khảo sát — tạo, lọc, sao chép và xóa mã"
        actions={
          <button
            onClick={() => setShowGenerateModal(true)}
            disabled={surveys.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-200 font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Tạo mã mới
          </button>
        }
      />

      {/* Error / Notice alerts */}
      {error && (
        <div className="bg-red-50 border-2 border-red-300 text-red-800 px-4 py-3 rounded-xl text-sm flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      {notice && (
        <div className={`${notice.type === 'success' ? 'bg-emerald-50 border-2 border-emerald-300 text-emerald-800' : 'bg-red-50 border-2 border-red-300 text-red-800'} px-4 py-3 rounded-xl text-sm flex items-center gap-2 font-medium`}>
          {notice.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {notice.message}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Tổng số mã" value={summary.total} color="bg-blue-600" />
        <StatCard label="Còn hiệu lực" value={summary.active} color="bg-emerald-600" />
        <StatCard label="Đã dùng" value={summary.used} color="bg-amber-600" />
        <StatCard label="Hết hạn / Hết lượt" value={summary.expired} color="bg-rose-600" />
      </div>

      {/* Filter & Toolbar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <FieldLabel htmlFor="tokens-search" className="sr-only">Tìm kiếm mã khảo sát</FieldLabel>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="tokens-search"
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Tìm kiếm theo mã, khảo sát, người dùng..."
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <TextField
            select
            size="small"
            label="Khảo sát"
            value={selectedSurveyId}
            onChange={(e) => handleSurveyFilterChange(e.target.value)}
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
          <button
            onClick={() => void handleRefresh()}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Tokens Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Đang tải dữ liệu...</div>
        ) : filteredTokens.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
              <QrCode className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Chưa có mã khảo sát</h3>
            <p className="text-slate-500 text-sm">
              {search || selectedSurveyId
                ? 'Không tìm thấy mã nào phù hợp với bộ lọc hiện tại.'
                : 'Tạo mã khảo sát mới để bắt đầu thu thập phản hồi.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <TableHeader className="w-10 text-center">STT</TableHeader>
                  <TableHeader>Mã khảo sát</TableHeader>
                  <TableHeader>Khảo sát</TableHeader>
                  <TableHeader>Trạng thái</TableHeader>
                  <TableHeader>Lượt dùng</TableHeader>
                  <TableHeader>Hạn dùng</TableHeader>
                  <TableHeader className="text-right">Thao tác</TableHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedTokens.map((token, idx) => {
                  const status = getStatus(token);
                  const StatusIcon = status.icon;
                  const usagePercent = token.maxUsage ? Math.min((token.usageCount / token.maxUsage) * 100, 100) : 0;
                  const isExhausted = token.maxUsage !== null && token.usageCount >= token.maxUsage;
                  return (
                    <tr key={token.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-sm text-center">
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <code className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-mono font-semibold tracking-wide">
                            {token.code}
                          </code>
                          <button
                            onClick={() => void copyToClipboard(token.code)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Sao chép mã"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900">{token.surveyTitle}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${token.surveyIsPublic ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-orange-100 text-orange-800 border border-orange-300'}`}>
                            {token.surveyIsPublic ? 'Công khai' : 'Cần token'}
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {token.surveyQuestionCount} câu hỏi
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${isExhausted ? 'bg-red-600' : 'bg-blue-600'}`}
                              style={{ width: `${usagePercent}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-600 whitespace-nowrap font-medium">
                            {token.usageCount}{token.maxUsage !== null ? ` / ${token.maxUsage}` : ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {token.validTo ? (
                            <>
                              Hết hạn: {formatDateTime(token.validTo)}
                            </>
                          ) : (
                            'Không giới hạn'
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {token.validFrom
                            ? `Hiệu lực: ${formatDateTime(token.validFrom)}`
                            : `Tạo: ${formatDateTime(token.createdAt)}`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <a
                            href={`${window.location.origin}${PATHS.SURVEY_DETAIL(token.surveyId)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Mở khảo sát"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => void copyToClipboard(token.code)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Sao chép mã"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(token)}
                            disabled={deletingId === token.id}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Xóa mã"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalFiltered > PAGE_SIZE && (
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Hiển thị <span className="font-medium">{paginatedTokens.length}</span> trong{' '}
              <span className="font-medium">{totalFiltered}</span> mã · Trang {page}/{totalPages}
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
        )}
      </div>

      {/* Sidebar: Create Form (always visible on desktop) */}
      <div className="hidden xl:block">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-24">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <QrCode className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Tạo mã truy cập mới</h3>
              <p className="text-xs text-slate-500">Mã gồm 9 ký tự in hoa, có thể thêm tiền tố</p>
            </div>
          </div>

          <div className="space-y-4">{renderTokenFormContent('token-sidebar')}</div>

          <button
            onClick={() => void handleCreateToken()}
            disabled={
              creating ||
              !form.surveyId ||
              (selectedSurvey ? isSurveyExpired(selectedSurvey.expiresAt) : false)
            }
            className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {creating ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                Đang tạo...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Tạo mã khảo sát
              </>
            )}
          </button>

          {selectedSurvey && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Thông tin khảo sát</h4>
              <p className="text-sm font-medium text-slate-900">{selectedSurvey.title}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${selectedSurvey.isPublic ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-orange-100 text-orange-800 border border-orange-300'}`}>
                  {selectedSurvey.isPublic ? <ShieldCheck className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {selectedSurvey.isPublic ? 'Công khai' : 'Cần token'}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  {selectedSurveyTokensCount} mã
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${selectedSurvey.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                  {selectedSurvey.isActive ? 'Đang hoạt động' : 'Ngừng'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal for creating new token */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <QrCode className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Tạo mã khảo sát mới</h2>
                <p className="text-xs text-slate-500">Mã gồm 9 ký tự in hoa, có thể thêm tiền tố</p>
              </div>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleCreateToken();
              }}
              className="space-y-4"
            >
              {renderTokenFormContent('token-modal')}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowGenerateModal(false);
                    setNotice(null);
                  }}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={
                    creating ||
                    !form.surveyId ||
                    (selectedSurvey ? isSurveyExpired(selectedSurvey.expiresAt) : false)
                  }
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {creating ? 'Đang tạo...' : 'Tạo mã'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (() => {
        const status = getStatus(deleteTarget);
        const isStillValid = status.label === 'Còn hiệu lực' || status.label === 'Chờ kích hoạt';
        const StatusIcon = status.icon;
        const isDeleting = deletingId === deleteTarget.id;
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isStillValid ? 'bg-amber-100' : 'bg-red-100'}`}>
                  <Trash2 className={`w-5 h-5 ${isStillValid ? 'text-amber-600' : 'text-red-600'}`} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Xác nhận xóa mã khảo sát</h2>
                  <p className="text-xs text-slate-500">Hành động này không thể hoàn tác.</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">Mã:</span>
                  <code className="px-2 py-0.5 bg-white border border-slate-200 text-slate-800 rounded text-xs font-mono font-semibold">
                    {deleteTarget.code}
                  </code>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">Khảo sát:</span>
                  <span className="text-xs font-medium text-slate-700 truncate text-right">{deleteTarget.surveyTitle}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">Trạng thái:</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">Lượt dùng:</span>
                  <span className="text-xs font-medium text-slate-700">
                    {deleteTarget.usageCount}{deleteTarget.maxUsage !== null ? ` / ${deleteTarget.maxUsage}` : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">Hạn dùng:</span>
                  <span className="text-xs font-medium text-slate-700">{formatDateTime(deleteTarget.validTo)}</span>
                </div>
              </div>

              {isStillValid ? (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm flex items-start gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Mã này vẫn còn hiệu lực.</p>
                    <p className="text-xs mt-0.5">
                      Mã chưa hết hạn và chưa hết lượt dùng — người tham gia vẫn có thể sử dụng để gửi khảo sát. Bạn có chắc chắn muốn xóa?
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 text-slate-600 rounded-lg p-3 text-sm flex items-start gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-xs">Mã đã hết hạn hoặc hết lượt dùng. Xác nhận để xóa khỏi danh sách.</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmDelete()}
                  disabled={isDeleting}
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white disabled:opacity-50 transition-colors text-sm font-medium ${isStillValid ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  {isDeleting ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      Đang xóa...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      {isStillValid ? 'Vẫn xóa' : 'Xóa mã'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function TableHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider ${className}`}>
      {children}
    </th>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center shadow-sm`}>
          <span className="text-white text-lg font-bold">{value}</span>
        </div>
        <div>
          <div className="text-sm text-slate-500">{label}</div>
          <div className="text-2xl font-bold text-slate-900 mt-0.5">{value}</div>
        </div>
      </div>
    </div>
  );
}
