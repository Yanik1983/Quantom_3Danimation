import type { SectionContent } from './types';

export const tunneling: SectionContent = {
  simple: [
    'Roll a ball at a hill without enough energy to reach the top and it rolls back — every time. A quantum particle facing an energy barrier it “can’t” climb sometimes simply appears on the other side. This is **tunnelling**.',
    'Watch the wave packet arrive. Inside the barrier the wave doesn’t stop dead; it fades away exponentially. If the barrier is thin enough, a little of the wave is still alive at the far side and carries on. The glow beyond the barrier is the probability that the particle got through; the readout compares it with the exact quantum prediction — and with classical physics, which says zero.',
    'Make the barrier twice as wide and the transmission doesn’t halve — it collapses exponentially. Raise the energy above the barrier top and something equally strange happens: part of the wave still bounces back.',
    'Tunnelling isn’t exotic. It powers the Sun’s fusion, lets flash memory store your photos, and limits how small transistors can get.',
  ],
  technical: [
    "For $E < V_0$ the Schrödinger equation inside the barrier has growing and decaying exponentials $e^{\\pm\\kappa x}$ with $\\kappa = \\sqrt{2m(V_0 - E)}/\\hbar$. Matching $\\psi$ and $\\psi'$ at both edges gives the exact rectangular-barrier result $T = [1 + V_0^2\\sinh^2(\\kappa a)/4E(V_0-E)]^{-1} \\approx 16\\tfrac{E}{V_0}(1-\\tfrac{E}{V_0})\\,e^{-2\\kappa a}$ for thick barriers.",
    'Above the barrier, $\\kappa \\to ik_2$ and $\\sinh \\to \\sin$: reflection persists except at resonances $k_2 a = n\\pi$, where the barrier becomes perfectly transparent. For smooth barriers the WKB factor $e^{-2\\int\\kappa\\,dx}$ governs alpha decay and scanning tunnelling microscopes, whose current changes about tenfold per 0.1 nm of tip height.',
    'A wave packet is a spread of energies, so its transmission is the average $\\int|\\varphi(k)|^2\\,T(\\hbar^2k^2/2m)\\,dk$. The simulation evolves the packet with the split-step Fourier method and reads $T$ as the probability beyond the barrier; when the run ends it agrees with this average to within a fraction of a percent. The classical figure counts only momentum components whose energy exceeds $V_0$.',
  ],
  analogy:
    'Sound leaks through a thin wall even though the wall blocks you: the pressure wave is weakened inside but not zero at the far side. The analogy is limited — a sound wave arrives weakened everywhere, whereas a tunnelling particle is always detected whole, just less often.',
  altText:
    'An energy diagram: a violet translucent block is the barrier, rising from zero to height V₀. A dashed cyan line marks the particle’s energy E, and the wave packet rides along it as a phase-coloured spiral ribbon with its probability density glowing behind. When the packet hits the barrier most of it reflects back, while a smaller packet emerges on the far side and moves on.',
  underTheHood: {
    equations: [
      {
        tex: 'T(E) = \\left[1 + \\frac{V_0^2\\,\\sinh^2(\\kappa a)}{4E(V_0 - E)}\\right]^{-1}, \\qquad \\kappa = \\frac{\\sqrt{2m(V_0-E)}}{\\hbar}',
        caption:
          'Exact transmission through a rectangular barrier of height $V_0$ and width $a$, for $E < V_0$.',
      },
      {
        tex: 'T(E) = \\left[1 + \\frac{V_0^2\\,\\sin^2(k_2 a)}{4E(E - V_0)}\\right]^{-1}, \\qquad k_2 = \\frac{\\sqrt{2m(E-V_0)}}{\\hbar}',
        caption: 'For $E > V_0$: transparent only when $k_2 a = n\\pi$.',
      },
      {
        tex: 'T_{\\text{packet}} = \\int_0^\\infty |\\varphi(k)|^2\\,T\\!\\left(\\frac{\\hbar^2k^2}{2m}\\right)dk',
        caption: 'Transmission of a Gaussian packet with momentum spread $\\hbar/2\\sigma$.',
      },
      {
        tex: 'T_{\\text{measured}}(t) = \\int_{a/2}^{\\infty} |\\psi(x,t)|^2\\,dx',
        caption: 'The live readout: probability that has emerged beyond the barrier.',
      },
    ],
    method: [
      'A Gaussian packet ($\\sigma = 4$, starting at $x = -30$) is evolved by the split-step Fourier method on 2048 points over 160 units ($\\hbar = m = 1$, $\\Delta t = 0.02$) in a Web Worker, about 350 steps per second of animation. Absorbing layers at the box edges remove the outgoing waves.',
      'The barrier is drawn on the grid with fractional edge cells, so its width is exact rather than rounded to whole cells — important, because $T$ depends exponentially on $a$.',
      'Tested: hand-computed $T$ values, continuity at $E = V_0$, resonances, exponential decay with width, unitarity, and simulated $T$ agreeing with the packet-averaged formula within 0.005 with $T + R = 1$.',
    ],
  },
};
