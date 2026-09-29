import type { ExperimentId } from '../state/lab';

/**
 * All copy for the lab. Strings support inline math between `$…$` and emphasis between
 * `**…**`. The story: three tricks of tiny particles (waves, qubits, linked qubits), then a tiny
 * quantum computer that uses all three. Each card is short; what the visitor sees is explained
 * after they try it (the "What you saw" lines live with the UI strings in i18n.ts), and the
 * equations live only in "Learn more".
 */
export interface ExperimentCopy {
  /** Short plain name: lab table, menu and the "Next" button. */
  name: string;
  /** The question the step answers. */
  title: string;
  /** Two or three sentences before the first button. */
  text: string;
  /** What to do, one short line per action. */
  tryIt: string[];
  /** One line on how a quantum computer uses this idea. */
  inComputer: string;
  learnMore: {
    paragraphs: string[];
    /** KaTeX, display mode. */
    equations: string[];
  };
  /** Text alternative for the 3D model. */
  altText: string;
}

export const WELCOME = {
  title: 'How does a quantum computer work?',
  text: 'It is not a faster laptop. It uses three tricks of tiny particles that normal computers cannot. Learn the three tricks, then use them to find a hidden card in one look.',
  time: 'About 5 minutes.',
  start: 'Start',
  choose: 'Or choose a step:',
};

/** The last screen, after step 4. */
export const FINALE = {
  title: 'Now you know how a quantum computer works',
  tricks: [
    '**Waves** can add up or cancel.',
    'A **qubit** holds a mix of 0 and 1, and more qubits hold a mix of many results.',
    'Qubits can be **linked**, so they work as a team.',
  ],
  together:
    'A quantum computer puts the three together: it spreads over all the answers, then makes the **wrong ones cancel** and the right one grow.',
  usesTitle: 'What will they be good for?',
  uses: [
    'Designing new **medicines and materials**, by imitating molecules.',
    'Some **search and planning** problems.',
    'One day, breaking some of today’s **secret codes**, which is why new codes are already being built.',
  ],
  wont: 'They will not replace your phone or laptop: for most jobs, normal computers stay better. Today’s machines are still small and make mistakes, and engineers are working on bigger, more reliable ones.',
  mythTitle: 'A common myth',
  myth: '“They try every answer at once.” Not quite: measuring gives just one random answer. The real trick is making the wrong answers cancel.',
  machine: 'Meet the real machine',
  again: 'Start again',
};

/** The gold machine behind the tables (opened by clicking it, or from the finale). */
export const COMPUTER = {
  title: 'A real quantum computer',
  text: 'The gold "chandelier" is built like a real one. Its plates get colder step by step, down to about **−273 °C**, colder than outer space. At the bottom sits a **chip** with tiny superconducting circuits: the qubits. They are kept this cold and still because any heat or vibration would ruin their waves. The cables carry microwave pulses from the racks of electronics to control and measure the qubits.',
};

export const LAB_ALT =
  'A dim quantum-computing laboratory with four glowing tables, one per step: a particle gun firing at two slits, glowing clouds split between boxes marked 0 and 1, two linked particles flying apart to two detectors, and four cups hiding a card. Behind them stand a gold dilution refrigerator, a closed cryostat and racks of blinking control electronics.';

