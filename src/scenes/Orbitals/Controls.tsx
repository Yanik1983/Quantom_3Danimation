import { num } from '../../lib/format';
import { BOHR_NM, energyEV, meanRadius } from '../../physics/hydrogen';
import { orbitalName } from '../../physics/sphericalHarmonics';
import { Button, ControlPanel, LiveDescription, Segmented, Slider, Toggle } from '../../ui/controls';
import { EnergyLevels } from './EnergyLevels';
import { useOrbitals } from './store';

const L_LETTERS = ['s', 'p', 'd', 'f'];

export default function OrbitalsControls() {
  const s = useOrbitals();
  const name = orbitalName(s.n, s.l, s.m);
  const radialNodes = s.n - s.l - 1;
  const r = meanRadius(s.n, s.l);

  return (
    <ControlPanel title="Orbital controls">
      <p className="font-display text-2xl text-white" aria-live="polite">
        {name.main}
        {name.sub && <sub className="ml-0.5 text-base text-cyan">{name.sub}</sub>}
        <span className="ml-3 align-middle font-mono text-xs text-slate-400">
          n={s.n}, l={s.l}, m={s.m}
        </span>
      </p>
      <Segmented
        label="Energy level n"
        value={String(s.n)}
        options={[1, 2, 3, 4].map((k) => ({ value: String(k), label: String(k) }))}
        onChange={(v) => s.setN(Number(v))}
      />
      <Segmented
        label="Shape l (subshell)"
        value={String(s.l)}
        options={Array.from({ length: s.n }, (_, k) => ({
          value: String(k),
          label: `${k} · ${L_LETTERS[k]}`,
        }))}
        onChange={(v) => s.setL(Number(v))}
      />
      <Segmented
        label="Orientation m"
        value={String(s.m)}
        options={Array.from({ length: 2 * s.l + 1 }, (_, k) => {
          const m = k - s.l;
          const sub = orbitalName(s.n, s.l, m).sub;
          return { value: String(m), label: sub ? `${m} · ${sub}` : String(m) };
        })}
        onChange={(v) => s.setM(Number(v))}
      />
      <Slider
        label="Cross-section"
        min={-1}
        max={1}
        step={0.02}
        value={s.cut}
        onChange={s.setCut}
        format={(v) => (v >= 1 ? 'off' : `${Math.round(((1 - v) / 2) * 100)}% cut away`)}
        hint="Slide left to cut the cloud open and see ψ on the cutting plane."
      />
      <Toggle label="Auto-rotate" checked={s.autoRotate} onChange={s.setAutoRotate} />
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-black/30 px-3 py-2 font-mono text-xs text-slate-300 tabular-nums">
        <dt>Energy</dt>
        <dd className="text-right text-white">{num(energyEV(s.n))} eV</dd>
        <dt>⟨r⟩</dt>
        <dd className="text-right text-white">
          {r.toFixed(1)} a₀ = {(r * BOHR_NM).toFixed(3)} nm
        </dd>
        <dt>95 % inside</dt>
        <dd className="text-right text-white">{s.r95 ? `${s.r95.toFixed(1)} a₀` : '—'}</dd>
        <dt>Nodes</dt>
        <dd className="text-right text-white">
          {radialNodes} radial · {s.l} angular
        </dd>
      </dl>
      <EnergyLevels n={s.n} />
      <Button onClick={s.reset} label="Reset orbital to defaults">
        Reset
      </Button>
      <p className="text-xs text-slate-400">
        Each cloud is rescaled to fit; the readouts give its true size. Drag the cloud to turn it.
      </p>
      <LiveDescription>
        Showing the {name.main}
        {name.sub ? ` ${name.sub}` : ''} orbital: energy {num(energyEV(s.n))} electronvolts, {radialNodes}{' '}
        radial and {s.l} angular nodes.{' '}
        {s.cut < 1 ? 'The cloud is cut open, showing the wavefunction on the cutting plane.' : ''}
      </LiveDescription>
    </ControlPanel>
  );
}
