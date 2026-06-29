import {
  Alert,
  Button,
  Card,
  CardActions,
  CardContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { categoryService } from '../../services/category.service';
import { surveyService } from '../../services/survey.service';
import type { CategoryDto, SurveyListItemDto } from '../../types/survey';

export const ManageCategoriesPage = () => {
  const [, setSurveys] = useState<SurveyListItemDto[]>([]);
  const [surveyId, setSurveyId] = useState('');
  const [items, setItems] = useState<CategoryDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
      surveyService
        .list()
        .then((res) => {
          setSurveys(res.items);
          setSurveyId((current) => current || res.items[0]?.id || '');
        })
      .catch(() => setError('Không thể tải danh sách khảo sát'));
  }, []);

  const load = (id: string) =>
    categoryService
      .listBySurvey(id)
      .then((rows) => setItems(rows))
      .catch(() => setError('Không thể tải danh mục'));

  useEffect(() => {
    if (!surveyId) return;
    load(surveyId);
  }, [surveyId]);

  const onCreate = async () => {
    if (!surveyId) return;
    setError(null);
    try {
      await categoryService.create({ surveyId, name, description: description || undefined });
      setName('');
      setDescription('');
      await load(surveyId);
    } catch {
      setError('Tạo danh mục thất bại');
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('Xóa danh mục này?')) return;
    setError(null);
    try {
      await categoryService.remove(id);
      await load(surveyId);
    } catch {
      setError('Xóa danh mục thất bại');
    }
  };

  return (
    <Stack spacing={2.5}>
      <AdminPageHeader
        title="Quản lý danh mục"
        subtitle="Bộ danh mục này được dùng chung cho tất cả survey."
      />

      {error && <Alert severity="error">{error}</Alert>}

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Tạo danh mục
            </Typography>
            <TextField label="Tên" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
            <TextField
              label="Mô tả (không bắt buộc)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
            <Button variant="contained" onClick={onCreate} disabled={!name}>
              Tạo
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Stack spacing={2}>
        {items.map((c) => (
          <Card key={c.id}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {c.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {c.description ?? '—'}
              </Typography>
            </CardContent>
            <CardActions>
              <Button color="error" onClick={() => onDelete(c.id)}>
                Xóa
              </Button>
            </CardActions>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
};
