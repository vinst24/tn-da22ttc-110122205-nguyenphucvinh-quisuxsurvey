type DraftThresholdBadgeProps = {
  progress: number;
};

const DRAFT_THRESHOLD_PERCENT = 80;

export const DraftThresholdBadge = ({ progress }: DraftThresholdBadgeProps) => {
  const reachedThreshold = progress >= DRAFT_THRESHOLD_PERCENT;
  const roundedProgress = Math.round(progress);

  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-xs leading-5 ${
        reachedThreshold
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-amber-200 bg-amber-50 text-amber-800'
      }`}
    >
      <div className="font-semibold">
        {reachedThreshold
          ? '✓ Đủ tiến độ tối thiểu'
          : `Tiến độ chưa đủ ${DRAFT_THRESHOLD_PERCENT}%`}
      </div>
      <div className={reachedThreshold ? 'text-emerald-700' : 'text-amber-700'}>
        {reachedThreshold
          ? 'Nếu thoát giữa chừng, phản hồi sẽ được ghi nhận như một partial submission.'
          : `Hiện tại ${roundedProgress}%. Nếu thoát, dữ liệu nháp dưới ngưỡng có thể bị dọn sau thời gian lưu nháp của hệ thống.`}
      </div>
    </div>
  );
};
