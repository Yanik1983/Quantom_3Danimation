import { Button, LiveDescription, Slider } from '../../ui/controls';
import { MAX_QUBITS, useQubits } from './store';

const pct = (p: number) => `${Math.round(p * 100)}%`;
const bitStrings = (n: number) => Array.from({ length: 1 << n }, (_, i) => i.toString(2).padStart(n, '0'));

export default function QubitsControls() {
  const s = useQubits();
  const possibilities = 1 << s.count;
  return (
    <>
      <Slider
        label="Mix of 0 and 1"
        min={0}
        max={1}
        step={0.01}
        value={s.p1}
        onChange={s.setP1}
        format={(p) => `${pct(1 - p)} of 0 · ${pct(p)} of 1`}
      />
      <Button variant="primary" onClick={s.measure}>
        Measure
      </Button>
      <Slider
        label="Number of qubits"
        min={1}
        max={MAX_QUBITS}
        step={1}
        value={s.count}
        onChange={s.setCount}
        format={(n) => `${n} → ${1 << n} possibilities`}
      />
      <p className="font-mono text-xs leading-relaxed break-words text-slate-400" aria-hidden="true">
        {bitStrings(s.count).join('  ')}
      </p>
      <div aria-live="polite" className="min-h-[1.5rem] text-sm text-slate-200">
        {s.result && (
          <p>
            Result: <strong className="font-mono text-white">{s.result.join('')}</strong>
          </p>
        )}
      </div>
      <LiveDescription>
        {s.count} {s.count === 1 ? 'qubit holds' : 'qubits hold'} {possibilities} possibilities at once.
      </LiveDescription>
    </>
  );
}
