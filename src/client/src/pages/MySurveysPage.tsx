import { ArrowRight, CheckCircle2, ChevronDown, ClipboardList, FileText, Hourglass, Lock, RotateCw, Shield } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LoadingScreen } from '../components/LoadingScreen';
import { PublicHeader } from '../components/PublicHeader';
import { PATHS } from '../constants/paths';
import { responseService } from '../services/response.service';
import type { MyResponseAttemptDto, MySurveyHistorySummaryDto } from '../types/response';

const PAGE_SIZE = 8;

const formatDateTime = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const attemptDate = (attempt: MyResponseAttemptDto) =>
  attempt.isComplete ? attempt.submittedAt : attempt.lastSavedAt ?? attempt.createdAt;


const surveyPathKey = (item: MySurveyHistorySummaryDto) => item.surveySlug ?? item.surveyId;

export const MySurveysPage = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<MySurveyHistorySummaryDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [histories, setHistories] = useState<Record<string, MyResponseAttemptDto[]>>({});
  const [historyLoading, setHistoryLoading] = useState<Record<string, boolean>>({});
  const [historyErrors, setHistoryErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    responseService
      .listMine(page, PAGE_SIZE)
      .then((res) => {
        if (!mounted) return;
        setItems(res.items);
        setTotal(Number(res.meta?.total ?? res.items.length));
      })
      .catch(() => {
        if (!mounted) return;
        setItems([]);
        setTotal(0);
        setError('Không thể tải lịch sử khảo sát của bạn.');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const visiblePages = useMemo(() => {
    const pages: Array<number | 'ellipsis_start' | 'ellipsis_end'> = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i += 1) pages.push(i);
      return pages;
    }

    pages.push(1);
    let windowStart = Math.max(2, page - 2);
    let windowEnd = Math.min(totalPages - 1, page + 2);

    if (page <= 3) {
      windowStart = 2;
      windowEnd = Math.min(totalPages - 1, windowStart + maxVisible - 1);
    } else if (page >= totalPages - 2) {
      windowEnd = totalPages - 1;
      windowStart = Math.max(2, windowEnd - maxVisible + 1);
    }

    if (windowStart > 2) pages.push('ellipsis_start');
    for (let i = windowStart; i <= windowEnd; i += 1) pages.push(i);
    if (windowEnd < totalPages - 1) pages.push('ellipsis_end');
    pages.push(totalPages);
    return pages;
  }, [page, totalPages]);

  const toggleHistory = async (item: MySurveyHistorySummaryDto) => {
    const surveyId = item.surveyId;
    const willOpen = !expanded[surveyId];
    setExpanded((current) => ({ ...current, [surveyId]: willOpen }));
    if (!willOpen || histories[surveyId] || historyLoading[surveyId]) return;

    setHistoryLoading((current) => ({ ...current, [surveyId]: true }));
    setHistoryErrors((current) => ({ ...current, [surveyId]: '' }));
    try {
      const attempts = await responseService.history(surveyId);
      setHistories((current) => ({ ...current, [surveyId]: attempts }));
    } catch {
      setHistoryErrors((current) => ({ ...current, [surveyId]: 'Không thể tải lịch sử các lần làm.' }));
    } finally {
      setHistoryLoading((current) => ({ ...current, [surveyId]: false }));
    }
  };

  if (loading && items.length === 0) return <LoadingScreen label="Đang tải lịch sử khảo sát của bạn..." />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50/40 via-white to-emerald-50/30">
      <PublicHeader />

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-700">
            <ClipboardList className="h-4 w-4" />
            Khảo sát của tôi
          </div>
          <h1 className="mb-2 text-3xl font-bold text-slate-900 md:text-4xl">Lịch sử khảo sát</h1>
          <p className="max-w-3xl text-slate-600">
            Mỗi khảo sát được gom thành một nhóm để bạn xem lại các lần làm, tiếp tục bản nháp hoặc làm lại khi khảo sát còn mở.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {items.length === 0 && !error ? (
          <EmptyState />
        ) : (
          <div className="space-y-5">
            {loading && (
              <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                Đang cập nhật dữ liệu...
              </div>
            )}

            {items.map((item) => (
              <SurveyHistoryCard
                key={item.surveyId}
                item={item}
                expanded={Boolean(expanded[item.surveyId])}
                attempts={histories[item.surveyId]}
                loading={Boolean(historyLoading[item.surveyId])}
                error={historyErrors[item.surveyId]}
                onToggle={() => void toggleHistory(item)}
              />
            ))}

            <Pagination
              page={page}
              total={total}
              totalPages={totalPages}
              visiblePages={visiblePages}
              onPageChange={setPage}
            />
          </div>
        )}
      </main>
    </div>
  );
};

