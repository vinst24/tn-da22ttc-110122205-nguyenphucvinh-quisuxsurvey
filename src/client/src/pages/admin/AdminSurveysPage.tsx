import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import IosShareOutlinedIcon from '@mui/icons-material/IosShareOutlined';
import LaunchOutlinedIcon from '@mui/icons-material/LaunchOutlined';
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import SortOutlinedIcon from '@mui/icons-material/SortOutlined';
import ZoomInOutlinedIcon from '@mui/icons-material/ZoomInOutlined';
import type { AlertColor } from '@mui/material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { PATHS } from '../../constants/paths';
import { useNow } from '../../hooks/useNow';
import type { SurveySortField } from '../../services/survey.service';
import { surveyService } from '../../services/survey.service';
import { extractApiErrorMessage } from '../../types/api';
import type { SurveyDetailDto, SurveyListItemDto, SurveyTokenDto } from '../../types/survey';

type SurveyFormState = {
  title: string;
  description: string;
  isActive: boolean;
  isPublic: boolean;
  expiresAtDate: string;
  expiresAtTime: string;
};

type TokenFormState = {
  codePrefix: string;
  validFromDate: string;
  validFromTime: string;
  validToDate: string;
  validToTime: string;
  maxUsage: string;
};

type FieldErrors = Record<string, string>;

type StatusFilter = 'all' | 'active' | 'blocked';
type AccessFilter = 'all' | 'public' | 'token';
type SortDir = 'asc' | 'desc';
type DetailTab = 'info' | 'link' | 'tokens';

const PAGE_SIZE = 10;
const DEFAULT_SORT_BY: SurveySortField = 'createdAt';
const DEFAULT_SORT_DIR: SortDir = 'desc';
const isDefaultSort = (by: SurveySortField, dir: SortDir) =>
  by === DEFAULT_SORT_BY && dir === DEFAULT_SORT_DIR;

const emptySurveyForm = (): SurveyFormState => ({
  title: '',
  description: '',
  isActive: true,
  isPublic: false,
  expiresAtDate: '',
  expiresAtTime: '',
});

const emptyTokenForm = (): TokenFormState => ({
  codePrefix: '',
  validFromDate: '',
  validFromTime: '',
  validToDate: '',
  validToTime: '',
  maxUsage: '',
});

const emptyFieldErrors = (): FieldErrors => ({});

/** Combine date (YYYY-MM-DD) + time (HH:mm) → ISO string, or null if either is empty */
const combineToISO = (date: string, time: string): string | null => {
  if (!date || !time) return null;
  return new Date(`${date}T${time}:00`).toISOString();
};

/** Format ISO string → YYYY-MM-DD */
const toDateInput = (value?: string | null) => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

/** Format ISO string → HH:mm */
const toTimeInput = (value?: string | null) => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(11, 16);
};

const ONE_HOUR_MS = 60 * 60 * 1000;

const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString('vi-VN') : '—');

const isSurveyExpired = (expiresAt?: string | Date | null) => {
  if (!expiresAt) return false;
  const time = expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime();
  return Number.isFinite(time) && time < Date.now();
};

const getQrUrl = (value: string, size = 300) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;

const statusBadge = (survey: SurveyListItemDto | SurveyDetailDto) => {
  if (!survey.isActive) return { label: 'Đã chặn', color: 'default' as const };
  return { label: 'Đang hoạt động', color: 'success' as const };
};

const accessBadge = (survey: SurveyListItemDto | SurveyDetailDto) =>
  survey.isPublic
    ? { label: 'Công khai', color: 'info' as const }
    : { label: 'Cần token', color: 'warning' as const };

