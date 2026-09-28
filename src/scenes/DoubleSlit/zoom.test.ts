import { describe, expect, it } from 'vitest';
import { fieldOfView, formatLength, zoomLabel } from './zoom';

describe('zoom lens scale', () => {
  it('spans a grain of fine sand (0.1 mm) to an atom (0.1 nm)', () => {
    expect(fieldOfView(0)).toBeCloseTo(1e-4, 12);
    expect(fieldOfView(1) / 1e-10).toBeCloseTo(1, 9);
    // "A million times smaller than a grain of sand."
    expect(fieldOfView(0) / fieldOfView(1)).toBeCloseTo(1e6, 0);
  });

  it('formats lengths with sensible units', () => {
    expect(formatLength(1e-3)).toBe('1 mm');
    expect(formatLength(2.5e-5)).toBe('25 µm');
    expect(formatLength(1e-9)).toBe('1 nm');
    expect(formatLength(1e-10)).toBe('0.1 nm');
  });

  it('names what the lens shows', () => {
    expect(zoomLabel(0)).toBe('100 µm: a grain of sand');
    expect(zoomLabel(1)).toBe('0.1 nm: one atom');
  });
});