function SurveyHistoryCard({
  item,
  expanded,
  attempts,
  loading,
  error,
  onToggle,
}: {
  item: MySurveyHistorySummaryDto;
  expanded: boolean;
  attempts?: MyResponseAttemptDto[];
  loading: boolean;
  error?: string;
  onToggle: () => void;
}) {
  const latest = item.latestAttempt;
  const latestIsDraft = !latest.isComplete;
  const pathKey = surveyPathKey(item);
  const canAct = item.surveyIsActive;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <StatusBadge attempt={latest} />
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                {item.surveyIsPublic ? <Shield className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                {item.surveyIsPublic ? 'Công khai' : 'Cần mã truy cập'}
              </span>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                {item.attemptCount} lần làm
              </span>
            </div>
            <h2 className="line-clamp-2 text-xl font-bold text-slate-900">{item.surveyTitle}</h2>
            {item.surveyDescription && (
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{item.surveyDescription}</p>
            )}
          </div>

          <div className="grid gap-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 sm:min-w-64">
            <Metric label="Lần gần nhất" value={`Lần ${latest.attemptNumber}`} />
            <Metric label={latestIsDraft ? 'Lưu lần cuối' : 'Nộp lúc'} value={formatDateTime(attemptDate(latest))} />
            <Metric label="Tiến độ" value={`${latest.completionPercent}%`} />
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
            <span>{latestIsDraft ? 'Tiến độ bản nháp' : 'Tiến độ lần gần nhất'}</span>
            <span className="font-semibold text-slate-700">{latest.completionPercent}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full ${latestIsDraft ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-emerald-400 to-teal-500'}`}
              style={{ width: `${latest.completionPercent}%` }}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {item.hasOpenDraft && canAct && (
            <Link
              to={PATHS.TAKE_SURVEY(pathKey)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Hourglass className="h-4 w-4" />
              Tiếp tục bản nháp
            </Link>
          )}
          {canAct ? (
            <Link
              to={PATHS.SURVEY_DETAIL(pathKey)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              <RotateCw className="h-4 w-4" />
              Làm lại khảo sát
            </Link>
          ) : (
            <span className="text-sm italic text-slate-500">Khảo sát đã đóng, không thể làm lại.</span>
          )}
          <Link
            to={PATHS.SURVEY_DETAIL(pathKey)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Xem chi tiết
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:ml-auto"
          >
            {expanded ? 'Ẩn lịch sử' : 'Xem lịch sử'}
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-6">
          {loading && (
            <div className="rounded-xl border border-sky-100 bg-white px-4 py-3 text-sm text-sky-700">
              Đang tải các lần làm...
            </div>
          )}
          {error && !loading && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {!loading && !error && attempts && (
            <AttemptTimeline attempts={attempts} />
          )}
        </div>
      )}
    </article>
  );
}

function AttemptTimeline({ attempts }: { attempts: MyResponseAttemptDto[] }) {
  if (attempts.length === 0) {
    return <p className="text-sm text-slate-500">Chưa có lần làm nào cho khảo sát này.</p>;
  }

  return (
    <div className="space-y-3">
      {attempts.map((attempt) => (
        <div key={attempt.responseId} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                  Lần {attempt.attemptNumber}
                </span>
                <StatusBadge attempt={attempt} />
              </div>
              <p className="text-sm text-slate-600">
                {attempt.isComplete ? 'Nộp lúc' : 'Lưu lần cuối'}: {formatDateTime(attemptDate(attempt))}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm sm:min-w-64">
              <Metric label="Tiến độ" value={`${attempt.completionPercent}%`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ attempt }: { attempt: MyResponseAttemptDto }) {
  if (attempt.isComplete) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Đã nộp
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
      <Hourglass className="h-3.5 w-3.5" />
      Đang làm dở
    </span>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function Pagination({
  page,
  total,
  totalPages,
  visiblePages,
  onPageChange,
}: {
  page: number;
  total: number;
  totalPages: number;
  visiblePages: Array<number | 'ellipsis_start' | 'ellipsis_end'>;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-600">
        Hiển thị <span className="font-medium">{Math.min(PAGE_SIZE, total - (page - 1) * PAGE_SIZE)}</span> trong{' '}
        <span className="font-medium">{total}</span> khảo sát
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-lg border border-slate-300 px-3 py-1 text-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Trước
        </button>
        {visiblePages.map((item) => {
          if (item === 'ellipsis_start' || item === 'ellipsis_end') {
            return <span key={item} className="px-2 text-sm text-slate-400">...</span>;
          }
          return (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              className={`rounded-lg px-3 py-1 text-sm ${
                item === page ? 'bg-blue-600 text-white' : 'border border-slate-300 hover:bg-slate-50'
              }`}
            >
              {item}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="rounded-lg border border-slate-300 px-3 py-1 text-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Tiếp
        </button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
        <FileText className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-slate-900">Bạn chưa tham gia khảo sát nào</h3>
      <p className="mb-6 text-slate-600">Hãy khám phá các khảo sát đang mở và chia sẻ trải nghiệm của bạn.</p>
      <Link
        to={PATHS.SURVEY}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white shadow-md transition-all hover:bg-blue-700"
      >
        Xem khảo sát công khai
      </Link>
    </div>
  );
}