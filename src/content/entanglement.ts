import type { SectionContent } from './types';

export const entanglement: SectionContent = {
  simple: [
    'Two particles can be born in one shared quantum state: they are **entangled**. Here a source sends such pairs to two detectors, Alice’s and Bob’s, which could be kilometres apart. For every pair, each detector is independently set to a random direction and records +1 or −1.',
    'Each side on its own looks like pure coin-flipping — 50/50, whatever the other does — so no message can be sent this way. But compare the records afterwards: whenever the settings happen to match, the two answers are always opposite. Call opposite answers a “match”.',
    'Perhaps every pair simply carries hidden instructions, fixed at the source? That is the common-sense explanation. John Bell showed it makes a testable prediction: with random settings, instructions must produce matches at least 5/9 of the time (55.6 %). Watch the counter. Entangled pairs match only 50 % of the time — no set of instructions can do that.',
    'Real experiments, with detectors far apart and settings chosen too late for any light-speed signal, agree with quantum mechanics. They earned the 2022 Nobel Prize in Physics.',
  ],
  technical: [
    'The source emits spin singlets $|\\psi^-\\rangle = (|{\\uparrow\\downarrow}\\rangle - |{\\downarrow\\uparrow}\\rangle)/\\sqrt2$. Spin measurements along directions at angles $a$ and $b$ give $A, B = \\pm1$ with $P(A = B) = \\sin^2\\tfrac{a-b}{2}$ and correlation $E(a,b) = -\\cos(a-b)$. Each marginal is exactly 50/50, so the correlations carry no signal.',
    "A local hidden-variable theory assigns every pair predetermined outcomes $A(a,\\lambda)$, $B(b,\\lambda)$. With Mermin’s three settings 120° apart, perfect anticorrelation at equal settings forces any instruction set to give opposite answers in at least 5 of the 9 equally likely setting pairs; quantum mechanics gives $\\tfrac13 + \\tfrac23\\cdot\\tfrac14 = \\tfrac12$. In CHSH form, $|S| = |E(a,b) - E(a,b') + E(a',b) + E(a',b')| \\le 2$, while singlets reach Tsirelson’s bound $2\\sqrt2$.",
    'The comparison model gives each pair a shared random angle $\\lambda$ and answers $\\pm\\operatorname{sgn}\\cos(\\theta - \\lambda)$: it reproduces perfect anticorrelation but only a straight-line $E(\\Delta)$, and it sits exactly on the classical limits, just as Bell’s theorem says it must.',
  ],
  analogy:
    'Entanglement is often compared to a pair of gloves shipped in two boxes: open one, find a left glove, and you instantly know the other is right. That analogy captures only the correlation at matching settings — and the gloves are precisely a “hidden instructions” model, the kind Bell tests rule out.',
  altText:
    'A glowing source in the centre emits pairs of particles that fly in opposite directions to two ring-shaped detectors labelled Alice and Bob. Inside each ring a needle shows the randomly chosen measurement direction for the latest pair, and a lamp above lights cyan for +1 or magenta for −1. A counter and a chart beside the scene compare the measured statistics with the limits any classical explanation must obey.',
  underTheHood: {
    equations: [
      {
        tex: '|\\psi^-\\rangle = \\tfrac{1}{\\sqrt2}\\left(|{\\uparrow\\downarrow}\\rangle - |{\\downarrow\\uparrow}\\rangle\\right), \\qquad E(a,b) = \\langle \\sigma_a \\otimes \\sigma_b\\rangle = -\\cos(a - b)',
        caption: 'The spin singlet and its correlation for measurement directions at angles $a$ and $b$.',
      },
      {
        tex: 'P_{\\text{opposite}}^{\\text{LHV}} \\ge \\tfrac59 \\qquad\\text{vs.}\\qquad P_{\\text{opposite}}^{\\text{QM}} = \\tfrac13\\cdot 1 + \\tfrac23\\cdot\\cos^2 60^\\circ = \\tfrac12',
        caption: 'Mermin’s version of Bell’s inequality for three settings 120° apart, chosen at random.',
      },
      {
        tex: "S = E(a,b) - E(a,b') + E(a',b) + E(a',b'), \\qquad |S|_{\\text{LHV}} \\le 2 < |S|_{\\text{QM}} = 2\\sqrt2",
        caption:
          "The CHSH inequality, maximally violated at $a = 0^\\circ$, $a' = 90^\\circ$, $b = 45^\\circ$, $b' = 135^\\circ$.",
      },
      {
        tex: 'P(A = +1 \\mid a, b) = \\tfrac12 \\quad \\text{for all } b',
        caption: 'No-signalling: Alice’s statistics do not depend on Bob’s choice.',
      },
    ],
    method: [
      'For every pair, settings are drawn uniformly at random on both sides. Alice’s outcome is a fair coin; Bob’s is then opposite with probability $\\cos^2\\tfrac{a-b}{2}$ — exact sampling of the singlet’s joint Born distribution. The same settings are fed to the hidden-variable model, so both statistics accumulate side by side.',
      'Uncertainties are standard errors, $\\sqrt{(1-E^2)/N}$ per correlation and $\\sqrt{p(1-p)/N}$ for the match rate; the verdict reports how many standard errors separate the quantum result from the classical limit.',
      'Tested: $E = -\\cos\\Delta$ from sampling, the linear classical correlation, $|S| = 2\\sqrt2$ versus $|S| \\le 2$ for the model at hundreds of random setting choices, Mermin rates of ½ versus 5⁄9, and 50/50 marginals for every setting of Bob’s.',
    ],
  },
};
