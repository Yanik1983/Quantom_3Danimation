import { create } from 'zustand';
import { QRegister } from '../../physics/qregister';
import { mulberry32 } from '../../physics/rng';

export type AppId = 'transistor' | 'mri' | 'laser' | 'qc';

/** The 3-qubit register shared by the quantum-computer vignette and its controls. */
export const register = new QRegister(3);
const rng = mulberry32(crypto.getRandomValues(new Uint32Array(1))[0]);

export type QcStep = 'reset' | 'superpose' | 'oracle' | 'diffuse' | 'measure';

interface ApplicationsState {
  app: AppId;
  /** Gate-oxide thickness (nm). */
  oxide: number;
  /** MRI field strength (T). */
  field: number;
  /** Bumped to fire an RF pulse. */
  pulseToken: number;
  /** Laser pump strength 0…1 and wavelength (nm). */
  pump: number;
  wavelength: number;
  /** Quantum computer. */
  marked: number;
  qcVersion: number;
  qcLog: QcStep[];
  lastOutcome: number | null;
  /** Photons leaving the laser per second (illustration units), reported by the scene. */
  laserOutput: number;
  setApp(a: AppId): void;
  setOxide(v: number): void;
  setField(v: number): void;
  pulse(): void;
  setPump(v: number): void;
  setWavelength(v: number): void;
  setMarked(m: number): void;
  qc(step: QcStep): void;
  reset(): void;
}

const DEFAULTS = {
  app: 'transistor' as AppId,
  oxide: 1.2,
  field: 1.5,
  pump: 0.7,
  wavelength: 632.8,
  marked: 5,
};

export const useApplications = create<ApplicationsState>()((set, get) => ({
  ...DEFAULTS,
  pulseToken: 0,
  qcVersion: 0,
  qcLog: ['reset'],
  lastOutcome: null,
  laserOutput: 0,
  setApp: (app) => set({ app }),
  setOxide: (oxide) => set({ oxide }),
  setField: (field) => set({ field }),
  pulse: () => set((s) => ({ pulseToken: s.pulseToken + 1 })),
  setPump: (pump) => set({ pump }),
  setWavelength: (wavelength) => set({ wavelength }),
  setMarked: (marked) => {
    register.reset();
    set((s) => ({ marked, qcVersion: s.qcVersion + 1, qcLog: ['reset'], lastOutcome: null }));
  },
  qc: (step) => {
    let outcome: number | null = null;
    switch (step) {
      case 'reset':
        register.reset();
        break;
      case 'superpose':
        register.hadamardAll();
        break;
      case 'oracle':
        register.oracle(get().marked);
        break;
      case 'diffuse':
        register.diffuse();
        break;
      case 'measure':
        outcome = register.measure(rng);
        break;
    }
    set((s) => ({
      qcVersion: s.qcVersion + 1,
      qcLog: step === 'reset' ? ['reset'] : [...s.qcLog, step],
      lastOutcome: step === 'measure' ? outcome : step === 'reset' ? null : s.lastOutcome,
    }));
  },
  reset: () => {
    register.reset();
    set((s) => ({ ...DEFAULTS, qcVersion: s.qcVersion + 1, qcLog: ['reset'], lastOutcome: null }));
  },
}));
