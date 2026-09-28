import { Equation } from '../../ui/Equation';
import { Button, ControlPanel, LiveDescription, Segmented, Slider, Toggle } from '../../ui/controls';
import { K_MAX } from './Scene';
import { MAX_PACKETS, PACKET_NAMES, useWavefunction } from './store';

const fmt = (v: number, d = 2) => (Math.abs(v) < 0.005 ? '0.00' : v.toFixed(d));

export default function WavefunctionControls() {
  const s = useWavefunction();
  const i = Math.min(s.selected, s.packets.length - 1);
  const p = s.packets[i];
  const set = (patch: Parameters<typeof s.setPacket>[1]) => s.setPacket(i, patch);
  const o = s.obs;

  return (
    <ControlPanel title="Wavefunction controls">
      <div
        className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-black/30 px-3 py-2 font-mono text-xs text-slate-300 tabular-nums"
        role="status"
        aria-label="Measured properties of ψ"
      >
        <span>
          <Equation tex="\int|\psi|^2\,dA" /> ={' '}
          <span className="text-white">{o ? o.norm.toFixed(3) : '—'}</span>
        </span>
        <span>
          <Equation tex="\langle E\rangle" /> ={' '}
          <span className="text-white">{o ? o.energy.toFixed(2) : '—'}</span>
        </span>
        <span>
          <Equation tex="\langle x\rangle" /> = <span className="text-white">{o ? fmt(o.x) : '—'}</span>
        </span>
        <span>
          <Equation tex="\langle y\rangle" /> = <span className="text-white">{o ? fmt(o.y) : '—'}</span>
        </span>
        {s.evolving && <span className="col-span-2 text-slate-400">t = {s.time.toFixed(1)} (ℏ = m = 1)</span>}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Segmented
          label="Edit packet"
          value={String(i)}
          options={s.packets.map((_, j) => ({ value: String(j), label: `Packet ${PACKET_NAMES[j]}` }))}
          onChange={(v) => s.select(Number(v))}
        />
        <div className="flex gap-1.5">
          <Button onClick={s.addPacket} disabled={s.packets.length >= MAX_PACKETS} label="Add a wave packet">
            + Add
          </Button>
          <Button
            onClick={() => s.removePacket(i)}
            disabled={s.packets.length <= 1}
            label={`Remove packet ${PACKET_NAMES[i]}`}
          >
            Remove
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Slider
          label="Position x"
          min={-6.5}
          max={6.5}
          step={0.1}
          value={p.x}
          onChange={(x) => set({ x })}
          format={(v) => fmt(v, 1)}
        />
        <Slider
          label="Position y"
          min={-6.5}
          max={6.5}
          step={0.1}
          value={p.y}
          onChange={(y) => set({ y })}
          format={(v) => fmt(v, 1)}
        />
        <Slider
          label="Momentum kₓ"
          min={-K_MAX}
          max={K_MAX}
          step={0.1}
          value={p.kx}
          onChange={(kx) => set({ kx })}
          format={(v) => fmt(v, 1)}
        />
        <Slider
          label="Momentum k_y"
          min={-K_MAX}
          max={K_MAX}
          step={0.1}
          value={p.ky}
          onChange={(ky) => set({ ky })}
          format={(v) => fmt(v, 1)}
        />
        <Slider
          label="Width σ"
          min={0.5}
          max={2.5}
          step={0.05}
          value={p.sigma}
          onChange={(sigma) => set({ sigma })}
          format={(v) => v.toFixed(2)}
        />
        <Slider
          label="Relative phase φ"
          min={0}
          max={2}
          step={0.05}
          value={p.phase / Math.PI}
          onChange={(v) => set({ phase: v * Math.PI })}
          format={(v) => `${v.toFixed(2)}π`}
        />
      </div>

      <Toggle
        label="Evolve in time"
        checked={s.evolving}
        onChange={s.setEvolving}
        hint="Solve the Schrödinger equation live. Editing restarts from t = 0."
      />
      <Segmented
        label="Potential"
        value={s.potential}
        options={[
          { value: 'harmonic', label: 'Harmonic bowl' },
          { value: 'free', label: 'Free (periodic box)' },
        ]}
        onChange={s.setPotential}
      />
      <div className="flex gap-2">
        <Button onClick={s.restart} label="Restart evolution from the current packets">
          Restart
        </Button>
        <Button onClick={s.reset} label="Reset wavefunction to defaults">
          Reset
        </Button>
      </div>
      <p className="text-xs text-slate-400">
        Tip: drag a ring on the floor to move a packet, or its arrow tip to push it.
      </p>
      <LiveDescription>
        {s.packets.length} wave packet{s.packets.length > 1 ? 's' : ''}.{' '}
        {s.packets
          .map(
            (q, j) =>
              `Packet ${PACKET_NAMES[j]} at (${q.x.toFixed(1)}, ${q.y.toFixed(1)}) with momentum (${q.kx.toFixed(1)}, ${q.ky.toFixed(1)}) and phase ${(q.phase / Math.PI).toFixed(2)} pi.`,
          )
          .join(' ')}{' '}
        {o ? `Average position (${fmt(o.x, 1)}, ${fmt(o.y, 1)}), energy ${o.energy.toFixed(2)}.` : ''}
      </LiveDescription>
    </ControlPanel>
  );
}