export const AdminSurveysPage = () => {
  const [surveys, setSurveys] = useState<SurveyListItemDto[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState('');
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyDetailDto | null>(null);
  const [tokens, setTokens] = useState<SurveyTokenDto[]>([]);
  const [loadingSurveys, setLoadingSurveys] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [creatingToken, setCreatingToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ severity: AlertColor; message: string } | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [accessFilter, setAccessFilter] = useState<AccessFilter>('all');
  const [applied, setApplied] = useState<{ q: string; status: StatusFilter; access: AccessFilter }>({
    q: '',
    status: 'all',
    access: 'all',
  });

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<SurveySortField>(DEFAULT_SORT_BY);
  const [sortDir, setSortDir] = useState<SortDir>(DEFAULT_SORT_DIR);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<SurveyFormState>(emptySurveyForm());

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [qrPreviewOpen, setQrPreviewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>('info');
  const [editForm, setEditForm] = useState<SurveyFormState>(emptySurveyForm());

  const [tokenForm, setTokenForm] = useState<TokenFormState>(emptyTokenForm());
  const [lastCreatedTokens, setLastCreatedTokens] = useState<string[]>([]);

  const [surveyFieldErrors, setSurveyFieldErrors] = useState<FieldErrors>(emptyFieldErrors());
  const [tokenFieldErrors, setTokenFieldErrors] = useState<FieldErrors>(emptyFieldErrors());

  const now = useNow(1000);
  const todayStr = new Date(now).toISOString().slice(0, 10);
  const nowTimeStr = new Date(now).toISOString().slice(11, 16);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
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

    if (windowStart > 2) {
      pages.push('ellipsis_start');
    }

    for (let i = windowStart; i <= windowEnd; i++) {
      pages.push(i);
    }

    if (windowEnd < totalPages - 1) {
      pages.push('ellipsis_end');
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  }, [page, totalPages]);

  const loadSurveys = useCallback(async () => {
    setLoadingSurveys(true);
    setError(null);
    try {
      const useSort = !isDefaultSort(sortBy, sortDir);
      const res = await surveyService.list({
        page,
        pageSize: PAGE_SIZE,
        q: applied.q || undefined,
        status: applied.status === 'all' ? undefined : applied.status,
        access: applied.access === 'all' ? undefined : applied.access,
        sortBy: useSort ? sortBy : undefined,
        sortDir: useSort ? sortDir : undefined,
      });
      setSurveys(res.items);
      setTotal(Number(res.meta?.total ?? 0));
    } catch (e) {
      setSurveys([]);
      setTotal(0);
      setError(extractApiErrorMessage(e, 'Không tải được danh sách khảo sát'));
    } finally {
      setLoadingSurveys(false);
    }
  }, [page, applied, sortBy, sortDir]);

  const loadDetail = async (id: string) => {
    if (!id) {
      setSelectedSurvey(null);
      setTokens([]);
      return;
    }
    setLoadingDetail(true);
    setError(null);
    try {
      const [detail, tokenItems] = await Promise.all([surveyService.getByIdAdmin(id), surveyService.listTokens(id)]);
      setSelectedSurvey(detail);
      setTokens(tokenItems);
      setEditForm({
        title: detail.title,
        description: detail.description ?? '',
        isActive: detail.isActive,
        isPublic: detail.isPublic,
        expiresAtDate: toDateInput(detail.expiresAt ?? null),
        expiresAtTime: toTimeInput(detail.expiresAt ?? null),
      });
      setTokenForm(emptyTokenForm());
      setLastCreatedTokens([]);
    } catch (e) {
      setSelectedSurvey(null);
      setTokens([]);
      setError(extractApiErrorMessage(e, 'Không tải được chi tiết khảo sát'));
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setApplied({ q: searchTerm.trim(), status: statusFilter, access: accessFilter });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter, accessFilter]);

  useEffect(() => {
    void loadSurveys();
  }, [loadSurveys]);

  useEffect(() => {
    void loadDetail(selectedSurveyId);
  }, [selectedSurveyId]);

  const openDetail = (id: string) => {
    setSelectedSurveyId(id);
    setActiveTab('info');
    setDrawerOpen(true);
  };

  const closeDetail = () => {
    setDrawerOpen(false);
  };

  const refreshAfterChange = async () => {
    await loadSurveys();
    if (selectedSurveyId) await loadDetail(selectedSurveyId);
  };

  // ── Validation helpers ─────────────────────────────────

  const validateSurveyDateTime = (date: string, time: string): FieldErrors => {
    const errs: FieldErrors = {};
    if (date) {
      if (date < todayStr) {
        errs.date = 'Ngày hết hạn không được trong quá khứ';
      } else if (date === todayStr && time && time <= nowTimeStr) {
        errs.time = 'Giờ hết hạn phải ở tương lai';
      }
    }
    return errs;
  };

  const validateTokenDateTime = (f: TokenFormState): FieldErrors => {
    const errs: FieldErrors = {};

    if (f.validFromDate) {
      if (f.validFromDate < todayStr) {
        errs.validFromDate = 'Ngày hiệu lực không được trong quá khứ';
      } else if (f.validFromDate === todayStr && f.validFromTime && f.validFromTime <= nowTimeStr) {
        errs.validFromTime = 'Giờ hiệu lực phải ở tương lai';
      }
    }

    if (f.validToDate) {
      if (f.validToDate < todayStr) {
        errs.validToDate = 'Ngày hết hạn không được trong quá khứ';
      } else if (f.validToDate === todayStr && f.validToTime && f.validToTime <= nowTimeStr) {
        errs.validToTime = 'Giờ hết hạn phải ở tương lai';
      }

      if (f.validFromDate && f.validFromTime && f.validToDate && f.validToTime) {
        const fromMs = new Date(`${f.validFromDate}T${f.validFromTime}:00`).getTime();
        const toMs = new Date(`${f.validToDate}T${f.validToTime}:00`).getTime();
        if (toMs - fromMs < 3600000) {
          errs.validToTime = 'Hết hạn phải cách hiệu lực từ ít nhất 1 giờ';
        }
      }

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

    if (f.maxUsage.trim()) {
      const maxUsage = Number(f.maxUsage);
      if (!Number.isInteger(maxUsage) || maxUsage < 1 || maxUsage > 1000) {
        errs.maxUsage = 'Số lượt sử dụng tối đa phải từ 1 đến 1000';
      }
    }

    return errs;
  };

  // ── Handlers ───────────────────────────────────────────

  const handleCreateSurvey = async () => {
    const trimmedTitle = createForm.title.trim();
    if (!trimmedTitle) return;
    if (trimmedTitle.length > 200) {
      setError('Tiêu đề tối đa 200 ký tự.');
      return;
    }
    if (createForm.description.trim().length > 2000) {
      setError('Mô tả tối đa 2000 ký tự.');
      return;
    }
    let expiresAt: string | undefined;
    if (createForm.expiresAtDate) {
      const iso = combineToISO(createForm.expiresAtDate, createForm.expiresAtTime);
      if (!iso) {
        setError('Hạn khảo sát không hợp lệ.');
        return;
      }
      if (new Date(iso).getTime() <= Date.now() + ONE_HOUR_MS) {
        setError('Hạn khảo sát phải cách hiện tại ít nhất 1 giờ.');
        return;
      }
      expiresAt = iso;
    }
    setCreating(true);
    setError(null);
    setNotice(null);
    try {
      const created = await surveyService.create({
        title: createForm.title.trim(),
        description: createForm.description.trim() || undefined,
        isActive: createForm.isActive,
        isPublic: createForm.isPublic,
        expiresAt,
      });
      setCreateForm(emptySurveyForm());
      setCreateOpen(false);
      setNotice({
        severity: 'success',
        message:
          created.title !== trimmedTitle
            ? `\u0110\u00e3 t\u1ea1o kh\u1ea3o s\u00e1t m\u1edbi. Ti\u00eau \u0111\u1ec1 \u0111\u01b0\u1ee3c t\u1ef1 \u0111\u1ed9ng \u0111i\u1ec1u ch\u1ec9nh th\u00e0nh "${created.title}".`
            : '\u0110\u00e3 t\u1ea1o kh\u1ea3o s\u00e1t m\u1edbi.',
      });
      setSearchTerm('');
      setStatusFilter('all');
      setAccessFilter('all');
      setSortBy(DEFAULT_SORT_BY);
      setSortDir(DEFAULT_SORT_DIR);
      setPage(1);
      setApplied({ q: '', status: 'all', access: 'all' });
      openDetail(String(created.id));
    } catch (e) {
      const message = extractApiErrorMessage(e, '\u0054\u1ea1o kh\u1ea3o s\u00e1t th\u1ea5t b\u1ea1i');
      setError(message);
      setSurveyFieldErrors((prev) => ({ ...prev, createTitle: message }));
    } finally {
      setCreating(false);
    }
  };

  const handleSaveSurvey = async () => {
    if (!selectedSurveyId) return;
    const trimmedTitle = editForm.title.trim();
    if (!trimmedTitle) return;
    if (trimmedTitle.length > 200) {
      setError('Tiêu đề tối đa 200 ký tự.');
      return;
    }
    if (editForm.description.trim().length > 2000) {
      setError('Mô tả tối đa 2000 ký tự.');
      return;
    }
    let expiresAt: string | undefined;
    if (editForm.expiresAtDate) {
      const iso = combineToISO(editForm.expiresAtDate, editForm.expiresAtTime);
      if (!iso) {
        setError('Hạn khảo sát không hợp lệ.');
        return;
      }
      if (new Date(iso).getTime() <= Date.now()) {
        setError('Hạn khảo sát phải ở tương lai.');
        return;
      }
      expiresAt = iso;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await surveyService.update(selectedSurveyId, {
        title: editForm.title.trim(),
        description: editForm.description.trim() || undefined,
        isActive: editForm.isActive,
        isPublic: editForm.isPublic,
        expiresAt,
      });
      setNotice({
        severity: 'success',
        message:
          updated.title !== trimmedTitle
            ? `\u0110\u00e3 l\u01b0u thay \u0111\u1ed5i kh\u1ea3o s\u00e1t. Ti\u00eau \u0111\u1ec1 \u0111\u01b0\u1ee3c t\u1ef1 \u0111\u1ed9ng \u0111i\u1ec1u ch\u1ec9nh th\u00e0nh "${updated.title}".`
            : '\u0110\u00e3 l\u01b0u thay \u0111\u1ed5i kh\u1ea3o s\u00e1t.',
      });
    } catch (e) {
      const message = extractApiErrorMessage(e, '\u004c\u01b0u kh\u1ea3o s\u00e1t th\u1ea5t b\u1ea1i');
      setError(message);
      setSurveyFieldErrors((prev) => ({ ...prev, editTitle: message }));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBlock = async (survey: SurveyListItemDto | SurveyDetailDto) => {
    const willBlock = survey.isActive;
    const action = willBlock ? 'Chặn' : 'Bỏ chặn';
    if (!window.confirm(`${action} khảo sát "${survey.title}"?`)) return;
    setError(null);
    setNotice(null);
    try {
      await surveyService.update(survey.id, { isActive: !survey.isActive });
      setNotice({ severity: 'success', message: willBlock ? 'Đã chặn khảo sát.' : 'Đã bỏ chặn khảo sát.' });
      await refreshAfterChange();
    } catch (e) {
      setError(extractApiErrorMessage(e, `${action} khảo sát thất bại`));
    }
  };

  const handleCreateToken = async () => {
    if (!selectedSurveyId) return;
    if (selectedSurvey && isSurveyExpired(selectedSurvey.expiresAt)) {
      setError('Khảo sát đã hết hạn, không thể tạo mã mới.');
      return;
    }

    const errs = validateTokenDateTime(tokenForm);
    setTokenFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const validFromIso = combineToISO(tokenForm.validFromDate, tokenForm.validFromTime);
    const validToIso = combineToISO(tokenForm.validToDate, tokenForm.validToTime);
    const maxUsage = tokenForm.maxUsage.trim() ? Number(tokenForm.maxUsage) : undefined;

    setCreatingToken(true);
    setError(null);
    setNotice(null);
    setTokenFieldErrors(emptyFieldErrors());
    try {
      const result = await surveyService.createToken(selectedSurveyId, {
        validFrom: validFromIso ?? undefined,
        expiresAt: validToIso ?? undefined,
        codePrefix: tokenForm.codePrefix.trim() || undefined,
        maxUsage,
      });
      setLastCreatedTokens((result.tokens?.map((item) => item.token) ?? [result.token]).filter(Boolean));
      setTokenForm(emptyTokenForm());
      setNotice({
        severity: 'success',
        message: 'Đã tạo mã truy cập mới.',
      });
      await loadDetail(selectedSurveyId);
    } catch (e) {
      setError(extractApiErrorMessage(e, 'Tạo mã khảo sát thất bại'));
    } finally {
      setCreatingToken(false);
    }
  };

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice({ severity: 'success', message: 'Đã sao chép vào clipboard.' });
    } catch {
      setError('Không thể sao chép, vui lòng thử lại.');
    }
  };
  const handleDownloadQr = async () => {
    if (!takeSurveyLink) return;
    try {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.src = getQrUrl(takeSurveyLink, 500);
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('QR load failed'));
      });

      const canvas = document.createElement('canvas');
      canvas.width = 500;
      canvas.height = 500;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas is not available');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('QR export failed');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qr-survey-${selectedSurvey?.slug ?? (selectedSurveyId || 'link')}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setNotice({ severity: 'success', message: 'Đã tải xuống mã QR.' });
    } catch {
      setError('Không thể tải xuống mã QR, vui lòng thử lại.');
    }
  };

  const handleShareSurvey = async () => {
    if (!takeSurveyLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: selectedSurvey?.title ?? 'Khảo sát QUIS',
          text: 'Mời bạn tham gia khảo sát QUIS.',
          url: takeSurveyLink,
        });
        return;
      } catch {
        return;
      }
    }
    await handleCopy(takeSurveyLink);
    setNotice({ severity: 'info', message: 'Trình duyệt chưa hỗ trợ chia sẻ, đã sao chép link khảo sát.' });
  };

  const handleSortClick = (field: SurveySortField) => {
    setPage(1);
    if (sortBy !== field) {
      setSortBy(field);
      setSortDir('asc');
      return;
    }
    if (sortDir === 'asc') {
      setSortDir('desc');
      return;
    }
    // Third click on the same column → clear sort (back to default)
    setSortBy(DEFAULT_SORT_BY);
    setSortDir(DEFAULT_SORT_DIR);
  };

  const handleClearSort = () => {
    setPage(1);
    setSortBy(DEFAULT_SORT_BY);
    setSortDir(DEFAULT_SORT_DIR);
  };

  const sortActive = !isDefaultSort(sortBy, sortDir);

  const slug = selectedSurvey?.slug ?? selectedSurveyId;
  const takeSurveyLink = slug ? `${window.location.origin}${PATHS.TAKE_SURVEY(slug)}` : '';
  const surveyDetailLink = slug ? `${window.location.origin}${PATHS.SURVEY_DETAIL(slug)}` : '';
  const qrCodeLink = takeSurveyLink ? getQrUrl(takeSurveyLink) : '';

  // ── Derived min/max ────────────────────────────────────

  const createTimeMin = createForm.expiresAtDate === todayStr ? nowTimeStr : undefined;
  const editTimeMin = editForm.expiresAtDate === todayStr ? nowTimeStr : undefined;

  const surveyMaxDate = selectedSurvey?.expiresAt ? new Date(selectedSurvey.expiresAt).toISOString().slice(0, 10) : undefined;
  const surveyMaxTime =
    selectedSurvey?.expiresAt && tokenForm.validToDate === surveyMaxDate
      ? new Date(selectedSurvey.expiresAt).toISOString().slice(11, 16)
      : undefined;

  const tokenValidFromTimeMin = tokenForm.validFromDate === todayStr ? nowTimeStr : undefined;
  const tokenValidToTimeMin = tokenForm.validToDate === todayStr ? nowTimeStr : undefined;

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        title="Quản lý khảo sát"
        subtitle="Xem nhanh trạng thái khảo sát, mở chi tiết để chỉnh sửa, quản lý liên kết và mã truy cập."
        actions={
          <>
            <Button
              variant="outlined"
              startIcon={<RefreshOutlinedIcon />}
              onClick={() => void loadSurveys()}
              disabled={loadingSurveys}
            >
              Làm mới
            </Button>
            <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={() => setCreateOpen(true)}>
              Tạo khảo sát
            </Button>
          </>
        }
      />

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
      {notice && <Alert severity={notice.severity} onClose={() => setNotice(null)}>{notice.message}</Alert>}

      <Card sx={{ borderRadius: 4 }}>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
              <TextField
                placeholder="Tìm theo tiêu đề, mô tả..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                fullWidth
                size="small"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchOutlinedIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                select
                label="Trạng thái"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                size="small"
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="all">Tất cả</MenuItem>
                <MenuItem value="active">Đang hoạt động</MenuItem>
                <MenuItem value="blocked">Đã chặn</MenuItem>
              </TextField>
              <TextField
                select
                label="Truy cập"
                value={accessFilter}
                onChange={(e) => setAccessFilter(e.target.value as AccessFilter)}
                size="small"
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="all">Tất cả</MenuItem>
                <MenuItem value="public">Công khai</MenuItem>
                <MenuItem value="token">Cần token</MenuItem>
              </TextField>
              {sortActive && (
                <Chip
                  icon={<SortOutlinedIcon />}
                  label="Bỏ sắp xếp"
                  onDelete={handleClearSort}
                  onClick={handleClearSort}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              )}
            </Stack>

            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: 60 }}>STT</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} sortDirection={sortBy === 'title' ? sortDir : false}>
                      <TableSortLabel
                        active={sortBy === 'title'}
                        direction={sortBy === 'title' ? sortDir : 'asc'}
                        onClick={() => handleSortClick('title')}
                      >
                        Tên khảo sát
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }} sortDirection={sortBy === 'isActive' ? sortDir : false}>
                      <TableSortLabel
                        active={sortBy === 'isActive'}
                        direction={sortBy === 'isActive' ? sortDir : 'asc'}
                        onClick={() => handleSortClick('isActive')}
                      >
                        Trạng thái
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Truy cập</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right" sortDirection={sortBy === 'responses' ? sortDir : false}>
                      <TableSortLabel
                        active={sortBy === 'responses'}
                        direction={sortBy === 'responses' ? sortDir : 'asc'}
                        onClick={() => handleSortClick('responses')}
                      >
                        Phản hồi
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }} sortDirection={sortBy === 'expiresAt' ? sortDir : false}>
                      <TableSortLabel
                        active={sortBy === 'expiresAt'}
                        direction={sortBy === 'expiresAt' ? sortDir : 'asc'}
                        onClick={() => handleSortClick('expiresAt')}
                      >
                        Hết hạn
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Thao tác</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingSurveys ? (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
                        Đang tải danh sách khảo sát...
                      </TableCell>
                    </TableRow>
                  ) : surveys.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
                        {total === 0 && !applied.q && applied.status === 'all' && applied.access === 'all'
                          ? 'Chưa có khảo sát nào. Bấm "Tạo khảo sát" để bắt đầu.'
                          : 'Không có khảo sát khớp bộ lọc.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    surveys.map((survey, idx) => {
                      const status = statusBadge(survey);
                      const access = accessBadge(survey);
                      return (
                        <TableRow
                          key={survey.id}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => openDetail(survey.id)}
                        >
                          <TableCell sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                            {(page - 1) * PAGE_SIZE + idx + 1}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {survey.title}
                            </Typography>
                            {survey.description && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 360 }} noWrap>
                                {survey.description}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip size="small" label={status.label} color={status.color} />
                          </TableCell>
                          <TableCell>
                            <Chip size="small" label={access.label} color={access.color} variant="outlined" />
                          </TableCell>
                          <TableCell align="right">{survey._count?.responses ?? 0}</TableCell>
                          <TableCell>
                            <Typography variant="caption">{formatDateTime(survey.expiresAt)}</Typography>
                          </TableCell>
                          <TableCell align="right" onClick={(e) => e.stopPropagation()} sx={{ minWidth: 112 }}>
                            <Stack direction="row" spacing={0.75} sx={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                              <Tooltip title={survey.isActive ? 'Chặn khảo sát' : 'Bỏ chặn khảo sát'}>
                                <IconButton
                                  size="medium"
                                  color={survey.isActive ? 'warning' : 'success'}
                                  onClick={() => void handleToggleBlock(survey)}
                                  sx={{ width: 38, height: 38 }}
                                  aria-label={survey.isActive ? 'Chặn khảo sát' : 'Bỏ chặn khảo sát'}
                                >
                                  {survey.isActive ? <BlockOutlinedIcon fontSize="small" /> : <CheckCircleOutlineOutlinedIcon fontSize="small" />}
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Xem chi tiết">
                                <IconButton
                                  size="medium"
                                  color="primary"
                                  onClick={() => openDetail(survey.id)}
                                  sx={{ width: 38, height: 38 }}
                                  aria-label="Xem chi tiết khảo sát"
                                >
                                  <LaunchOutlinedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Box>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', pt: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                Hiển thị <strong>{surveys.length}</strong> trong <strong>{total}</strong> khảo sát · Trang {page}/{totalPages}
              </Typography>
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1 || loadingSurveys}
                  sx={{ minWidth: 40 }}
                >
                  ← Trước
                </Button>
                {visiblePages.map((item) => {
                  if (item === 'ellipsis_start' || item === 'ellipsis_end') {
                    return (
                      <Typography key={item} variant="body2" sx={{ color: 'text.disabled', px: 0.5 }}>
                        ...
                      </Typography>
                    );
                  }
                  return (
                    <Button
                      key={item}
                      size="small"
                      variant={item === page ? 'contained' : 'outlined'}
                      disableElevation
                      onClick={() => setPage(item)}
                      disabled={loadingSurveys}
                      sx={{ minWidth: 40 }}
                    >
                      {item}
                    </Button>
                  );
                })}
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages || loadingSurveys}
                  sx={{ minWidth: 40 }}
                >
                  Tiếp →
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Tạo khảo sát mới</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.25} sx={{ pt: 1 }}>
            <TextField
              label="Tiêu đề"
              value={createForm.title}
              onChange={(e) => {
                setSurveyFieldErrors((prev) => ({ ...prev, createTitle: '' }));
                setCreateForm((current) => ({ ...current, title: e.target.value }));
              }}
              fullWidth
              autoFocus
              slotProps={{ htmlInput: { maxLength: 200 } }}
              error={!!surveyFieldErrors.createTitle}
              helperText={surveyFieldErrors.createTitle || '\u0054\u1ed1i \u0111a 200 k\u00fd t\u1ef1'}
            />
            <TextField
              label="Mô tả"
              value={createForm.description}
              onChange={(e) => setCreateForm((current) => ({ ...current, description: e.target.value }))}
              fullWidth
              multiline
              minRows={3}
              slotProps={{ htmlInput: { maxLength: 2000 } }}
              helperText="Tối đa 2000 ký tự"
            />
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Hạn khảo sát (không bắt buộc)
              </Typography>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Ngày hết hạn"
                  type="date"
                  value={createForm.expiresAtDate}
                  onChange={(e) => {
                    const v = e.target.value;
                    const errs = validateSurveyDateTime(v, createForm.expiresAtTime);
                    setSurveyFieldErrors((prev) => ({ ...prev, createDate: errs.date ?? '' }));
                    setCreateForm((current) => ({ ...current, expiresAtDate: v }));
                  }}
                  slotProps={{
                    inputLabel: { shrink: true },
                    htmlInput: { min: todayStr },
                  }}
                  size="small"
                  fullWidth
                  error={!!surveyFieldErrors.createDate}
                  helperText={surveyFieldErrors.createDate || undefined}
                />
                <TextField
                  label="Giờ hết hạn"
                  type="time"
                  value={createForm.expiresAtTime}
                  onChange={(e) => {
                    const v = e.target.value;
                    const errs = createForm.expiresAtDate ? validateSurveyDateTime(createForm.expiresAtDate, v) : {};
                    setSurveyFieldErrors((prev) => ({ ...prev, createTime: errs.time ?? '' }));
                    setCreateForm((current) => ({ ...current, expiresAtTime: v }));
                  }}
                  slotProps={{
                    inputLabel: { shrink: true },
                    htmlInput: { min: createTimeMin },
                  }}
                  size="small"
                  fullWidth
                  error={!!surveyFieldErrors.createTime}
                  helperText={surveyFieldErrors.createTime || 'Phải cách hiện tại ít nhất 1 giờ'}
                />
              </Stack>
              {!createForm.expiresAtDate && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Để trống nếu không hết hạn
                </Typography>
              )}
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={createForm.isActive}
                    onChange={(_e, checked) => setCreateForm((current) => ({ ...current, isActive: checked }))}
                  />
                }
                label="Đang hoạt động"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={createForm.isPublic}
                    onChange={(_e, checked) => setCreateForm((current) => ({ ...current, isPublic: checked }))}
                  />
                }
                label="Công khai, không cần token"
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            startIcon={<AddOutlinedIcon />}
            onClick={() => void handleCreateSurvey()}
            disabled={creating || !createForm.title.trim()}
          >
            {creating ? 'Đang tạo...' : 'Tạo khảo sát'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={closeDetail}
        slotProps={{ paper: { sx: { width: { xs: '100%', sm: 640 } } } }}
      >
        {!selectedSurvey || loadingDetail ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">{loadingDetail ? 'Đang tải chi tiết...' : 'Không có dữ liệu'}</Typography>
          </Box>
        ) : (
          <Stack sx={{ height: '100%' }}>
            <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }} noWrap>
                    {selectedSurvey.title}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                    <Chip size="small" label={statusBadge(selectedSurvey).label} color={statusBadge(selectedSurvey).color} />
                    <Chip size="small" label={accessBadge(selectedSurvey).label} color={accessBadge(selectedSurvey).color} variant="outlined" />
                  </Stack>
                </Box>
                <IconButton onClick={closeDetail} size="small">
                  <CloseOutlinedIcon />
                </IconButton>
              </Stack>
            </Box>

            <Tabs
              value={activeTab}
              onChange={(_e, value) => setActiveTab(value as DetailTab)}
              variant="fullWidth"
              sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 1, bgcolor: 'grey.50' }}
            >
              <Tab value="info" label="Thông tin" />
              <Tab value="link" label="Link & QR" />
              <Tab value="tokens" label={`Mã truy cập (${tokens.length})`} />
            </Tabs>

            <Box sx={{ p: 3, overflowY: 'auto', flex: 1 }}>
              {activeTab === 'info' && (
                <Stack spacing={2.5}>
                  <TextField
                    label="Tiêu đề"
                    value={editForm.title}
                    onChange={(e) => {
                      setSurveyFieldErrors((prev) => ({ ...prev, editTitle: '' }));
                      setEditForm((current) => ({ ...current, title: e.target.value }));
                    }}
                    fullWidth
                    slotProps={{ htmlInput: { maxLength: 200 } }}
                    error={!!surveyFieldErrors.editTitle}
                    helperText={surveyFieldErrors.editTitle || '\u0054\u1ed1i \u0111a 200 k\u00fd t\u1ef1'}
                  />
                  <TextField
                    label="Mô tả"
                    value={editForm.description}
                    onChange={(e) => setEditForm((current) => ({ ...current, description: e.target.value }))}
                    multiline
                    minRows={3}
                    fullWidth
                    slotProps={{ htmlInput: { maxLength: 2000 } }}
                    helperText="Tối đa 2000 ký tự"
                  />
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Hạn khảo sát (không bắt buộc)
                    </Typography>
                    <Stack direction="row" spacing={2}>
                      <TextField
                        label="Ngày hết hạn"
                        type="date"
                        value={editForm.expiresAtDate}
                        onChange={(e) => {
                          const v = e.target.value;
                          const errs = v ? validateSurveyDateTime(v, editForm.expiresAtTime) : {};
                          setSurveyFieldErrors((prev) => ({ ...prev, editDate: errs.date ?? '' }));
                          setEditForm((current) => ({ ...current, expiresAtDate: v }));
                        }}
                        slotProps={{
                          inputLabel: { shrink: true },
                          htmlInput: { min: todayStr },
                        }}
                        size="small"
                        fullWidth
                        error={!!surveyFieldErrors.editDate}
                        helperText={surveyFieldErrors.editDate || undefined}
                      />
                      <TextField
                        label="Giờ hết hạn"
                        type="time"
                        value={editForm.expiresAtTime}
                        onChange={(e) => {
                          const v = e.target.value;
                          const errs = editForm.expiresAtDate ? validateSurveyDateTime(editForm.expiresAtDate, v) : {};
                          setSurveyFieldErrors((prev) => ({ ...prev, editTime: errs.time ?? '' }));
                          setEditForm((current) => ({ ...current, expiresAtTime: v }));
                        }}
                        slotProps={{
                          inputLabel: { shrink: true },
                          htmlInput: { min: editTimeMin },
                        }}
                        size="small"
                        fullWidth
                        error={!!surveyFieldErrors.editTime}
                        helperText={surveyFieldErrors.editTime || 'Phải ở tương lai'}
                      />
                    </Stack>
                    {!editForm.expiresAtDate && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        Để trống nếu không hết hạn
                      </Typography>
                    )}
                  </Box>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={editForm.isActive}
                          onChange={(_e, checked) => setEditForm((current) => ({ ...current, isActive: checked }))}
                        />
                      }
                      label="Đang hoạt động"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={editForm.isPublic}
                          onChange={(_e, checked) => setEditForm((current) => ({ ...current, isPublic: checked }))}
                        />
                      }
                      label="Công khai, không cần token"
                    />
                  </Stack>

                  <Divider />

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <Button
                      variant="contained"
                      startIcon={<SaveOutlinedIcon />}
                      onClick={() => void handleSaveSurvey()}
                      disabled={saving || !editForm.title.trim()}
                    >
                      {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </Button>
                    <Button
                      variant="outlined"
                      color={selectedSurvey.isActive ? 'warning' : 'success'}
                      startIcon={selectedSurvey.isActive ? <BlockOutlinedIcon /> : <CheckCircleOutlineOutlinedIcon />}
                      onClick={() => void handleToggleBlock(selectedSurvey)}
                    >
                      {selectedSurvey.isActive ? 'Chặn khảo sát' : 'Bỏ chặn'}
                    </Button>
                  </Stack>

                  <Typography variant="caption" color="text.secondary">
                    Mã khảo sát: #{selectedSurvey.id} · {selectedSurvey.categories.length} mục ·{' '}
                    {selectedSurvey.categories.reduce((sum, c) => sum + c.questions.length, 0)} câu hỏi
                  </Typography>
                </Stack>
              )}

              {activeTab === 'link' && (
                <Stack spacing={2.5}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', md: 'minmax(280px, 320px) 1fr' },
                      gap: 2,
                      alignItems: 'stretch',
                    }}
                  >
                    <Box
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 3,
                        bgcolor: 'grey.50',
                        p: 2,
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <Box
                        sx={{
                          width: { xs: '100%', sm: 300 },
                          maxWidth: 300,
                          aspectRatio: '1 / 1',
                          overflow: 'hidden',
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 2,
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: 'common.white',
                        }}
                      >
                        {qrCodeLink ? (
                          <img src={qrCodeLink} alt="QR khảo sát" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Chưa có QR
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 3,
                        p: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: 1.5,
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                          Thao tác với QR
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Dùng QR này để chia sẻ nhanh đường dẫn làm khảo sát cho người tham gia.
                        </Typography>
                      </Box>
                      <Button
                        variant="outlined"
                        startIcon={<ZoomInOutlinedIcon />}
                        onClick={() => setQrPreviewOpen(true)}
                        disabled={!qrCodeLink}
                        fullWidth
                      >
                        Phóng to QR
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<FileDownloadOutlinedIcon />}
                        onClick={() => void handleDownloadQr()}
                        disabled={!qrCodeLink}
                        fullWidth
                      >
                        Tải xuống QR
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={<IosShareOutlinedIcon />}
                        onClick={() => void handleShareSurvey()}
                        disabled={!takeSurveyLink}
                        fullWidth
                      >
                        Chia sẻ
                      </Button>
                    </Box>
                  </Box>
                  <TextField
                    label="Link làm khảo sát"
                    value={takeSurveyLink}
                    slotProps={{
                      input: {
                        readOnly: true,
                        endAdornment: (
                          <Tooltip title="Sao chép">
                            <IconButton onClick={() => void handleCopy(takeSurveyLink)} edge="end">
                              <ContentCopyOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ),
                      },
                    }}
                    fullWidth
                  />
                  <TextField
                    label="Link xem chi tiết"
                    value={surveyDetailLink}
                    slotProps={{
                      input: {
                        readOnly: true,
                        endAdornment: (
                          <Tooltip title="Sao chép">
                            <IconButton onClick={() => void handleCopy(surveyDetailLink)} edge="end">
                              <ContentCopyOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ),
                      },
                    }}
                    fullWidth
                  />
                  <Button
                    variant="outlined"
                    startIcon={<LaunchOutlinedIcon />}
                    component="a"
                    href={takeSurveyLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Mở bài khảo sát
                  </Button>
                </Stack>
              )}

              {activeTab === 'tokens' && (
                <Stack spacing={2.5}>
                  <Box
                    sx={{
                      display: 'grid',
                      gap: 2,
                      gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                    }}
                  >
                    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, p: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
                        Thông tin mã
                      </Typography>
                      <Stack spacing={1.5}>
                        <TextField
                          label="Tiền tố mã"
                          value={tokenForm.codePrefix}
                          onChange={(e) => setTokenForm((current) => ({ ...current, codePrefix: e.target.value }))}
                          helperText="Ví dụ: QUIS, LMS, UXA"
                          size="small"
                          fullWidth
                        />
                        <TextField
                          label="Số lượt tối đa"
                          type="number"
                          value={tokenForm.maxUsage}
                          onChange={(e) => {
                            const v = e.target.value;
                            setTokenForm((current) => ({ ...current, maxUsage: v }));
                            setTokenFieldErrors((current) => ({ ...current, maxUsage: '' }));
                          }}
                          slotProps={{ htmlInput: { min: 1, max: 1000 } }}
                          size="small"
                          fullWidth
                          error={!!tokenFieldErrors.maxUsage}
                          helperText={tokenFieldErrors.maxUsage || 'Số lần tối đa mã này có thể được dùng'}
                        />
                      </Stack>
                    </Box>

                    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, p: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
                        Thời gian hiệu lực
                      </Typography>
                      <Stack spacing={1.5}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                          <TextField
                            label="Hiệu lực từ ngày"
                            type="date"
                            value={tokenForm.validFromDate}
                            onChange={(e) => {
                              const v = e.target.value;
                              setTokenForm((current) => ({ ...current, validFromDate: v }));
                              const errs = validateTokenDateTime({ ...tokenForm, validFromDate: v });
                              setTokenFieldErrors(errs);
                            }}
                            slotProps={{
                              inputLabel: { shrink: true },
                              htmlInput: { min: todayStr },
                            }}
                            size="small"
                            fullWidth
                            error={!!tokenFieldErrors.validFromDate}
                            helperText={tokenFieldErrors.validFromDate || undefined}
                          />
                          <TextField
                            label="Giờ bắt đầu"
                            type="time"
                            value={tokenForm.validFromTime}
                            onChange={(e) => {
                              const v = e.target.value;
                              setTokenForm((current) => ({ ...current, validFromTime: v }));
                              const errs = validateTokenDateTime({ ...tokenForm, validFromTime: v });
                              setTokenFieldErrors(errs);
                            }}
                            slotProps={{
                              inputLabel: { shrink: true },
                              htmlInput: { min: tokenValidFromTimeMin },
                            }}
                            size="small"
                            fullWidth
                            error={!!tokenFieldErrors.validFromTime}
                            helperText={tokenFieldErrors.validFromTime || undefined}
                          />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          Để trống nếu mã có hiệu lực ngay sau khi tạo.
                        </Typography>
                        <Divider />
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                          <TextField
                            label="Hết hạn ngày"
                            type="date"
                            value={tokenForm.validToDate}
                            onChange={(e) => {
                              const v = e.target.value;
                              setTokenForm((current) => ({ ...current, validToDate: v }));
                              const errs = validateTokenDateTime({ ...tokenForm, validToDate: v });
                              setTokenFieldErrors(errs);
                            }}
                            slotProps={{
                              inputLabel: { shrink: true },
                              htmlInput: {
                                min: todayStr,
                                ...(surveyMaxDate ? { max: surveyMaxDate } : {}),
                              },
                            }}
                            size="small"
                            fullWidth
                            error={!!tokenFieldErrors.validToDate}
                            helperText={tokenFieldErrors.validToDate || undefined}
                          />
                          <TextField
                            label="Giờ hết hạn"
                            type="time"
                            value={tokenForm.validToTime}
                            onChange={(e) => {
                              const v = e.target.value;
                              setTokenForm((current) => ({ ...current, validToTime: v }));
                              const errs = validateTokenDateTime({ ...tokenForm, validToTime: v });
                              setTokenFieldErrors(errs);
                            }}
                            slotProps={{
                              inputLabel: { shrink: true },
                              htmlInput: {
                                min: tokenValidToTimeMin,
                                ...(surveyMaxTime && tokenForm.validToDate === surveyMaxDate ? { max: surveyMaxTime } : {}),
                              },
                            }}
                            size="small"
                            fullWidth
                            error={!!tokenFieldErrors.validToTime}
                            helperText={tokenFieldErrors.validToTime || undefined}
                          />
                        </Stack>
                      </Stack>
                    </Box>
                  </Box>
                  {selectedSurvey?.expiresAt && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: -1.5 }}>
                      Không vượt quá hạn khảo sát ({formatDateTime(selectedSurvey.expiresAt)}). Để trống nếu không giới hạn.
                    </Typography>
                  )}
                  {!selectedSurvey?.expiresAt && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: -1.5 }}>
                      Để trống nếu không giới hạn thời gian
                    </Typography>
                  )}

                  {selectedSurvey && isSurveyExpired(selectedSurvey.expiresAt) && (
                    <Alert severity="warning">
                      Khảo sát đã hết hạn — không thể tạo mã truy cập mới.
                    </Alert>
                  )}

                  <Button
                    variant="contained"
                    startIcon={<QrCode2OutlinedIcon />}
                    onClick={() => void handleCreateToken()}
                    disabled={
                      creatingToken ||
                      (selectedSurvey ? isSurveyExpired(selectedSurvey.expiresAt) : false)
                    }
                  >
                    {creatingToken ? 'Đang tạo mã...' : 'Tạo mã truy cập'}
                  </Button>

                  {lastCreatedTokens.length > 0 && (
                    <Alert severity="success" onClose={() => setLastCreatedTokens([])}>
                      <Stack spacing={1}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          Mã truy cập vừa tạo
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {lastCreatedTokens.map((token) => (
                            <Chip
                              key={token}
                              label={token}
                              size="small"
                              onClick={() => void handleCopy(token)}
                              sx={{ fontFamily: 'monospace', fontWeight: 700 }}
                            />
                          ))}
                        </Box>
                        <Button size="small" onClick={() => void handleCopy(lastCreatedTokens.join(', '))} sx={{ alignSelf: 'flex-start' }}>
                          {lastCreatedTokens.length > 1 ? 'Sao chép tất cả' : 'Sao chép mã'}
                        </Button>
                      </Stack>
                    </Alert>
                  )}

                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small" sx={{ minWidth: 580 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Mã truy cập</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Trạng thái sử dụng</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Hiệu lực</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {tokens.map((token) => {
                          const used = Boolean(token.usedAt);
                          const participantLabel = token.participant?.nickname ?? token.participant?.participantCode;
                          return (
                            <TableRow key={token.id}>
                              <TableCell>
                                <Stack spacing={0.5}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 800 }}>
                                      {token.code}
                                    </Typography>
                                    <Tooltip title="Sao chép mã">
                                      <IconButton size="small" onClick={() => void handleCopy(token.code)}>
                                        <ContentCopyOutlinedIcon fontSize="inherit" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                  <Typography variant="caption" color="text.secondary">
                                    Tạo lúc {formatDateTime(token.createdAt)}
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Stack spacing={0.75}>
                                  <Chip
                                    size="small"
                                    label={used ? 'Đã dùng' : 'Còn hiệu lực'}
                                    color={used ? 'default' : 'success'}
                                    sx={{ width: 'fit-content' }}
                                  />
                                  <Typography variant="caption" color="text.secondary">
                                    {participantLabel ? `Người dùng: ${participantLabel}` : 'Chưa có người dùng'}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Lượt dùng: {token.usageCount}{token.maxUsage ? `/${token.maxUsage}` : ''}
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Stack spacing={0.5}>
                                  <Typography variant="caption" color="text.secondary">
                                    Từ: {formatDateTime(token.validFrom)}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Đến: {formatDateTime(token.validTo)}
                                  </Typography>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {tokens.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} sx={{ textAlign: 'center', color: 'text.secondary', py: 3 }}>
                              Chưa có mã truy cập nào.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Box>
                </Stack>
              )}
            </Box>
          </Stack>
        )}
      </Drawer>

      <Dialog open={qrPreviewOpen} onClose={() => setQrPreviewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Mã QR khảo sát</DialogTitle>
        <DialogContent dividers sx={{ display: 'grid', placeItems: 'center', bgcolor: 'grey.50' }}>
          {takeSurveyLink ? (
            <Box
              component="img"
              src={getQrUrl(takeSurveyLink, 500)}
              alt="QR khảo sát phóng to"
              sx={{ width: '100%', maxWidth: 500, height: 'auto', bgcolor: 'common.white', p: 1 }}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">Chưa có link khảo sát.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrPreviewOpen(false)}>Đóng</Button>
          <Button startIcon={<FileDownloadOutlinedIcon />} onClick={() => void handleDownloadQr()} disabled={!takeSurveyLink}>
            Tải xuống
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};
