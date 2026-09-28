import type { SectionContent } from './types';

export const uncertainty: SectionContent = {
  simple: [
    'The upper plot shows a particle’s wavefunction in position; the lower one shows the very same state described by momentum. They are not two things — they are two views of one wave, linked by a mathematical operation called the **Fourier transform**.',
    'Squeeze the packet. As it narrows in position, it spreads out in momentum; stretch it and the momentum narrows. A wave confined to a small region must be built from many different wavelengths, and wavelength is momentum. That trade-off is the **uncertainty principle**: the spreads obey Δx·Δp ≥ ℏ/2, whatever you do.',
    'It is not about clumsy instruments disturbing the particle. The limit is a property of the state itself. A smooth Gaussian bell reaches it exactly; every other shape — flat-top, two peaks, or a chirped wave — lands above it.',
    'The numbers are real: pin an electron down to the width of an atom (0.1 nm) and its speed becomes uncertain by at least about 580 km/s.',
  ],
  technical: [
    'Position and momentum wavefunctions are Fourier pairs, $\\varphi(p) = (2\\pi\\hbar)^{-1/2}\\int \\psi(x)\\,e^{-ipx/\\hbar}dx$. The Robertson inequality for $[\\hat x, \\hat p] = i\\hbar$ gives $\\sigma_x\\sigma_p \\ge \\hbar/2$, with equality only for Gaussians with no chirp. Sequential measurements cannot beat it either: a sharp position measurement leaves a state narrow in $x$, hence broad in $p$, so the next momentum result is correspondingly unpredictable.',
    'The panels plot the complex functions as ribbons from the axis to $(\\operatorname{Re}, \\operatorname{Im})$, coloured by phase, with $|\\psi|^2$ and $|\\varphi|^2$ on the back walls. The brackets mark $\\langle x\\rangle \\pm \\sigma_x$ and $\\langle p\\rangle \\pm \\sigma_p$. Note the duality: shifting $x_0$ twists the phase of $\\varphi(p)$ as $e^{-ipx_0/\\hbar}$, and a momentum kick $p_0$ twists $\\psi(x)$ as $e^{ip_0x/\\hbar}$.',
    'A chirp $e^{icx^2}$ leaves $|\\psi(x)|$ untouched yet raises $\\sigma_p$ to $\\sqrt{1/4\\sigma_x^2 + 4c^2\\sigma_x^2}$. Two separated peaks produce momentum-space fringes with period $2\\pi\\hbar/d$ — the double slit, read in reverse.',
  ],
  analogy:
    'A short clap contains a wide spread of pitches, while a pure, long note has one precise pitch. Sound engineers meet the same Fourier trade-off between timing and frequency — but for sound it limits measurements, whereas for a quantum particle it limits what the particle itself can be.',
  altText:
    'Two stacked 3D plots. On top, the position wavefunction winds around a horizontal axis as a twisted, phase-coloured ribbon, with its probability density glowing on the wall behind; below, the momentum wavefunction of the same state. Brackets under each plot mark one standard deviation. Narrowing the upper packet visibly widens the lower one.',
  underTheHood: {
    equations: [
      {
        tex: '\\varphi(p) = \\frac{1}{\\sqrt{2\\pi\\hbar}}\\int_{-\\infty}^{\\infty}\\psi(x)\\,e^{-ipx/\\hbar}\\,dx',
        caption: 'Momentum-space wavefunction as the Fourier transform of $\\psi(x)$.',
      },
      {
        tex: '\\sigma_x\\,\\sigma_p \\ge \\tfrac12\\left|\\langle[\\hat x,\\hat p]\\rangle\\right| = \\frac{\\hbar}{2}',
        caption: 'Robertson uncertainty relation.',
      },
      {
        tex: '\\psi(x) \\propto e^{-(x-x_0)^2/4\\sigma^2}\\quad\\Longrightarrow\\quad\\sigma_x\\sigma_p = \\frac{\\hbar}{2}\\sqrt{1 + 16c^2\\sigma^4}\\ \\text{with chirp } e^{ic(x-x_0)^2}',
        caption: 'A Gaussian without chirp ($c = 0$) is the minimum-uncertainty state.',
      },
      {
        tex: '\\Delta v \\ge \\frac{\\hbar}{2m_e\\,\\Delta x} = \\frac{1.055\\times10^{-34}}{2\\,(9.11\\times10^{-31})(10^{-10})}\\ \\text{m/s} \\approx 5.8\\times10^{5}\\ \\text{m/s}',
        caption: 'An electron confined to 0.1 nm.',
      },
    ],
    method: [
      'ψ is sampled on 2048 points over 80 units ($\\hbar = 1$). A single radix-2 FFT gives $\\varphi(p)$ at spacing $\\Delta p = 2\\pi/80$, corrected by the phase factor $e^{-ipx_{\\min}}$ for the grid offset and reordered so $p$ increases. $\\sigma_x$ and $\\sigma_p$ come from the discrete densities.',
      'Each edit recomputes everything (about 0.2 ms) and rewrites the ribbon vertex buffers in place; nothing runs per frame.',
      'Tested: Parseval normalization of both functions, $\\sigma_x\\sigma_p = 1/2$ for Gaussians of any width, the exact Gaussian transform, both shift theorems, the chirp formula above, strict inequality for other shapes, and the momentum-space fringe zeros of two separated peaks.',
    ],
  },
};
