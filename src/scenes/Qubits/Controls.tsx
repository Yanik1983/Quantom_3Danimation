import { useUi } from '../../content/i18n';
import { sound } from '../../lib/sound';
import { bitsToIndex } from '../../physics/qubits';
import { Button, LiveDescription, Saw, Slider, Stepper } from '../../ui/controls';
import { countResults, MANY, MAX_QUBITS, useQubits } from './store';

const pct = (p: number) => `${Math.round(p * 100)}%`;
const bitString = (i: number, n: number) => i.toString(2).padStart(n, '0');

export default function QubitsControls() {
  const s = useQubits();
  const t = useUi();
  const possible = 1 << s.count;

  let saw: string | null = null;
  if (s.batch) {
    const counts = countResults(s.batch, s.count);
    if (s.count === 1) saw = t.sawTally(counts[0], counts[1]);
    else {
      let top = 0;
      for (let i = 1; i < counts.length; i++) if (counts[i] > counts[top]) top = i;
      const kinds = counts.filter((c) => c > 0).length;
      saw = t.sawSpread(kinds, possible, bitString(top, s.count), counts[top]);
    }
  } else if (s.result) {
    saw = s.count === 1 ? t.sawOne(s.result[0]) : t.sawMany(s.result.join(''), possible);
  } else if (s.count > 1) {
    saw = t.sawDoubling(s.count, possible);
  }

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
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          onClick={() => {
            s.measure();
            const { result, count } = useQubits.getState();
            if (result) sound.measure(bitsToIndex(result), 1 << count);
          }}
        >
          {t.measure}
        </Button>
        <Button
          onClick={() => {
            s.measureMany();
            const { batch, count } = useQubits.getState();
            if (batch) sound.measureMany(batch, 1 << count);
          }}
        >
          {t.measureTimes(MANY)}
        </Button>
      </div>
      <Stepper
        label={t.qubitCount}
        value={s.count}
        min={1}
        max={MAX_QUBITS}
        onChange={s.setCount}
        format={(n) => t.qubitCountValue(n, 1 << n)}
        decLabel={t.removeQubit}
        incLabel={t.addQubit}
      />
      {s.count > 1 && (
        <p
          dir="ltr"
          className="text-start font-mono text-xs leading-relaxed break-words text-slate-400"
          aria-hidden="true"
        >
          {Array.from({ length: possible }, (_, i) => bitString(i, s.count)).join('  ')}
        </p>
      )}
      <Saw label={t.whatYouSaw} text={saw} />
      <LiveDescription>{t.mix01Value(pct(1 - s.p1), pct(s.p1))}</LiveDescription>
    </>
  );
}
