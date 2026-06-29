import { PrismaClient, Specialty } from '@prisma/client';

const prisma = new PrismaClient();

// =====================================================
// PARTICIPANTS SEED
// Tạo ~20 participants (guest + user-linked)
// Không xóa dữ liệu cũ — chỉ thêm mới nếu chưa tồn tại
// =====================================================

type ParticipantSeed = {
  participantCode: string;
  nickname: string;
  isGuest: boolean;
  specialty: Specialty | null;
};

const SPECIALTIES: Specialty[] = [
  'INFORMATION_TECHNOLOGY',
  'BUSINESS_MANAGEMENT',
  'ENGINEERING',
  'HEALTHCARE',
  'EDUCATION',
  'MARKETING_COMMUNICATION',
  'UX_DESIGN',
  'FINANCE_ACCOUNTING',
  'LAW',
  'ARCHITECTURE',
  'MEDIA_JOURNALISM',
  'OTHER',
];

const GUEST_NAMES = [
  { code: 'GUEST-001', nickname: 'Nguyễn Văn An' },
  { code: 'GUEST-002', nickname: 'Trần Thị Bình' },
  { code: 'GUEST-003', nickname: 'Lê Hoàng Chương' },
  { code: 'GUEST-004', nickname: 'Phạm Minh Đức' },
  { code: 'GUEST-005', nickname: 'Hoàng Thị Em' },
  { code: 'GUEST-006', nickname: 'Vũ Ngọc FPT' },
  { code: 'GUEST-007', nickname: 'Đặng Thanh Giang' },
  { code: 'GUEST-008', nickname: 'Bùi Văn Hạnh' },
  { code: 'GUEST-009', nickname: 'Ngô Thị Iris' },
  { code: 'GUEST-010', nickname: 'Hồ Minh Khải' },
];

const USER_NAMES = [
  { code: 'USER-001', nickname: 'Lý Thị Lan' },
  { code: 'USER-002', nickname: 'Đinh Văn Minh' },
  { code: 'USER-003', nickname: 'Mai Thanh Nga' },
  { code: 'USER-004', nickname: 'Trương Văn Phúc' },
  { code: 'USER-005', nickname: 'Lâm Thị Quỳnh' },
  { code: 'USER-006', nickname: 'Phan Hoàng Rạng' },
  { code: 'USER-007', nickname: 'Võ Thị Sương' },
  { code: 'USER-008', nickname: 'Tạ Văn Thắng' },
  { code: 'USER-009', nickname: 'Đỗ Minh Uyên' },
  { code: 'USER-010', nickname: 'Cao Thùy Vân' },
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

async function main() {
  console.log('🌱 Seeding participants...');

  const guestParticipants: ParticipantSeed[] = GUEST_NAMES.map((g) => ({
    participantCode: g.code,
    nickname: g.nickname,
    isGuest: true,
    specialty: pickRandom(SPECIALTIES),
  }));

  const userParticipants: ParticipantSeed[] = USER_NAMES.map((u) => ({
    participantCode: u.code,
    nickname: u.nickname,
    isGuest: false,
    specialty: pickRandom(SPECIALTIES),
  }));

  const allParticipants = [...guestParticipants, ...userParticipants];

  let created = 0;
  let skipped = 0;

  for (const p of allParticipants) {
    // Check if participant already exists
    const existing = await prisma.participant.findUnique({
      where: { participantCode: p.participantCode },
      select: { id: true },
    });

    if (existing) {
      console.log(`  ⏭  ${p.participantCode} already exists — skipping`);
      skipped++;
      continue;
    }

    if (p.isGuest) {
      // Guest: no userId
      await prisma.participant.create({
        data: {
          participantCode: p.participantCode,
          nickname: p.nickname,
          isGuest: true,
          specialty: p.specialty,
        },
      });
    } else {
      // User-linked: create a User first, then link
      const email = `${p.participantCode.toLowerCase().replace('-', '.')}@quis.local`;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      let userId: number;

      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Create user with a dummy password hash
        // In production this would be a real bcrypt hash
        const user = await prisma.user.create({
          data: {
            email,
            passwordHash: '$2b$10$dummyHashForSeedDataOnly1234567890abcdef',
            fullname: p.nickname,
            role: 'USER',
          },
          select: { id: true },
        });
        userId = user.id;
      }

      await prisma.participant.create({
        data: {
          userId,
          participantCode: p.participantCode,
          nickname: p.nickname,
          isGuest: false,
          specialty: p.specialty,
        },
      });
    }

    created++;
    console.log(`  ✓ Created ${p.participantCode} — ${p.nickname} (${p.isGuest ? 'guest' : 'user'})`);
  }

  console.log(`🎉 Participants seed done: ${created} created, ${skipped} skipped`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });