import {
  abs2,
  arg,
  BASIS_KETS,
  basisAmplitudes,
  probabilityPlus,
  type Basis,
  type Complex,
} from '../../physics/bloch';
import { Equation } from '../../ui/Equation';
import { Button, ControlPanel, LiveDescription, Segmented, Slider } from '../../ui/controls';
import { displayedState, useSuperposition } from './store';

const deg = (r: number) => Math.round((r * 180) / Math.PI);

/** KaTeX for a complex amplitude in polar form, e.g. 0.38\,e^{i\,0.25\pi}. */
function ampTex(c: Complex): string {
  const m = Math.sqrt(abs2(c));
  if (m < 0.005) return '0';
  let p = arg(c) / Math.PI;
  if (p < 0) p += 2;
  if (Math.abs(p) < 0.005 || Math.abs(p - 2) < 0.005) return m.toFixed(2);
  return `${m.toFixed(2)}\\,e^{i\\,${p.toFixed(2)}\\pi}`;
}

export default function SuperpositionControls() {
  const s = useSuperposition();
  const shown = displayedState(s);
  const kets = BASIS_KETS[s.basis];
  const [a, b] = basisAmplitudes(shown, s.basis);
  const p = probabilityPlus(s.prepared, s.basis);
  const n = s.tally.plus + s.tally.minus;
  const sigma = n > 0 ? Math.sqrt((p * (1 - p)) / n) : 0;

  return (
    <ControlPanel title="Superposition controls">
      <Segmented<Basis>
        label="Measure along"
        value={s.basis}
        options={[
          { value: 'z', label: 'Z  (|0⟩ / |1⟩)' },
          { value: 'x', label: 'X  (|+⟩ / |−⟩)' },
          { value: 'y', label: 'Y  (|+i⟩ / |−i⟩)' },
        ]}
        onChange={s.setBasis}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Slider
          label="Polar angle θ"
          min={0}
          max={180}
          step={1}
          value={deg(s.prepared.theta)}
          onChange={(v) => s.setPrepared({ theta: (v * Math.PI) / 180, phi: s.prepared.phi })}
          format={(v) => `${v}°`}
        />
        <Slider
          label="Phase φ"
          min={0}
          max={360}
          step={1}
          value={deg(s.prepared.phi)}
          onChange={(v) => s.setPrepared({ theta: s.prepared.theta, phi: (v * Math.PI) / 180 })}
          format={(v) => `${v}°`}
        />
      </div>

      <div
        className="rounded-lg bg-black/30 px-3 py-2 text-sm text-slate-300"
        role="status"
        aria-label="Qubit state"
      >
        <p className="overflow-x-auto">
          <Equation
            tex={`|\\psi\\rangle = ${ampTex(a)}\\,|${kets[0]}\\rangle + ${ampTex(b)}\\,|${kets[1]}\\rangle`}
          />
        </p>
        <p className="mt-1 font-mono text-xs text-slate-400">
          P(|{kets[0]}⟩) = {(abs2(a) * 100).toFixed(1)}% · P(|{kets[1]}⟩) = {(abs2(b) * 100).toFixed(1)}%
          {s.collapsed && ' — after measurement'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={s.measureOnce}>
          Measure
        </Button>
        <Button onClick={() => s.measureMany(100)} label="Measure 100 freshly prepared copies">
          Measure 100 fresh copies
        </Button>
        <Button onClick={s.prepareAgain} disabled={!s.collapsed} label="Prepare the original state again">
          Prepare again
        </Button>
        <Button onClick={s.reset} label="Reset superposition to defaults">
          Reset
        </Button>
      </div>

      <div className="space-y-1 text-sm" aria-live="polite">
        {s.collapsed ? (
          <p className="text-magenta">
            Result: |{BASIS_KETS[s.collapsed.basis][s.collapsed.plus ? 0 : 1]}⟩. The qubit is now in that
            state — measure again and you will get the same answer.
          </p>
        ) : (
          <p className="text-slate-400">
            Prepared state ready. Measuring will randomly give one of the two outcomes.
          </p>
        )}
        <p className="font-mono text-xs text-slate-300 tabular-nums">
          Tally for fresh copies: |{kets[0]}⟩ {s.tally.plus} · |{kets[1]}⟩ {s.tally.minus}
          {n > 0 && (
            <>
              {' '}
              → {((s.tally.plus / n) * 100).toFixed(1)}% (Born rule: {(p * 100).toFixed(1)}% ±{' '}
              {(sigma * 100).toFixed(1)})
            </>
          )}
        </p>
      </div>
      <LiveDescription>
        State arrow at polar angle {deg(shown.theta)} degrees and phase {deg(shown.phi)} degrees. Probability
        of |{kets[0]}⟩ is {Math.round(abs2(a) * 100)} percent.
      </LiveDescription>
    </ControlPanel>
  );
}
