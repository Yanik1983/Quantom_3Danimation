import type { SectionContent } from './types';

export const superposition: SectionContent = {
  simple: [
    'A **qubit** is the simplest quantum system: measure it and you get one of just two answers, labelled |0⟩ and |1⟩ — like an electron’s spin pointing up or down. Unlike a coin, it can sit in a **superposition**: a precise blend of both, with an amplitude for each.',
    'Every possible state of a qubit is a point on this sphere. The north pole is |0⟩, the south pole |1⟩, and everything in between is a superposition. Drag the glowing tip and watch the bars: their heights are the probabilities of the two outcomes, their colours the phases of the amplitudes.',
    'Press **Measure**. The qubit interacts with a detector and comes out as |0⟩ or |1⟩ — at random, with exactly the odds the bars showed. Measure again and you get the same answer: the interaction changed the state. To collect statistics you need fresh copies.',
    'Switch the axis to X or Y. The same state now gives different odds: what you find depends on the question you ask.',
  ],
  technical: [
    'A pure qubit state $|\\psi\\rangle = \\cos\\tfrac{\\theta}{2}|0\\rangle + e^{i\\varphi}\\sin\\tfrac{\\theta}{2}|1\\rangle$ corresponds one-to-one to the unit Bloch vector $\\vec r = (\\sin\\theta\\cos\\varphi,\\ \\sin\\theta\\sin\\varphi,\\ \\cos\\theta)$, once the unobservable global phase is dropped.',
    'A projective measurement along $\\hat n$ yields $\\pm1$ with Born probabilities $P_\\pm = |\\langle\\pm\\hat n|\\psi\\rangle|^2 = \\tfrac12(1 \\pm \\vec r\\cdot\\hat n)$ — the dashed projection onto the axis. Afterwards the state is $|\\pm\\hat n\\rangle$, so an immediate repeat agrees with certainty, while a measurement along an orthogonal axis is 50/50.',
    'Superposition is relative to a basis: $|0\\rangle$ is itself an equal superposition of $|+\\rangle$ and $|-\\rangle$. What separates a superposition from a 50/50 coin-flip mixture is coherence — a definite relative phase $\\varphi$, which shows up as different statistics along X and Y.',
    'Physically, measuring means coupling the qubit to a macroscopic apparatus. Entanglement with the apparatus and its environment (decoherence) suppresses interference between the outcomes, and one definite record results. The tally of fresh copies converges to $P_+$ with a standard error $\\sqrt{P_+(1-P_+)/N}$.',
  ],
  analogy:
    'A coin spinning in the air is often used to picture superposition. It is a flawed analogy: the spinning coin secretly has a definite orientation at every instant, whereas the qubit’s phase is real and can make probabilities interfere — change the measurement axis and the odds change in ways no coin can mimic.',
  altText:
    'A translucent sphere with glowing latitude and longitude lines. An arrow from its centre points to the qubit’s state on the surface; |0⟩ is marked at the top, |1⟩ at the bottom and |±⟩, |±i⟩ around the equator. A dashed line drops from the arrow tip onto the highlighted measurement axis. Beside the sphere, two bars show the probabilities of the two outcomes. After a measurement a ring flashes across the sphere and the arrow snaps to one end of the axis.',
  underTheHood: {
    equations: [
      {
        tex: '|\\psi\\rangle = \\cos\\frac{\\theta}{2}\\,|0\\rangle + e^{i\\varphi}\\sin\\frac{\\theta}{2}\\,|1\\rangle',
        caption: 'Bloch-sphere parametrization of a pure qubit state.',
      },
      {
        tex: 'P(\\pm\\hat n) = |\\langle\\pm\\hat n|\\psi\\rangle|^2 = \\tfrac12\\,(1 \\pm \\vec r\\cdot\\hat n)',
        caption: 'Born rule for a measurement along the axis $\\hat n$.',
      },
      {
        tex: '|\\pm x\\rangle = \\frac{|0\\rangle \\pm |1\\rangle}{\\sqrt2}, \\qquad |\\pm y\\rangle = \\frac{|0\\rangle \\pm i|1\\rangle}{\\sqrt2}',
        caption: 'Eigenstates of the X and Y measurements.',
      },
      {
        tex: '\\hat\\rho_{\\text{after}} = \\sum_\\pm P_\\pm\\,|\\pm\\hat n\\rangle\\langle\\pm\\hat n| \\quad\\text{(before reading the record)}',
        caption:
          'Decoherence by the detector leaves a mixture of the two outcomes; each run shows one of them.',
      },
    ],
    method: [
      'Amplitudes are computed exactly in the chosen basis with complex arithmetic. Each measurement draws a uniform random number $u$ and returns the + outcome if $u < P_+$ — inverse-CDF sampling of the Born distribution — using a generator seeded from the browser’s cryptographic entropy.',
      'The post-measurement state is the corresponding eigenstate; the 0.6 s flash and snap only visualize that update and are skipped under reduced motion. “Measure 100 fresh copies” re-prepares the original state for every trial.',
      'Unit tests check normalization, that $P_\\pm$ from amplitudes equals $\\tfrac12(1 \\pm \\vec r\\cdot\\hat n)$ in every basis, that 100 000 samples fall within 4σ of the prediction, that repeated measurements agree, and that complementary bases give 50/50.',
    ],
  },
};
