import { create } from 'zustand';
import type { Packet1D, PacketShape } from '../../physics/wavepacket1d';

interface UncertaintyState extends Packet1D {
  set(patch: Partial<Packet1D>): void;
  setShape(s: PacketShape): void;
  reset(): void;
}

export const DEFAULT_PACKET: Packet1D = {
  shape: 'gaussian',
  sigma: 1,
  x0: 0,
  k0: 1.5,
  chirp: 0,
  separation: 4,
};

export const useUncertainty = create<UncertaintyState>()((set) => ({
  ...DEFAULT_PACKET,
  set: (patch) => set(patch),
  setShape: (shape) => set({ shape }),
  reset: () => set({ ...DEFAULT_PACKET }),
}));

export const packetOf = (s: Packet1D): Packet1D => ({
  shape: s.shape,
  sigma: s.sigma,
  x0: s.x0,
  k0: s.k0,
  chirp: s.chirp,
  separation: s.separation,
});
