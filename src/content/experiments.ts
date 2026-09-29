import type { ExperimentId } from '../state/lab';

/**
 * All copy for the lab. Strings support inline math between `$…$` and emphasis between
 * `**…**`. The main text is deliberately short; equations live only in "Learn more".
 */
export interface ExperimentCopy {
  /** Name on the lab table and in the menu. */
  name: string;
  title: string;
  text: string;
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
  text: 'Quantum computers use the strange rules of tiny particles. Try the five experiments to see how, one idea at a time.',
  prompt: 'Choose an experiment to begin.',
};

export const ENDING =
  'Waves, mixes, qubits, links and interference: that is how a quantum computer works, and how it solves some problems faster.';

/** The gold machine behind the tables (opened by clicking it). */
export const COMPUTER = {
  title: 'A real quantum computer',
  text: 'The gold "chandelier" is built like a real one. Its plates get colder step by step, down to about **−273\u00a0°C**, colder than outer space. At the bottom sits a **chip** with tiny superconducting circuits: the qubits. Any heat or vibration would disturb them, so they are kept this cold. The cables carry microwave pulses from the racks of electronics to control and read the qubits.',
  open: 'Meet the quantum computer',
};

export const LAB_ALT =
  'A dim quantum-computing laboratory with five glowing tables, one per experiment: a particle gun firing at two slits, a glowing particle spread across two boxes, an arrow on a sphere, and two linked particles flying apart, and four cups hiding a card. Behind them stand a gold dilution refrigerator, a closed cryostat and racks of blinking control electronics.';

