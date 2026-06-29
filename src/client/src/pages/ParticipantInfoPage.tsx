import { RefreshCw, User } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FieldLabel, InputIcon } from '../components/FormControls';
import { ResearchConsent } from '../components/ResearchConsent';
import { PATHS } from '../constants/paths';
import {
  SPECIALTY_FIELD_LABEL,
  SPECIALTY_OPTIONS,
  SPECIALTY_STEP3_PLACEHOLDER,
  getSpecialtyLabel,
  type SpecialtyValue,
} from '../constants/specialties';
import { useAuth } from '../contexts/AuthContext';
import { participantService } from '../services/participant.service';
import { normalizeParticipantInfo } from '../utils/participantValidation';

export const ParticipantInfoPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, participant } = useAuth();
  const flowState = (location.state ?? {}) as {
    surveyId?: string;
    surveySlug?: string;
    guestToken?: string;
    surveyTitle?: string;
    fullName?: string;
    major?: SpecialtyValue;
  };

  const isAuthenticated = Boolean(user);
  const [nickname, setNickname] = useState(flowState.fullName ?? participant?.fullName ?? user?.fullName ?? '');
  const [major, setMajor] = useState<SpecialtyValue | ''>(flowState.major ?? participant?.major ?? '');
  const [consentAccepted, setConsentAccepted] = useState(false);

  // Guest info dialog state
  const [guestInfoDialog, setGuestInfoDialog] = useState<{
    nickname: string;
    specialty: SpecialtyValue | '';
  } | null>(null);

  useEffect(() => {
    if (!flowState.surveyId) {
      navigate(PATHS.SURVEY);
    }
  }, [flowState.surveyId, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setNickname(participant?.fullName ?? user?.fullName ?? '');
    setMajor(participant?.major ?? '');
  }, [isAuthenticated, participant?.fullName, participant?.major, user?.fullName]);

  // Kiểm tra guest info từ cookie khi load trang (chỉ cho guest, không phải authenticated user)
  useEffect(() => {
    if (isAuthenticated) return;
    let cancelled = false;
    const load = async () => {
      try {
        const info = await participantService.getGuestInfo();
        if (cancelled) return;
        if (info && (info.nickname || info.specialty)) {
          setGuestInfoDialog({
            nickname: info.nickname ?? '',
            specialty: (info.specialty as SpecialtyValue) ?? '',
          });
        }
      } catch {
        // ignore
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const handleUseGuestInfo = () => {
    if (!guestInfoDialog) return;
    setNickname(guestInfoDialog.nickname);
    setMajor(guestInfoDialog.specialty);
    setGuestInfoDialog(null);
    setConsentAccepted(true);
  };

  const handleEnterNewInfo = () => {
    if (!guestInfoDialog) return;
    setNickname('');
    setMajor('');
    setGuestInfoDialog(null);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleStartSurvey();
  };

  const handleStartSurvey = () => {
    if (!consentAccepted) return;
    if (!flowState.surveyId) return;

    const slug = flowState.surveySlug ?? flowState.surveyId;
    if (!slug) return;
    const guestInfo = normalizeParticipantInfo({ nickname, major });

    navigate(PATHS.TAKE_SURVEY(slug), {
      state: {
        surveySlug: flowState.surveySlug,
        guestToken: flowState.guestToken,
        ...(isAuthenticated ? {} : guestInfo),
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-900">Thông tin người tham gia</h1>
            {flowState.surveyTitle && (
              <p className="mt-1 text-xs text-slate-500">
                Khảo sát: <span className="font-medium text-slate-700">{flowState.surveyTitle}</span>
              </p>
            )}
          </div>

          <div className="mb-6">
            <ResearchConsent accepted={consentAccepted} onAcceptedChange={setConsentAccepted} />
          </div>

          {isAuthenticated ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <InfoRow label="Họ tên" value={participant?.fullName ?? user?.fullName ?? 'Chưa có'} />
                <InfoRow label="Email" value={user?.email ?? 'Chưa có'} />
                <InfoRow
                  label={SPECIALTY_FIELD_LABEL}
                  value={participant?.major ? getSpecialtyLabel(participant.major) : SPECIALTY_STEP3_PLACEHOLDER}
                />
              </div>

              <button
                type="button"
                onClick={handleStartSurvey}
                disabled={!consentAccepted}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg hover:shadow-xl disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
              >
                Bắt đầu khảo sát
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <FieldLabel htmlFor="participant-nickname" optional="(không bắt buộc)">Mã/Bí danh người tham gia</FieldLabel>
                <div className="relative">
                  <InputIcon>
                  <User className="w-5 h-5" />
                </InputIcon>
                  <input
                    id="participant-nickname"
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    placeholder="Nhập nickname của bạn"
                  />
                </div>
              </div>

              <div>
                <FieldLabel htmlFor="participant-specialty">{SPECIALTY_FIELD_LABEL}</FieldLabel>
                <select
                  id="participant-specialty"
                  value={major}
                  onChange={(e) => setMajor(e.target.value as SpecialtyValue | '')}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">{SPECIALTY_STEP3_PLACEHOLDER}</option>
                  {SPECIALTY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={!consentAccepted}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg hover:shadow-xl disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
              >
                Bắt đầu khảo sát
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Guest info dialog */}
      {guestInfoDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-blue-700" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Bạn đã từng tham gia khảo sát
              </h3>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Tên/Bí danh:</span>
                <span className="font-medium text-slate-900">{guestInfoDialog.nickname || 'Chưa cung cấp'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Lĩnh vực:</span>
                <span className="font-medium text-slate-900">
                  {guestInfoDialog.specialty ? getSpecialtyLabel(guestInfoDialog.specialty) : 'Chưa cung cấp'}
                </span>
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-600 leading-6">
              Bạn muốn dùng lại thông tin này, hay nhập thông tin mới?
            </p>

            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                onClick={handleEnterNewInfo}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
              >
                Nhập thông tin mới
              </button>
              <button
                type="button"
                onClick={handleUseGuestInfo}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-purple-700 transition shadow-md"
              >
                Dùng thông tin cũ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-200 last:border-0">
      <span className="text-slate-600">{label}:</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}
