import type { SectionContent } from './types';

export const applications: SectionContent = {
  simple: [
    'Everything you have just played with is running the modern world.',
    '**Tunnelling** sets the limits of every transistor in your phone and makes flash memory work. **Spin and superposition** let an MRI scanner listen to the hydrogen nuclei inside your body. **Quantized energy levels** give each atom its own exact colours, and a laser uses them to amplify light into a perfectly matched beam. **Superposition and entanglement** are the raw materials of quantum computers, which choreograph interference so that wrong answers cancel and right ones reinforce.',
    'Pick an application to see the idea at work, then follow the “builds on” links back to the physics behind it.',
    'The strange rules you met along the way — probability amplitudes, measurement as interaction, correlations no hidden instructions can explain — are not loose ends. They are among the most precisely tested ideas in science, and nearly every modern electronic device is designed with them.',
  ],
  technical: [
    '**Semiconductors** are band structure plus tunnelling: gate-oxide leakage scales roughly as $e^{-2\\kappa d}$, one reason SiO₂ gave way to high-$k$ dielectrics; flash memory writes by Fowler–Nordheim tunnelling through a field-tilted barrier.',
    '**MRI** exploits proton spin: the magnetization precesses at the Larmor frequency $f = \\gamma B/2\\pi$ (42.58 MHz/T) and follows the Bloch equations; tissue contrast comes from the relaxation times $T_1$ and $T_2$.',
    '**Lasers** rest on discrete atomic levels, $E = h\\nu = hc/\\lambda$, and on stimulated emission, which copies a photon’s mode exactly; population inversion plus optical feedback gives coherent gain.',
    '**Quantum computers** evolve superpositions of $2^n$ basis states with unitary gates. Grover’s algorithm amplifies a marked amplitude to $\\sin^2((2k+1)\\theta)$, $\\sin\\theta = 1/\\sqrt N$ — about $\\tfrac{\\pi}{4}\\sqrt N$ queries instead of $N/2$.',
    'The same physics runs atomic clocks (and so GPS timing), LEDs and solar cells, and the chemical bond in every molecule.',
  ],
  altText:
    'The final station shows one of four small working models, chosen with the controls: a transistor cross-section with electrons streaming along the channel and occasionally tunnelling through the gate oxide; a nuclear spin precessing around a magnetic field and tipped by a radio pulse, with its signal traced below; a laser cavity in which excited atoms release cascades of identical photons between two mirrors; and eight bars showing the amplitudes of a three-qubit quantum computer running Grover’s search.',
  underTheHood: {
    equations: [
      {
        tex: 'T \\approx 16\\,\\frac{E}{V_0}\\left(1-\\frac{E}{V_0}\\right)e^{-2\\kappa d}, \\qquad \\kappa = \\frac{\\sqrt{2m_e(V_0 - E)}}{\\hbar} \\approx 7.4\\ \\text{nm}^{-1}',
        caption:
          'Gate-oxide tunnelling for $V_0 = 3.1$ eV, $E = 1$ eV (exact rectangular-barrier formula used in the readout).',
      },
      {
        tex: '\\frac{d\\vec M}{dt} = \\gamma\\,\\vec M \\times \\vec B - \\frac{M_x\\hat x + M_y\\hat y}{T_2} - \\frac{(M_z - M_0)\\hat z}{T_1}',
        caption: 'Bloch equations for nuclear magnetization; $\\gamma/2\\pi = 42.58$ MHz/T for hydrogen.',
      },
      {
        tex: 'E_{\\text{photon}} = h\\nu = \\frac{hc}{\\lambda}, \\qquad hc = 1239.84\\ \\text{eV·nm}',
        caption: 'Photon energy of each laser line.',
      },
      {
        tex: 'P_{\\text{marked}}(k) = \\sin^2\\!\\big((2k+1)\\,\\theta\\big), \\qquad \\sin\\theta = \\tfrac{1}{\\sqrt{N}}',
        caption: 'Grover success probability; for $N = 8$, two rounds give 0.945.',
      },
    ],
    method: [
      'Transistor: the exact barrier formula in electron units ($\\hbar^2/2m_e = 0.0381$ eV·nm²). The animated leak rate is proportional to $\\log_{10} T$ so it remains visible; the readout is the physical value.',
      'MRI: the Bloch equations are integrated each frame with precession slowed about $10^8$ times and $T_1$, $T_2$ lengthened for display; the Larmor readout is exact.',
      'Laser: a stochastic illustration of pumping, spontaneous and stimulated emission, and output coupling — qualitative, not a rate-equation model of any real device.',
      'Quantum computer: an exact 3-qubit state-vector simulation (Hadamard, oracle phase flip, diffusion) with Born-rule measurement; tested against the analytic Grover probabilities.',
    ],
  },
};
