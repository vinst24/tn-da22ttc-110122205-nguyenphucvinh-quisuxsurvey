import {
  Alert,
  Box,
  Card,
  CardContent,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { BarChart } from '../../charts/BarChart';
import { DoughnutChart } from '../../charts/DoughnutChart';
import { HorizontalBarChart } from '../../charts/HorizontalBarChart';
import { LineChart } from '../../charts/LineChart';
import { PieChart } from '../../charts/PieChart';
import { RadarChart } from '../../charts/RadarChart';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { LoadingScreen } from '../../components/LoadingScreen';
import { dashboardService } from '../../services/dashboard.service';
import { CHART_PALETTE } from '../../theme/tokens';
import type { AnalyticsDto, AnalyticsFilters, SurveySummaryDto } from '../../types/dashboard';

const truncate = (value: string, length = 48) =>
  value.length > length ? `${value.slice(0, length).trimEnd()}...` : value;



const DashboardEmptyState = ({ title, description }: { title: string; description: string }) => (
  <Card sx={{ borderStyle: 'dashed', borderColor: 'divider' }}>
    <CardContent>
      <Stack spacing={1.5} sx={{ py: 6, textAlign: 'center', alignItems: 'center' }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 2,
            bgcolor: 'grey.100',
            display: 'grid',
            placeItems: 'center',
            color: 'text.secondary',
            fontWeight: 900,
            fontSize: 24,
          }}
        >
          0
        </Box>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 800 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560 }}>
          {description}
        </Typography>
      </Stack>
    </CardContent>
  </Card>
);

