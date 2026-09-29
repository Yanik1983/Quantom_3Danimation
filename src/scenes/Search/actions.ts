import { sound } from '../../lib/sound';
import { useSearch, type Stage } from './store';

/** Lift a cup in the classic round: a thud if it is empty, a chime if the card is there. */
export function liftCup(cup: number) {
  useSearch.getState().lift(cup);
  const s = useSearch.getState();
  if (s.lifted[cup]) (cup === s.marked ? sound.chime : sound.thud)();
}

/** Each quantum step has its own sound: spread (chord), mark (flip), cancel (beats settle), measure. */
const STEP_SOUNDS: Record<Exclude<Stage, 0>, () => void> = {
  1: () => sound.spread(),
  2: () => sound.flip(),
  3: () => sound.cancel(),
  4: () => sound.chime(),
};

export function nextStep() {
  useSearch.getState().next();
  const { stage } = useSearch.getState();
  if (stage > 0) STEP_SOUNDS[stage as Exclude<Stage, 0>]();
}
