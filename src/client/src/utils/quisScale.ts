export type ParsedQuisLabels = {
  question: string;
  leftLabel: string;
  rightLabel: string;
};

type ScaleType =
  | 'quality'
  | 'difficulty'
  | 'satisfaction'
  | 'adequacy'
  | 'stimulation'
  | 'flexibility'
  | 'readability'
  | 'organization'
  | 'consistency'
  | 'clarity'
  | 'relevance'
  | 'frequency'
  | 'frequencyIncreasing'
  | 'speed'
  | 'reliability'
  | 'helpfulness';

const scaleDescriptions: Record<ScaleType, string[]> = {
  quality: ['Rất tệ', 'Tệ', 'Khá tệ', 'Hơi tệ', 'Bình thường', 'Hơi tốt', 'Khá tốt', 'Tốt', 'Tuyệt vời'],
  difficulty: ['Rất khó', 'Khó', 'Khá khó', 'Hơi khó', 'Trung bình', 'Hơi dễ', 'Khá dễ', 'Dễ', 'Rất dễ'],
  satisfaction: [
    'Rất thất vọng',
    'Thất vọng',
    'Khá thất vọng',
    'Hơi thất vọng',
    'Bình thường',
    'Hơi hài lòng',
    'Khá hài lòng',
    'Hài lòng',
    'Rất hài lòng',
  ],
  adequacy: ['Rất thiếu', 'Thiếu', 'Khá thiếu', 'Hơi thiếu', 'Tạm đủ', 'Hơi đủ', 'Khá đủ', 'Đủ', 'Rất đủ'],
  stimulation: [
    'Rất nhàm chán',
    'Nhàm chán',
    'Khá nhàm chán',
    'Hơi nhàm chán',
    'Bình thường',
    'Hơi thú vị',
    'Khá thú vị',
    'Thú vị',
    'Rất thú vị',
  ],
  flexibility: [
    'Rất cứng nhắc',
    'Cứng nhắc',
    'Khá cứng nhắc',
    'Hơi cứng nhắc',
    'Bình thường',
    'Hơi linh hoạt',
    'Khá linh hoạt',
    'Linh hoạt',
    'Rất linh hoạt',
  ],
  readability: [
    'Rất khó đọc',
    'Khó đọc',
    'Khá khó đọc',
    'Hơi khó đọc',
    'Bình thường',
    'Hơi dễ đọc',
    'Khá dễ đọc',
    'Dễ đọc',
    'Rất dễ đọc',
  ],
  organization: [
    'Rất lộn xộn',
    'Lộn xộn',
    'Khá lộn xộn',
    'Hơi lộn xộn',
    'Bình thường',
    'Hơi rõ ràng',
    'Khá rõ ràng',
    'Rõ ràng',
    'Rất rõ ràng',
  ],
  consistency: [
    'Rất không nhất quán',
    'Không nhất quán',
    'Khá không nhất quán',
    'Hơi không nhất quán',
    'Bình thường',
    'Hơi nhất quán',
    'Khá nhất quán',
    'Nhất quán',
    'Rất nhất quán',
  ],
  clarity: [
    'Rất khó hiểu',
    'Khó hiểu',
    'Khá khó hiểu',
    'Hơi khó hiểu',
    'Bình thường',
    'Hơi rõ ràng',
    'Khá rõ ràng',
    'Rõ ràng',
    'Rất rõ ràng',
  ],
  relevance: [
    'Rất không liên quan',
    'Không liên quan',
    'Khá không liên quan',
    'Hơi không liên quan',
    'Bình thường',
    'Hơi liên quan',
    'Khá liên quan',
    'Liên quan',
    'Rất liên quan',
  ],
  frequency: [
    'Luôn luôn',
    'Gần như luôn',
    'Rất thường xuyên',
    'Thường xuyên',
    'Thỉnh thoảng',
    'Đôi khi',
    'Hiếm khi',
    'Rất hiếm',
    'Không bao giờ',
  ],
  frequencyIncreasing: [
    'Không bao giờ',
    'Rất hiếm',
    'Hiếm khi',
    'Đôi khi',
    'Thỉnh thoảng',
    'Thường xuyên',
    'Rất thường xuyên',
    'Gần như luôn',
    'Luôn luôn',
  ],
  speed: ['Rất chậm', 'Chậm', 'Khá chậm', 'Hơi chậm', 'Bình thường', 'Hơi nhanh', 'Khá nhanh', 'Nhanh', 'Rất nhanh'],
  reliability: [
    'Rất hay lỗi',
    'Hay lỗi',
    'Khá hay lỗi',
    'Hơi hay lỗi',
    'Bình thường',
    'Hơi ổn định',
    'Khá ổn định',
    'Ổn định',
    'Rất ổn định',
  ],
  helpfulness: [
    'Rất không hữu ích',
    'Không hữu ích',
    'Khá không hữu ích',
    'Hơi không hữu ích',
    'Bình thường',
    'Hơi hữu ích',
    'Khá hữu ích',
    'Hữu ích',
    'Rất hữu ích',
  ],
};

const scaleTypeMap: Record<string, ScaleType> = {
  'tệ||tốt': 'quality',
  'không tốt||tốt': 'quality',
  'khó||dễ': 'difficulty',
  'khó đọc||dễ đọc': 'readability',
  'thất vọng||hài lòng': 'satisfaction',
  'thiếu năng lực||đủ năng lực': 'adequacy',
  'cứng nhắc||linh hoạt': 'flexibility',
  'nhàm chán||thú vị': 'stimulation',
  'lộn xộn||rõ ràng': 'organization',
  'không nhất quán||nhất quán': 'consistency',
  'khó hiểu||rõ ràng': 'clarity',
  'không liên quan||liên quan': 'relevance',
  'không bao giờ||luôn luôn': 'frequencyIncreasing',
  'chậm||nhanh': 'speed',
  'hay lỗi||ổn định': 'reliability',
  'không hữu ích||hữu ích': 'helpfulness',
  'luôn luôn||không bao giờ': 'frequency',
};

export function parseLabels(content: string): ParsedQuisLabels {
  const trimmed = content.trim();
  const parts = trimmed.split(':');
  const afterColon = parts.length >= 2 ? parts.slice(1).join(':').trim() : trimmed;

  const dashSplit = afterColon.split(/—|â€”/).map((x) => x.trim()).filter(Boolean);
  if (dashSplit.length >= 2) {
    return {
      question: parts.length >= 2 ? parts[0]!.trim() : trimmed,
      leftLabel: dashSplit[0]!,
      rightLabel: dashSplit.slice(1).join(' — ').trim(),
    };
  }

  return { question: trimmed, leftLabel: 'Rất tệ', rightLabel: 'Tuyệt vời' };
}

export function getScaleLabels(leftLabel: string, rightLabel: string): string[] {
  const key = `${leftLabel.toLowerCase()}||${rightLabel.toLowerCase()}`;
  const type = scaleTypeMap[key];
  if (type) return scaleDescriptions[type];

  return [
    leftLabel,
    'Rất thấp',
    'Thấp',
    'Hơi thấp',
    'Bình thường',
    'Hơi cao',
    'Cao',
    'Rất cao',
    rightLabel,
  ];
}