export const COPY: Record<ExperimentId, ExperimentCopy> = {
  basics: {
    name: 'Waves that cancel',
    title: 'Can a particle act like a wave?',
    text: 'We fire tiny particles, one at a time, at a wall with two thin slits. Each one lands on the screen as a single dot. Where will they land?',
    tryIt: ['Press **Fire** and watch the dots build up.', 'When stripes appear, turn on the **detectors**.'],
    inComputer:
      'A quantum computer makes the **wrong answers cancel**, like the dark stripes. It is kept cold and still because any disturbance ruins the waves, just as the detectors did.',
    learnMore: {
      paragraphs: [
        'Every particle has a wavelength set by its momentum $p$. For an electron it is about the size of an atom, which is why the wave only shows up at tiny scales. The wave passes through both slits and overlaps with itself. Where each dot lands is random, with chances set by the wave’s brightness $|\\psi|^2$, so the dots build up stripes.',
        'A detector at the slits interacts with each particle to record its path. That interaction destroys the stripes; no person needs to look. The simulation solves the real Schrödinger equation for the wave.',
      ],
      equations: [
        '\\lambda = \\dfrac{h}{p}',
        'i\\hbar\\,\\dfrac{\\partial\\psi}{\\partial t} = -\\dfrac{\\hbar^2}{2m}\\nabla^2\\psi + V\\psi',
      ],
    },
    altText:
      'A particle gun fires at a wall with two slits. A glowing wave spreads through both slits, and single dots land on a screen behind. Without detectors the dots form bright and dark stripes; with detectors at the slits they form one smooth band.',
  },
  qubits: {
    name: 'Qubits: 0 and 1 at once',
    title: 'Can a bit be 0 and 1 at once?',
    text: 'A normal computer bit is **0 or 1**. A **qubit** can be a mix of both, like the glowing cloud split between box 0 and box 1. This mix is called **superposition**. Measuring a qubit gives just 0 or 1.',
    tryIt: ['Set the mix with the slider.', 'Press **Measure 100 times**.', 'Add qubits with **+**.'],
    inComputer:
      'Measuring gives just **one result, at random**. So a quantum computer has to make the right answer the likely one. Step 4 shows how.',
    learnMore: {
      paragraphs: [
        'A qubit is any tiny system with two states, here a particle in box 0 or box 1. Its state is a sum of both, each with an amplitude; the chance of each result is the amplitude squared. Measuring means a physical interaction that records the state, such as light bouncing off the particle.',
        'Describing $n$ qubits takes $2^n$ numbers, so 50 qubits need about $10^{15}$. Here every qubit gets the same mix and they are not linked, so each one is measured on its own.',
      ],
      equations: [
        '|\\psi\\rangle = a\\,|0\\rangle + b\\,|1\\rangle',
        'P(0) = |a|^2, \\quad P(1) = |b|^2, \\quad |a|^2 + |b|^2 = 1',
      ],
    },
    altText:
      'Two glass boxes marked 0 and 1 share one glowing cloud, brighter in the box with the better chance. Measuring makes the cloud vanish and a single dot appears in one box. With more qubits, up to four pairs of boxes stand in a row, and bars behind them show the chance of every possible result (4, 8 or 16).',
  },
  entanglement: {
    name: 'Linked qubits',
    title: 'Can two qubits be linked?',
    text: 'Two qubits can be made as a **linked** pair. This is called **entanglement**. They fly apart to two detectors, and each detector reads a random 0 or 1. Are the two results connected?',
    tryIt: ['Press **Measure a pair** a few times.', 'Then press **Measure 100 pairs**.'],
    inComputer:
      'Linking makes qubits work **as one team**, not as separate coins. In step 4, marking the card links the two qubits.',
    learnMore: {
      paragraphs: [
        'The pair shares one state: each result on its own is random, yet the two always match. Neither qubit has its own value before it is measured.',
        'Could the pair carry a hidden plan from the start, like a pair of gloves? Bell tests measure at different angles and show that no such plan can explain the results. Aspect, Clauser and Zeilinger won the 2022 Nobel Prize in Physics for these experiments. The link cannot send messages: each side on its own sees only random bits.',
      ],
      equations: ['|\\Phi^+\\rangle = \\tfrac{1}{\\sqrt{2}}\\big(|00\\rangle + |11\\rangle\\big)'],
    },
    altText:
      'A source in the middle sends two linked particles to detectors on the left and right. Each detector shows the bit it read, 0 in cyan or 1 in magenta; the two always show the same bit.',
  },
  search: {
    name: 'Find the card',
    title: 'Can you find the card in one look?',
    text: 'A card is hidden under one of four cups. First, **you** are the normal computer. Then a quantum computer with **2 qubits** tries, using all three tricks.',
    tryIt: [
      'Lift cups one at a time until you find the card.',
      'Then let the quantum computer try, step by step.',
    ],
    inComputer:
      "This is **Grover's search**, a real quantum program. With a million cups it needs about **800 steps** instead of up to a million checks.",
    learnMore: {
      paragraphs: [
        'Two qubits in an even mix hold four amplitudes of $\\tfrac12$. The **oracle** is a circuit that recognises the answer: it flips the sign of that amplitude (the wave turned upside down) without revealing it, so the chances stay 25% each. The **diffusion** step reflects every amplitude about their average, so the flipped one grows and the others shrink to zero.',
        'For $N$ items the search needs about $\\tfrac{\\pi}{4}\\sqrt{N}$ rounds instead of up to $N$ checks. The simulation applies these steps to the real four-number state and measures it with the Born rule.',
      ],
      equations: [
        '|s\\rangle = \\tfrac{1}{2}\\big(|00\\rangle + |01\\rangle + |10\\rangle + |11\\rangle\\big)',
        'O\\,|x\\rangle = -|x\\rangle \\text{ for the marked } x, \\qquad D = 2\\,|s\\rangle\\langle s| - I',
        'P_k = \\sin^2\\big((2k+1)\\,\\theta\\big), \\quad \\sin\\theta = \\tfrac{1}{\\sqrt{N}}',
      ],
    },
    altText:
      'Four upside-down cups in a row, labelled 00, 01, 10 and 11. First the visitor lifts cups one by one. Then a bar above each cup shows its wave: at first all are equal; marking flips one bar upside down; cancelling grows that bar to full height and shrinks the others to nothing. Measuring lifts the cup and reveals the glowing card.',
  },
};
