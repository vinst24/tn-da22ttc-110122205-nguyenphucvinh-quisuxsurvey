import { useCallback, useEffect, useState } from 'react';

const OFFLINE_MESSAGE = 'Mất kết nối mạng. Vui lòng kiểm tra lại đường truyền.';
const ONLINE_MESSAGE = 'Đã kết nối lại.';

export const NetworkStatusProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);
  const [bannerMessage, setBannerMessage] = useState('');

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setBannerMessage(ONLINE_MESSAGE);
    setShowBanner(true);
    setTimeout(() => setShowBanner(false), 3000);
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setBannerMessage(OFFLINE_MESSAGE);
    setShowBanner(true);
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return (
    <>
      {showBanner && (
        <div
          className={`fixed top-0 left-0 right-0 z-[9999] px-4 py-3 text-center text-sm font-semibold shadow-lg transition-all ${
            isOnline
              ? 'bg-emerald-600 text-white'
              : 'bg-red-600 text-white'
          }`}
          role="alert"
        >
          <div className="flex items-center justify-center gap-2">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                isOnline ? 'bg-emerald-200' : 'bg-red-300'
              }`}
            />
            {bannerMessage}
            <button
              onClick={() => setShowBanner(false)}
              className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full hover:bg-white/20 transition-colors"
              aria-label="Đóng"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {children}
    </>
  );
};