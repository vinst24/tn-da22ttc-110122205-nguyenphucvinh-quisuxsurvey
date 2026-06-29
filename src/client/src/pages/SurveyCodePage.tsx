import { Alert, Box } from '@mui/material';
import { CheckCircle, Clock, FileText, Key } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { FieldLabel } from '../components/FormControls';
import { PATHS } from '../constants/paths';
import { surveyService } from '../services/survey.service';
import { ApiError } from '../types/api';

const surveyAccessTokenKey = (slug: string) => `quis_survey_access_token_${slug}`;

export const SurveyCodePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedSurvey = (location.state ?? {}) as {
    surveyId?: string;
    surveySlug?: string;
    surveyTitle?: string;
  };
  const [surveyCode, setSurveyCode] = useState('');
  const [surveyInfo, setSurveyInfo] = useState<{
    surveyId: string;
    surveySlug: string;
    title: string;
    description?: string;
    questionCount: number;
    isActive: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const hasSurveyContext = Boolean(selectedSurvey.surveyId);

  const handleCheckCode = async () => {
    const token = surveyCode.trim();
    if (!token) return;
    if (!selectedSurvey.surveyId) {
      setSurveyInfo(null);
      setError('Vui lòng chọn một khảo sát cụ thể từ danh sách trước khi nhập mã truy cập.');
      return;
    }

    setError(null);
    setSurveyInfo(null);
    setIsChecking(true);

    try {
      const info = await surveyService.validateToken(token, selectedSurvey.surveyId);
      const surveySlug = info.surveySlug ?? selectedSurvey.surveySlug ?? info.surveyId;
      window.sessionStorage.setItem(surveyAccessTokenKey(surveySlug), token);
      setSurveyInfo({
        surveyId: info.surveyId,
        surveySlug,
        title: info.title,
        description: info.description ?? undefined,
        questionCount: info.questionCount,
        isActive: info.isActive,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Mã khảo sát không hợp lệ');
    } finally {
      setIsChecking(false);
    }
  };

  const handleJoinSurvey = () => {
    if (!surveyInfo) return;
    navigate(PATHS.PARTICIPANT_INFO, {
      state: {
        surveyId: surveyInfo.surveyId,
        surveySlug: surveyInfo.surveySlug,
        guestToken: surveyCode.trim(),
        surveyTitle: surveyInfo.title,
      },
    });
  };

  const helpText = useMemo(() => 'Bạn chưa có mã khảo sát?', []);

  return (
    <Box className="max-w-2xl mx-auto py-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <Key className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Nhập mã khảo sát</h1>
        <p className="text-slate-600">Vui lòng nhập mã khảo sát để bắt đầu tham gia</p>
        {selectedSurvey.surveyTitle && (
          <p className="mt-2 text-sm text-slate-500">
            Khảo sát: <span className="font-semibold text-slate-900">{selectedSurvey.surveyTitle}</span>
          </p>
        )}
      </div>

      {!hasSurveyContext && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">
          Màn hình này cần đi từ một khảo sát riêng tư cụ thể. Hãy quay lại danh sách khảo sát và chọn đúng khảo sát cần mã truy cập.
          <div className="mt-4">
            <RouterLink
              to={PATHS.SURVEY}
              className="inline-flex items-center rounded-xl bg-amber-600 px-4 py-2 font-semibold text-white transition hover:bg-amber-700"
            >
              Đi đến danh sách khảo sát
            </RouterLink>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 mb-6">
        <div className="space-y-4">
          <FieldLabel htmlFor="survey-code" className="mb-0">Mã khảo sát</FieldLabel>
          <input
            id="survey-code"
            type="text"
            value={surveyCode}
            onChange={(e) => setSurveyCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && hasSurveyContext) handleCheckCode();
            }}
            disabled={!hasSurveyContext}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-center text-2xl font-mono tracking-wider disabled:bg-slate-100 disabled:text-slate-400"
            placeholder="Nhập mã khảo sát"
            inputMode="text"
            autoComplete="one-time-code"
            aria-describedby={error ? 'survey-code-error' : undefined}
          />
          <button
            onClick={handleCheckCode}
            disabled={!hasSurveyContext || !surveyCode.trim() || isChecking}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isChecking ? 'Đang kiểm tra...' : 'Kiểm tra mã'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6">
          <Alert id="survey-code-error" severity="error">{error}</Alert>
        </div>
      )}

      {surveyInfo && (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-start gap-3 mb-6">
            <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">{surveyInfo.title}</h2>
              {surveyInfo.description && <p className="text-slate-600">{surveyInfo.description}</p>}
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <InfoRow
              icon={<Clock className="w-5 h-5 text-blue-600" />}
              label="Thời gian ước tính"
              value="10–15 phút"
            />
            <InfoRow
              icon={<FileText className="w-5 h-5 text-blue-600" />}
              label="Số lượng câu hỏi"
              value={`${surveyInfo.questionCount} câu`}
            />
            <InfoRow
              icon={<CheckCircle className="w-5 h-5 text-green-500" />}
              label="Trạng thái"
              value={surveyInfo.isActive ? 'Đang hoạt động' : 'Không hoạt động'}
              valueClassName={
                surveyInfo.isActive ? 'text-green-600 font-medium' : 'text-slate-600 font-medium'
              }
            />
          </div>

          <button
            onClick={handleJoinSurvey}
            disabled={!surveyInfo.isActive}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {surveyInfo.isActive ? 'Tham gia khảo sát' : 'Khảo sát chưa hoạt động'}
          </button>
        </div>
      )}

      <div className="mt-8 text-center">
        <p className="text-slate-600 text-sm">
          {helpText}{' '}
          <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
            Liên hệ quản trị viên
          </a>
        </p>
      </div>
    </Box>
  );
};

function InfoRow({
  icon,
  label,
  value,
  valueClassName = 'text-slate-900',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-slate-600">{label}</span>
      </div>
      <span className={valueClassName}>{value}</span>
    </div>
  );
}
