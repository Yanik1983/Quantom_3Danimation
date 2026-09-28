import { applications } from './applications';
import { doubleSlit } from './doubleSlit';
import { entanglement } from './entanglement';
import { orbitals } from './orbitals';
import { superposition } from './superposition';
import { tunneling } from './tunneling';
import { uncertainty } from './uncertainty';
import { wavefunction } from './wavefunction';
import type { SectionContent } from './types';

/** Section id → scientific copy. */
export const CONTENT: Partial<Record<string, SectionContent>> = {
  'double-slit': doubleSlit,
  wavefunction,
  superposition,
  orbitals,
  uncertainty,
  tunneling,
  entanglement,
  applications,
};
