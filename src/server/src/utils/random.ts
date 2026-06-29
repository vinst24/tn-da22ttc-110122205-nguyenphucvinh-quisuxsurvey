import crypto from 'crypto';

export const randomToken = (bytes = 24) => {
  return crypto.randomBytes(bytes).toString('base64url');
};

const SURVEY_TOKEN_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export const randomSurveyTokenCode = (length = 9, prefix = '') => {
  const normalizedPrefix = prefix
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, length);

  if (normalizedPrefix.length >= length) {
    return normalizedPrefix.slice(0, length);
  }

  const remainingLength = length - normalizedPrefix.length;
  const randomBytes = crypto.randomBytes(remainingLength);
  let suffix = '';

  for (let index = 0; index < remainingLength; index += 1) {
    suffix += SURVEY_TOKEN_ALPHABET[randomBytes[index]! % SURVEY_TOKEN_ALPHABET.length];
  }

  return `${normalizedPrefix}${suffix}`;
};
