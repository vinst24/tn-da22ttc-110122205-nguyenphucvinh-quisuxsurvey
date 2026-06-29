import { describe, expect, it } from 'vitest';
import { getScaleLabels, parseLabels } from './quisScale';

describe('quisScale', () => {
  it('parses question and semantic labels with a standard em dash', () => {
    const labels = parseLabels('Screen: Text readability — hard to read — easy to read');

    expect(labels).toEqual({
      question: 'Screen',
      leftLabel: 'Text readability',
      rightLabel: 'hard to read — easy to read',
    });
  });

  it('parses legacy mojibake em dash content', () => {
    const labels = parseLabels('Question: Left â€” Right');

    expect(labels).toEqual({ question: 'Question', leftLabel: 'Left', rightLabel: 'Right' });
  });

  it('returns nine labels for a known quality pair', () => {
    const labels = getScaleLabels('tệ', 'tốt');

    expect(labels).toHaveLength(9);
    expect(labels[0]).toBe('Rất tệ');
    expect(labels[8]).toBe('Tuyệt vời');
  });

  it('keeps left-to-right direction for frequency pairs', () => {
    const labels = getScaleLabels('luôn luôn', 'không bao giờ');

    expect(labels).toHaveLength(9);
    expect(labels[0]).toBe('Luôn luôn');
    expect(labels[8]).toBe('Không bao giờ');
  });

  it('falls back to a complete nine-point scale for unknown pairs', () => {
    const labels = getScaleLabels('Left', 'Right');

    expect(labels).toHaveLength(9);
    expect(labels[0]).toBe('Left');
    expect(labels[8]).toBe('Right');
  });
});
