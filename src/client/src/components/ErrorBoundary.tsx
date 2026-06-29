import { Component, type ErrorInfo, type ReactNode } from 'react';

type ErrorBoundaryProps = {
  children: ReactNode;
  fallbackTitle?: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[320px] flex items-center justify-center p-6">
          <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-red-500">Loi hien thi</p>
            <h2 className="mt-3 text-xl font-bold text-red-950">
              {this.props.fallbackTitle ?? 'Trang nay dang gap loi'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-red-800">
              Vui long tai lai trang. Neu loi lap lai, hay ghi lai thao tac vua thuc hien de kiem tra log.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Tai lai trang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
