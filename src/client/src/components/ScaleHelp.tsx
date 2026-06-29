import { HelpCircle, X } from 'lucide-react';
import { useState } from 'react';

type ScaleHelpProps = {
  onClose: () => void;
  onDismissPermanently: () => void;
};

export function ScaleHelp({ onClose, onDismissPermanently }: ScaleHelpProps) {
  const [doNotShowAgain, setDoNotShowAgain] = useState(false);

  const handleClose = () => {
    if (doNotShowAgain) {
      onDismissPermanently();
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="scale-help-title"
        className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Đóng hướng dẫn thang đo"
          title="Đóng"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-4 pr-10">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-md">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">Hướng dẫn thang đo</p>
            <h2 id="scale-help-title" className="mt-1 text-xl font-semibold text-slate-900">
              Cách trả lời thang QUIS 1-9
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Mỗi câu hỏi là một cặp ý nghĩa đối lập. Hãy chọn mức phản ánh cảm nhận của bạn về hệ thống, không cần suy nghĩ quá lâu.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
            <div className="text-sm font-semibold text-red-800">1-4</div>
            <p className="mt-1 text-sm leading-5 text-red-700">Nghiêng về phía đánh giá tiêu cực hoặc mức thấp.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">5</div>
            <p className="mt-1 text-sm leading-5 text-slate-600">Trung lập, bình thường hoặc chưa nghiêng rõ về bên nào.</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="text-sm font-semibold text-emerald-800">6-9</div>
            <p className="mt-1 text-sm leading-5 text-emerald-700">Nghiêng về phía đánh giá tích cực hoặc mức cao.</p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
          Ví dụ: với cặp "Khó hiểu - Rõ ràng", chọn 1 nếu rất khó hiểu, 5 nếu bình thường, và 9 nếu rất rõ ràng.
        </div>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={doNotShowAgain}
              onChange={(event) => setDoNotShowAgain(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Không hiển thị lại
          </label>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-blue-700 hover:to-purple-700"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}