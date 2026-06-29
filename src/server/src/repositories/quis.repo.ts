export type QuisInterpretation = {
  id: string;
  minScore: string;
  maxScore: string;
  level: string;
  description: string;
};

// Built-in interpretation mapping (no DB tables required).
// QUIS scale: 1–9
export const quisRepo = {
  findInterpretationByScore: (score: number): QuisInterpretation => {
    if (score <= 3) {
      return {
        id: 'poor',
        minScore: '1',
        maxScore: '3',
        level: 'Poor',
        description: 'Trải nghiệm kém; cần ưu tiên cải thiện các vấn đề chính.',
      };
    }
    if (score <= 5) {
      return {
        id: 'fair',
        minScore: '3',
        maxScore: '5',
        level: 'Fair',
        description: 'Trải nghiệm trung bình; vẫn còn nhiều điểm cần tối ưu.',
      };
    }
    if (score <= 7) {
      return {
        id: 'good',
        minScore: '5',
        maxScore: '7',
        level: 'Good',
        description: 'Trải nghiệm tốt; có thể tinh chỉnh để nâng cao hơn.',
      };
    }
    return {
      id: 'excellent',
      minScore: '7',
      maxScore: '9',
      level: 'Excellent',
      description: 'Trải nghiệm rất tốt; duy trì và tối ưu liên tục.',
    };
  },
};

