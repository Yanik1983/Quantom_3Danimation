/** Fixed-point number with a true minus sign (U+2212), which screen readers announce as "minus". */
export function num(v: number, digits = 2): string {
  const s = v.toFixed(digits);
  // Avoid "−0.00" for tiny negative values.
  if (/^-0\.?0*$/.test(s)) return s.slice(1);
  return s.replace('-', '−');
}
