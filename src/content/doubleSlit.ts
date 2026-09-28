import type { SectionContent } from './types';

export const doubleSlit: SectionContent = {
  simple: [
    'Fire particles — electrons, say — one at a time at a wall with two narrow slits. Each one arrives at the screen as a single sharp dot, exactly as a tiny particle should.',
    'Keep going. Dot by dot, stripes appear: bright bands where many particles land, dark bands where almost none do. That is the signature of **waves overlapping**. No two particles ever meet, yet together they paint interference. Each particle’s wave passed through **both** slits and interfered with itself; the dot then lands where the two parts of its wave reinforce, never where they cancel.',
    'Now switch on the detectors at the slits. They record which slit every particle used, and the stripes vanish. The hits are coloured by the slit their detector recorded: two plain bands, cyan and magenta, one from each slit. They overlap into a smooth, stripe-free spread. Nobody has to read the record — the physical interaction that stores the which-path information is enough.',
    'The waves you see are a genuine solution of the Schrödinger equation, and every dot is drawn at random from the probabilities it predicts.',
  ],
  technical: [
    'The packet is evolved with the time-dependent Schrödinger equation. Behind the mask the wavefunction is the superposition $\\psi = \\psi_1 + \\psi_2$ of the waves leaving each slit, so the detection density is $|\\psi_1|^2 + |\\psi_2|^2 + 2\\,\\mathrm{Re}(\\psi_1^*\\psi_2)$. The cross term oscillates with the path difference and puts bright fringes where $r_2 - r_1 = m\\lambda$, with $\\lambda = h/p$ the de Broglie wavelength. Faster particles have shorter wavelengths and therefore more tightly packed fringes.',
    'Each dot is an independent Born-rule sample from the time-integrated probability current through the screen. The fringes are a property of the ensemble; no single detection reveals them.',
    'A which-path detector entangles with the particle: $\\psi_1|D_1\\rangle + \\psi_2|D_2\\rangle$. With orthogonal pointer states, $\\langle D_1|D_2\\rangle = 0$, tracing out the detector multiplies the cross term by zero — decoherence. Partially distinguishable states would reduce the fringe visibility continuously; the simulation shows the ideal limit.',
  ],
  analogy:
    'Ripples on a pond passing through two gaps in a breakwater overlap into calm and choppy stripes on the far shore. But water waves are made of water; the quantum wave is not made of anything you could see, and what arrives at the screen is always one whole particle.',
  altText:
    'A glowing wave packet leaves an emitter near the viewer, travels across a dark floor to a mask with two narrow slits, and emerges as two overlapping fans of ripples coloured by quantum phase. At the back, a detection screen collects individual flashes that build up vertical bright and dark stripes; a histogram above it tracks the counts.',
  underTheHood: {
    equations: [
      {
        tex: 'i\\hbar\\,\\frac{\\partial \\psi}{\\partial t} = -\\frac{\\hbar^2}{2m}\\nabla^2\\psi + V\\psi',
        caption: 'Time-dependent Schrödinger equation (simulation units: $\\hbar = m = 1$).',
      },
      {
        tex: '\\psi(t+\\Delta t) \\approx e^{-iV\\Delta t/2\\hbar}\\,\\mathcal{F}^{-1}\\!\\left[e^{-i\\hbar k^2\\Delta t/2m}\\,\\mathcal{F}\\!\\left[e^{-iV\\Delta t/2\\hbar}\\,\\psi(t)\\right]\\right]',
        caption:
          'Split-step Fourier (Strang) update: kinetic energy is applied exactly in momentum space, potential exactly in position space.',
      },
      {
        tex: 'P(y) \\propto \\int j_x(x_s, y, t)\\,dt, \\qquad j_x = \\frac{\\hbar}{m}\\,\\mathrm{Im}\\!\\left(\\psi^*\\,\\partial_x\\psi\\right)',
        caption: 'Detection density: the probability current through the screen, integrated over time.',
      },
      {
        tex: 'P_{\\text{no record}} \\propto |\\psi_1 + \\psi_2|^2, \\qquad P_{\\text{which-path}} \\propto |\\psi_1|^2 + |\\psi_2|^2',
        caption: 'Orthogonal detector states remove the interference term.',
      },
    ],
    method: [
      'A Gaussian packet ($k_0 = 8$, $\\lambda \\approx 0.79$) is propagated by the split-step Fourier method on a 256 × 128 grid in a Web Worker, using radix-2 FFTs. The slit mask and the box edges are complex absorbing potentials, so waves that hit them are absorbed instead of reflecting or wrapping around.',
      'Only the upper-slit wave $\\psi_1$ is simulated; by mirror symmetry $\\psi_2(x,y) = \\psi_1(x,-y)$. This superposition was validated against a direct two-slit run (patterns agree within 5 %), and the fringe positions against exact path-difference geometry.',
      'Why do the two which-path bands overlap? Narrow slits spread each beam much wider than the slit spacing — the same spreading that makes the fringes crisp. Separated bands would need wide slits and a nearby screen, where the fringes themselves fade: sharp fringes and separated bands exclude each other.',
      'Screen hits are drawn with Vose’s alias method from the computed distribution — each dot is a genuine Born-rule sample. With detectors on, each particle first registers at one slit (probability ½ each) and then lands according to that slit’s pattern.',
    ],
  },
};
