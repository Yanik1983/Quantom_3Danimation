/** The eight concepts on the progress rail. Station 0 is the intro and is not on the rail. */
export interface SectionMeta {
  id: string;
  /** Station index in world space (1..8). */
  station: number;
  title: string;
  kicker: string;
  railLabel: string;
}

export const SECTIONS: readonly SectionMeta[] = [
  {
    id: 'double-slit',
    station: 1,
    title: 'One particle, two paths',
    kicker: 'Wave–particle duality',
    railLabel: 'Double slit',
  },
  {
    id: 'wavefunction',
    station: 2,
    title: 'The wavefunction',
    kicker: 'Amplitude and phase',
    railLabel: 'Wavefunction',
  },
  {
    id: 'superposition',
    station: 3,
    title: 'Both, until asked',
    kicker: 'Superposition',
    railLabel: 'Superposition',
  },
  {
    id: 'orbitals',
    station: 4,
    title: 'Why atoms have shapes',
    kicker: 'Quantization & orbitals',
    railLabel: 'Orbitals',
  },
  {
    id: 'uncertainty',
    station: 5,
    title: 'The price of precision',
    kicker: 'Uncertainty',
    railLabel: 'Uncertainty',
  },
  {
    id: 'tunneling',
    station: 6,
    title: 'Through the wall',
    kicker: 'Quantum tunneling',
    railLabel: 'Tunneling',
  },
  {
    id: 'entanglement',
    station: 7,
    title: 'Spooky, but not a signal',
    kicker: 'Entanglement',
    railLabel: 'Entanglement',
  },
  {
    id: 'applications',
    station: 8,
    title: 'Where it shows up',
    kicker: 'Quantum in your life',
    railLabel: 'Applications',
  },
];

export const STATION_COUNT = SECTIONS.length + 1;
