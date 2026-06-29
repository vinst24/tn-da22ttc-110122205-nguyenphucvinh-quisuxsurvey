import { ArrowRight, ArrowUpDown, CheckCircle, Clock, FileText, Lock, Search, Shield, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LoadingScreen } from '../components/LoadingScreen';
import { PublicHeader } from '../components/PublicHeader';
import { PATHS } from '../constants/paths';
import { surveyService } from '../services/survey.service';
import type { SurveyListItemDto } from '../types/survey';
import { getSurveyStartTarget } from '../utils/surveyNavigation';

const PAGE_SIZE = 9;

export const SurveyPage = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SurveyListItemDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'popular'>('newest');
  const [accessFilter, setAccessFilter] = useState<'all' | 'public' | 'token'>('all');

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
    if (windowStart > 2) pages.push('ellipsis_start');
    for (let i = windowStart; i <= windowEnd; i++) pages.push(i);
    if (windowEnd < totalPages - 1) pages.push('ellipsis_end');
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  }, [page, totalPages]);

  const loadSurveys = useCallback(async () => {
    setLoading(true);
    try {
      const sortByParam = sortBy === 'popular' ? 'responses' : 'createdAt';
      const sortDirParam = sortBy === 'popular' ? 'desc' : 'desc';
      const res = await surveyService.list({
        page,
        pageSize: PAGE_SIZE,
        status: 'active',
        access: accessFilter === 'all' ? undefined : accessFilter,
        sortBy: sortByParam as 'responses' | 'createdAt',
        sortDir: sortDirParam,
      });
      setItems(res.items);
      setTotal(Number(res.meta?.total ?? 0));
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, accessFilter]);

  useEffect(() => {
    void loadSurveys();
  }, [loadSurveys]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setAppliedSearch(searchTerm.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Client-side search filter on current page items
  const filteredSurveys = useMemo(() => {
    if (!appliedSearch) return items;
    const term = appliedSearch.toLowerCase();
    return items.filter(
      (survey) =>
        survey.title.toLowerCase().includes(term) ||
        (survey.description ?? '').toLowerCase().includes(term),
    );
  }, [items, appliedSearch]);

  if (loading && items.length === 0) return <LoadingScreen label="Đang tải khảo sát..." />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-white to-purple-50/20">
      <PublicHeader />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Khảo sát công khai
            </h1>
            <p className="text-lg md:text-xl text-blue-50 mb-8">
              Tham gia đánh giá và chia sẻ trải nghiệm của bạn với các sản phẩm, dịch vụ
            </p>
            <div className="flex items-center justify-center gap-4 text-sm flex-wrap">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                <FileText className="w-4 h-4" />
                <span>{total} khảo sát đang mở</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                <Users className="w-4 h-4" />
                <span>{items.reduce((sum, s) => sum + (s._count?.responses ?? 0), 0)} người đã tham gia</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Search & Filter */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm khảo sát theo tên, mô tả..."
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-slate-400" />
              <select
                aria-label="Loại truy cập"
                value={accessFilter}
                onChange={(e) => {
                  setAccessFilter(e.target.value as 'all' | 'public' | 'token');
                  setPage(1);
                }}
                className="px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tất cả</option>
                <option value="public">Công khai</option>
                <option value="token">Cần mã</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-5 h-5 text-slate-400" />
              <select
                aria-label="Sắp xếp khảo sát"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as 'newest' | 'popular');
                  setPage(1);
                }}
                className="px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="newest">Mới nhất</option>
                <option value="popular">Phổ biến</option>
              </select>
            </div>
          </div>
        </div>

        {/* Survey Results Count */}
        <div className="mb-6">
          <p className="text-slate-600">
            Tổng cộng <span className="font-semibold text-slate-900">{total}</span> khảo sát
            {appliedSearch && (
              <span> cho từ khóa "<span className="font-semibold text-blue-600">{appliedSearch}</span>"</span>
            )}
            <span className="text-slate-400"> · Trang {page}/{totalPages}</span>
          </p>
        </div>

        {/* Surveys Grid */}
        {loading ? (
          <div className="text-center py-16">
            <p className="text-slate-500">Đang tải...</p>
          </div>
        ) : filteredSurveys.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSurveys.map((survey) => (
              <SurveyCard key={survey.id} survey={survey} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Không tìm thấy khảo sát</h3>
            <p className="text-slate-600">Vui lòng thử lại với từ khóa khác</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || loading}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    item === page
                      ? 'bg-blue-600 text-white shadow-sm'
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
              disabled={page >= totalPages || loading}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Tiếp →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

function SurveyCard({ survey }: { survey: SurveyListItemDto }) {
  const requiresToken = !survey.isPublic;
  const startTarget = getSurveyStartTarget(survey);
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-lg transition-all group relative">
      {/* Access badge */}
      <div
        className={`absolute top-4 right-4 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
          requiresToken
            ? 'bg-amber-50 text-amber-700 border border-amber-200'
            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        }`}
        title={requiresToken ? 'Khảo sát này yêu cầu mã truy cập' : 'Khảo sát công khai, không cần mã'}
      >
        {requiresToken ? <Lock className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
        <span>{requiresToken ? 'Cần mã' : 'Công khai'}</span>
      </div>

      {/* Survey Title */}
      <div className="mb-4 pr-24">
        <Link
          to={PATHS.SURVEY_DETAIL(survey.slug || survey.id)}
          className="block no-underline"
        >
          <h3 className="font-semibold text-lg text-slate-900 mb-2 group-hover:text-blue-600 transition-colors cursor-pointer hover:text-blue-600">
            {survey.title}
          </h3>
        </Link>
        <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
          {survey.description}
        </p>
      </div>

      {/* Survey Metadata */}
      <div className="space-y-3 mb-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Users className="w-4 h-4" />
          <span>{survey._count?.responses ?? 0} người tham gia</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <Clock className="w-4 h-4" />
            <span>10-15 phút</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <FileText className="w-4 h-4" />
            <span>{survey._count?.questions ?? 0} câu hỏi</span>
          </div>
        </div>
      </div>

      {/* Stats & Action */}
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <span className="text-slate-500">Đã có </span>
          <span className="font-semibold text-blue-600">{survey._count?.responses ?? 0}</span>
          <span className="text-slate-500"> người tham gia</span>
        </div>
        <Link
          to={startTarget.path}
          state={startTarget.state}
          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm group-hover:gap-2 transition-all"
        >
          Tham gia
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
