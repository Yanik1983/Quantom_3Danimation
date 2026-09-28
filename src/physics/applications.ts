/**
 * Real-world numbers for the "Where it shows up" vignettes (SI-derived constants).
 */
import { transmission } from './barrier';

/** ℏ²/2mₑ in eV·nm². */
export const HBAR2_2ME_EV_NM2 = 0.0380998;
/** hc in eV·nm. */
export const HC_EV_NM = 1239.84198;
/** Proton gyromagnetic ratio γ/2π in MHz per tesla. */
export const PROTON_GAMMA_MHZ_PER_T = 42.577478;

/** Probability that an electron of energy E (eV) tunnels through an oxide barrier of height V₀ (eV) and thickness a (nm). */
export function oxideTunnelling(energyEV: number, barrierEV: number, thicknessNm: number): number {
  return transmission(energyEV, barrierEV, thicknessNm, HBAR2_2ME_EV_NM2);
}

/** Larmor (MRI resonance) frequency of hydrogen nuclei in field B (tesla), in MHz. */
export const larmorMHz = (teslas: number) => PROTON_GAMMA_MHZ_PER_T * teslas;

/** Photon energy (eV) for a vacuum wavelength in nm: E = hc/λ. */
export const photonEnergyEV = (lambdaNm: number) => HC_EV_NM / lambdaNm;
