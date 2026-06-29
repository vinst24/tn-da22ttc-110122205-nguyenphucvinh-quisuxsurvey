import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// =====================================================
// SURVEY TOKENS SEED
// Tạo tokens cho các surveys không public (isPublic=false)
// Mỗi survey không public tạo 1-2 tokens
// Không xóa dữ liệu cũ — chỉ thêm mới nếu chưa tồn tại
// =====================================================

function generateTokenCode(surveySlug: string, index: number): string {
  // Format: TOKEN-{slug-prefix}-{random4}
  const slugPrefix = surveySlug
    .replace(/seed-many-survey-/, '')
    .replace(/seed-quis-survey-/, '')
    .slice(0, 4)
    .toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TOKEN-${slugPrefix}-${index}-${random}`;
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  console.log('🌱 Seeding survey tokens for non-public surveys...');

  // Lấy surveys không public
  const nonPublicSurveys = await prisma.survey.findMany({
    where: { isPublic: false },
    select: { id: true, slug: true, title: true },
  });

  if (nonPublicSurveys.length === 0) {
    console.log('ℹ️  Không tìm thấy survey nào không public — bỏ qua.');
    return;
  }

  console.log(`📋 Tìm thấy ${nonPublicSurveys.length} surveys không public`);

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const survey of nonPublicSurveys) {
    // Đếm tokens hiện có
    const existingTokens = await prisma.surveyToken.findMany({
      where: { surveyId: survey.id },
      select: { id: true, code: true },
    });

    // Mỗi survey cần 1-2 tokens
    const tokensNeeded = Math.max(0, 2 - existingTokens.length);

    if (tokensNeeded === 0) {
      console.log(`  ⏭  ${survey.slug} already has ${existingTokens.length} tokens — skipping`);
      totalSkipped++;
      continue;
    }

    console.log(`  📝 ${survey.slug}: ${existingTokens.length} existing, creating ${tokensNeeded} more...`);

    for (let i = 0; i < tokensNeeded; i++) {
      const code = generateTokenCode(survey.slug, i + 1);

      // Check if token code already exists
      const existing = await prisma.surveyToken.findUnique({
        where: { code },
        select: { id: true },
      });

      if (existing) {
        console.log(`    ⏭  Token ${code} already exists — skipping`);
        totalSkipped++;
        continue;
      }

      await prisma.surveyToken.create({
        data: {
          surveyId: survey.id,
          code,
          maxUsage: 100,
          validFrom: new Date(),
          validTo: daysFromNow(90),
        },
      });

      totalCreated++;
      console.log(`    ✓ Created token: ${code} (maxUsage=100, validTo=90 days)`);
    }
  }

  console.log(`🎉 Survey tokens seed done: ${totalCreated} created, ${totalSkipped} skipped`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });