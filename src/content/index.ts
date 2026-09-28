import { doubleSlit } from './doubleSlit';
import { wavefunction } from './wavefunction';
import type { SectionContent } from './types';

/** Section id → scientific copy. */
export const CONTENT: Partial<Record<string, SectionContent>> = {
  'double-slit': doubleSlit,
  wavefunction,
};
