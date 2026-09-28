import { classicalTransmission, packetTransmission, transmission } from '../../physics/barrier';
import { Button, ControlPanel, LiveDescription, Slider, Toggle } from '../../ui/controls';
import { PACKET_SIGMA } from './constants';
import { useTunneling } from './store';

const pct = (v: number) => `${(v * 100).toFixed(v < 0.01 && v > 0 ? 2 : 1)}%`;

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr_3.5rem] items-center gap-2 text-xs">
      <span className="text-slate-300">{label}</span>
      <div className="h-2 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, value * 100)}%` }} />
      </div>
      <span className="text-right font-mono text-white tabular-nums">{pct(value)}</span>
    </div>
  );
}

export default function TunnelingControls() {
  const s = useTunneling();
  const k0 = Math.sqrt(2 * s.energy);
  const predicted = packetTransmission(k0, PACKET_SIGMA, s.V0, s.a);
  const planeWave = transmission(s.energy, s.V0, s.a);
  const classical = classicalTransmission(k0, PACKET_SIGMA, s.V0);
  const below = s.energy < s.V0;

  return (
    <ControlPanel title="Tunneling controls">
      <div
        className="space-y-2 rounded-lg bg-black/30 px-3 py-2"
        role="status"
        aria-label="Transmission readout"
      >
        <Bar label="Beyond the barrier" value={s.T} color="bg-gradient-to-r from-cyan to-violet" />
        <Bar label="Before the barrier" value={s.R} color="bg-magenta/70" />
        <div className="border-t border-white/10 pt-2 font-mono text-xs text-slate-300 tabular-nums">
          <p>
            Quantum prediction (this packet): <span className="text-cyan">{pct(predicted)}</span>
          </p>
          <p>
            Plane wave at E: {pct(planeWave)} · Classical:{' '}
            <span className="text-magenta">{pct(classical)}</span>
          </p>
          {s.done && (
            <p className="mt-1 text-slate-200">
              Final: measured {pct(s.T)} vs predicted {pct(predicted)} transmitted; {pct(s.R)} reflected.
            </p>
          )}
        </div>
      </div>
      <p className="text-sm text-slate-300">
        {below
          ? 'The packet’s energy is below the barrier top: a classical particle would always bounce back.'
          : 'The packet’s energy is above the barrier top — yet some of the wave still reflects.'}
      </p>
      <Slider
        label="Particle energy E"
        min={0.2}
        max={3}
        step={0.02}
        value={s.energy}
        onChange={s.setEnergy}
        format={(v) => v.toFixed(2)}
      />
      <Slider
        label="Barrier height V₀"
        min={0}
        max={3}
        step={0.02}
        value={s.V0}
        onChange={s.setV0}
        format={(v) => v.toFixed(2)}
      />
      <Slider
        label="Barrier width a"
        min={0.2}
        max={3}
        step={0.02}
        value={s.a}
        onChange={s.setA}
        format={(v) => v.toFixed(2)}
        hint="Transmission falls off exponentially as the barrier widens."
      />
      <Toggle label="Auto-repeat" checked={s.autoRepeat} onChange={s.setAutoRepeat} />
      <div className="flex gap-2">
        <Button variant="primary" onClick={s.fire}>
          Fire again
        </Button>
        <Button onClick={s.reset} label="Reset tunneling experiment to defaults">
          Reset
        </Button>
      </div>
      <LiveDescription>
        {s.done
          ? `Run complete: ${pct(s.T)} of the probability tunnelled through, ${pct(s.R)} reflected. Quantum theory predicts ${pct(predicted)}; classical physics predicts ${pct(classical)}.`
          : `Energy ${s.energy.toFixed(2)}, barrier height ${s.V0.toFixed(2)}, width ${s.a.toFixed(2)}. Predicted transmission ${pct(predicted)}.`}
      </LiveDescription>
    </ControlPanel>
  );
}
