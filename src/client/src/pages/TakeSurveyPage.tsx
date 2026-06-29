import { AlertCircle, CheckCircle, ChevronLeft, ChevronRight, HelpCircle, Home } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { DraftThresholdBadge } from '../components/DraftThresholdBadge';
import { LoadingScreen } from '../components/LoadingScreen';
import { ScaleHelp } from '../components/ScaleHelp';
import { PATHS } from '../constants/paths';
import { QUIS_CATEGORIES } from '../constants/quisCategories';
import { SPECIALTY_OPTIONS, type SpecialtyValue } from '../constants/specialties';
import { useAuth } from '../contexts/AuthContext';
import { responseService } from '../services/response.service';
import { surveyService } from '../services/survey.service';
import type { DraftDto } from '../types/response';
import type { SurveyDetailDto } from '../types/survey';
import { getScaleLabels, parseLabels } from '../utils/quisScale';

type FlowState = { guestToken?: string; fullName?: string; major?: SpecialtyValue };

const SCALE_HELP_DISMISSED_KEY = 'quis_help_dismissed';
const SESSION_TTL_MS = 15 * 60 * 1000;
const SESSION_WARNING_MS = 2 * 60 * 1000;
const surveyAccessTokenKey = (slug: string) => `quis_survey_access_token_${slug}`;

