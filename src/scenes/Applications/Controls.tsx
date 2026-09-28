import { jumpToStation } from '../../lib/scroll';
import { larmorMHz, oxideTunnelling, photonEnergyEV } from '../../physics/applications';
import { groverSuccess } from '../../physics/qregister';
import { Button, ControlPanel, LiveDescription, Segmented, Slider } from '../../ui/controls';
import { register, useApplications, type AppId } from './store';

/** a × 10^b with a true minus sign. */
function sci(v: number): string {
  if (v === 0) return '0';
  const e = Math.floor(Math.log10(v));
  const m = v / 10 ** e;
  return `${m.toFixed(1)} × 10${String(e)
    .replace('-', '⁻')
    .replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)])}`;
}

function BuildsOn({ items }: { items: { label: string; station: number }[] }) {
  return (
    <p className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
      Builds on:
      {items.map((it) => (
        <button
          key={it.label}
          type="button"
          onClick={() => jumpToStation(it.station)}
          className="rounded-full border border-violet/40 px-2 py-0.5 text-violet-ink hover:border-violet hover:text-white"
        >
          {it.label}
        </button>
      ))}
    </p>
  );
}

const APPS: { value: AppId; label: string }[] = [
  { value: 'transistor', label: 'Transistors' },
  { value: 'mri', label: 'MRI' },
  { value: 'laser', label: 'Lasers' },
  { value: 'qc', label: 'Quantum computers' },
];

function TransistorPanel() {
  const s = useApplications();
  const T = oxideTunnelling(1, 3.1, s.oxide);
  const T20 = oxideTunnelling(1, 3.1, 2.0);
  return (
    <>
      <p className="text-sm leading-relaxed text-slate-300">
        A transistor’s gate is insulated from its channel by an oxide layer only a few atoms thick. Electrons
        that strike it can <strong className="text-white">tunnel</strong> straight through, leaking current
        and wasting power — one reason chips stopped shrinking plain silicon dioxide below about 1.2 nm. Flash
        memory turns the same effect into a feature, using a strong field to tunnel electrons onto an isolated
        gate to store each bit.
      </p>
      <Slider
        label="Oxide thickness"
        min={0.8}
        max={3}
        step={0.05}
        value={s.oxide}
        onChange={s.setOxide}
        format={(v) => `${v.toFixed(2)} nm`}
      />
      <p className="rounded-lg bg-black/30 px-3 py-2 font-mono text-xs text-slate-300" role="status">
        Tunnelling probability per electron: <span className="text-white">{sci(T)}</span>
        <br />
        {s.oxide < 2 ? `${sci(T / T20)}× the leakage at 2 nm` : `${sci(T20 / T)}× less leakage than at 2 nm`}
        <br />
        <span className="text-slate-400">
          Barrier 3.1 eV (Si/SiO₂), electron energy 1 eV. Animation leak rate on a log scale.
        </span>
      </p>
      <BuildsOn items={[{ label: '06 Tunneling', station: 6 }]} />
    </>
  );
}

function MriPanel() {
  const s = useApplications();
  return (
    <>
      <p className="text-sm leading-relaxed text-slate-300">
        Hydrogen nuclei in your body are tiny magnets with quantum spin. In a scanner’s strong field their
        spins
        <strong className="text-white"> precess</strong> at a precise frequency set by the field. A radio
        pulse tips them over; as they swing and relax back they broadcast a signal, and differences in how
        fast different tissues relax become the contrast in the image.
      </p>
      <Slider
        label="Magnetic field"
        min={0.5}
        max={7}
        step={0.1}
        value={s.field}
        onChange={s.setField}
        format={(v) => `${v.toFixed(1)} T`}
      />
      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={s.pulse}>
          RF pulse (90°)
        </Button>
        <p className="font-mono text-xs text-slate-300" role="status">
          Larmor frequency: <span className="text-white">{larmorMHz(s.field).toFixed(1)} MHz</span>
        </p>
      </div>
      <p className="text-xs text-slate-400">
        Precession slowed about 10⁸× and relaxation shortened for display.
      </p>
      <BuildsOn items={[{ label: '03 Superposition', station: 3 }]} />
    </>
  );
}

