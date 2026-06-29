import { ArrowLeft, BarChart3, Calendar, CheckCircle, Clock, FileText, Info, Lock, Shield, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LoadingScreen } from '../components/LoadingScreen';
import { PublicHeader } from '../components/PublicHeader';
import { PATHS } from '../constants/paths';
import { surveyService } from '../services/survey.service';
import type { SurveyDetailDto } from '../types/survey';
import { getSurveyStartTarget } from '../utils/surveyNavigation';

export const SurveyDetailPage = () => {
  const { slug: id } = useParams();
  const [loading, setLoading] = useState(true);
  const [survey, setSurvey] = useState<SurveyDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    surveyService
      .getById(id)
      .then((res) => {
        if (!mounted) return;
        setSurvey(res);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setError('Không tìm thấy khảo sát.');
        setSurvey(null);
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) return <LoadingScreen label="Đang tải khảo sát..." />;
  if (error) return <div className="mx-auto max-w-3xl p-8 text-center text-red-700">{error}</div>;
  if (!survey) return <div className="mx-auto max-w-3xl p-8 text-center text-slate-700">Không tìm thấy khảo sát.</div>;

  const totalQuestions = survey.categories.reduce((sum, c) => sum + c.questions.length, 0);
  const totalResponses = survey._count?.responses ?? 0;
  const startTarget = getSurveyStartTarget(survey);
  const requiresToken = !survey.isPublic;

  const formatDate = (value?: string | null) => {
    if (!value) return null;
    return new Date(value).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return null;
    return new Date(value).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicHeader />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <Link
          to={PATHS.SURVEY}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách
        </Link>

        {/* Main card */}
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="border-b border-slate-200 px-6 py-6 sm:px-8 sm:py-7">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {/* Access badge */}
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                  requiresToken
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {requiresToken ? <Lock className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                {requiresToken ? 'Cần mã truy cập' : 'Công khai'}
              </span>

              {/* Status badge */}
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                  survey.isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${survey.isActive ? 'bg-blue-500' : 'bg-slate-400'}`} />
                {survey.isActive ? 'Đang mở' : 'Đã đóng'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">{survey.title}</h1>
            {survey.description && (
              <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">{survey.description}</p>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-200">
            <div className="bg-white px-6 py-5">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-slate-500 font-medium">Câu hỏi</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{totalQuestions}</p>
            </div>
            <div className="bg-white px-6 py-5">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-slate-500 font-medium">Danh mục</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{survey.categories.length}</p>
            </div>
            <div className="bg-white px-6 py-5">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-slate-500 font-medium">Lượt tham gia</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{totalResponses}</p>
            </div>
            <div className="bg-white px-6 py-5">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-slate-500 font-medium">Thời gian</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">~15 phút</p>
            </div>
          </div>

          {/* Survey Info */}
          <div className="px-6 sm:px-8 py-5 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Thông tin khảo sát</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-slate-500">Ngày tạo</p>
                  <p className="font-medium text-slate-800">{formatDate(survey.createdAt) ?? '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-slate-500">Quyền truy cập</p>
                  <p className="font-medium text-slate-800">
                    {survey.isPublic ? 'Công khai - không cần mã' : 'Bảo vệ - cần mã truy cập'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-slate-500">Hạn cuối</p>
                  <p className="font-medium text-slate-800">
                    {survey.expiresAt ? formatDateTime(survey.expiresAt) : 'Không giới hạn'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="px-6 sm:px-8 py-5 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Danh mục câu hỏi</h2>
            </div>
            <div className="space-y-2">
              {survey.categories.map((category, index) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3 hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-900 truncate">{category.name}</span>
                    {category.description && (
                      <span className="hidden sm:inline text-xs text-slate-400 ml-1 truncate">— {category.description}</span>
                    )}
                  </div>
                  <span className="flex-shrink-0 text-xs text-slate-500 font-medium bg-white px-2.5 py-1 rounded-full border border-slate-200">
                    {category.questions.length} câu
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 sm:px-8 py-5 bg-slate-50/80">
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to={startTarget.path}
                state={startTarget.state}
                className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-all ${
                  survey.isActive
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                    : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                }`}
              >
                {survey.isActive ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Bắt đầu khảo sát
                  </>
                ) : (
                  'Khảo sát đã đóng'
                )}
              </Link>
              <Link
                to={PATHS.SURVEY}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Quay lại
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}