export const TakeSurveyPage = () => {
  const { slug: surveyId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refresh } = useAuth();
  const flowState = (location.state ?? {}) as FlowState;

  const [loading, setLoading] = useState(true);
  const [survey, setSurvey] = useState<SurveyDetailDto | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showScaleHelp, setShowScaleHelp] = useState(false);

  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [overallFeedback, setOverallFeedback] = useState('');
  const [highlightMissing, setHighlightMissing] = useState(false);
  const [showDescriptionDialog, setShowDescriptionDialog] = useState(false);
  const [showProgressInfo, setShowProgressInfo] = useState(false);
  const [showRetakeDialog, setShowRetakeDialog] = useState(false);
  const [sessionExpiresAt, setSessionExpiresAt] = useState(() => Date.now() + SESSION_TTL_MS);
  const [sessionRemainingMs, setSessionRemainingMs] = useState(SESSION_TTL_MS);
  const [extendingSession, setExtendingSession] = useState(false);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  const [guestToken] = useState(() => {
    if (!surveyId) return flowState.guestToken ?? '';
    return flowState.guestToken ?? window.sessionStorage.getItem(surveyAccessTokenKey(surveyId)) ?? '';
  });
  const [guestCode, setGuestCode] = useState<string>(() => window.sessionStorage.getItem('quis_guest_code') ?? '');
  const [fullName] = useState(flowState.fullName ?? '');
  const [major] = useState<SpecialtyValue | ''>(flowState.major ?? '');
  const [, setSurveyStatusWarning] = useState<string | null>(null);
  const userId = user?.id;
  const categoryContentRef = useRef<HTMLDivElement | null>(null);
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Exit navigation state
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [exitAction, setExitAction] = useState<(() => void) | null>(null);
  const [saveDraftOnExit, setSaveDraftOnExit] = useState(true);


  const handleRequestExit = (action: () => void) => {
    const hasAnswers = Object.keys(answers).length > 0;
    if (!hasAnswers) {
      action();
      return;
    }
    setSaveDraftOnExit(true);
    setExitAction(() => action);
    setShowExitDialog(true);
  };

  const handleConfirmExit = async () => {
    if (surveyId && survey) {
      if (saveDraftOnExit) {
        try {
          const details = Object.entries(answers).map(([qid, score]) => ({ questionId: qid, score }));
          await responseService.saveDraft({
            surveyId,
            responseId: responseId ?? undefined,
            details,
            overallFeedback: overallFeedback.trim() || undefined,
            token: buildTokenPayload(),
            guest: buildGuestPayload(),
            guestCode: guestCode || undefined,
          });
        } catch {
          // Proceed anyway
        }
      } else {
        try {
          await responseService.discardDraft(surveyId);
        } catch {
          // Proceed anyway
        }
      }
    }
    setShowExitDialog(false);
    exitAction?.();
  };

  // Auto-save / draft state
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [pendingDraft, setPendingDraft] = useState<DraftDto | null>(null);
  const [draftChecked, setDraftChecked] = useState(false);
  const [responseId, setResponseId] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextAutoSaveRef = useRef(false);

  useEffect(() => {
    if (window.localStorage.getItem(SCALE_HELP_DISMISSED_KEY) !== 'true') {
      setShowScaleHelp(true);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    setSessionExpiresAt(Date.now() + SESSION_TTL_MS);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const updateRemaining = () => setSessionRemainingMs(Math.max(0, sessionExpiresAt - Date.now()));
    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [sessionExpiresAt, userId]);

  const handleExtendSession = async () => {
    setExtendingSession(true);
    setSessionMessage(null);
    try {
      await refresh();
      setSessionExpiresAt(Date.now() + SESSION_TTL_MS);
      setSessionMessage('Phiên đã được gia hạn thêm 15 phút.');
    } catch {
      setSessionMessage('Không thể gia hạn phiên. Vui lòng đăng nhập lại nếu phiên đã hết hạn.');
    } finally {
      setExtendingSession(false);
    }
  };

  const showSessionWarning = Boolean(userId) && sessionRemainingMs <= SESSION_WARNING_MS;
  const sessionRemainingMinutes = Math.ceil(sessionRemainingMs / 60000);

  const handleDismissScaleHelpPermanently = () => {
    window.localStorage.setItem(SCALE_HELP_DISMISSED_KEY, 'true');
    setShowScaleHelp(false);
  };

  useEffect(() => {
    if (!surveyId) return;
    let mounted = true;
    const accessToken = flowState.guestToken ?? window.sessionStorage.getItem(surveyAccessTokenKey(surveyId)) ?? '';
    surveyService
      .getForTaking(surveyId, accessToken)
      .then(async (res) => {
        if (!mounted) return;
        if (accessToken) window.sessionStorage.setItem(surveyAccessTokenKey(surveyId), accessToken);
        setSurvey(res);
        setSurveyStatusWarning(null);

        setAnswers({});
        setCurrentCategoryIndex(0);

        try {
          const draft = await responseService.getDraft(surveyId);
          if (!mounted) return;
          if (draft && draft.completionPercent > 0 && draft.details.length > 0) {
            setPendingDraft(draft);
          } else if (userId) {
            try {
              const attempts = await responseService.history(String(res.id));
              if (!mounted) return;
              if (attempts.some((attempt) => attempt.isComplete)) {
                setShowRetakeDialog(true);
              } else {
                setDraftChecked(true);
              }
            } catch {
              if (mounted) setDraftChecked(true);
            }
          } else {
            setDraftChecked(true);
          }
        } catch {
          if (mounted) setDraftChecked(true);
        }

        setLoading(false);
      })
      .catch(async () => {
        if (!mounted) return;
        try {
          const detail = await surveyService.getById(surveyId);
          if (!mounted) return;
          if (!detail.isPublic) {
            navigate(PATHS.SURVEY_CODE, {
              replace: true,
              state: {
                surveyId: detail.id,
                surveySlug: detail.slug ?? surveyId,
                surveyTitle: detail.title,
              },
            });
            return;
          }
        } catch {
          // Fall through to the not-found state below.
        }
        setSurvey(null);
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [flowState.guestToken, navigate, surveyId, userId]);

  // Check survey status periodically and on save
  useEffect(() => {
    if (!surveyId || !survey || loading) return;

    const checkStatus = async () => {
      try {
        const detail = await surveyService.getById(surveyId);
        if (!detail.isActive) {
          setSurveyStatusWarning('Khảo sát đã đóng. Bạn có thể xem lại nhưng không thể nộp bài.');
        } else if (!detail.isPublic && !guestToken.trim()) {
          setSurveyStatusWarning('Khảo sát đã chuyển sang riêng tư. Bạn cần mã truy cập để tiếp tục.');
        } else {
          setSurveyStatusWarning(null);
        }
      } catch {
        // Ignore check errors
      }
    };

    void checkStatus();

    const interval = window.setInterval(checkStatus, 30000);
    return () => window.clearInterval(interval);
  }, [surveyId, survey, loading, guestToken]);

  const categories = useMemo(() => {
    if (!survey) return [];
    return [...survey.categories]
      .sort((a, b) => a.order - b.order)
      .map((category) => category.name);
  }, [survey]);

  const flatQuestions = useMemo(() => {
    if (!survey) return [];
    return [...survey.categories]
      .sort((a, b) => a.order - b.order)
      .flatMap((category) =>
        [...category.questions]
          .sort((a, b) => a.order - b.order)
          .map((question) => ({ ...question, categoryName: category.name })),
      );
  }, [survey]);

  const questionsByCategoryName = useMemo(() => {
    const map = new Map<string, Array<{ id: string }>>();
    for (const question of flatQuestions) {
      const arr = map.get(question.categoryName) ?? [];
      arr.push({ id: question.id });
      map.set(question.categoryName, arr);
    }
    return map;
  }, [flatQuestions]);

  const currentCategory = categories[currentCategoryIndex] ?? '';
  const categoryQuestions = useMemo(
    () => flatQuestions.filter((question) => question.categoryName === currentCategory),
    [flatQuestions, currentCategory],
  );

  const totalAnswered = Object.keys(answers).length;
  const progress = flatQuestions.length ? (totalAnswered / flatQuestions.length) * 100 : 0;
  const categoryCompleted = categoryQuestions.filter((question) => answers[question.id] !== undefined).length;

  const isLastCategory = currentCategoryIndex === categories.length - 1;
  const categoryAnswered = categoryQuestions.every((question) => answers[question.id] !== undefined);
  const allAnswered = flatQuestions.every((question) => answers[question.id] !== undefined);

  const progressWidthClasses = [
    'w-0', 'w-1/12', 'w-2/12', 'w-3/12', 'w-4/12', 'w-5/12',
    'w-6/12', 'w-7/12', 'w-8/12', 'w-9/12', 'w-10/12', 'w-11/12', 'w-full',
  ];
  const progressWidthClass = progressWidthClasses[Math.min(12, Math.round((progress / 100) * 12))];
  const progressGradientClass =
    progress >= 80 ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-amber-400 to-yellow-500';


  useEffect(() => {
    if (!categoryContentRef.current) return;
    const elementTop = categoryContentRef.current.getBoundingClientRect().top + window.pageYOffset;
    const offset = 112;
    window.scrollTo({ top: Math.max(0, elementTop - offset), behavior: 'smooth' });
  }, [currentCategoryIndex]);

  const getScaleClasses = (value: number, selected: boolean) => {
    if (!selected) {
      return 'bg-white border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-300';
    }
    const scaleColors: Record<number, string> = {
      1: 'bg-red-100 border-red-500 text-red-900 shadow-sm',
      2: 'bg-rose-100 border-rose-500 text-rose-900 shadow-sm',
      3: 'bg-orange-100 border-orange-500 text-orange-900 shadow-sm',
      4: 'bg-amber-100 border-amber-500 text-amber-900 shadow-sm',
      5: 'bg-yellow-100 border-yellow-500 text-yellow-900 shadow-sm',
      6: 'bg-lime-100 border-lime-500 text-lime-900 shadow-sm',
      7: 'bg-green-100 border-green-500 text-green-900 shadow-sm',
      8: 'bg-emerald-100 border-emerald-500 text-emerald-900 shadow-sm',
      9: 'bg-teal-100 border-teal-500 text-teal-900 shadow-sm',
    };
    return scaleColors[value] ?? 'bg-slate-100 border-slate-400 text-slate-900 shadow-sm';
  };

  const handleAnswer = (questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setHighlightMissing(false);
  };

  const scrollToFirstUnanswered = (questions: Array<{ id: string }>) => {
    const first = questions.find((q) => answers[q.id] === undefined);
    if (!first) return;
    const el = questionRefs.current[first.id];
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.pageYOffset;
    window.scrollTo({ top: Math.max(0, top - 120), behavior: 'smooth' });
  };

  const buildGuestPayload = useCallback(() => {
    if (user) return undefined;
    const trimmedFullName = fullName.trim();
    return {
      fullName: trimmedFullName.length > 0 ? trimmedFullName : undefined,
      major: major || undefined,
    };
  }, [user, fullName, major]);

  const buildTokenPayload = useCallback(() => {
    return guestToken.trim() || undefined;
  }, [guestToken]);

  // Auto-save draft
  useEffect(() => {
    if (!surveyId || !survey) return;
    if (!draftChecked || pendingDraft) return;
    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return;
    }
    if (submitting) return;
    if (Object.keys(answers).length === 0) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      const details = Object.entries(answers).map(([qid, score]) => ({
        questionId: qid,
        score,
      }));
      setSavingStatus('saving');
      try {
        const result = await responseService.saveDraft({
          surveyId,
          responseId: responseId ?? undefined,
          details,
          overallFeedback: overallFeedback.trim() || undefined,
          token: buildTokenPayload(),
          guest: buildGuestPayload(),
          guestCode: guestCode || undefined,
        });
        if (result.guestCodeToSet) {
          setGuestCode(result.guestCodeToSet);
          window.sessionStorage.setItem('quis_guest_code', result.guestCodeToSet);
        }
        if (!responseId) {
          setResponseId(result.responseId);
        }
        setSavingStatus('saved');
        setLastSavedAt(new Date());
      } catch (err) {
        console.error('[autosave] failed:', err);
        setSavingStatus('error');
      }
    }, 600);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [answers, surveyId, survey, draftChecked, pendingDraft, submitting, buildGuestPayload, buildTokenPayload, overallFeedback, guestCode, responseId]);

  const handleResumeDraft = () => {
    if (!pendingDraft) return;
    const restored: Record<string, number> = {};
    for (const d of pendingDraft.details) {
      restored[d.questionId] = d.score;
    }
    skipNextAutoSaveRef.current = true;
    setResponseId(pendingDraft.responseId);
    setAnswers(restored);
    setLastSavedAt(pendingDraft.lastSavedAt ? new Date(pendingDraft.lastSavedAt) : null);
    setSavingStatus('saved');

    if (survey) {
      const sortedCats = [...survey.categories].sort((a, b) => a.order - b.order);
      const firstIncompleteIdx = sortedCats.findIndex((cat) =>
        cat.questions.some((q) => restored[String(q.id)] === undefined),
      );
      setCurrentCategoryIndex(firstIncompleteIdx >= 0 ? firstIncompleteIdx : 0);
    }

    setPendingDraft(null);
    setDraftChecked(true);
  };

  const handleDiscardDraft = async () => {
    if (!surveyId) return;
    try {
      await responseService.discardDraft(surveyId);
    } catch (err) {
      console.error('[discard draft] failed:', err);
    }
    setResponseId(null);
    setAnswers({});
    setPendingDraft(null);
    setDraftChecked(true);
    setSavingStatus('idle');
    setLastSavedAt(null);
  };
  const handleConfirmDiscardDraft = () => {
    if (!pendingDraft) return;
    const confirmed = window.confirm(
      `Bạn sẽ mất ${pendingDraft.completionPercent}% tiến độ đã làm. Bạn có chắc muốn bắt đầu mới?`,
    );
    if (!confirmed) return;
    void handleDiscardDraft();
  };
  const handleStartRetake = () => {
    setResponseId(null);
    setAnswers({});
    setOverallFeedback('');
    setLastSavedAt(null);
    setSavingStatus('idle');
    setShowRetakeDialog(false);
    setDraftChecked(true);
  };

  const handleNext = () => {
    if (isLastCategory) return;
    if (!categoryAnswered) {
      setHighlightMissing(true);
      scrollToFirstUnanswered(categoryQuestions);
      return;
    }
    setHighlightMissing(false);
    setCurrentCategoryIndex((index) => Math.min(index + 1, categories.length - 1));
  };

  const handlePrevious = () => {
    if (currentCategoryIndex === 0) return;
    setCurrentCategoryIndex((index) => Math.max(index - 1, 0));
  };

  const handleSubmit = async () => {
    if (!surveyId || !survey) return;
    if (!allAnswered) {
      setHighlightMissing(true);
      scrollToFirstUnanswered(categoryQuestions);
      return;
    }

    if (!survey.isActive) {
      setSubmitError('Khảo sát đã đóng. Bạn không thể nộp bài.');
      return;
    }
    if (!survey.isPublic && !guestToken.trim()) {
      setSubmitError('Khảo sát đã chuyển sang riêng tư. Bạn cần mã truy cập để nộp bài.');
      return;
    }

    setSubmitError(null);
    setSubmitting(true);

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    try {
      const details = flatQuestions
        .map((question) => ({
          questionId: question.id,
          score: answers[question.id],
        }))
        .filter((d): d is { questionId: string; score: number } => d.score !== undefined);

      const guestPayload = buildGuestPayload();
      const tokenPayload = buildTokenPayload();

      let result;
      if (responseId) {
        result = await responseService.complete({
          responseId,
          surveyId,
          details,
          overallFeedback: overallFeedback.trim() || undefined,
          token: tokenPayload,
          guest: guestPayload,
          guestCode: guestCode || undefined,
        });
      } else {
        result = await responseService.submit({
          surveyId,
          details,
          overallFeedback: overallFeedback.trim() || undefined,
          token: tokenPayload,
          guest: guestPayload,
          guestCode: guestCode || undefined,
        });
      }

      if (result.guestCodeToSet) {
        window.sessionStorage.setItem('quis_guest_code', result.guestCodeToSet);
      }

      navigate(PATHS.SURVEY_RESULT, {
        state: {
          surveyId: survey.id,
          surveySlug: survey.slug ?? undefined,
          surveyTitle: survey.title,
          submittedAt: new Date().toISOString(),
        },
      });
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyErr = e as any;
      const serverError = anyErr?.response?.data?.error;
      const msg =
        serverError?.message ||
        (e instanceof Error ? e.message : null) ||
        'Gửi khảo sát thất bại';
      const detailsText = serverError?.details
        ? ` (${JSON.stringify(serverError.details)})`
        : '';
      console.error('[submit response] failed:', anyErr?.response?.data ?? e);
      setSubmitError(`${msg}${detailsText}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingScreen label="Đang tải khảo sát..." />;
  if (!survey) return <div>Không tìm thấy khảo sát.</div>;

  const canSubmit = survey.isActive && (survey.isPublic || guestToken.trim());
  const surveyDetailPath = PATHS.SURVEY_DETAIL(survey.slug ?? surveyId ?? String(survey.id));
  const handleBackFromHeader = () => {
    handleRequestExit(() => {
      if (window.history.length > 1) {
        navigate(-1);
        return;
      }
      navigate(surveyDetailPath);
    });
  };
  const handleHomeFromHeader = () => handleRequestExit(() => navigate(PATHS.HOME));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50/20">
      {/* ===== Header compact ===== */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex flex-shrink-0 items-center gap-1 pt-0.5">
              <button
                type="button"
                onClick={handleBackFromHeader}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-blue-700"
                aria-label="Quay lại"
                title="Quay lại"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleHomeFromHeader}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-blue-700"
                aria-label="Về trang chủ"
                title="Về trang chủ"
              >
                <Home className="h-4 w-4" />
              </button>
            </div>
            <div className="hidden flex-shrink-0 items-center justify-center w-9 h-9 sm:inline-flex sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white text-sm font-bold shadow">
              Q
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg md:text-xl font-semibold text-slate-900 tracking-tight truncate">
                {survey.title}
              </h1>
              <p className="mt-0.5 text-xs leading-5 text-slate-600 line-clamp-1">
                <span>{survey.description ?? 'Khảo sát gồm các câu hỏi được phân chia theo danh mục để đánh giá trải nghiệm toàn diện.'}</span>
                <button
                  type="button"
                  onClick={() => setShowDescriptionDialog(true)}
                  className="ml-1 text-blue-600 hover:text-blue-700 text-xs font-medium underline whitespace-nowrap"
                >
                  Xem thêm
                </button>
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                  {categories.length} danh mục
                </span>
                <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                  {flatQuestions.length} câu hỏi
                </span>
                {savingStatus !== 'idle' && (
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                      savingStatus === 'saving'
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : savingStatus === 'saved'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-red-50 border-red-200 text-red-700'
                    }`}
                  >
                    {savingStatus === 'saving' && 'Đang lưu...'}
                    {savingStatus === 'saved' && lastSavedAt &&
                      `Đã lưu ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    {savingStatus === 'saved' && !lastSavedAt && 'Đã lưu'}
                    {savingStatus === 'error' && 'Lưu thất bại'}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShowScaleHelp(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100"
                  aria-label="Mở hướng dẫn thang đo QUIS"
                  title="Mở hướng dẫn thang đo QUIS"
                >
                  <HelpCircle className="w-3 h-3" />
                  Hướng dẫn thang 1-9
                </button>
              </div>
            </div>
            <div className="flex-shrink-0 relative">
              <div className="rounded-xl bg-white border border-slate-200 px-3 py-2 shadow-sm min-w-[140px] sm:min-w-[170px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] uppercase tracking-[0.2em] text-slate-400 font-semibold">Tổng tiến độ</span>
                  <button
                    type="button"
                    onClick={() => setShowProgressInfo((v) => !v)}
                    aria-label="Xem thông tin ngưỡng tiến độ"
                    title="Xem thông tin ngưỡng tiến độ"
                    className={`inline-flex items-center justify-center w-4 h-4 rounded-full transition ${
                      progress >= 80
                        ? 'text-emerald-600 hover:bg-emerald-50'
                        : 'text-amber-600 hover:bg-amber-50'
                    }`}
                  >
                    {progress >= 80
                      ? <CheckCircle className="w-3.5 h-3.5" />
                      : <AlertCircle className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="mt-0.5 text-sm font-semibold text-slate-900 tabular-nums">
                  {totalAnswered}/{flatQuestions.length}
                  <span className="ml-1 text-[11px] font-normal text-slate-500">({Math.round(progress)}%)</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full overflow-hidden bg-slate-100">
                  <div className={`h-full ${progressGradientClass} transition-all duration-500 ${progressWidthClass}`} />
                </div>
              </div>
              {showProgressInfo && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowProgressInfo(false)}
                    aria-hidden
                  />
                  <div className="absolute right-0 mt-2 w-72 z-40">
                    <DraftThresholdBadge progress={progress} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {submitError && (
          <div className="bg-red-50 border-2 border-red-400 text-red-900 rounded-2xl p-4 mb-6 font-medium">
            {submitError}
          </div>
        )}

        {(showSessionWarning || sessionMessage) && (
          <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">
                  {showSessionWarning
                    ? `Phiên sắp hết hạn trong khoảng ${sessionRemainingMinutes} phút.`
                    : sessionMessage}
                </p>
                {showSessionWarning && (
                  <p className="mt-1 text-xs text-amber-800">
                    Bạn có thể gia hạn để tiếp tục lưu tiến độ và gửi khảo sát ổn định.
                  </p>
                )}
              </div>
              {showSessionWarning && (
                <button
                  type="button"
                  onClick={handleExtendSession}
                  disabled={extendingSession}
                  className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  {extendingSession ? 'Đang gia hạn...' : 'Gia hạn phiên'}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Sidebar - luôn sticky */}
          <aside className="lg:col-span-1 lg:sticky lg:top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
            <div className="space-y-4">
              <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
                <div className="text-xs uppercase tracking-[0.25em] text-slate-400 font-semibold mb-4">Danh mục</div>
                <div className="space-y-3">
                  {categories.map((category, index) => {
                    const catQuestions = questionsByCategoryName.get(category) ?? [];
                    const completed = catQuestions.filter((question) => answers[question.id] !== undefined).length;
                    const isActive = currentCategory === category;
                    const isCompleted = completed === catQuestions.length && catQuestions.length > 0;

                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setCurrentCategoryIndex(index)}
                        className={`w-full text-left px-4 py-3 rounded-2xl transition-all text-sm font-medium ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                            : isCompleted
                            ? 'bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{category}</span>
                          {isCompleted && !isActive && <CheckCircle className="w-4 h-4 text-blue-500" />}
                        </div>
                        <div className={`text-xs mt-1 tabular-nums ${isActive ? 'text-blue-100' : isCompleted ? 'text-blue-600' : 'text-slate-400'}`}>
                          {completed} / {catQuestions.length}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          <main className="lg:col-span-4">
            {!user && (
              <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.32em] text-slate-400 font-semibold mb-1">Thông tin lưu khảo sát</div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
                      <span className="font-semibold text-slate-900">{fullName.trim() || 'Nickname chưa được cung cấp'}</span>
                      <span className="text-slate-400">•</span>
                      <span>{SPECIALTY_OPTIONS.find((option) => option.value === major)?.label || 'Không xác định'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={categoryContentRef} className="rounded-2xl bg-white border border-slate-200 shadow-lg p-8 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">
                    Danh mục {currentCategoryIndex + 1} / {categories.length}
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    {(() => {
                      const info = QUIS_CATEGORIES[currentCategory];
                      if (!info) return null;
                      const Icon = info.icon;
                      return (
                        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
                          <Icon className="w-4 h-4" />
                          {currentCategory}
                        </div>
                      );
                    })()}
                    <div className="text-sm text-slate-500">
                      {categoryCompleted}/{categoryQuestions.length} câu đã trả lời
                    </div>
                  </div>
                  <h2 className="mt-4 text-xl font-semibold text-slate-900">{currentCategory}</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Hãy chọn mức độ phù hợp nhất với trải nghiệm của bạn cho từng câu hỏi.
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
                  <div className="font-semibold text-slate-900">
                    {categoryAnswered ? 'Đã hoàn tất danh mục' : 'Chưa hoàn tất danh mục'}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {categoryCompleted}/{categoryQuestions.length} câu trả lời
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-8">
                {categoryQuestions.map((question) => {
                  const labels = parseLabels(question.content);
                  const scaleLabels = getScaleLabels(labels.leftLabel, labels.rightLabel);
                  const isAnswered = answers[question.id] !== undefined;
                  const isMissingHighlight = highlightMissing && !isAnswered;
                  const wrapperBorder = isMissingHighlight
                    ? 'border-l-4 border-red-500 bg-red-50/40 rounded-r-xl'
                    : 'border-l-2 border-slate-200';

                  return (
                    <div
                      key={question.id}
                      ref={(el) => {
                        questionRefs.current[question.id] = el;
                      }}
                      className={`pl-6 pb-8 transition-colors ${wrapperBorder}`}
                    >
                      <div className="mb-4">
                        <div className="flex items-start gap-3 mb-2">
                          <div
                            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold tabular-nums ${
                              isAnswered ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {question.order}
                          </div>
                          <div className="flex-1">
                            <div className="text-base font-medium text-slate-900 leading-relaxed">{labels.question}</div>
                          </div>
                          {isAnswered && (
                            <div className="flex-shrink-0">
                              <CheckCircle className="w-5 h-5 text-emerald-500" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2 sm:gap-3">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => {
                          const selected = answers[question.id] === value;
                          const classes = getScaleClasses(value, selected);
                          return (
                            <label key={value} className={`relative flex min-w-0 flex-col items-center p-2 sm:p-3 border-2 rounded-xl cursor-pointer transition-all ${classes}`}>
                              <input
                                type="radio"
                                name={`question-${question.id}`}
                                value={value}
                                checked={selected}
                                onChange={() => handleAnswer(question.id, value)}
                                className="sr-only"
                              />
                              <div className={`text-lg font-semibold tabular-nums mb-1 ${selected ? '' : 'text-slate-400'}`}>
                                {value}
                              </div>
                              <div className={`w-full min-w-0 text-[10px] text-center leading-tight min-h-[32px] flex items-center justify-center whitespace-normal break-words ${selected ? '' : 'text-slate-500'}`}>
                                {scaleLabels[value - 1]}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {isLastCategory && (
                  <div className="border-l-2 border-blue-300 pl-6 pb-8">
                    <div className="mb-4">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold bg-blue-100 text-blue-700">
                          ✎
                        </div>
                        <div className="flex-1">
                          <div className="text-base font-medium text-slate-900 leading-relaxed">
                            Nhận xét chung về khảo sát
                          </div>
                          <p className="text-sm text-slate-500 mt-1">
                            (Tùy chọn) Hãy chia sẻ cảm nhận, góp ý hoặc đánh giá tổng thể của bạn về khảo sát này.
                          </p>
                        </div>
                      </div>
                    </div>
                    <textarea
                      value={overallFeedback}
                      onChange={(e) => setOverallFeedback(e.target.value)}
                      placeholder="Nhập nhận xét, góp ý của bạn ở đây..."
                      maxLength={2000}
                      rows={4}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition"
                    />
                    <div className="mt-1 text-right text-xs text-slate-400">
                      {overallFeedback.length} / 2000
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <button
                onClick={handlePrevious}
                disabled={currentCategoryIndex === 0}
                className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                <ChevronLeft className="w-4 h-4" />
                Danh mục trước
              </button>

              <div className="flex-1" />

              {!isLastCategory ? (
                <div className="flex flex-col items-end gap-1.5 sm:items-center sm:flex-row sm:gap-3">
                  <span
                    className={`text-xs sm:text-sm font-medium tabular-nums ${
                      categoryAnswered ? 'text-emerald-600' : 'text-slate-500'
                    }`}
                  >
                    Đã trả lời {categoryCompleted}/{categoryQuestions.length} câu
                  </span>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!categoryAnswered}
                    className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-all shadow-md text-sm font-medium text-white ${
                      categoryAnswered
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 opacity-60 hover:opacity-80'
                    }`}
                  >
                    Danh mục tiếp theo
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!allAnswered || submitting || !canSubmit}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg hover:from-emerald-700 hover:to-green-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Hoàn thành khảo sát
                  <CheckCircle className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="mt-6 text-center text-sm text-slate-500">
              <button
                type="button"
                className="underline hover:text-slate-700"
                onClick={() => handleRequestExit(() => navigate(PATHS.SURVEY_DETAIL(survey.slug ?? survey.id)))}
              >
                Xem thông tin khảo sát
              </button>
            </div>
          </main>
        </div>
      </div>

      {showDescriptionDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="px-6 pt-6 pb-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900 break-words">{survey.title}</h3>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1">
              <p className="text-sm text-slate-600 leading-6 whitespace-pre-line break-words">
                {survey.description ?? 'Khảo sát gồm các câu hỏi được phân chia theo danh mục để đánh giá trải nghiệm toàn diện.'}
              </p>
            </div>
            <div className="px-6 pb-6 pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDescriptionDialog(false)}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition shadow-md"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Exit confirmation dialog */}
      {showExitDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900">Bạn có muốn thoát?</h3>
            <p className="mt-3 text-sm text-slate-600 leading-6">
              Bạn đã trả lời <span className="font-semibold text-slate-900">{totalAnswered}</span> / {flatQuestions.length} câu hỏi.
            </p>
            <label className="mt-4 flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={saveDraftOnExit}
                onChange={(e) => setSaveDraftOnExit(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">Lưu nháp cho lần sau</span>
            </label>
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowExitDialog(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
              >
                Ở lại
              </button>
              <button
                type="button"
                onClick={handleConfirmExit}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition shadow-md"
              >
                Thoát
              </button>
            </div>
          </div>
        </div>
      )}

      {showScaleHelp && !pendingDraft && !showRetakeDialog && (
        <ScaleHelp
          onClose={() => setShowScaleHelp(false)}
          onDismissPermanently={handleDismissScaleHelpPermanently}
        />
      )}

      {showRetakeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900">
              Bạn đã làm khảo sát này rồi
            </h3>
            <p className="mt-3 text-sm text-slate-600 leading-6">
              Hệ thống phát hiện tài khoản của bạn đã từng hoàn thành khảo sát này. Bạn có thể làm lại để tạo một lần phản hồi mới, hoặc quay về lịch sử khảo sát.
            </p>
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate(PATHS.MY_SURVEYS)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
              >
                Quay lại lịch sử
              </button>
              <button
                type="button"
                onClick={handleStartRetake}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition shadow-md"
              >
                Làm lại khảo sát
              </button>
            </div>
          </div>
        </div>
      )}
      {pendingDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900">
              Tiếp tục bài khảo sát đang làm dở?
            </h3>
            <p className="mt-3 text-sm text-slate-600 leading-6">
              Hệ thống phát hiện bạn đã trả lời{' '}
              <span className="font-semibold text-slate-900">
                {pendingDraft.completionPercent}%
              </span>{' '}
              ({pendingDraft.details.length} câu) của bài khảo sát này.
              {pendingDraft.lastSavedAt && (
                <>
                  {' '}Lần lưu gần nhất:{' '}
                  <span className="font-medium">
                    {new Date(pendingDraft.lastSavedAt).toLocaleString()}
                  </span>
                  .
                </>
              )}
            </p>
            <p className="mt-2 text-sm text-slate-600 leading-6">
              Bạn muốn tiếp tục từ chỗ đang làm, hay bắt đầu lại từ đầu?
            </p>
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                onClick={handleConfirmDiscardDraft}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
              >
                Làm phiên mới
              </button>
              <button
                type="button"
                onClick={handleResumeDraft}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-purple-700 transition shadow-md"
              >
                Tiếp tục làm bài
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