function LaserPanel() {
  const s = useApplications();
  return (
    <>
      <p className="text-sm leading-relaxed text-slate-300">
        Atoms can only hold certain energies, so they emit light of exact colours. A laser adds a twist
        Einstein predicted in 1917: a passing photon can <strong className="text-white">stimulate</strong> an
        excited atom to emit an identical twin — same colour, direction and phase. Mirrors bounce the light
        back and forth so the cascade grows into a beam.
      </p>
      <Segmented
        label="Laser"
        value={String(s.wavelength)}
        options={[
          { value: '405', label: '405 nm violet' },
          { value: '532', label: '532 nm green' },
          { value: '632.8', label: '633 nm red' },
        ]}
        onChange={(v) => s.setWavelength(Number(v))}
      />
      <Slider
        label="Pump power"
        min={0}
        max={1}
        step={0.01}
        value={s.pump}
        onChange={s.setPump}
        format={(v) => `${Math.round(v * 100)}%`}
      />
      <p className="rounded-lg bg-black/30 px-3 py-2 font-mono text-xs text-slate-300" role="status">
        Photon energy E = hc/λ ={' '}
        <span className="text-white">{photonEnergyEV(s.wavelength).toFixed(2)} eV</span>
        <br />
        Output (illustration): {s.laserOutput.toFixed(0)} photons/s
      </p>
      <BuildsOn items={[{ label: '04 Orbitals', station: 4 }]} />
    </>
  );
}

function QcPanel() {
  const s = useApplications();
  const pMarked = register.probability(s.marked);
  const iterations = s.qcLog.filter((x) => x === 'diffuse').length;
  const superposed = s.qcLog.includes('superpose');
  return (
    <>
      <p className="text-sm leading-relaxed text-slate-300">
        A quantum computer manipulates amplitudes, not just bits. Here three qubits hold all eight
        possibilities at once. Grover’s search algorithm finds a hidden item by{' '}
        <strong className="text-white">interference</strong>: the oracle flips the marked amplitude’s sign,
        and diffusion reflects every amplitude about the mean, so the marked one grows while the rest shrink.
        Two rounds make it 94.5 % likely.
      </p>
      <Segmented
        label="Hidden item"
        value={String(s.marked)}
        options={Array.from({ length: 8 }, (_, i) => ({
          value: String(i),
          label: i.toString(2).padStart(3, '0'),
        }))}
        onChange={(v) => s.setMarked(Number(v))}
      />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => s.qc('superpose')} label="Apply Hadamard to all qubits">
          1 · Superpose
        </Button>
        <Button onClick={() => s.qc('oracle')} disabled={!superposed} label="Apply the oracle">
          2 · Oracle
        </Button>
        <Button onClick={() => s.qc('diffuse')} disabled={!superposed} label="Apply the diffusion step">
          3 · Diffuse
        </Button>
        <Button variant="primary" onClick={() => s.qc('measure')} label="Measure the qubits">
          Measure
        </Button>
        <Button onClick={() => s.qc('reset')} label="Reset the qubits">
          Reset
        </Button>
      </div>
      <p
        className="rounded-lg bg-black/30 px-3 py-2 font-mono text-xs text-slate-300"
        role="status"
        aria-label="Quantum register readout"
      >
        P(|{s.marked.toString(2).padStart(3, '0')}⟩) ={' '}
        <span className="text-white">{(pMarked * 100).toFixed(1)}%</span> after {iterations} Grover round
        {iterations === 1 ? '' : 's'}
        {superposed && iterations > 0 && ` (theory ${(groverSuccess(8, iterations) * 100).toFixed(1)}%)`}
        {s.lastOutcome !== null && (
          <>
            <br />
            Measured: |{s.lastOutcome.toString(2).padStart(3, '0')}⟩{' '}
            {s.lastOutcome === s.marked ? '— found it!' : ''}
          </>
        )}
      </p>
      <BuildsOn
        items={[
          { label: '03 Superposition', station: 3 },
          { label: '07 Entanglement', station: 7 },
        ]}
      />
    </>
  );
}

export default function ApplicationsControls() {
  const s = useApplications();
  return (
    <ControlPanel title="Applications controls">
      <Segmented label="Application" value={s.app} options={APPS} onChange={s.setApp} />
      {s.app === 'transistor' && <TransistorPanel />}
      {s.app === 'mri' && <MriPanel />}
      {s.app === 'laser' && <LaserPanel />}
      {s.app === 'qc' && <QcPanel />}
      <Button onClick={s.reset} label="Reset applications to defaults">
        Reset all
      </Button>
      <LiveDescription>Showing {APPS.find((a) => a.value === s.app)?.label}.</LiveDescription>
    </ControlPanel>
  );
}
