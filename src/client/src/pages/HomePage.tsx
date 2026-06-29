import { ArrowRight, BarChart3, BookOpen, Brain, Monitor, Settings, Star, Target, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicHeader } from '../components/PublicHeader';
import { PATHS } from '../constants/paths';
import { surveyService } from '../services/survey.service';
import type { SurveyListItemDto } from '../types/survey';

const RECENT_SURVEY_LIMIT = 3;
const RECENT_SURVEY_FETCH_LIMIT = 20;

const isSurveyExpired = (expiresAt?: string | null) => {
  if (!expiresAt) return false;
  const time = new Date(expiresAt).getTime();
  return Number.isFinite(time) && time < Date.now();
};

const isHomeSurveyVisible = (survey: SurveyListItemDto) =>
  survey.isActive &&
  survey.isPublic &&
  !isSurveyExpired(survey.expiresAt) &&
  (survey._count?.questions ?? 0) > 0;

export const HomePage = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SurveyListItemDto[]>([]);

  useEffect(() => {
    let mounted = true;
    surveyService
      .list({
        page: 1,
        pageSize: RECENT_SURVEY_FETCH_LIMIT,
        status: 'active',
        access: 'public',
        sortBy: 'createdAt',
        sortDir: 'desc',
      })
      .then((res) => {
        if (!mounted) return;
        setItems(res.items.filter(isHomeSurveyVisible).slice(0, RECENT_SURVEY_LIMIT));
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setItems([]);
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-white to-purple-50/20">
      <PublicHeader />

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200 text-blue-700 rounded-full mb-6">
                <Brain className="w-4 h-4" />
                <span className="text-sm font-medium">Tiêu chuẩn QUIS 7.0</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
                Hệ thống khảo sát và đánh giá<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">trải nghiệm người dùng</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-600 mb-10 leading-relaxed">
                Nền tảng chuyên nghiệp để đo lường và phân tích trải nghiệm người dùng theo
                tiêu chuẩn QUIS (Questionnaire for User Interaction Satisfaction)
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to={PATHS.SURVEY}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                >
                  Tham gia khảo sát
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Background decoration */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
            <div className="absolute top-20 left-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse"></div>
            <div className="absolute top-40 right-10 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse"></div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Tính năng nổi bật
              </h2>
              <p className="text-lg text-slate-600">
                Giải pháp toàn diện cho việc đánh giá và phân tích UX
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <FeatureCard
                icon={<Brain className="w-8 h-8 text-blue-600" />}
                title="Tiêu chuẩn QUIS"
                description="Áp dụng bộ câu hỏi chuẩn quốc tế QUIS 7.0 để đánh giá tương tác người-máy"
              />
              <FeatureCard
                icon={<BarChart3 className="w-8 h-8 text-blue-600" />}
                title="Dashboard phân tích"
                description="Trực quan hóa dữ liệu với biểu đồ radar, bar chart, heatmap chuyên sâu"
              />
              <FeatureCard
                icon={<BarChart3 className="w-8 h-8 text-blue-600" />}
                title="Phân tích thống kê"
                description="Hỗ trợ Cronbach α, t-test, Cohen's d và 95% CI để diễn giải dữ liệu UX theo hướng nghiên cứu"
              />
              <FeatureCard
                icon={<Target className="w-8 h-8 text-blue-600" />}
                title="Semantic Differential 1-9"
                description="Đo mức hài lòng bằng thang đối cực 9 điểm trên 5 nhóm tiêu chí QUIS chuẩn"
              />
            </div>
          </div>
        </section>

        {/* Recent Surveys Section */}
        <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Khảo sát gần đây
              </h2>
              <p className="text-lg text-slate-600">
                Những khảo sát mới nhất đang mở để tham gia
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {loading
                ? Array.from({ length: RECENT_SURVEY_LIMIT }).map((_, index) => (
                    <SurveyCardSkeleton key={index} />
                  ))
                : items.map((survey) => (
                    <SurveyCard
                      key={survey.id}
                      title={survey.title}
                      description={survey.description ?? 'Chưa có mô tả'}
                      participants={survey._count?.responses ?? 0}
                      href={PATHS.SURVEY_DETAIL(survey.slug ?? survey.id)}
                      isActive={survey.isActive}
                    />
                  ))}
            </div>

            {!loading && items.length === 0 && (
              <div className="text-center text-slate-600 py-8">
                <p>Chưa có khảo sát công khai.</p>
              </div>
            )}

            {!loading && items.length > 0 && (
              <div className="text-center">
                <Link
                  to={PATHS.SURVEY}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
                >
                  Xem tất cả khảo sát
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                  Về tiêu chuẩn QUIS
                </h2>
                <div className="space-y-4 text-slate-600">
                  <p>
                    <strong className="text-slate-900">QUIS (Questionnaire for User Interaction Satisfaction)</strong> là một công cụ đánh giá tiêu chuẩn được phát triển bởi Đại học Maryland để đo lường mức độ hài lòng của người dùng với giao diện và tương tác hệ thống.
                  </p>
                  <p>
                    Được sử dụng rộng rãi trong nghiên cứu UX/UI và đánh giá chất lượng phần mềm, QUIS cung cấp phương pháp đo lường khoa học và có thể so sánh giữa các sản phẩm, phiên bản khác nhau.
                  </p>
                  <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                    QUIS được phát triển bởi Chin, Diehl & Norman tại Human-Computer Interaction Lab, University of Maryland (1988).
                  </p>
                  <p>
                    Hệ thống sử dụng thang đo semantic differential 9 điểm, đánh giá qua 5 nhóm tiêu chí chính:
                  </p>
                  <ul className="space-y-2 ml-6">
                    <li className="flex items-start gap-2">
                      <Star className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong className="text-slate-900">Overall Reaction to the Software</strong>: Đánh giá cảm nhận tổng quan của người dùng về phần mềm.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Monitor className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong className="text-slate-900">Screen</strong>: Đánh giá cách trình bày màn hình, bố cục, khả năng đọc và sự rõ ràng của giao diện.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <BookOpen className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong className="text-slate-900">Terminology and System Information</strong>: Đánh giá thuật ngữ, thông tin hệ thống và thông báo hỗ trợ người dùng.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Brain className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong className="text-slate-900">Learning</strong>: Đánh giá mức độ dễ học, dễ ghi nhớ và khả năng bắt đầu sử dụng hệ thống.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Settings className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong className="text-slate-900">System Capabilities</strong>: Đánh giá khả năng, tốc độ, độ tin cậy và tính đáp ứng của hệ thống.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-2xl shadow-xl border border-slate-200">
                <div className="space-y-6">
                  <div className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-4 text-white shadow-md">
                    <p className="text-sm font-medium text-blue-100">Tóm tắt tiêu chuẩn</p>
                    <h3 className="text-2xl font-bold">QUIS Survey 7.0</h3>
                  </div>
                  <StatItem label="Phiên bản" value="7.0" />
                  <StatItem label="Câu hỏi chuẩn" value="27" />
                  <StatItem label="Thang đo" value="1-9" />
                  <StatItem label="Danh mục đánh giá" value="5" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-6 h-6" />
                <span className="font-semibold text-lg">QUIS Survey System</span>
              </div>
              <p className="text-slate-400">
                Nền tảng đánh giá trải nghiệm người dùng theo tiêu chuẩn quốc tế
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Liên kết nhanh</h3>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#features" className="hover:text-white transition-colors">Tính năng nổi bật</a></li>
                <li><a href="#about" className="hover:text-white transition-colors">Về QUIS 7.0</a></li>
                <li><Link to={PATHS.SURVEY} className="hover:text-white transition-colors">Danh sách khảo sát</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Đăng nhập</Link></li>
                <li><Link to="/register" className="hover:text-white transition-colors">Đăng ký tài khoản</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Liên hệ</h3>
              <ul className="space-y-2 text-slate-400">
                <li>Email: support@quis-system.com</li>
                <li>Hotline: 1900-xxxx</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-slate-400">
            <p>&copy; 2026 QUIS Survey System. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 bg-white rounded-xl hover:shadow-lg transition-all border border-slate-200 hover:border-blue-400 group">
      <div className="mb-4 transform group-hover:scale-110 transition-transform">{icon}</div>
      <h3 className="font-semibold text-lg text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center pb-4 border-b border-slate-200 last:border-0 last:pb-0">
      <span className="text-slate-600 font-medium">{label}</span>
      <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">{value}</span>
    </div>
  );
}

function SurveyCard({
  title,
  description,
  participants,
  href,
  isActive,
}: {
  title: string;
  description: string;
  participants: number;
  href: string;
  isActive: boolean;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-lg transition-all group">
      <h3 className="font-semibold text-lg text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{title}</h3>
      <p className="text-slate-600 text-sm mb-4 line-clamp-2">{description}</p>
      <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          <span>{participants} người tham gia</span>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${isActive ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
          {isActive ? 'Đang mở' : 'Đóng'}
        </span>
      </div>
      <Link
        to={href}
        className="block text-center py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-sm hover:shadow-md"
      >
        Xem chi tiết
      </Link>
    </div>
  );
}

function SurveyCardSkeleton() {
  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse"
      aria-hidden="true"
    >
      <div className="h-6 w-3/4 rounded bg-slate-200 mb-3" />
      <div className="h-4 w-full rounded bg-slate-100 mb-2" />
      <div className="h-4 w-5/6 rounded bg-slate-100 mb-6" />
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-28 rounded bg-slate-100" />
        <div className="h-6 w-16 rounded-full bg-slate-100" />
      </div>
      <div className="h-10 w-full rounded-lg bg-slate-200" />
    </div>
  );
}
