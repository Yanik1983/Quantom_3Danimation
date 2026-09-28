import { describe, expect, it } from 'vitest';
import { num } from './format';

describe('num', () => {
  it('uses a true minus sign and never prints −0', () => {
    expect(num(-13.6057)).toBe('−13.61');
    expect(num(2.5, 1)).toBe('2.5');
    expect(num(-0.0001)).toBe('0.00');
    expect(num(-0.4, 0)).toBe('0');
  });
});
