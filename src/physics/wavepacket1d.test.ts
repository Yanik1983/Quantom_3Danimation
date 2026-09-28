import { describe, expect, it } from 'vitest';
import { buildPacket1D, MomentumTransform, spread, type Packet1D } from './wavepacket1d';
import { centeredGrid1D } from './grid';

const grid = centeredGrid1D(2048, 80);
const xs = Float64Array.from({ length: grid.n }, (_, i) => grid.x0 + i * grid.dx);
const base: Packet1D = { shape: 'gaussian', sigma: 1, x0: 0, k0: 0, chirp: 0, separation: 4 };

function analyse(p: Partial<Packet1D>) {
  const psi = new Float64Array(2 * grid.n);
  buildPacket1D(grid, { ...base, ...p }, psi);
  const t = new MomentumTransform(grid);
  const phi = t.transform(psi);
  return { psi, phi, t, x: spread(xs, psi), k: spread(t.p, phi) };
}

describe('1D wave packets and their Fourier transforms (ℏ = 1)', () => {
  it('ψ and φ are both normalized (Parseval)', () => {
    for (const shape of ['gaussian', 'flattop', 'twopeaks'] as const) {
      const { psi, phi, t } = analyse({ shape, k0: 1.3, x0: -2 });
      let a = 0;
      let b = 0;
      for (let i = 0; i < grid.n; i++) {
        a += (psi[2 * i] ** 2 + psi[2 * i + 1] ** 2) * grid.dx;
        b += (phi[2 * i] ** 2 + phi[2 * i + 1] ** 2) * t.dp;
      }
      expect(a).toBeCloseTo(1, 10);
      expect(b).toBeCloseTo(1, 10);
    }
  });

  it.each([0.3, 0.8, 1, 2.5])('a Gaussian saturates the bound: Δx·Δp = 1/2 (σ = %f)', (sigma) => {
    const { x, k } = analyse({ sigma });
    expect(x.sd).toBeCloseTo(sigma, 6);
    expect(k.sd).toBeCloseTo(1 / (2 * sigma), 6);
    expect(x.sd * k.sd).toBeCloseTo(0.5, 6);
  });

  it('the Fourier transform of a Gaussian is a Gaussian with real, positive amplitude at x₀ = k₀ = 0', () => {
    const { phi, t } = analyse({ sigma: 1.2 });
    const s = 1 / (2 * 1.2);
    for (let m = 0; m < grid.n; m += 37) {
      const expected = Math.pow(2 * Math.PI * s * s, -0.25) * Math.exp(-(t.p[m] ** 2) / (4 * s * s));
      expect(phi[2 * m]).toBeCloseTo(expected, 8);
      expect(phi[2 * m + 1]).toBeCloseTo(0, 8);
    }
  });

  it('shifting in x twists the phase in p, and a momentum kick shifts φ: ⟨p⟩ = k₀', () => {
    const shifted = analyse({ x0: 3 });
    const m = shifted.t.p.findIndex((p) => Math.abs(p - 0.5) < 1e-9 || p > 0.5);
    const phase = Math.atan2(shifted.phi[2 * m + 1], shifted.phi[2 * m]);
    const expected = -shifted.t.p[m] * 3;
    expect(Math.cos(phase - expected)).toBeCloseTo(1, 8);
    const kicked = analyse({ k0: 2.2, sigma: 0.7 });
    expect(kicked.k.mean).toBeCloseTo(2.2, 8);
    expect(kicked.k.sd * kicked.x.sd).toBeCloseTo(0.5, 6);
  });

  it('a chirp leaves |ψ(x)| unchanged but raises Δp: Δx·Δp = ½√(1 + 16c²σ⁴)', () => {
    for (const c of [0.1, 0.3]) {
      const { x, k } = analyse({ sigma: 1, chirp: c });
      expect(x.sd).toBeCloseTo(1, 6);
      expect(x.sd * k.sd).toBeCloseTo(0.5 * Math.sqrt(1 + 16 * c * c), 5);
    }
  });

  it('other shapes obey the bound strictly', () => {
    for (const shape of ['flattop', 'twopeaks'] as const) {
      const { x, k } = analyse({ shape, sigma: 0.8 });
      expect(x.sd * k.sd).toBeGreaterThan(0.5);
    }
  });

  it('two separated peaks produce interference fringes in momentum space with period 2π/d', () => {
    const d = 6;
    const { phi, t } = analyse({ shape: 'twopeaks', separation: d, sigma: 0.5 });
    // |φ(p)|² ∝ cos²(pd/2) × envelope: zeros at p = π/d (and odd multiples).
    const pZero = Math.PI / d;
    const m = t.p.findIndex((p) => p >= pZero);
    const at = (i: number) => phi[2 * i] ** 2 + phi[2 * i + 1] ** 2;
    const peak = at(t.p.findIndex((p) => p >= 0));
    expect(at(m) / peak).toBeLessThan(0.02);
  });
});
