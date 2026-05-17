import { describe, it, expect } from 'vitest';
import { generateShortCode, isValidShortCode } from '../../src/shared/utils/alias.js';

describe('shortCode utils', () => {
  it('generates valid short code', () => {
    const code = generateShortCode();
    expect(code).toHaveLength(6);
    expect(isValidShortCode(code)).toBe(true);
  });

  it('validates custom short code', () => {
    expect(isValidShortCode('my-link_1')).toBe(true);
    expect(isValidShortCode('ab')).toBe(false);
  });
});
