import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { responseService } from '../../services/response.service';
import { surveyService } from '../../services/survey.service';
import type { ResponseListItemDto } from '../../types/response';
import type { SurveyListItemDto } from '../../types/survey';

export const SurveyReportsPage = () => {
  const [surveys, setSurveys] = useState<SurveyListItemDto[]>([]);
  const [surveyId, setSurveyId] = useState('');
  const [items, setItems] = useState<ResponseListItemDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [includePartial, setIncludePartial] = useState(false);
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [cleanupBusy, setCleanupBusy] = useState(false);
  const [cleanupNotice, setCleanupNotice] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    surveyService
      .list()
      .then((res) => {
        setSurveys(res.items);
        setSurveyId(res.items[0]?.id ?? '');
      })
      .catch(() => setError('Không thể tải danh sách khảo sát'));
  }, []);

  useEffect(() => {
    if (!surveyId) return;
    setError(null);
    responseService
      .list(surveyId, 1, 20, { includePartial })
      .then((res) => setItems(res.items))
      .catch(() => setError('Không thể tải phản hồi'));
  }, [surveyId, includePartial, reloadKey]);

  const handleCleanup = async () => {
    if (!surveyId) return;
    setCleanupBusy(true);
    try {
      const result = await responseService.cleanupDrafts({ surveyId });
      setCleanupNotice(`Đã xóa ${result.count} bản nháp dưới 80%.`);
      setReloadKey((k) => k + 1);
    } catch {
      setCleanupNotice('Xóa bản nháp thất bại.');
    } finally {
      setCleanupBusy(false);
      setCleanupOpen(false);
    }
  };

  return (
    <Stack spacing={2.5}>
      <AdminPageHeader
        title="Báo cáo khảo sát"
        subtitle="Xem danh sách phản hồi chi tiết và kết quả khảo sát của người tham gia."
      />

      {error && <Alert severity="error">{error}</Alert>}
      {cleanupNotice && (
        <Alert severity="info" onClose={() => setCleanupNotice(null)}>
          {cleanupNotice}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' } }}>
        <TextField
          select
          size="small"
          label="Khảo sát"
          value={surveyId}
          onChange={(e) => setSurveyId(e.target.value)}
          sx={{ width: { xs: '100%', sm: 400 } }}
          slotProps={{
            select: {
              renderValue: (selected: unknown) => {
                const id = selected as string;
                const survey = surveys.find((s) => s.id === id);
                const title = survey?.title ?? '';
                return <span title={title}>{title.length > 48 ? `${title.slice(0, 48).trimEnd()}...` : title}</span>;
              },
              MenuProps: {
                slotProps: { paper: { sx: { maxHeight: 300, overflowX: 'auto' } } },
              },
            },
          }}
        >
          {surveys.map((s) => {
            const title = s.title.length > 48
              ? `${s.title.slice(0, 48).trimEnd()}...`
              : s.title;
            return (
              <MenuItem
                key={s.id}
                value={s.id}
                sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                <span title={s.title}>{title}</span>
              </MenuItem>
            );
          })}
        </TextField>

        <FormControlLabel
          control={
            <Switch
              checked={includePartial}
              onChange={(e) => setIncludePartial(e.target.checked)}
            />
          }
          label="Hiển thị cả bản chưa hoàn thành (≥80%)"
        />

        <Button
          variant="outlined"
          color="error"
          onClick={() => setCleanupOpen(true)}
          disabled={!surveyId}
        >
          Dọn dẹp draft &lt; 80%
        </Button>
      </Stack>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 800 }} className="mb-4">
            Phản hồi mới nhất
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Thời điểm gửi</TableCell>
                <TableCell>Người tham gia</TableCell>
                <TableCell>Loại</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell align="right">Điểm TB chung</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((r) => {
                const completed = r.isComplete ?? true;
                const percent = r.completionPercent ?? 100;
                return (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.submittedAt).toLocaleString()}</TableCell>
                    <TableCell>
                      {r.participant.fullName ?? r.participant.email ?? r.participant.id}
                    </TableCell>
                    <TableCell>{r.participant.type}</TableCell>
                    <TableCell>
                      {completed ? (
                        <Chip size="small" color="success" label="Hoàn thành" variant="filled" />
                      ) : (
                        <Chip
                          size="small"
                          color="warning"
                          variant="filled"
                          label={`Chưa hoàn thành (${percent}%)`}
                        />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {r.quisScore ? Number(r.quisScore.overallAverage).toFixed(2) : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>Chưa có phản hồi.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={cleanupOpen} onClose={() => setCleanupOpen(false)}>
        <DialogTitle>Xác nhận dọn dẹp</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Thao tác này sẽ xóa toàn bộ bản nháp khảo sát có tiến độ dưới 80% của khảo sát đang chọn.
            Hành động không thể hoàn tác.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCleanupOpen(false)} disabled={cleanupBusy}>
            Hủy
          </Button>
          <Button color="error" onClick={handleCleanup} disabled={cleanupBusy}>
            {cleanupBusy ? 'Đang xóa...' : 'Xóa'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};
