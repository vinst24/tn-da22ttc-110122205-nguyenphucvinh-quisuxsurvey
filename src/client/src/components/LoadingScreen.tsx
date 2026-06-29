import { Box, CircularProgress, Typography } from '@mui/material';

export const LoadingScreen = ({ label = 'Loading...' }: { label?: string }) => {
  return (
    <Box className="min-h-[60vh] flex items-center justify-center">
      <Box className="flex flex-col items-center gap-3">
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Box>
    </Box>
  );
};

