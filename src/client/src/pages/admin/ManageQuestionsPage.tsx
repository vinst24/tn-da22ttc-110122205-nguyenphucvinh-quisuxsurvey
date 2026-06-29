import {
  Alert,
  Box,
  CircularProgress,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
  Accordion,
  AccordionDetails,
  AccordionSummary,
} from '@mui/material';
import { useEffect, useState } from 'react';
import {
  Add,
  AddCircleOutlined,
  ArrowDropDown,
  DeleteOutlined,
  DragIndicator,
  EditOutlined,
  FolderOpen,
  HelpOutlined,
  Refresh,
} from '@mui/icons-material';
import { ApiError } from '../../types/api';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import type { CategoryDto, QuestionDto, SurveyListItemDto } from '../../types/survey';
import { categoryService } from '../../services/category.service';
import { questionService } from '../../services/question.service';
import { surveyService } from '../../services/survey.service';

type CategoryWithQuestions = CategoryDto & {
  questions: QuestionDto[];
};

type CategoryFormState = {
  surveyId: string;
  name: string;
  description: string;
  order: string;
};

type QuestionFormState = {
  categoryId: string;
  content: string;
  order: string;
  isRequired: boolean;
};

const emptyCategoryForm = (surveyId = ''): CategoryFormState => ({
  surveyId,
  name: '',
  description: '',
  order: '',
});

const emptyQuestionForm = (categoryId = ''): QuestionFormState => ({
  categoryId,
  content: '',
  order: '',
  isRequired: true,
});

const asOptionalNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const nextOrder = (items: Array<{ order: number }>) => {
  if (!items.length) return 0;
  return Math.max(...items.map((item) => item.order ?? -1)) + 1;
};

export const ManageQuestionsPage = () => {
  const [surveys, setSurveys] = useState<SurveyListItemDto[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState('');
  const [categories, setCategories] = useState<CategoryWithQuestions[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [loadingSurveys, setLoadingSurveys] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryMode, setCategoryMode] = useState<'create' | 'edit'>('create');
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategoryForm());
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [questionMode, setQuestionMode] = useState<'create' | 'edit'>('create');
  const [questionForm, setQuestionForm] = useState<QuestionFormState>(emptyQuestionForm());
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  const loadSurveys = async () => {
    setLoadingSurveys(true);
    setError(null);

    try {
      const res = await surveyService.list();
      setSurveys(res.items);

      const firstSurveyId = res.items[0]?.id ?? '';
      setSelectedSurveyId((current) => current || firstSurveyId);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không thể tải danh sách khảo sát');
    } finally {
      setLoadingSurveys(false);
    }
  };

  const loadSurveyContent = async (surveyId: string) => {
    if (!surveyId) {
      setCategories([]);
      setExpandedCategories([]);
      return;
    }

    setLoadingContent(true);
    setError(null);

    try {
      const rows = await categoryService.listBySurvey(surveyId);
      const withQuestions = await Promise.all(
        rows.map(async (category) => ({
          ...category,
          questions: await questionService.listByCategory(category.id),
        })),
      );

      const sorted = withQuestions
        .map((category) => ({
          ...category,
          questions: [...category.questions].sort((a, b) => a.order - b.order),
        }))
        .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

      setCategories(sorted);
      setExpandedCategories(sorted.map((category) => category.id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không thể tải danh mục và câu hỏi');
      setCategories([]);
      setExpandedCategories([]);
    } finally {
      setLoadingContent(false);
    }
  };

  useEffect(() => {
    void loadSurveys();
  }, []);

  useEffect(() => {
    if (!selectedSurveyId) return;
    void loadSurveyContent(selectedSurveyId);
  }, [selectedSurveyId]);

  const refreshContent = async () => {
    if (!selectedSurveyId) return;
    await loadSurveyContent(selectedSurveyId);
  };

  const openCreateCategory = () => {
    setCategoryMode('create');
    setCategoryForm(
      emptyCategoryForm(
        selectedSurveyId || surveys[0]?.id || '',
      ),
    );
    setEditingCategoryId(null);
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (category: CategoryWithQuestions) => {
    setCategoryMode('edit');
    setCategoryForm({
      surveyId: selectedSurveyId,
      name: category.name,
      description: category.description ?? '',
      order: category.order?.toString() ?? '',
    });
    setEditingCategoryId(category.id);
    setCategoryDialogOpen(true);
  };

  const openCreateQuestion = (categoryId?: string) => {
    const targetCategoryId = categoryId ?? categories[0]?.id ?? '';
    const targetCategory = categories.find((category) => category.id === targetCategoryId);
    setQuestionMode('create');
    setQuestionForm({
      categoryId: targetCategoryId,
      content: '',
      order: targetCategory ? String(nextOrder(targetCategory.questions)) : '',
      isRequired: true,
    });
    setEditingQuestionId(null);
    setQuestionDialogOpen(true);
  };

  const openEditQuestion = (category: CategoryWithQuestions, question: QuestionDto) => {
    setQuestionMode('edit');
    setQuestionForm({
      categoryId: category.id,
      content: question.content,
      order: question.order?.toString() ?? '',
      isRequired: question.isRequired,
    });
    setEditingQuestionId(question.id);
    setQuestionDialogOpen(true);
  };

  const submitCategory = async () => {
    setError(null);

    try {
      if (categoryMode === 'create') {
        if (!categoryForm.surveyId || !categoryForm.name.trim()) return;

        await categoryService.create({
          surveyId: categoryForm.surveyId,
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim() || undefined,
          order: asOptionalNumber(categoryForm.order),
        });
      } else if (editingCategoryId) {
        await categoryService.update(editingCategoryId, {
          name: categoryForm.name.trim() || undefined,
          description: categoryForm.description.trim() || undefined,
          order: asOptionalNumber(categoryForm.order),
        });
      }

      setCategoryDialogOpen(false);
      setEditingCategoryId(null);
      await refreshContent();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '\u004c\u01b0u danh m\u1ee5c th\u1ea5t b\u1ea1i');
    }
  };

  const submitQuestion = async () => {
    setError(null);

    try {
      if (questionMode === 'create') {
        if (!questionForm.categoryId || !questionForm.content.trim()) return;

        await questionService.create({
          categoryId: questionForm.categoryId,
          content: questionForm.content.trim(),
          order: asOptionalNumber(questionForm.order),
          isRequired: questionForm.isRequired,
        });
      } else if (editingQuestionId) {
        await questionService.update(editingQuestionId, {
          content: questionForm.content.trim() || undefined,
          order: asOptionalNumber(questionForm.order),
          isRequired: questionForm.isRequired,
        });
      }

      setQuestionDialogOpen(false);
      setEditingQuestionId(null);
      await refreshContent();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '\u004c\u01b0u c\u00e2u h\u1ecfi th\u1ea5t b\u1ea1i');
    }
  };

  const deleteCategory = async (category: CategoryWithQuestions) => {
    if (
      !window.confirm(
        `Xóa danh mục "${category.name}"? Hành động này sẽ xóa toàn bộ câu hỏi bên trong.`,
      )
    ) {
      return;
    }

    setError(null);

    try {
      await categoryService.remove(category.id);
      await refreshContent();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '\u0058\u00f3a danh m\u1ee5c th\u1ea5t b\u1ea1i');
    }
  };

  const deleteQuestion = async (question: QuestionDto) => {
    if (!window.confirm('\u0058\u00f3a c\u00e2u h\u1ecfi n\u00e0y?')) return;

    setError(null);

    try {
      await questionService.remove(question.id);
      await refreshContent();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '\u0058\u00f3a c\u00e2u h\u1ecfi th\u1ea5t b\u1ea1i');
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    );
  };

  const canCreateQuestions = categories.length > 0;

  return (
    <Box
      sx={{
        minHeight: '100%',
      }}
    >
      <Stack spacing={3}>
        <AdminPageHeader
          title="Quản lý câu hỏi"
          subtitle="Quản lý bộ danh mục và câu hỏi dùng chung cho tất cả survey."
          actions={
            <>
              <Button
                variant="outlined"
                onClick={refreshContent}
                disabled={!selectedSurveyId || loadingContent}
                startIcon={
                  loadingContent ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <Refresh sx={{ fontSize: 20 }} />
                  )
                }
              >
                Tải lại
              </Button>
              <Button
                variant="contained"
                onClick={openCreateCategory}
                startIcon={<FolderOpen sx={{ fontSize: 20 }} />}
              >
                Thêm danh mục
              </Button>
              <Button
                variant="contained"
                onClick={() => openCreateQuestion()}
                disabled={!canCreateQuestions}
                startIcon={<AddCircleOutlined sx={{ fontSize: 20 }} />}
              >
                Thêm câu hỏi
              </Button>
            </>
          }
        />

        {error && <Alert severity="error">{error}</Alert>}

        <Card sx={{ border: '1px solid rgba(148,163,184,0.18)' }}>
          <CardContent>
            <Stack spacing={2.5}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Bộ câu hỏi dùng chung
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Mỗi survey sẽ sử dụng cùng một bộ danh mục và câu hỏi QUIS.
                </Typography>
              </Box>

              <Divider />

              {loadingSurveys || loadingContent ? (
                <Stack spacing={1.5}>
                  {[0, 1, 2].map((index) => (
                    <Box
                      key={index}
                      sx={{
                        height: 96,
                        borderRadius: 3,
                        background:
                          'linear-gradient(90deg, rgba(226,232,240,0.65), rgba(241,245,249,0.9), rgba(226,232,240,0.65))',
                        backgroundSize: '200% 100%',
                        animation: 'pulse 1.4s ease-in-out infinite',
                      }}
                    />
                  ))}
                </Stack>
              ) : categories.length === 0 ? (
                <Box
                  sx={{
                    py: 8,
                    textAlign: 'center',
                    border: '1px dashed rgba(148,163,184,0.4)',
                    borderRadius: 3,
                    backgroundColor: 'rgba(248, 250, 252, 0.8)',
                  }}
                >
                  <HelpOutlined sx={{ fontSize: 42, color: '#94a3b8', mb: 1.5 }} />
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Chưa có danh mục
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Tạo danh mục đầu tiên để bắt đầu thêm câu hỏi.
                  </Typography>
                  <Button sx={{ mt: 2 }} variant="contained" onClick={openCreateCategory}>
                    Thêm danh mục
                  </Button>
                </Box>
              ) : (
                <Stack spacing={1.5}>
                  {categories.map((category) => {
                    const isExpanded = expandedCategories.includes(category.id);
                    const questionCount = category.questions.length;

                    return (
                      <Accordion
                        key={category.id}
                        expanded={isExpanded}
                        onChange={() => toggleCategory(category.id)}
                        disableGutters
                        elevation={0}
                        sx={{
                          border: '1px solid rgba(148, 163, 184, 0.2)',
                          borderRadius: 3,
                          overflow: 'hidden',
                          '&:before': { display: 'none' },
                        }}
                      >
                        <AccordionSummary
                          expandIcon={<ArrowDropDown sx={{ fontSize: 22 }} />}
                          sx={{
                            px: 2,
                            py: 0.5,
                            background:
                              'linear-gradient(135deg, rgba(248,250,252,1) 0%, rgba(241,245,249,1) 100%)',
                            '& .MuiAccordionSummary-content': {
                              my: 1.5,
                              alignItems: 'center',
                            },
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: { xs: 'column', md: 'row' },
                              gap: 2,
                              alignItems: { xs: 'flex-start', md: 'center' },
                              justifyContent: 'space-between',
                              width: '100%',
                            }}
                          >
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, flex: 1, minWidth: 0 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                                  {category.name}
                                </Typography>
                                <Chip label={`${questionCount} câu hỏi`} size="small" />
                                <Chip label={`Thứ tự ${category.order}`} size="small" variant="outlined" />
                              </Box>
                              <Typography variant="body2" color="text.secondary" noWrap={false}>
                                {category.description ?? 'Không có mô tả'}
                              </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
                              <IconButton
                                size="medium"
                                onClick={() => openCreateQuestion(category.id)}
                                aria-label="Thêm câu hỏi"
                              >
                                <Add sx={{ fontSize: 20 }} />
                              </IconButton>
                              <IconButton
                                size="medium"
                                onClick={() => openEditCategory(category)}
                                aria-label="Sửa danh mục"
                              >
                                <EditOutlined sx={{ fontSize: 20 }} />
                              </IconButton>
                              <IconButton
                                size="medium"
                                color="error"
                                onClick={() => deleteCategory(category)}
                                aria-label="Xóa danh mục"
                              >
                                <DeleteOutlined sx={{ fontSize: 20 }} />
                              </IconButton>
                            </Box>
                          </Box>
                        </AccordionSummary>

                        <AccordionDetails sx={{ p: 0 }}>
                          {questionCount === 0 ? (
                            <Box sx={{ p: 3 }}>
                              <Box
                                sx={{
                                  display: 'flex',
                                  flexDirection: { xs: 'column', sm: 'row' },
                                  gap: 2,
                                  alignItems: { xs: 'flex-start', sm: 'center' },
                                  justifyContent: 'space-between',
                                  border: '1px dashed rgba(148, 163, 184, 0.35)',
                                  borderRadius: 3,
                                  p: 2.5,
                                  backgroundColor: 'rgba(248, 250, 252, 0.8)',
                                }}
                              >
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                    Chưa có câu hỏi
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    Thêm câu hỏi mới vào danh mục này để bắt đầu.
                                  </Typography>
                                </Box>
                                <Button
                                  variant="contained"
                                  startIcon={<AddCircleOutlined sx={{ fontSize: 20 }} />}
                                  onClick={() => openCreateQuestion(category.id)}
                                >
                                  Thêm câu hỏi
                                </Button>
                              </Box>
                            </Box>
                          ) : (
                            <Stack divider={<Divider flexItem />} sx={{ backgroundColor: 'white' }}>
                              {category.questions.map((question, index) => (
                                <Box
                                  key={question.id}
                                  sx={{
                                    px: 2.5,
                                    py: 2,
                                    '&:hover': { backgroundColor: 'rgba(248,250,252,0.9)' },
                                  }}
                                >
                                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                                    <Box
                                    sx={{
                                      mt: 0.5,
                                      width: 34,
                                      height: 34,
                                      display: 'grid',
                                      placeItems: 'center',
                                      borderRadius: 2,
                                      backgroundColor: 'rgba(37, 99, 235, 0.08)',
                                      color: 'primary.main',
                                      flexShrink: 0,
                                    }}
                                    >
                                      <DragIndicator sx={{ fontSize: 16 }} />
                                    </Box>

                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                      <Box
                                        sx={{
                                          display: 'flex',
                                          flexDirection: { xs: 'column', md: 'row' },
                                          gap: 1.5,
                                          alignItems: { xs: 'flex-start', md: 'flex-start' },
                                          justifyContent: 'space-between',
                                        }}
                                      >
                                        <Box sx={{ minWidth: 0 }}>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                            <Chip
                                              label={`#${index + 1}`}
                                              size="small"
                                              variant="outlined"
                                            />
                                            <Chip
                                              label={question.isRequired ? 'Bắt buộc' : 'Không bắt buộc'}
                                              size="small"
                                              color={question.isRequired ? 'primary' : 'default'}
                                            />
                                          </Box>
                                          <Typography
                                            variant="body1"
                                            sx={{ fontWeight: 700, mt: 1, wordBreak: 'break-word' }}
                                          >
                                            {question.content}
                                          </Typography>
                                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                            Thứ tự: {question.order}
                                          </Typography>
                                        </Box>

                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                          <IconButton
                                            size="medium"
                                            onClick={() => openEditQuestion(category, question)}
                                            aria-label="Sửa câu hỏi"
                                          >
                                            <EditOutlined sx={{ fontSize: 20 }} />
                                          </IconButton>
                                          <IconButton
                                            size="medium"
                                            color="error"
                                            onClick={() => deleteQuestion(question)}
                                            aria-label="Xóa câu hỏi"
                                          >
                                            <DeleteOutlined sx={{ fontSize: 20 }} />
                                          </IconButton>
                                        </Box>
                                      </Box>
                                    </Box>
                                  </Box>
                                </Box>
                              ))}
                            </Stack>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    );
                  })}
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <Dialog
        open={categoryDialogOpen}
        onClose={() => setCategoryDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ pb: 1 }}>
          {categoryMode === 'create' ? 'Thêm danh mục mới' : 'Chỉnh sửa danh mục'}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Danh muc nay nam trong bo cau hoi dung chung cho tat ca survey.
            </Typography>
            <TextField
              label="Tên danh mục"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm((current) => ({ ...current, name: e.target.value }))}
              autoFocus
              fullWidth
            />
            <TextField
              label="Mô tả"
              value={categoryForm.description}
              onChange={(e) =>
                setCategoryForm((current) => ({ ...current, description: e.target.value }))
              }
              multiline
              fullWidth
              minRows={3}
            />
            <TextField
              label="Thứ tự"
              type="number"
              value={categoryForm.order}
              onChange={(e) => setCategoryForm((current) => ({ ...current, order: e.target.value }))}
              fullWidth
              helperText="Để trống nếu muốn hệ thống tự gán thứ tự tiếp theo."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setCategoryDialogOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            onClick={() => void submitCategory()}
            disabled={
              (categoryMode === 'create' && !categoryForm.surveyId) ||
              !categoryForm.name.trim()
            }
          >
            {categoryMode === 'create' ? 'Thêm danh mục' : 'Lưu thay đổi'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={questionDialogOpen}
        onClose={() => setQuestionDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ pb: 1 }}>
          {questionMode === 'create' ? 'Thêm câu hỏi mới' : 'Chỉnh sửa câu hỏi'}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Danh mục"
              value={questionForm.categoryId}
              onChange={(e) => setQuestionForm((current) => ({ ...current, categoryId: e.target.value }))}
              disabled={questionMode === 'edit'}
              fullWidth
            >
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Nội dung câu hỏi"
              value={questionForm.content}
              onChange={(e) => setQuestionForm((current) => ({ ...current, content: e.target.value }))}
              multiline
              minRows={3}
              autoFocus
              fullWidth
            />
            <TextField
              label="Thứ tự"
              type="number"
              value={questionForm.order}
              onChange={(e) => setQuestionForm((current) => ({ ...current, order: e.target.value }))}
              fullWidth
              helperText="Để trống nếu muốn hệ thống tự gán thứ tự tiếp theo."
            />
            <FormControlLabel
              control={
                <Switch
                  checked={questionForm.isRequired}
                  onChange={(_event, checked) =>
                    setQuestionForm((current) => ({ ...current, isRequired: checked }))
                  }
                />
              }
              label="Bắt buộc trả lời"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setQuestionDialogOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            onClick={() => void submitQuestion()}
            disabled={
              (questionMode === 'create' && !questionForm.categoryId) ||
              !questionForm.content.trim()
            }
          >
            {questionMode === 'create' ? 'Thêm câu hỏi' : 'Lưu thay đổi'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
