import { Button, LiveDescription, Slider } from '../../ui/controls';
import { LOOKS, useSuperposition } from './store';

const pct = (p: number) => `${Math.round(p * 100)}%`;

export default function SuperpositionControls() {
  const s = useSuperposition();
  return (
    <>
      <Slider
        label="Left ↔ Right"
        min={0}
        max={1}
        step={0.01}
        value={s.pRight}
        onChange={s.setPRight}
        format={(p) => `${pct(1 - p)} left · ${pct(p)} right`}
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={s.look}>
          Look
        </Button>
        <Button onClick={s.lookMany}>Look {LOOKS} times</Button>
      </div>
      <div aria-live="polite" className="min-h-[1.5rem] text-sm text-slate-200">
        {s.found && (
          <p>
            Found in the <strong className="text-white">{s.found}</strong> box.
          </p>
        )}
        {s.tally && (
          <p>
            Left box: <strong className="text-white">{s.tally.left}</strong> · Right box:{' '}
            <strong className="text-white">{s.tally.right}</strong>
          </p>
        )}
      </div>
      <LiveDescription>
        The particle is a mix: {pct(1 - s.pRight)} chance left, {pct(s.pRight)} chance right.
      </LiveDescription>
    </>
  );
}
