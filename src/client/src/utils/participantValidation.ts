export type ParticipantInfoInput = {
  nickname: string;
  major?: string;
};

export type NormalizedParticipantInfo = {
  fullName?: string;
  major?: string;
};

export function normalizeParticipantInfo(input: ParticipantInfoInput): NormalizedParticipantInfo {
  const fullName = input.nickname.trim();
  const major = input.major?.trim() ?? '';

  return {
    ...(fullName ? { fullName } : {}),
    ...(major ? { major } : {}),
  };
}
