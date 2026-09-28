/** Simulation box: 2048 points over 160 units (ℏ = m = 1), absorbing 12-unit edges. */
export const SIM = { n: 2048, length: 160, dt: 0.02, capWidth: 12, capStrength: 2 } as const;
/** The packet starts at x₀ with position spread σ (momentum spread 1/2σ). */
export const PACKET_X0 = -30;
export const PACKET_SIGMA = 4;
/** The visible window is x ∈ [−DISPLAY_HALF, DISPLAY_HALF]. */
export const DISPLAY_HALF = 36;
export const DISPLAY_SAMPLES = 720;
/** Simulated time units per second of animation. */
export const SIM_RATE = 7;
