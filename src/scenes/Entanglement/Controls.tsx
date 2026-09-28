import { chsh, MERMIN_CLASSICAL_MIN } from '../../physics/bell';
import { num } from '../../lib/format';
import { Button, ControlPanel, LiveDescription, Segmented, Slider } from '../../ui/controls';
import { CorrelationChart } from './CorrelationChart';
import type { BellTest } from './engine';
import { useEntanglement, type BellSummary } from './store';

const MIN_RATE = 0.5;
const MAX_RATE = 300;
const toSlider = (r: number) => (100 * Math.log(r / MIN_RATE)) / Math.log(MAX_RATE / MIN_RATE);
const fromSlider = (v: number) => {
  const r = MIN_RATE * Math.pow(MAX_RATE / MIN_RATE, v / 100);
  return r < 10 ? Math.round(r * 2) / 2 : Math.round(r);
};

/** Horizontal meter over [lo, hi] with labelled reference marks. */
function Meter({
  label,
  value,
  se,
  lo,
  hi,
  marks,
  color,
}: {
  label: string;
  value: number | null;
  se: number;
  lo: number;
  hi: number;
  marks: { at: number; text: string }[];
  color: string;
}) {
  const pos = (v: number) => `${((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * 100}%`;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="font-mono text-white tabular-nums">
          {value === null ? '—' : `${num(value, 3)} ± ${num(se, 3)}`}
        </span>
      </div>
      <div className="relative h-3 rounded-full bg-white/10" aria-hidden="true">
        {value !== null && (
          <>
            <div
              className="absolute inset-y-0.5 rounded-full opacity-40"
              style={{
                left: pos(value - se),
                width: `calc(${pos(value + se)} - ${pos(value - se)})`,
                background: color,
              }}
            />
            <div
              className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#0e101c]"
              style={{ left: pos(value), background: color }}
            />
          </>
        )}
        {marks.map((m) => (
          <div
            key={m.text}
            className="absolute inset-y-[-3px] w-px bg-white/70"
            style={{ left: pos(m.at) }}
          />
        ))}
      </div>
      <div className="relative h-3 text-[0.65rem] text-slate-400" aria-hidden="true">
        {marks.map((m) => (
          <span
            key={m.text}
            className="absolute -translate-x-1/2 whitespace-nowrap"
            style={{ left: pos(m.at) }}
          >
            {m.text}
          </span>
        ))}
      </div>
    </div>
  );
}

function results(test: BellTest, s: BellSummary | null) {
  if (!s || s.total === 0) return null;
  if (test === 'mermin') {
    const q = s.agreeQ / s.total;
    const c = s.agreeC / s.total;
    const qse = Math.sqrt((q * (1 - q)) / s.total);
    const cse = Math.sqrt((c * (1 - c)) / s.total);
    return { q, qse, c, cse, sigmas: (MERMIN_CLASSICAL_MIN - q) / qse };
  }
  const cell = (i: number, j: number) => s.cells.find((x) => x.i === i && x.j === j)!;
  const Sq = Math.abs(chsh((i, j) => cell(i, j).q));
  const Sc = Math.abs(chsh((i, j) => cell(i, j).c));
  const seQ = Math.sqrt(s.cells.reduce((a, x) => a + (Number.isFinite(x.qse) ? x.qse ** 2 : 1), 0));
  const seC = Math.sqrt(s.cells.reduce((a, x) => a + (Number.isFinite(x.cse) ? x.cse ** 2 : 1), 0));
  return { q: Sq, qse: seQ, c: Sc, cse: seC, sigmas: (Sq - 2) / seQ };
}

export default function EntanglementControls() {
  const st = useEntanglement();
  const r = results(st.test, st.summary);
  const n = st.summary?.total ?? 0;
  const mermin = st.test === 'mermin';
  const verdict =
    r && n >= 100
      ? r.sigmas > 3
        ? `The entangled pairs beat the classical limit by ${r.sigmas.toFixed(1)} standard errors.`
        : 'Keep counting — the gap from the classical limit is not yet statistically clear.'
      : 'Counting pairs…';

  return (
    <ControlPanel title="Entanglement controls">
      <Segmented<BellTest>
        label="Bell test"
        value={st.test}
        options={[
          { value: 'mermin', label: 'Match game (3 settings)' },
          { value: 'chsh', label: 'CHSH (2 × 2 settings)' },
        ]}
        onChange={st.setTest}
      />
      <div
        className="space-y-3 rounded-lg bg-black/30 px-3 py-2"
        role="status"
        aria-label="Bell test counter"
      >
        <p className="font-mono text-xs text-slate-400 tabular-nums">
          {n.toLocaleString('en-US')} pairs measured
        </p>
        {mermin ? (
          <>
            <Meter
              label="Match rate — entangled pairs"
              value={r?.q ?? null}
              se={r?.qse ?? 0}
              lo={0.35}
              hi={0.75}
              marks={[
                { at: 0.5, text: '1/2 QM' },
                { at: MERMIN_CLASSICAL_MIN, text: '5/9 classical' },
              ]}
              color="#2196c0"
            />
            <Meter
              label="Match rate — hidden-instruction model"
              value={r?.c ?? null}
              se={r?.cse ?? 0}
              lo={0.35}
              hi={0.75}
              marks={[{ at: MERMIN_CLASSICAL_MIN, text: '5/9' }]}
              color="#e94f9f"
            />
          </>
        ) : (
          <>
            <Meter
              label="|S| — entangled pairs"
              value={r?.q ?? null}
              se={r?.qse ?? 0}
              lo={0}
              hi={3}
              marks={[
                { at: 2, text: '2 classical' },
                { at: 2 * Math.SQRT2, text: '2√2' },
              ]}
              color="#2196c0"
            />
            <Meter
              label="|S| — hidden-instruction model"
              value={r?.c ?? null}
              se={r?.cse ?? 0}
              lo={0}
              hi={3}
              marks={[{ at: 2, text: '2' }]}
              color="#e94f9f"
            />
          </>
        )}
        <p className="text-sm text-slate-200">{verdict}</p>
        {st.summary && (
          <p className="text-xs text-slate-400">
            No signal: Alice gets +1 in{' '}
            {st.summary.alicePlusByBob
              .map((v) => (Number.isFinite(v) ? `${(v * 100).toFixed(0)}%` : '—'))
              .join(' / ')}{' '}
            of runs for each of Bob’s settings — her results alone never reveal his choice.
          </p>
        )}
      </div>
      <Slider
        label="Pairs per second"
        min={0}
        max={100}
        step={0.5}
        value={toSlider(st.rate)}
        onChange={(v) => st.setRate(fromSlider(v))}
        format={() => `${st.rate} / s`}
      />
      <CorrelationChart summary={st.summary} />
      <div className="flex gap-2">
        <Button onClick={st.clear}>Clear counts</Button>
        <Button onClick={st.reset} label="Reset entanglement experiment to defaults">
          Reset
        </Button>
      </div>
      <LiveDescription>
        {n} pairs measured.{' '}
        {r
          ? mermin
            ? `Entangled pairs match (give opposite answers) ${(r.q * 100).toFixed(1)} percent of the time; any classical explanation needs at least 55.6 percent.`
            : `Entangled pairs give S = ${r.q.toFixed(2)}; any classical explanation is limited to 2.`
          : ''}
      </LiveDescription>
    </ControlPanel>
  );
}