export const AdminDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [surveys, setSurveys] = useState<SurveySummaryDto[]>([]);
  const [surveyId, setSurveyId] = useState('');
  const [statusFilter, setStatusFilter] = useState<NonNullable<AnalyticsFilters['status']>>('completed');
  const [analytics, setAnalytics] = useState<AnalyticsDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    dashboardService
      .surveys({ includePartial: statusFilter !== 'completed' })
      .then((items) => {
        if (!mounted) return;
        setSurveys(items);
        setSurveyId(items[0]?.surveyId ?? '');
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setError('Không thể tải danh sách khảo sát');
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [statusFilter]);

  useEffect(() => {
    if (!surveyId) return;

    dashboardService
      .analytics(surveyId, { status: statusFilter })
      .then((res) => setAnalytics(res))
      .catch(() => setError('Không thể tải dữ liệu phân tích'));
  }, [surveyId, statusFilter]);

  const radarData = useMemo(() => {
    if (!analytics) return null;
    return {
      labels: analytics.charts.radar.labels,
      data: analytics.charts.radar.datasets[0]?.data ?? [],
    };
  }, [analytics]);

  const sortedQuestions = useMemo(() => {
    if (!analytics) return [];
    return [...analytics.questions].sort((a, b) => b.average - a.average);
  }, [analytics]);

  const topQuestions = useMemo(() => sortedQuestions.slice(0, 5), [sortedQuestions]);
  const bottomQuestions = useMemo(
    () => [...sortedQuestions].slice(-5).reverse(),
    [sortedQuestions],
  );

  const completionDistribution = analytics?.stats.completionDistribution ?? [0, 0, 0];
  const eligibleCompletionDistribution = [completionDistribution[0] ?? 0, completionDistribution[1] ?? 0];


  if (loading) return <LoadingScreen label="Đang tải tổng quan..." />;

  return (
    <Stack spacing={2.5}>
      <AdminPageHeader
        title="Tổng quan phân tích QUIS"
        subtitle="Thống kê điểm trung bình, xu hướng và phân bố phản hồi của khảo sát."
      />

      {error && <Alert severity="error">{error}</Alert>}

      {!surveys.length ? (
        <DashboardEmptyState
          title={'\u0043h\u01b0a c\u00f3 kh\u1ea3o s\u00e1t \u0111\u1ec3 th\u1ed1ng k\u00ea'}
          description={'\u004bhi c\u00f3 kh\u1ea3o s\u00e1t v\u00e0 ph\u1ea3n h\u1ed3i h\u1ee3p l\u1ec7, dashboard s\u1ebd hi\u1ec3n th\u1ecb \u0111i\u1ec3m trung b\u00ecnh, ph\u00e2n ph\u1ed1i \u0111i\u1ec3m v\u00e0 c\u00e1c bi\u1ec3u \u0111\u1ed3 ph\u00e2n t\u00edch t\u1ea1i \u0111\u00e2y.'}
        />
      ) : (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' } }}>
          <TextField
            select
            size="small"
            label="Khảo sát"
            value={surveyId}
            onChange={(e) => setSurveyId(e.target.value)}
            sx={{ width: { xs: '100%', md: 400 } }}
            slotProps={{
              select: {
                renderValue: (selected: unknown) => {
                  const id = selected as string;
                  const survey = surveys.find((s) => s.surveyId === id);
                  return <span title={survey?.title ?? ''}>{survey ? truncate(survey.title) : ''}</span>;
                },
                MenuProps: {
                  slotProps: { paper: { sx: { maxHeight: 300, overflowX: 'auto' } } },
                },
              },
            }}
          >
            {surveys.map((s) => (
              <MenuItem
                key={s.surveyId}
                value={s.surveyId}
                sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                <span title={s.title}>{truncate(s.title)}</span>
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Trạng thái"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as NonNullable<AnalyticsFilters['status']>)}
            sx={{ width: { xs: '100%', md: 280 } }}
          >
            <MenuItem value="completed">Hoàn thành 100%</MenuItem>
            <MenuItem value="all">Tất cả phản hồi (&gt;=80%)</MenuItem>
          </TextField>
        </Stack>
      )}

      {surveys.length > 0 && !analytics ? (
        <LoadingScreen label="Đang tải dữ liệu phân tích..." />
      ) : analytics ? (
        analytics.stats.totalResponses === 0 ? (
          <DashboardEmptyState
            title={'\u0043h\u01b0a c\u00f3 ph\u1ea3n h\u1ed3i n\u00e0o'}
            description={'\u004bh\u1ea3o s\u00e1t \u0111\u00e3 s\u1eb5n s\u00e0ng, nh\u01b0ng ch\u01b0a c\u00f3 ng\u01b0\u1eddi tham gia g\u1eedi c\u00e2u tr\u1ea3 l\u1eddi. H\u00e3y chia s\u1ebb m\u00e3/link kh\u1ea3o s\u00e1t, sau \u0111\u00f3 quay l\u1ea1i dashboard \u0111\u1ec3 xem th\u1ed1ng k\u00ea.'}
          />
        ) : (
        <>
          <Box className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  Điểm trung bình
                </Typography>
                <Typography variant="h3" component="p" sx={{ fontWeight: 900 }}>
                  {analytics.stats.overallAverage}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {analytics.stats.interpretation?.description ?? 'Chưa có nhận định'}
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  Tổng phản hồi
                </Typography>
                <Typography variant="h3" component="p" sx={{ fontWeight: 900 }}>
                  {analytics.stats.totalResponses}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Người tham gia duy nhất: {analytics.stats.uniqueParticipants}
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  Mức UX
                </Typography>
                <Typography variant="h3" component="p" sx={{ fontWeight: 900 }}>
                  {analytics.stats.interpretation?.level ?? '—'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Thang đo: 1–9
                </Typography>
              </CardContent>
            </Card>
          </Box>


          {/* Hàng 1: 2 biểu đồ trung bình theo danh mục */}
          <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card sx={{ minHeight: 420 }}>
              <CardContent>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 800 }}>
                  Biểu đồ radar theo danh mục
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  So sánh điểm trung bình giữa các danh mục QUIS
                </Typography>
                {radarData && <RadarChart labels={radarData.labels} data={radarData.data} height={320} />}
              </CardContent>
            </Card>

            <Card sx={{ minHeight: 420 }}>
              <CardContent>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 800 }}>
                  Biểu đồ cột theo danh mục
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Điểm trung bình từng danh mục (thang 1–9)
                </Typography>
                <BarChart
                  labels={analytics.charts.bar.labels}
                  data={analytics.charts.bar.datasets[0]?.data ?? []}
                  height={320}
                />
              </CardContent>
            </Card>
          </Box>

          {/* Hàng 2: biểu đồ đường xu hướng theo trình tự câu hỏi (chart chi tiết - lớn hơn) */}
          <Card sx={{ minHeight: 380 }}>
            <CardContent>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 800 }}>
                Xu hướng điểm trung bình theo trình tự câu hỏi
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Hình dạng đường biểu diễn cho thấy phần nào của khảo sát đang được đánh giá tốt/kém
              </Typography>
              <LineChart
                labels={analytics.questionCharts.bar.labels}
                data={analytics.questionCharts.bar.datasets[0]?.data ?? []}
                height={300}
              />
            </CardContent>
          </Card>

          {/* Hàng 3: phân bố phản hồi theo điểm + mức độ hoàn thành */}
          <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card sx={{ minHeight: 360 }}>
              <CardContent>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 800 }}>
                  Phân bố phản hồi theo mức điểm
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Số phản hồi rơi vào từng mức điểm QUIS
                </Typography>
                <PieChart labels={analytics.charts.pie.labels} data={analytics.charts.pie.data} height={280} />
              </CardContent>
            </Card>

            <Card sx={{ minHeight: 360 }}>
              <CardContent>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 800 }}>
                  Phân bố mức độ hoàn thành
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Chỉ tính phản hồi đạt ngưỡng phân tích; draft dưới 80% tách khỏi biểu đồ này
                </Typography>
                <DoughnutChart
                  labels={['Hoàn thành 100%', 'Đạt ngưỡng 80-99%']}
                  data={eligibleCompletionDistribution}
                  colors={[CHART_PALETTE.distribution[3], CHART_PALETTE.distribution[2], CHART_PALETTE.distribution[0]]}
                  height={280}
                />
              </CardContent>
            </Card>
          </Box>

          {/* Hàng 4: top 5 cao nhất / thấp nhất */}
          <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card sx={{ minHeight: 360 }}>
              <CardContent>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 800 }}>
                  5 câu hỏi được đánh giá cao nhất
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Điểm mạnh của hệ thống cần được duy trì
                </Typography>
                {topQuestions.length > 0 ? (
                  <HorizontalBarChart
                    labels={topQuestions.map((q) => `Q${q.sequence}. ${truncate(q.questionContent, 36)}`)}
                    data={topQuestions.map((q) => q.average)}
                    color={CHART_PALETTE.distribution[2]}
                    height={Math.max(260, topQuestions.length * 48)}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Chưa có dữ liệu.
                  </Typography>
                )}
              </CardContent>
            </Card>

            <Card sx={{ minHeight: 360 }}>
              <CardContent>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 800 }}>
                  5 câu hỏi cần cải thiện
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Điểm yếu cần ưu tiên rà soát
                </Typography>
                {bottomQuestions.length > 0 ? (
                  <HorizontalBarChart
                    labels={bottomQuestions.map((q) => `Q${q.sequence}. ${truncate(q.questionContent, 36)}`)}
                    data={bottomQuestions.map((q) => q.average)}
                    color={CHART_PALETTE.distribution[0]}
                    height={Math.max(260, bottomQuestions.length * 48)}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Chưa có dữ liệu.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        </>
        )
      ) : null}
    </Stack>
  );
};
