import { Alert, Snackbar } from '@mui/material';
import React, { createContext, useContext, useMemo, useState } from 'react';

type NotificationSeverity = 'success' | 'error' | 'info' | 'warning';

type NotificationContextValue = {
  notify: (message: string, severity?: NotificationSeverity) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [notification, setNotification] = useState<{ message: string; severity: NotificationSeverity } | null>(null);

  const value = useMemo(
    () => ({
      notify: (message: string, severity: NotificationSeverity = 'info') => {
        setNotification({ message, severity });
      },
    }),
    [],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Snackbar
        open={Boolean(notification)}
        autoHideDuration={4000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setNotification(null)} severity={notification?.severity ?? 'info'} sx={{ width: '100%' }}>
          {notification?.message ?? ''}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
};
