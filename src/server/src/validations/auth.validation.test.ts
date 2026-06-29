import { describe, expect, it } from 'vitest';
import { profileBody } from './auth.validation.js';

describe('auth profile validation', () => {
  it('accepts a valid specialty value on profile update', () => {
    const result = profileBody.safeParse({
      email: 'user@example.com',
      fullName: 'Nguyen Van A',
      specialty: 'UX_DESIGN',
    });

    expect(result.success).toBe(true);
  });

  it('rejects an unsupported specialty value', () => {
    const result = profileBody.safeParse({
      email: 'user@example.com',
      specialty: 'UNKNOWN_FIELD',
    });

    expect(result.success).toBe(false);
  });

  it('allows clearing specialty with null', () => {
    const result = profileBody.safeParse({
      email: 'user@example.com',
      specialty: null,
    });

    expect(result.success).toBe(true);
  });
});