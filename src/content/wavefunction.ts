import type { SectionContent } from './types';

export const wavefunction: SectionContent = {
  simple: [
    'Everything quantum mechanics can say about a particle is packed into one object: the **wavefunction**, ψ. At every point in space it has two parts — a size, called the amplitude, and a direction on a colour wheel, called the phase. Here the height of the sheet is the amplitude and its colour is the phase.',
    'The glow on the floor is |ψ|², the amplitude squared: the probability of finding the particle there if you look. Where the floor is bright a detector would often click; where it is dark, almost never.',
    'Drag the rings to move the wave packets, or pull an arrow to give one a push — colour stripes appear, because a phase that winds through space means motion. Now slide one packet’s phase. Alone, its glow doesn’t change at all; but where two packets overlap, the bright and dark stripes shift. Phase is invisible on its own, yet it decides where waves add and where they cancel.',
    'Switch on evolution to watch ψ move according to the Schrödinger equation.',
  ],
  technical: [
    'The state of a spinless particle in 2D is a complex field $\\psi(x,y)$ with $\\int|\\psi|^2\\,dA = 1$. Writing $\\psi = |\\psi|e^{i\\varphi}$, the sheet height is $|\\psi|$, the hue is $\\varphi$, and the floor shows the Born-rule density $|\\psi|^2$.',
    'Each packet is a Gaussian $e^{-|\\mathbf r-\\mathbf r_0|^2/4\\sigma^2}e^{i\\mathbf k\\cdot\\mathbf r}$. The phase gradient $\\nabla\\varphi = \\mathbf k$ is the momentum, $\\mathbf p = \\hbar\\mathbf k$, so faster packets carry tighter colour bands. A global phase $e^{i\\alpha}$ changes nothing measurable, but a relative phase between overlapping packets shifts the interference term $2|\\psi_1||\\psi_2|\\cos(\\varphi_1-\\varphi_2)$. For the default pair, moving with $\\pm k$, those stripes repeat every $\\pi/k$ — half a de Broglie wavelength.',
    'With evolution on, $i\\hbar\\,\\partial_t\\psi = \\hat H\\psi$ in a harmonic bowl $V = \\tfrac12 m\\omega^2 r^2$ or a periodic free box. The readouts are integrals over the current ψ; $\\langle E\\rangle$ stays fixed while ψ changes shape, because the evolution is unitary.',
  ],
  analogy:
    'Think of the colour as the hand of a tiny clock at every point. The floor glow can’t show where the hands point, but when two waves meet, hands pointing the same way add up and hands pointing opposite ways cancel.',
  altText:
    'A glossy sheet floats above a dark floor. Where the wavefunction is large the sheet rises into smooth hills whose colour cycles through cyan, violet and magenta with the quantum phase; below, the floor glows with the probability density. With the default settings two overlapping packets produce a row of bright and dark stripes on the floor.',
  underTheHood: {
    equations: [
      {
        tex: '\\psi(\\mathbf r) = |\\psi(\\mathbf r)|\\,e^{i\\varphi(\\mathbf r)}, \\qquad dP = |\\psi(\\mathbf r)|^2\\,dA',
        caption:
          'Amplitude and phase; the Born rule gives the probability of finding the particle in a small area.',
      },
      {
        tex: '\\psi = \\mathcal N\\sum_j w_j\\,e^{i\\varphi_j}\\exp\\!\\left(-\\frac{|\\mathbf r-\\mathbf r_j|^2}{4\\sigma_j^2}\\right)e^{i\\mathbf k_j\\cdot\\mathbf r}',
        caption:
          'The editable state: a superposition of Gaussian packets, renormalized by $\\mathcal N$ after every edit.',
      },
      {
        tex: '|\\psi_1+\\psi_2|^2 = |\\psi_1|^2 + |\\psi_2|^2 + 2|\\psi_1||\\psi_2|\\cos(\\varphi_1-\\varphi_2)',
        caption: 'Only relative phase is observable, through interference.',
      },
      {
        tex: '\\langle E\\rangle = \\int \\psi^*\\left(-\\frac{\\hbar^2}{2m}\\nabla^2 + V\\right)\\psi\\,dA',
        caption: 'Energy expectation; the kinetic term is evaluated in momentum space.',
      },
    ],
    method: [
      'ψ lives on a 128 × 128 grid spanning 20 × 20 units ($\\hbar = m = 1$, trap frequency $\\omega = 0.5$). Evolution uses the split-step Fourier method ($\\Delta t = 0.01$, three steps per update) in a Web Worker, which also computes $\\langle x\\rangle$, $\\langle y\\rangle$ and $\\langle E\\rangle$ with FFT-based momentum sums.',
      'ψ reaches the GPU as a half-float texture; the vertex shader raises the sheet by $|\\psi|$ and the fragment shader colours it by $\\arg\\psi$ on a hue wheel with no seam at $\\pm\\pi$.',
      'Tested against analytic solutions: a displaced ground state swings to the opposite side after half a period without changing width, a squeezed packet breathes at twice the trap frequency, and $\\langle E\\rangle$ is conserved.',
    ],
  },
};
