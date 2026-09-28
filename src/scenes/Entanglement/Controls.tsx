import { Button } from '../../ui/controls';
import { MANY, useEntanglement } from './store';

const arrow = (v: 1 | -1) => (v > 0 ? '↑ up' : '↓ down');
const times = (n: number) => `${n} ${n === 1 ? 'time' : 'times'}`;

export default function EntanglementControls() {
  const s = useEntanglement();
  const { pairs, opposite, leftUp, last } = s.summary;
  const busy = s.inFlight > 0;
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={s.measurePair} disabled={busy}>
          Measure a pair
        </Button>
        <Button onClick={s.measureMany} disabled={busy}>
          Measure {MANY} pairs
        </Button>
      </div>
      <div aria-live="polite" className="min-h-[3rem] space-y-1 text-sm text-slate-200">
        {last && (
          <p>
            Left: <strong className="text-white">{arrow(last.left)}</strong> · Right:{' '}
            <strong className="text-white">{arrow(last.right)}</strong>
          </p>
        )}
        {pairs > 0 && (
          <p>
            Opposite: <strong className="text-white">{opposite}</strong> of {pairs}
            <span className="text-slate-400">
              {' '}
              (left was up {times(leftUp)}, down {times(pairs - leftUp)})
            </span>
          </p>
        )}
      </div>
    </>
  );
}
