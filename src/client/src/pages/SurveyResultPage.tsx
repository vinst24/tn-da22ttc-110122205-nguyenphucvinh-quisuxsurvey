import {
  BarChart3,
  CheckCircle,
  Copy,
  ExternalLink,
  FileText,
  Home,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PATHS } from '../constants/paths';

type SurveyResultLocationState = {
  surveyId?: string;
  surveySlug?: string;
  surveyTitle?: string;
  submittedAt?: string;
};

export const SurveyResultPage = () => {
  const location = useLocation();
  const state = (location.state ?? {}) as SurveyResultLocationState;
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setMounted(true);
  }, []);

  const surveyTitle = state.surveyTitle ?? 'khảo sát QUIS';
  const surveySlug = state.surveySlug?.trim() || '';
  const surveyPath = surveySlug ? PATHS.SURVEY_DETAIL(surveySlug) : '';
  const surveyUrl = useMemo(() => {
    if (!surveyPath || typeof window === 'undefined') return '';
    return `${window.location.origin}${surveyPath}`;
  }, [surveyPath]);

  const handleCopySurveyLink = async () => {
    if (!surveyUrl || typeof navigator === 'undefined' || !navigator.clipboard) return;
    await navigator.clipboard.writeText(surveyUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleShareSurveyLink = async () => {
    if (!surveyUrl || typeof navigator === 'undefined') return;
    if (navigator.share) {
      await navigator.share({
        title: `Khảo sát QUIS: ${surveyTitle}`,
        text: 'Mời bạn tham gia khảo sát trải nghiệm người dùng QUIS.',
        url: surveyUrl,
      }).catch(() => undefined);
      return;
    }
    await handleCopySurveyLink();
  };

  if (mounted && !state.surveyTitle) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-white to-purple-50/20 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Không tìm thấy thông tin</h2>
          <p className="text-slate-600 mb-6">Vui lòng tham gia khảo sát để xem kết quả.</p>
          <Link
            to={PATHS.SURVEY}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-sm"
          >
            Xem khảo sát công khai
          </Link>
        </div>
      </div>
    );
  }

  const submittedAt = state.submittedAt ? new Date(state.submittedAt) : new Date();
  const formattedDate = mounted ? submittedAt.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }) : '';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.18),_transparent_36%),linear-gradient(180deg,_#f8fbff_0%,_#ffffff_48%,_#f7fafc_100%)] px-4 py-12 sm:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="overflow-hidden rounded-[28px] border border-sky-100 bg-white shadow-[0_24px_70px_-36px_rgba(59,130,246,0.28)]">
          <div className="border-b border-sky-100 bg-gradient-to-br from-sky-50 via-white to-cyan-50 px-6 py-8 sm:px-10">
            <div className="max-w-3xl">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 shadow-sm ring-1 ring-emerald-100">
                <CheckCircle className="h-9 w-9" />
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.34em] text-sky-700">
                Phiếu đã được ghi nhận
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-800 sm:text-4xl">
                Khảo sát đã được ghi nhận
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                Cảm ơn bạn đã hoàn thành <span className="font-semibold text-slate-800">{surveyTitle}</span>.
                Hệ thống không hiển thị điểm cá nhân để giữ tính blind cho nghiên cứu và đảm bảo việc phân tích dữ liệu được khách quan.
              </p>
            </div>
          </div>

          <div className="grid gap-6 px-6 py-8 sm:px-10 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="space-y-6">
              <InfoPanel
                icon={<FileText className="h-5 w-5" />}
                iconClassName="bg-blue-100 text-blue-700"
                title="Thông tin nộp bài"
                subtitle="Chi tiết lần tham gia khảo sát của bạn"
              >
                <div className="mt-5 space-y-3">
                  <InfoRow label="Tên khảo sát" value={surveyTitle} />
                  <InfoRow label="Thời gian nộp" value={formattedDate} />
                </div>
              </InfoPanel>

              <InfoPanel
                icon={<ShieldCheck className="h-5 w-5" />}
                iconClassName="bg-sky-100 text-sky-700"
                title="Cam kết bảo mật dữ liệu"
                subtitle="Phản hồi của bạn được xử lý theo hướng nghiên cứu UX ẩn danh."
              >
                <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
                  <li>Phản hồi được tổng hợp ẩn danh và không dùng để công bố danh tính người tham gia.</li>
                  <li>Dữ liệu chỉ phục vụ phân tích trải nghiệm người dùng và cải tiến chất lượng hệ thống.</li>
                  <li>Bạn có thể yêu cầu hỗ trợ hoặc trao đổi về dữ liệu qua email nghiên cứu: <span className="font-medium text-slate-700">research@quis.local</span>.</li>
                </ul>
              </InfoPanel>

              <InfoPanel
                icon={<BarChart3 className="h-5 w-5" />}
                iconClassName="bg-cyan-500 text-white"
                title="Đóng góp của bạn"
                subtitle="Mỗi phản hồi đều giúp tăng độ tin cậy cho phân tích nghiên cứu."
              >
                <p className="mt-5 text-sm leading-7 text-slate-700">
                  Dữ liệu sẽ được tổng hợp để phân tích độ tin cậy nội tại bằng <span className="font-semibold text-slate-800">Cronbach alpha</span>,
                  kiểm định khác biệt nhóm bằng <span className="font-semibold text-slate-800">t-test</span> hoặc <span className="font-semibold text-slate-800">ANOVA</span>,
                  từ đó hỗ trợ đánh giá chất lượng trải nghiệm người dùng theo chuẩn QUIS.
                </p>
              </InfoPanel>
            </section>

            <aside className="space-y-6">
              <div className="rounded-3xl border border-amber-100 bg-amber-50/50 px-6 py-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800">Bước tiếp theo</h2>
                    <p className="text-sm text-slate-500">Chia sẻ đúng liên kết khảo sát vừa hoàn thành.</p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-amber-100 bg-white/85 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Liên kết khảo sát</div>
                  {surveyUrl ? (
                    <div className="mt-3 break-all text-sm leading-6 text-slate-700">{surveyUrl}</div>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-amber-800">
                      Không tìm thấy liên kết khảo sát để chia sẻ. Thông tin nộp bài vẫn đã được ghi nhận.
                    </p>
                  )}
                </div>

                <div className="mt-4 grid gap-3">
                  <button
                    type="button"
                    onClick={() => void handleShareSurveyLink()}
                    disabled={!surveyUrl}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Chia sẻ khảo sát
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCopySurveyLink()}
                    disabled={!surveyUrl}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                  >
                    <Copy className="h-4 w-4" />
                    {copied ? 'Đã copy link' : 'Copy link'}
                  </button>
                  {surveySlug && (
                    <Link
                      to={surveyPath}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Mở lại trang khảo sát
                    </Link>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 px-6 py-6">
                <h2 className="text-lg font-semibold text-slate-800">Điều hướng</h2>
                <div className="mt-4 grid gap-3">
                  <Link
                    to={PATHS.HOME}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    <Home className="h-4 w-4" />
                    Về trang chủ
                  </Link>
                  <Link
                    to={PATHS.SURVEY}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-sky-700 hover:to-cyan-700"
                  >
                    <FileText className="h-4 w-4" />
                    Tham gia khảo sát khác
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};

function InfoPanel({
  icon,
  iconClassName,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  iconClassName: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50/80 px-6 py-6">
      <div className="flex items-center gap-3">
        <div className={`rounded-2xl p-3 ${iconClassName}`}>{icon}</div>
        <div>
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-900 sm:text-right">{value}</span>
    </div>
  );
}
