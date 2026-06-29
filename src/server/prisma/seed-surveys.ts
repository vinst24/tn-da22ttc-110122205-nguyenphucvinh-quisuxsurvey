import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SLUG_PREFIX = 'seed-many-survey-';

type SurveySeed = {
  title: string;
  description: string;
  isActive: boolean;
  isPublic: boolean;
  expiresAt: Date | null;
};

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

// 26 bài khảo sát mẫu với title / description / expiresAt
// và cấu hình isActive + isPublic đa dạng để test bộ lọc / hiển thị
const SURVEYS: SurveySeed[] = [
  { title: 'Khảo sát QUIS — Cổng thông tin sinh viên',  description: 'Đánh giá trải nghiệm sử dụng cổng thông tin sinh viên.',         isActive: true,  isPublic: true,  expiresAt: daysFromNow(30) },
  { title: 'Khảo sát QUIS — Ứng dụng học trực tuyến',   description: 'Đánh giá trải nghiệm học tập trên nền tảng online.',             isActive: true,  isPublic: true,  expiresAt: daysFromNow(45) },
  { title: 'Khảo sát QUIS — Website thư viện số',       description: 'Đánh giá khả năng tìm kiếm và mượn tài liệu của thư viện số.',   isActive: true,  isPublic: false, expiresAt: daysFromNow(60) },
  { title: 'Khảo sát QUIS — Đăng ký môn học',           description: 'Đánh giá quy trình đăng ký môn học mỗi học kỳ.',                 isActive: true,  isPublic: true,  expiresAt: daysFromNow(20) },
  { title: 'Khảo sát QUIS — Hệ thống e-learning',       description: 'Phản hồi về hệ thống e-learning nội bộ doanh nghiệp.',           isActive: true,  isPublic: false, expiresAt: daysFromNow(90) },
  { title: 'Khảo sát QUIS — Cổng dịch vụ công',         description: 'Đánh giá việc nộp hồ sơ hành chính trực tuyến.',                 isActive: true,  isPublic: true,  expiresAt: daysFromNow(75) },
  { title: 'Khảo sát QUIS — Ứng dụng ngân hàng số',     description: 'Đánh giá tính năng chuyển khoản và quản lý tài khoản.',          isActive: true,  isPublic: true,  expiresAt: daysFromNow(40) },
  { title: 'Khảo sát QUIS — Website thương mại điện tử',description: 'Đánh giá quy trình tìm kiếm, mua hàng và thanh toán.',           isActive: true,  isPublic: true,  expiresAt: daysFromNow(50) },
  { title: 'Khảo sát QUIS — Ứng dụng đặt xe',           description: 'Đánh giá trải nghiệm đặt xe và theo dõi hành trình.',            isActive: true,  isPublic: true,  expiresAt: daysFromNow(25) },
  { title: 'Khảo sát QUIS — Ứng dụng giao đồ ăn',       description: 'Đánh giá tìm món, đặt hàng và theo dõi shipper.',                isActive: true,  isPublic: true,  expiresAt: daysFromNow(35) },
  { title: 'Khảo sát QUIS — Website tin tức',           description: 'Đánh giá khả năng đọc và tìm bài viết.',                          isActive: false, isPublic: true,  expiresAt: daysFromNow(10) },
  { title: 'Khảo sát QUIS — Mạng xã hội',               description: 'Đánh giá tương tác bài viết, kết bạn và thông báo.',             isActive: true,  isPublic: true,  expiresAt: daysFromNow(80) },
  { title: 'Khảo sát QUIS — Ứng dụng nhắn tin',         description: 'Đánh giá chất lượng cuộc trò chuyện và gọi điện.',               isActive: true,  isPublic: false, expiresAt: daysFromNow(55) },
  { title: 'Khảo sát QUIS — Ứng dụng nghe nhạc',        description: 'Đánh giá khả năng đề xuất và phát nhạc.',                         isActive: true,  isPublic: true,  expiresAt: daysFromNow(65) },
  { title: 'Khảo sát QUIS — Ứng dụng xem phim',         description: 'Đánh giá thư viện nội dung và chất lượng phát phim.',            isActive: true,  isPublic: true,  expiresAt: daysFromNow(70) },
  { title: 'Khảo sát QUIS — Website du lịch',           description: 'Đánh giá việc tìm tour, đặt vé và đặt khách sạn.',               isActive: false, isPublic: false, expiresAt: daysFromNow(15) },
  { title: 'Khảo sát QUIS — Ứng dụng sức khỏe',         description: 'Đánh giá theo dõi chỉ số sức khỏe hằng ngày.',                    isActive: true,  isPublic: true,  expiresAt: daysFromNow(85) },
  { title: 'Khảo sát QUIS — Ứng dụng tập luyện',        description: 'Đánh giá lịch tập, theo dõi tiến độ và nhắc nhở.',               isActive: true,  isPublic: true,  expiresAt: daysFromNow(45) },
  { title: 'Khảo sát QUIS — Quản lý công việc',         description: 'Đánh giá tính năng giao việc, theo dõi tiến độ nhóm.',           isActive: true,  isPublic: false, expiresAt: daysFromNow(60) },
  { title: 'Khảo sát QUIS — Ứng dụng ghi chú',          description: 'Đánh giá việc tạo, tìm và đồng bộ ghi chú.',                      isActive: true,  isPublic: true,  expiresAt: daysFromNow(30) },
  { title: 'Khảo sát QUIS — Phần mềm văn phòng',        description: 'Đánh giá soạn thảo, bảng tính và trình chiếu.',                  isActive: true,  isPublic: false, expiresAt: daysFromNow(100) },
  { title: 'Khảo sát QUIS — Hệ thống CRM',              description: 'Đánh giá quản lý khách hàng và hợp đồng.',                        isActive: true,  isPublic: false, expiresAt: daysFromNow(95) },
  { title: 'Khảo sát QUIS — Cổng nhân sự nội bộ',       description: 'Đánh giá tra cứu lương, nghỉ phép và chấm công.',                isActive: true,  isPublic: false, expiresAt: daysFromNow(40) },
  { title: 'Khảo sát QUIS — Giao thông công cộng',      description: 'Đánh giá tra cứu tuyến, lịch trình và mua vé.',                  isActive: true,  isPublic: true,  expiresAt: daysFromNow(50) },
  { title: 'Khảo sát QUIS — Đăng ký khám bệnh',         description: 'Đánh giá đặt lịch, chọn bác sĩ và thanh toán phí khám.',         isActive: false, isPublic: true,  expiresAt: daysFromNow(20) },
  { title: 'Khảo sát QUIS — Học ngoại ngữ',             description: 'Đánh giá lộ trình học, bài kiểm tra và phát âm.',                isActive: true,  isPublic: true,  expiresAt: daysFromNow(110) },
];

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

