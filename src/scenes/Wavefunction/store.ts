import { create } from 'zustand';
import type { Observables, Packet2D } from '../../physics/wavepacket2d';
import type { PotentialKind } from '../../workers/wavefunctionProtocol';

export const MAX_PACKETS = 3;
export const PACKET_NAMES = ['A', 'B', 'C'] as const;

/** Two overlapping packets moving toward each other: interference stripes from the start. */
export const DEFAULT_PACKETS: Packet2D[] = [
  { x: -1.4, y: 0, kx: 2, ky: 0, sigma: 1.2, phase: 0, weight: 1 },
  { x: 1.4, y: 0, kx: -2, ky: 0, sigma: 1.2, phase: 0, weight: 1 },
];
const NEW_PACKET: Packet2D = { x: 0, y: 3, kx: 0, ky: -1.5, sigma: 1, phase: 0, weight: 1 };

interface WavefunctionState {
  packets: Packet2D[];
  selected: number;
  evolving: boolean;
  potential: PotentialKind;
  /** Bumped on every edit so the scene rebuilds ψ. */
  version: number;
  obs: Observables | null;
  time: number;
  setPacket(i: number, patch: Partial<Packet2D>): void;
  select(i: number): void;
  addPacket(): void;
  removePacket(i: number): void;
  setEvolving(v: boolean): void;
  setPotential(p: PotentialKind): void;
  restart(): void;
  reset(): void;
}

export const useWavefunction = create<WavefunctionState>()((set) => ({
  packets: DEFAULT_PACKETS.map((p) => ({ ...p })),
  selected: 0,
  evolving: false,
  potential: 'harmonic',
  version: 0,
  obs: null,
  time: 0,
  setPacket: (i, patch) =>
    set((s) => ({
      packets: s.packets.map((p, j) => (j === i ? { ...p, ...patch } : p)),
      version: s.version + 1,
    })),
  select: (selected) => set({ selected }),
  addPacket: () =>
    set((s) =>
      s.packets.length >= MAX_PACKETS
        ? s
        : { packets: [...s.packets, { ...NEW_PACKET }], selected: s.packets.length, version: s.version + 1 },
    ),
  removePacket: (i) =>
    set((s) =>
      s.packets.length <= 1
        ? s
        : {
            packets: s.packets.filter((_, j) => j !== i),
            selected: Math.max(0, Math.min(s.selected, s.packets.length - 2)),
            version: s.version + 1,
          },
    ),
  setEvolving: (evolving) => set({ evolving }),
  setPotential: (potential) => set((s) => ({ potential, version: s.version + 1 })),
  restart: () => set((s) => ({ version: s.version + 1 })),
  reset: () =>
    set((s) => ({
      packets: DEFAULT_PACKETS.map((p) => ({ ...p })),
      selected: 0,
      evolving: false,
      potential: 'harmonic',
      version: s.version + 1,
    })),
}));
