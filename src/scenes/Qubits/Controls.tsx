import { useUi } from '../../content/i18n';
import { Button, LiveDescription, Slider } from '../../ui/controls';
import { MAX_QUBITS, useQubits } from './store';

const pct = (p: number) => `${Math.round(p * 100)}%`;
const bitStrings = (n: number) => Array.from({ length: 1 << n }, (_, i) => i.toString(2).padStart(n, '0'));

export default function QubitsControls() {
  const s = useQubits();
  const t = useUi();
  const possibilities = 1 << s.count;
  return (
    <>
      <Slider
        label={t.mix01}
        min={0}
        max={1}
        step={0.01}
        value={s.p1}
        onChange={s.setP1}
        format={(p) => t.mix01Value(pct(1 - p), pct(p))}
      />
      <Button variant="primary" onClick={s.measure}>
        {t.measure}
      </Button>
      <Slider
        label={t.qubitCount}
        min={1}
        max={MAX_QUBITS}
        step={1}
        value={s.count}
        onChange={s.setCount}
        format={(n) => t.qubitCountValue(n, 1 << n)}
      />
      <p
        dir="ltr"
        className="text-start font-mono text-xs leading-relaxed break-words text-slate-400"
        aria-hidden="true"
      >
        {bitStrings(s.count).join('  ')}
      </p>
      <div aria-live="polite" className="min-h-[1.5rem] text-sm text-slate-200">
        {s.result && (
          <p>
            {t.result}{' '}
            <strong dir="ltr" className="font-mono text-white">
              {s.result.join('')}
            </strong>
          </p>
        )}
      </div>
      <LiveDescription>{t.holds(s.count, possibilities)}</LiveDescription>
    </>
  );
}