export const COPY: Record<ExperimentId, ExperimentCopy> = {
  basics: {
    name: 'What is quantum physics?',
    title: 'The world of the very small',
    text: 'Everything is made of atoms, far too small to see. Tiny things act strangely. Fire them at a wall with two thin slits: each one travels like a **wave** through both slits at once. Yet each lands on the screen as one **dot**. Together the dots make stripes. Watch the slits and the stripes vanish.',
    inComputer:
      'Quantum computers use this same **interference**: they arrange the waves so wrong answers cancel and the right one grows.',
    learnMore: {
      paragraphs: [
        'Every particle has a wavelength set by its momentum $p$. For an electron it is about the size of an atom, which is why the wave only shows up at tiny scales. The wave passes through both slits and overlaps with itself. Where each dot lands is random, with odds set by the wave’s brightness $|\\psi|^2$, so the dots build up stripes.',
        'Watching the slits means a detector interacts with each particle to record its path. That interaction destroys the stripes; no person needs to look. The simulation solves the real Schrödinger equation for the wave.',
      ],
      equations: [
        '\\lambda = \\dfrac{h}{p}',
        'i\\hbar\\,\\dfrac{\\partial\\psi}{\\partial t} = -\\dfrac{\\hbar^2}{2m}\\nabla^2\\psi + V\\psi',
      ],
    },
    altText:
      'A particle gun fires at a wall with two slits. A glowing wave spreads through both slits, and single dots land on a screen behind. With the slits unwatched the dots form stripes; with detectors at the slits they form one smooth band. A round lens shows the chosen zoom level, from a grain of sand down to one atom.',
  },
  superposition: {
    name: 'Superposition',
    title: 'In two places at once',
    text: 'A coin on a table shows heads or tails. A tiny particle can be in **two places at once**. This is called **superposition**. To look, you shine light on it, and then it shows up in just one place. You cannot know which one ahead of time, but the slider sets the odds.',
    inComputer:
      'A **qubit** works just like this: a mix of 0 and 1, like the particle in two boxes. Measuring it gives one answer.',
    learnMore: {
      paragraphs: [
        'The state is a sum of both possibilities, each with an amplitude. The chance of finding the particle in a box is the amplitude squared. “Looking” means any physical interaction that records where the particle is, such as light bouncing off it.',
      ],
      equations: [
        '|\\psi\\rangle = a\\,|\\text{left}\\rangle + b\\,|\\text{right}\\rangle',
        'P(\\text{left}) = |a|^2, \\quad P(\\text{right}) = |b|^2, \\quad |a|^2 + |b|^2 = 1',
      ],
    },
    altText:
      'Two glass boxes side by side. A glowing cloud is split between them, brighter in the box with better odds. Looking makes the cloud vanish and a single dot appears in one box.',
  },
  qubits: {
    name: 'Qubits',
    title: 'The quantum bit',
    text: 'A normal computer bit is like a switch: **0 or 1**. A **qubit** can be 0, 1, or both at once. Each extra qubit doubles the possibilities: 1 qubit holds 2, 2 hold 4, 3 hold 8. When you measure, you still get just one answer. Quantum computers are built to make the right answer likely.',
    inComputer:
      'Real qubits are tiny superconducting circuits on a chip, cooled inside the gold machine behind the tables.',
    learnMore: {
      paragraphs: [
        'A qubit is drawn as an arrow on a sphere (the Bloch sphere). Up is 0, down is 1, and the tilt sets the odds. Turning around the vertical axis changes the phase, which the measurement here cannot see but quantum algorithms use.',
        'Describing $n$ qubits takes $2^n$ numbers, so 50 qubits need about $10^{15}$. A measurement still gives one answer; algorithms use interference to make the right answer likely.',
      ],
      equations: [
        '|\\psi\\rangle = \\cos\\tfrac{\\theta}{2}\\,|0\\rangle + e^{i\\varphi}\\sin\\tfrac{\\theta}{2}\\,|1\\rangle',
        'P(1) = \\sin^2\\tfrac{\\theta}{2}',
      ],
    },
    altText:
      'One to four spheres, each with an arrow: up means 0, down means 1, tilted means a mix. Below them a row of bars shows every possible result (2, 4, 8 or 16), with heights showing the odds. Measuring snaps each arrow up or down.',
  },
  entanglement: {
    name: 'Entanglement',
    title: 'Linked across any distance',
    text: 'Two particles can be made as a linked pair. They are **entangled**. Measure one: the result is random, up or down. Measure its partner, even very far away: it is always the **opposite**. You still cannot use this to send messages, because each result is random. Einstein called it “spooky”.',
    inComputer:
      'Quantum computers **entangle** their qubits so they work as one linked system, not as separate coins.',
    learnMore: {
      paragraphs: [
        'The pair shares one state in which the two spins always point opposite ways, yet neither has its own value before it is measured.',
        'Could the particles carry hidden instructions from the start? Bell tests measure at different angles and show that no such instructions can explain the results. Aspect, Clauser and Zeilinger won the 2022 Nobel Prize in Physics for these experiments.',
      ],
      equations: [
        '|\\psi\\rangle = \\tfrac{1}{\\sqrt{2}}\\big(|{\\uparrow\\downarrow}\\rangle - |{\\downarrow\\uparrow}\\rangle\\big)',
      ],
    },
    altText:
      'A source in the middle sends two linked particles to detectors on the left and right. Each detector lights up cyan for up or magenta for down; the two always show opposite results.',
  },
  search: {
    name: 'A tiny quantum computer',
    title: 'Finding the card in one go',
    text: 'A card is hidden under one of four cups. A normal computer checks the cups one by one and may need three tries. A quantum computer with **2 qubits** spreads over all four cups, marks the right one with a **minus sign**, then lets the waves **interfere**. The wrong cups cancel out, so one look finds the card.',
    inComputer:
      "This is **Grover's search**, a real quantum algorithm. With a million cups it needs about 800 rounds instead of up to a million checks.",
    learnMore: {
      paragraphs: [
        'Two qubits in an even mix hold four amplitudes of $\\tfrac12$. The **oracle** is a circuit that recognises the answer: it flips the sign of that amplitude without revealing it, so the odds stay 25% each. The **diffusion** step reflects every amplitude about their average, so the flipped one grows and the others shrink to zero.',
        'For $N$ items the search needs about $\\tfrac{\\pi}{4}\\sqrt{N}$ rounds instead of up to $N$ checks. The simulation applies these steps to the real four-number state and measures it with the Born rule.',
      ],
      equations: [
        '|s\\rangle = \\tfrac{1}{2}\\big(|00\\rangle + |01\\rangle + |10\\rangle + |11\\rangle\\big)',
        'O\\,|x\\rangle = -|x\\rangle \\text{ for the marked } x, \\qquad D = 2\\,|s\\rangle\\langle s| - I',
        'P_k = \\sin^2\\big((2k+1)\\,\\theta\\big), \\quad \\sin\\theta = \\tfrac{1}{\\sqrt{N}}',
      ],
    },
    altText:
      'Four upside-down cups in a row, labelled 00, 01, 10 and 11, with a bar above each showing its amplitude. At first all bars are equal. Marking flips one bar below the line; interference then grows that bar to full height and shrinks the others to nothing. Measuring lifts the cup and reveals the glowing card.',
  },
};
