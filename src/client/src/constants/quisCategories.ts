import { BookOpen, Brain, Monitor, Settings, Star } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';

export type QuisCategoryInfo = {
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export const QUIS_CATEGORIES: Record<string, QuisCategoryInfo> = {
  'Overall Reaction to the Software': {
    description:
      'Đánh giá tổng quan về mức độ hài lòng và ấn tượng chung khi sử dụng phần mềm.',
    icon: Star,
  },
  Screen: {
    description:
      'Đánh giá chất lượng hiển thị, bố cục và khả năng đọc thông tin trên màn hình.',
    icon: Monitor,
  },
  'Terminology and System Information': {
    description:
      'Đánh giá mức độ rõ ràng của thuật ngữ, thông báo và thông tin hệ thống.',
    icon: BookOpen,
  },
  Learning: {
    description:
      'Đánh giá khả năng học và làm quen với hệ thống của người dùng mới.',
    icon: Brain,
  },
  'System Capabilities': {
    description:
      'Đánh giá tốc độ, độ tin cậy và khả năng đáp ứng của hệ thống.',
    icon: Settings,
  },
};

export function getQuisCategoryInfo(
  name: string,
): QuisCategoryInfo | null {
  return QUIS_CATEGORIES[name] ?? null;
}