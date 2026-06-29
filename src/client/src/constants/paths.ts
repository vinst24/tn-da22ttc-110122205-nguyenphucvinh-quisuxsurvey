export const PATHS = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',

  SURVEY_CODE: '/survey-code',
  PARTICIPANT_INFO: '/participant-info',
  SURVEY: '/surveys',
  SURVEY_RESULT: '/survey-result',

  SURVEY_DETAIL: (slug = ':slug') => `/surveys/${slug}`,
  TAKE_SURVEY: (slug = ':slug') => `/surveys/${slug}/take`,

  ADMIN: '/admin',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_SURVEYS: '/admin/surveys',
  ADMIN_CATEGORIES: '/admin/categories',
  ADMIN_QUESTIONS: '/admin/questions',
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_PARTICIPANTS: '/admin/participants',
  ADMIN_ANALYTICS: '/admin/analytics',
  ADMIN_TOKENS: '/admin/tokens',
  ADMIN_SETTINGS: '/admin/settings',

  PROFILE: '/profile',
  MY_SURVEYS: '/my-surveys',
} as const;


