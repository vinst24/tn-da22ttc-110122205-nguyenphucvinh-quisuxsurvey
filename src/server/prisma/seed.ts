import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding survey-related tables (no users/participants)...');

  const SEED_SURVEY_SLUG = 'seed-quis-survey-2026';
  const SEED_TOKEN_CODE = 'SEED-QUIS-2026';

  const OLD_SURVEY_SLUGS_TO_DELETE = ['quis-survey-2026', SEED_SURVEY_SLUG];

  // =====================================================
  // 1. CATEGORIES (QUIS shared library) — define first
  // =====================================================
  const categoriesData: Array<{
    name: string;
    description: string;
    order: number;
  }> = [
    {
      name: 'Đánh giá tổng quan',
      description: 'Overall Reaction to the Software - đánh giá cảm nhận tổng thể về phần mềm.',
      order: 1,
    },
    {
      name: 'Màn hình',
      description: 'Screen - khả năng đọc, bố cục và cách tổ chức thông tin trên màn hình.',
      order: 2,
    },
    {
      name: 'Thuật ngữ và thông tin hệ thống',
      description: 'Terminology and System Information - thuật ngữ, thông báo, hướng dẫn và phản hồi của hệ thống.',
      order: 3,
    },
    {
      name: 'Học tập',
      description: 'Learning - mức độ dễ học, dễ ghi nhớ và dễ khám phá cách sử dụng.',
      order: 4,
    },
    {
      name: 'Khả năng hệ thống',
      description: 'System Capabilities - tốc độ, độ tin cậy, khả năng phục hồi và sự phù hợp với nhiều cấp độ người dùng.',
      order: 5,
    },
  ];

  // =====================================================
  // 2. DELETE OLD SAMPLE DATA (survey-related only)
  // =====================================================
  await prisma.surveyToken.deleteMany({
    where: {
      OR: [{ code: { startsWith: 'SEED-QUIS-' } }, { code: 'QUIS2026' }],
    },
  });

  // Delete survey first — cascade removes SurveyCategory join rows,
  // freeing the shared categories so we can delete them by name below.
  await prisma.survey.deleteMany({
    where: {
      OR: [{ slug: { in: OLD_SURVEY_SLUGS_TO_DELETE } }, { slug: { startsWith: 'seed-quis-' } }],
    },
  });

  const OLD_SEED_CATEGORY_NAMES = [
    'Phản ứng tổng quan',
    'Màn hình',
    'Thuật ngữ và thông tin hệ thống',
    'Học tập',
    'Khả năng hệ thống',
  ];
  const SEED_CATEGORY_NAMES = Array.from(new Set([...categoriesData.map((c) => c.name), ...OLD_SEED_CATEGORY_NAMES]));
  await prisma.category.deleteMany({
    where: { name: { in: SEED_CATEGORY_NAMES } },
  });

  console.log('✅ Old sample survey data removed');

  // =====================================================
  // 3. SURVEY
  // =====================================================
  const survey = await prisma.survey.create({
    data: {
      title: 'Khảo sát trải nghiệm người dùng (QUIS)',
      description: 'Bản lõi 27 câu phỏng theo QUIS 7.0 của Chin et al. (1988)',
      slug: SEED_SURVEY_SLUG,
      isActive: true,
      isPublic: true,
    },
    select: { id: true },
  });

  console.log('✅ Survey ready');

  // =====================================================
  // 4. CATEGORIES + SurveyCategory link
  // =====================================================
  const categories: Array<{ id: number; order: number }> = [];
  for (const c of categoriesData) {
    const cat = await prisma.category.create({
      data: {
        name: c.name,
        description: c.description,
      },
      select: { id: true },
    });
    await prisma.surveyCategory.create({
      data: {
        surveyId: survey.id,
        categoryId: cat.id,
        order: c.order,
      },
    });
    categories.push({ id: cat.id, order: c.order });
  }

  console.log('✅ Categories ready (shared library + linked to survey)');

  // =====================================================
  // 5. QUESTIONS (semantic differential 1..9)
  //    Format: "Câu hỏi: LabelTrái — LabelPhải"
  //    Tổng 27 câu, globalOrder 1..27
  // =====================================================
  const questionBankByCategoryOrder: Record<
    number,
    Array<{ content: string; isRequired?: boolean }>
  > = {
    // Mục 1: Đánh giá tổng quan / Overall Reaction to the Software (6 câu)
    1: [
      { content: 'Trải nghiệm tổng thể với phần mềm: Tệ — Tốt' },
      { content: 'Mức độ dễ sử dụng của phần mềm: Khó — Dễ' },
      { content: 'Mức độ hài lòng với phần mềm: Thất vọng — Hài lòng' },
      { content: 'Khả năng đáp ứng công việc của phần mềm: Thiếu năng lực — Đủ năng lực' },
      { content: 'Mức độ thú vị khi sử dụng phần mềm: Nhàm chán — Thú vị' },
      { content: 'Mức độ linh hoạt của phần mềm: Cứng nhắc — Linh hoạt' },
    ],
    // Mục 2: Màn hình / Screen (4 câu)
    2: [
      { content: 'Độ dễ đọc của chữ trên màn hình: Khó đọc — Dễ đọc' },
      { content: 'Cách làm nổi bật thông tin trên màn hình: Không tốt — Tốt' },
      { content: 'Cách tổ chức thông tin trên màn hình: Lộn xộn — Rõ ràng' },
      { content: 'Trình tự chuyển đổi giữa các màn hình: Lộn xộn — Rõ ràng' },
    ],
    // Mục 3: Thuật ngữ và thông tin hệ thống / Terminology and System Information (6 câu)
    3: [
      { content: 'Thuật ngữ được dùng trong hệ thống: Không nhất quán — Nhất quán' },
      { content: 'Thuật ngữ liên quan đến công việc của người dùng: Không liên quan — Liên quan' },
      { content: 'Vị trí của các thông báo trên màn hình: Không nhất quán — Nhất quán' },
      { content: 'Hướng dẫn và gợi ý nhập liệu: Khó hiểu — Rõ ràng' },
      { content: 'Hệ thống khiến người dùng bối rối về tiến trình đang chạy: Luôn luôn — Không bao giờ' },
      { content: 'Thông báo lỗi của hệ thống: Không hữu ích — Hữu ích' },
    ],
    // Mục 4: Học tập / Learning (6 câu)
    4: [
      { content: 'Học cách vận hành hệ thống: Khó — Dễ' },
      { content: 'Khám phá tính năng mới bằng cách thử và sai: Khó — Dễ' },
      { content: 'Ghi nhớ tên và cách dùng các chức năng: Khó — Dễ' },
      { content: 'Thực hiện tác vụ theo cách dễ hiểu và trực quan: Không bao giờ — Luôn luôn' },
      { content: 'Trợ giúp trên màn hình khi cần hỗ trợ: Không hữu ích — Hữu ích' },
      { content: 'Tài liệu tham khảo bổ sung: Khó hiểu — Rõ ràng' },
    ],
    // Mục 5: Khả năng hệ thống / System Capabilities (5 câu)
    5: [
      { content: 'Tốc độ phản hồi của hệ thống: Chậm — Nhanh' },
      { content: 'Độ tin cậy của hệ thống: Hay lỗi — Ổn định' },
      { content: 'Hệ thống gây lỗi hoặc khó kiểm soát: Luôn luôn — Không bao giờ' },
      { content: 'Sửa lỗi khi người dùng thao tác sai: Khó — Dễ' },
      { content: 'Phù hợp với nhiều cấp độ người dùng: Không bao giờ — Luôn luôn' },
    ],
  };

  const questions: Array<{ id: number }> = [];
  let globalOrder = 1;

  for (const category of categories) {
    const bank = questionBankByCategoryOrder[category.order] ?? [];
    for (let index = 0; index < bank.length; index++) {
      const item = bank[index]!;
      const order = index + 1;

      const q = await prisma.question.create({
        data: {
          content: item.content,
          categoryId: category.id,
          order,
          globalOrder: globalOrder++,
          minScale: 1,
          maxScale: 9,
          isRequired: item.isRequired ?? true,
        },
        select: { id: true },
      });

      questions.push(q);
    }
  }

  console.log(`✅ Questions ready (${questions.length})`);

  // =====================================================
  // 6. SURVEY TOKEN (guest access)
  // =====================================================
  await prisma.surveyToken.create({
    data: {
      surveyId: survey.id,
      code: SEED_TOKEN_CODE,
      maxUsage: 100,
    },
    select: { id: true },
  });

  console.log('✅ Survey token ready');

  console.log('🎉 SEED COMPLETED SUCCESSFULLY!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
