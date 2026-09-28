/** IEEE-754 float32 → float16 bit pattern (round-to-nearest), for half-float GPU textures. */
const f32 = new Float32Array(1);
const u32 = new Uint32Array(f32.buffer);

export function toHalf(v: number): number {
  f32[0] = v;
  const x = u32[0];
  const sign = (x >>> 16) & 0x8000;
  const exp = ((x >>> 23) & 0xff) - 112; // rebias 127 → 15
  const mant = x & 0x7fffff;
  if (((x >>> 23) & 0xff) === 0xff) return sign | 0x7c00 | (mant ? 0x200 : 0); // Inf / NaN
  if (exp >= 31) return sign | 0x7c00; // overflow → Inf
  if (exp <= 0) {
    if (exp < -10) return sign; // underflow → ±0
    const m = (mant | 0x800000) >> (1 - exp);
    return sign | ((m + 0x1000) >> 13);
  }
  // Adding (not OR-ing) lets a rounding carry out of the mantissa bump the exponent.
  return sign | ((exp << 10) + ((mant + 0x1000) >> 13));
}
