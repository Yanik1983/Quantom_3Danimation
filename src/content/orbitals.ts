import type { SectionContent } from './types';

export const orbitals: SectionContent = {
  simple: [
    'An electron in an atom is not a tiny planet on an orbit. It is a standing wave wrapped around the nucleus — and just as a guitar string can only ring at certain notes, that wave can only settle into certain patterns. Each pattern has a fixed energy. That is **quantization**: the energy ladder in the controls has rungs and nothing in between.',
    'Each dot in the cloud is one place the electron could be found, drawn at random from the exact probabilities of hydrogen’s wavefunction. Dense regions are likely; empty ones, unlikely. Colour shows the sign of the wave: cyan where it is positive, magenta where it is negative.',
    'Three whole numbers pick the pattern: n sets the energy and size, l the shape (s, p, d, f) and m the orientation. Raise n and the cloud grows — its true size, shown in the readout, scales roughly as n². Cut the cloud open with the cross-section slider to find the **nodes**: surfaces where the wave is exactly zero and the electron is never found.',
  ],
  technical: [
    'Hydrogen’s bound states solve $\\hat H\\psi = E\\psi$ with $V = -e^2/4\\pi\\varepsilon_0 r$. Separating variables gives $\\psi_{nlm} = R_{nl}(r)\\,Y_{lm}(\\theta,\\varphi)$ with $n \\ge 1$, $0 \\le l < n$, $|m| \\le l$, and energies $E_n = -13.6\\,\\text{eV}/n^2$ that depend only on $n$ — so each level holds $n^2$ degenerate orbitals.',
    'Normalizability at $r \\to \\infty$ is what quantizes $n$: for any other energy the radial series diverges. $R_{nl}$ has $n-l-1$ radial nodes and $Y_{lm}$ has $l$ angular nodal surfaces. The real harmonics used here are the familiar $p_x, d_{xy}, \\ldots$ combinations of $m = \\pm|m|$ states. The degeneracy in $l$ is special to the pure $1/r$ potential: in heavier atoms, screening by the other electrons splits the subshells — which is why the periodic table fills in the order it does.',
    'Points are independent samples from $|\\psi_{nlm}|^2$; their colour is $\\operatorname{sign}\\psi$. Each cloud is rescaled so 95 % of its probability fills the same volume; $\\langle r\\rangle = \\tfrac12[3n^2 - l(l+1)]\\,a_0$ gives the real size.',
  ],
  analogy:
    'A guitar string pinned at both ends can only vibrate in whole numbers of half-wavelengths, which is why it plays distinct notes. The electron’s wave must likewise fit around the nucleus and fade to zero far away — though it vibrates in three dimensions and nothing physical is actually oscillating.',
  altText:
    'A slowly turning cloud of tens of thousands of glowing points surrounds a tiny bright nucleus (drawn far larger than its true size). The cloud has the shape of the selected hydrogen orbital — a sphere for s orbitals, dumbbell lobes for p, cloverleaves and rings for d — with cyan points where the wavefunction is positive and magenta where it is negative. An optional cutting plane slices the cloud open and shows the exact wavefunction on the cut, including its dark nodal lines.',
  underTheHood: {
    equations: [
      {
        tex: '\\psi_{nlm}(r,\\theta,\\varphi) = R_{nl}(r)\\,Y_{lm}(\\theta,\\varphi), \\qquad E_n = -\\frac{m_e e^4}{2(4\\pi\\varepsilon_0)^2\\hbar^2}\\,\\frac{1}{n^2} = -\\frac{13.6\\ \\text{eV}}{n^2}',
        caption: 'Separable hydrogen eigenstates and the Bohr energy levels.',
      },
      {
        tex: 'R_{nl}(r) = \\sqrt{\\left(\\tfrac{2}{n}\\right)^3\\frac{(n-l-1)!}{2n\\,(n+l)!}}\\;e^{-r/n}\\left(\\tfrac{2r}{n}\\right)^{l} L^{2l+1}_{n-l-1}\\!\\left(\\tfrac{2r}{n}\\right)',
        caption:
          'Radial function in units of the Bohr radius $a_0 = 0.0529$ nm, with generalized Laguerre polynomials $L$.',
      },
      {
        tex: 'Y_{l,\\pm|m|} \\propto P_l^{|m|}(\\cos\\theta)\\,\\begin{cases}\\cos |m|\\varphi\\\\ \\sin |m|\\varphi\\end{cases}',
        caption: 'Real spherical harmonics from associated Legendre functions $P_l^{m}$.',
      },
      {
        tex: 'P(r)\\,dr = r^2 R_{nl}^2\\,dr, \\qquad P(\\Omega)\\,d\\Omega = Y_{lm}^2\\,d\\Omega',
        caption: 'Because $|\\psi|^2$ factorizes, radius and direction can be sampled independently.',
      },
    ],
    method: [
      'In a Web Worker, radii are drawn by inverse-CDF sampling of $r^2R_{nl}^2$ (4096-point table) and directions by rejection sampling of $Y_{lm}^2$ against a uniform sphere — exact samples of $|\\psi|^2$, up to 70 000 points on fast devices.',
      'The cross-section evaluates $\\psi$ exactly on a 160 × 160 grid over the cutting plane; the point-cloud shader discards points in front of it.',
      'Tested: closed-form Legendre and Laguerre values, orthonormality of all $Y_{lm}$ with $l \\le 3$ by Gauss–Legendre quadrature, normalization, $\\langle r\\rangle$, $\\langle 1/r\\rangle = 1/n^2$ (hence $E_n = -1/2n^2$ via the virial theorem), node counts, the radial Schrödinger equation residual, and the statistics of the samples.',
    ],
  },
};
