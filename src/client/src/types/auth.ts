export type UserRole = 'ADMIN' | 'USER';
export type Specialty =
  | 'INFORMATION_TECHNOLOGY'
  | 'BUSINESS_MANAGEMENT'
  | 'ENGINEERING'
  | 'HEALTHCARE'
  | 'EDUCATION'
  | 'MARKETING_COMMUNICATION'
  | 'UX_DESIGN'
  | 'FINANCE_ACCOUNTING'
  | 'LAW'
  | 'ARCHITECTURE'
  | 'MEDIA_JOURNALISM'
  | 'OTHER';

export type UserDto = {
  id: string;
  email: string;
  role: UserRole;
  fullName?: string | null;
};

export type ParticipantDto = {
  id: string;
  userId: string | null;
  type: 'GUEST' | 'REGISTERED';
  fullName?: string | null;
  email?: string | null;
  major?: Specialty | null;
  specialty?: Specialty | null;
};
