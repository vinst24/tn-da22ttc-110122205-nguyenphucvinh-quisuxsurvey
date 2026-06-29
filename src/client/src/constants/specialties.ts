export const SPECIALTY_OPTIONS = [
  { value: 'INFORMATION_TECHNOLOGY', label: 'Công nghệ thông tin' },
  { value: 'BUSINESS_MANAGEMENT', label: 'Kinh doanh / Quản lý' },
  { value: 'ENGINEERING', label: 'Kỹ thuật' },
  { value: 'HEALTHCARE', label: 'Y tế / Chăm sóc sức khỏe' },
  { value: 'EDUCATION', label: 'Giáo dục' },
  { value: 'MARKETING_COMMUNICATION', label: 'Marketing / Truyền thông' },
  { value: 'UX_DESIGN', label: 'Thiết kế / UX' },
  { value: 'FINANCE_ACCOUNTING', label: 'Tài chính / Kế toán' },
  { value: 'LAW', label: 'Luật / Pháp lý' },
  { value: 'ARCHITECTURE', label: 'Kiến trúc / Xây dựng' },
  { value: 'MEDIA_JOURNALISM', label: 'Báo chí / Truyền thông' },
  { value: 'OTHER', label: 'Khác' },
] as const;

export type SpecialtyValue = (typeof SPECIALTY_OPTIONS)[number]['value'];

export const SPECIALTY_FIELD_LABEL = 'Lĩnh vực chuyên môn';
export const SPECIALTY_STEP3_PLACEHOLDER = '-- Không bắt buộc --';
export const SPECIALTY_FILTER_ALL_LABEL = 'Tất cả lĩnh vực';

export const specialtyLabelMap = Object.fromEntries(
  SPECIALTY_OPTIONS.map((option) => [option.value, option.label]),
) as Record<SpecialtyValue, string>;

export const getSpecialtyLabel = (value?: string | null) => {
  if (!value) return 'Chưa cung cấp';
  return (specialtyLabelMap as Record<string, string>)[value] ?? 'Khác';
};