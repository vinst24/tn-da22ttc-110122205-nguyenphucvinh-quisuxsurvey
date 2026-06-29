import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// =====================================================
// RESPONSES SEED
// Tạo responses + response details cho MỌI survey
// Mỗi survey tối thiểu 50 responses
// Không xóa dữ liệu cũ — chỉ thêm mới
// =====================================================

const MIN_RESPONSES_PER_SURVEY = 50;

// Phân bố điểm hợp lý: phần lớn ở 5-8, ít ở 1-3 và 9
function randomScore(): number {
  const r = Math.random();
  if (r < 0.05) return 1;
  if (r < 0.10) return 2;
  if (r < 0.15) return 3;
  if (r < 0.25) return 4;
  if (r < 0.45) return 5;
  if (r < 0.65) return 6;
  if (r < 0.80) return 7;
  if (r < 0.92) return 8;
  return 9;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

const OVERALL_FEEDBACKS = [
  'Hệ thống rất tốt, dễ sử dụng.',
  'Trải nghiệm ổn, nhưng cần cải thiện tốc độ.',
  'Giao diện đẹp, dễ tìm kiếm.',
  'Cần thêm hướng dẫn cho người mới.',
  'Tốc độ phản hồi nhanh, hài lòng.',
  'Một số tính năng chưa rõ ràng.',
  'Tổng thể tốt, sẽ giới thiệu cho bạn bè.',
  'Cần cải thiện phần thông báo lỗi.',
  'Dễ sử dụng, giao diện trực quan.',
  'Hệ thống hoạt động ổn định.',
  'Cần thêm tính năng tìm kiếm nâng cao.',
  'Giao diện cần được tối ưu cho mobile.',
  'Tốc độ tải trang hơi chậm.',
  'Rất hài lòng với trải nghiệm.',
  'Cần cải thiện phần tài liệu hướng dẫn.',
  'Hệ thống tốt, nhưng cần thêm tùy chỉnh.',
  'Giao diện đẹp, dễ sử dụng.',
  'Cần cải thiện phần bảo mật.',
  'Tốc độ phản hồi tốt.',
  'Hệ thống hoạt động ổn định, ít lỗi.',
  'Cần thêm tính năng chia sẻ.',
  'Giao diện cần được tối ưu cho tablet.',
  'Tốc độ tải trang nhanh.',
  'Rất hài lòng với hệ thống.',
  'Cần cải thiện phần hỗ trợ khách hàng.',
  'Hệ thống tốt, dễ sử dụng.',
  'Cần thêm tính năng thông báo.',
  'Giao diện đẹp, dễ tìm kiếm.',
  'Tốc độ phản hồi nhanh, ổn định.',
  'Hệ thống hoạt động tốt, ít lỗi.',
];

async function main() {
  console.log('🌱 Seeding responses...');

  // Lấy tất cả surveys
  const surveys = await prisma.survey.findMany({
    select: { id: true, title: true, slug: true },
  });

  if (surveys.length === 0) {
    console.error('❌ Không tìm thấy survey nào. Hãy chạy seed.ts và seed-surveys.ts trước!');
    process.exit(1);
  }

  console.log(`📋 Tìm thấy ${surveys.length} surveys`);

  // Lấy tất cả participants
  const participants = await prisma.participant.findMany({
    select: { id: true, participantCode: true },
  });

  if (participants.length === 0) {
    console.error('❌ Không tìm thấy participant nào. Hãy chạy seed-participants.ts trước!');
    process.exit(1);
  }

  console.log(`📋 Tìm thấy ${participants.length} participants`);

  // Lấy tất cả questions (để tạo response details)
  const questions = await prisma.question.findMany({
    select: { id: true, globalOrder: true },
    orderBy: { globalOrder: 'asc' },
  });

  if (questions.length === 0) {
    console.error('❌ Không tìm thấy question nào. Hãy chạy seed.ts trước!');
    process.exit(1);
  }

  console.log(`📋 Tìm thấy ${questions.length} questions`);

  // Thời gian tạo responses: 30 ngày gần đây
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  let totalResponses = 0;
  let totalDetails = 0;

  for (const survey of surveys) {
    // Đếm responses hiện có cho survey này
    const existingCount = await prisma.response.count({
      where: { surveyId: survey.id },
    });

    const need = Math.max(0, MIN_RESPONSES_PER_SURVEY - existingCount);

    if (need === 0) {
      console.log(`  ⏭  ${survey.slug} already has ${existingCount} responses — skipping`);
      continue;
    }

    console.log(`  📝 ${survey.slug}: ${existingCount} existing, creating ${need} more...`);

    for (let i = 0; i < need; i++) {
      const participant = pickRandom(participants);
      const submittedAt = randomDate(thirtyDaysAgo, now);
      const completionPercent = 100;

      // Tạo response
      const response = await prisma.response.create({
        data: {
          surveyId: survey.id,
          participantId: participant.id,
          overallFeedback: pickRandom(OVERALL_FEEDBACKS),
          isComplete: true,
          completionPercent,
          lastSavedAt: submittedAt,
          submittedAt,
        },
        select: { id: true },
      });

      // Tạo response details cho từng câu hỏi
      const detailsData = questions.map((q) => ({
        responseId: response.id,
        questionId: q.id,
        score: randomScore(),
        answeredAt: new Date(submittedAt.getTime() + Math.random() * 60 * 60 * 1000), // within 1 hour of submit
      }));

      await prisma.responseDetail.createMany({
        data: detailsData,
      });

      totalResponses++;
      totalDetails += detailsData.length;
    }

    console.log(`  ✓ Created ${need} responses for ${survey.slug}`);
  }

  console.log(`🎉 Responses seed done: ${totalResponses} responses, ${totalDetails} response details`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });