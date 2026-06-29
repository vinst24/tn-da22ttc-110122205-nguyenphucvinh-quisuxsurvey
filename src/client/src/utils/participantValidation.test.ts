import { describe, expect, it } from 'vitest';
import { normalizeParticipantInfo } from './participantValidation';

describe('normalizeParticipantInfo', () => {
  it('allows an empty nickname and specialty', () => {
    expect(normalizeParticipantInfo({ nickname: '   ', major: '' })).toEqual({});
  });

  it('allows a one-character nickname', () => {
    expect(normalizeParticipantInfo({ nickname: 'A' })).toEqual({ fullName: 'A' });
  });

  it('allows icons and special characters in nickname', () => {
    expect(normalizeParticipantInfo({ nickname: '  ?? @user #1  ', major: 'frontend' })).toEqual({
      fullName: '?? @user #1',
      major: 'frontend',
    });
  });
});
