import rateLimit from 'express-rate-limit';

export const loginRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: '\u0110\u0103ng nh\u1eadp sai qu\u00e1 nhi\u1ec1u l\u1ea7n. Vui l\u00f2ng th\u1eed l\u1ea1i sau.' },
  },
});

