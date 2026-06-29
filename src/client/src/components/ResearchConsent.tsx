type ResearchConsentProps = {
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
};

const consentItems = [
  { title: 'Mục đích', description: 'Đánh giá UX theo thang QUIS.' },
  { title: 'Ẩn danh', description: 'Không công khai danh tính cá nhân.' },
  { title: 'Tự nguyện', description: 'Có thể dừng bất kỳ lúc nào.' },
  { title: 'Thời gian', description: '≈ 10 phút.' },
];

const CheckIcon = () => (
  <svg className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const ResearchConsent = ({ accepted, onAcceptedChange }: ResearchConsentProps) => {
  return (
    <section className="rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-4 text-left">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Đồng thuận tham gia nghiên cứu</h2>
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-600">
          Informed Consent
        </span>
      </div>

      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {consentItems.map((item) => (
          <li key={item.title} className="flex items-start gap-2 text-xs leading-5 text-slate-700">
            <CheckIcon />
            <span>
              <span className="font-semibold text-slate-900">{item.title}:</span> {item.description}
            </span>
          </li>
        ))}
      </ul>

      <label className="mt-3 flex cursor-pointer items-center gap-2.5 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs text-slate-700 transition hover:bg-blue-50">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => onAcceptedChange(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <span>Tôi đồng ý tham gia khảo sát và cho phép dùng phản hồi ẩn danh cho nghiên cứu UX.</span>
      </label>
    </section>
  );
};