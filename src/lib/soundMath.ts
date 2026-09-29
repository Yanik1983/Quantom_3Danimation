/**
 * Pure helpers for the sound effects (no Web Audio here, so they can be unit-tested).
 */

/** A pentatonic scale from E4 up two octaves: pleasant for any pair of notes played together. */
const PENTATONIC = [0, 3, 5, 7, 10];
const BASE_HZ = 329.63;

/**
 * Pitch for measurement result `index` out of `count` possible results: low for 0, higher for
 * larger results, so a batch of measurements sounds like the mix (mostly low = mostly 0).
 */
export function resultFrequency(index: number, count: number): number {
  const steps = Math.max(1, count - 1);
  // Spread the results over two octaves (10 scale steps), rounded to scale notes.
  const step = Math.round((index / steps) * 10);
  const semitones = 12 * Math.floor(step / 5) + PENTATONIC[step % 5];
  return BASE_HZ * Math.pow(2, semitones / 12);
}

/** Lets an event through at most once per `gap` seconds. */
export class RateLimiter {
  private last = -Infinity;
  constructor(private readonly gap: number) {}
  allow(now: number): boolean {
    if (now - this.last < this.gap) return false;
    this.last = now;
    return true;
  }
}
