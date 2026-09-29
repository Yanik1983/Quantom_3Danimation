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
  learnMore: {
    paragraphs: string[];
    /** KaTeX, display mode. */
    equations: string[];
  };
  /** Text alternative for the 3D model. */
  altText: string;
}

export const WELCOME = {
  title: 'Quantum physics, simply explained',
  text: 'Everything is made of tiny particles, far too small to see. They follow their own strange rules. Try each experiment to see how.',
  prompt: 'Choose an experiment to begin.',
};

export const ENDING =
  "That's quantum physics: waves, mixes, qubits and links. The same rules power lasers, MRI scanners and quantum computers.";

export const LAB_ALT =
  'A dim quantum-computing laboratory with four glowing tables, one per experiment: a particle gun firing at two slits, a glowing particle spread across two boxes, an arrow on a sphere, and two linked particles flying apart. Behind them stand a gold dilution refrigerator, a closed cryostat and racks of blinking control electronics.';

export const COPY: Record<ExperimentId, ExperimentCopy> = {
  basics: {
    name: 'What is quantum physics?',
    title: 'The world of the very small',
    text: 'Everything is made of atoms, far too small to see. Tiny things act strangely. Fire them at a wall with two thin slits: each one travels like a **wave** through both slits at once. Yet each lands on the screen as one **dot**. Together the dots make stripes. Watch the slits and the stripes vanish.',
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
};
