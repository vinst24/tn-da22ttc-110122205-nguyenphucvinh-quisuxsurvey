import { describe, expect, it } from 'vitest';
import { profileSchema } from './auth';

describe('profileSchema', () => {
  it('accepts a selected specialty', () => {
    const result = profileSchema.safeParse({
      email: 'user@example.com',
      fullName: 'Nguyen Van A',
      specialty: 'INFORMATION_TECHNOLOGY',
    });

    expect(result.success).toBe(true);
  });

  it('accepts an empty specialty selection', () => {
    const result = profileSchema.safeParse({
      email: 'user@example.com',
      fullName: 'Nguyen Van A',
      specialty: '',
    });

    expect(result.success).toBe(true);
  });

  it('rejects an unsupported specialty', () => {
    const result = profileSchema.safeParse({
      email: 'user@example.com',
      fullName: 'Nguyen Van A',
      specialty: 'UNKNOWN_FIELD',
    });

    expect(result.success).toBe(false);
  });
});