async function main() {
  console.log(`🌱 Seeding ${SURVEYS.length} surveys (metadata + shared category links)...`);

  // ── Xoá dữ liệu seed cũ của riêng script này (không đụng survey khác) ──
  const removed = await prisma.survey.deleteMany({
    where: { slug: { startsWith: SLUG_PREFIX } },
  });
  if (removed.count > 0) {
    console.log(`✅ Đã xoá ${removed.count} survey seed cũ`);
  }

  // ── Lấy shared categories (đã được seed bởi seed.ts) ──
  const sharedCategories = await prisma.category.findMany({
    orderBy: { id: 'asc' },
    select: { id: true, name: true },
  });

  if (sharedCategories.length === 0) {
    console.error('❌ Không tìm thấy shared categories. Hãy chạy seed.ts trước!');
    process.exit(1);
  }

  console.log(`📋 Tìm thấy ${sharedCategories.length} shared categories`);

  // ── Tạo surveys + link shared categories ──
  for (let i = 0; i < SURVEYS.length; i++) {
    const s = SURVEYS[i]!;
    const slug = `${SLUG_PREFIX}${pad2(i + 1)}`;

    const survey = await prisma.survey.create({
      data: {
        title: s.title,
        description: s.description,
        slug,
        isActive: s.isActive,
        isPublic: s.isPublic,
        expiresAt: s.expiresAt,
      },
      select: { id: true },
    });

    // Link tất cả shared categories vào survey này
    for (let catIdx = 0; catIdx < sharedCategories.length; catIdx++) {
      const cat = sharedCategories[catIdx]!;
      await prisma.surveyCategory.create({
        data: {
          surveyId: survey.id,
          categoryId: cat.id,
          order: catIdx + 1,
        },
      });
    }

    console.log(
      `  ✓ [${pad2(i + 1)}/${SURVEYS.length}] ${slug}  active=${s.isActive}  public=${s.isPublic}  (${sharedCategories.length} categories linked)`,
    );
  }

  console.log(`🎉 Đã tạo ${SURVEYS.length} surveys và link ${sharedCategories.length} shared categories mỗi survey!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });