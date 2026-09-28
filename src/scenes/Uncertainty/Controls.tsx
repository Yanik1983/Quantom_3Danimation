import type { PacketShape } from '../../physics/wavepacket1d';
import { num } from '../../lib/format';
import { Equation } from '../../ui/Equation';
import { Button, ControlPanel, LiveDescription, Segmented, Slider } from '../../ui/controls';
import { analyse } from './analysis';
import { packetOf, useUncertainty } from './store';

/** Width slider is logarithmic so squeezing and stretching feel symmetric. */
const SIG_MIN = 0.25;
const SIG_MAX = 2.5;
const toSlider = (s: number) => (100 * Math.log(s / SIG_MIN)) / Math.log(SIG_MAX / SIG_MIN);
const fromSlider = (v: number) => SIG_MIN * Math.pow(SIG_MAX / SIG_MIN, v / 100);

function Gauge({ product }: { product: number }) {
  // Scale: 0 … 4 × (ℏ/2); the forbidden zone is everything below ℏ/2.
  const max = 2;
  const frac = Math.min(product / max, 1);
  return (
    <div className="space-y-1">
      <div className="relative h-3 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
        <div
          className="absolute inset-y-0 left-0 bg-[repeating-linear-gradient(135deg,rgba(255,61,187,0.35)_0_4px,transparent_4px_8px)]"
          style={{ width: `${(0.5 / max) * 100}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan to-violet"
          style={{ width: `${frac * 100}%` }}
        />
        <div className="absolute inset-y-0 w-0.5 bg-white" style={{ left: `${(0.5 / max) * 100}%` }} />
      </div>
      <div className="flex justify-between text-[0.7rem] text-slate-400">
        <span className="text-magenta">forbidden</span>
        <span>ℏ/2</span>
        <span>{max}ℏ</span>
      </div>
    </div>
  );
}

export default function UncertaintyControls() {
  const s = useUncertainty();
  const a = analyse(packetOf(s));
  const product = a.x.sd * a.k.sd;
  const minimal = product < 0.5005;

  return (
    <ControlPanel title="Uncertainty controls">
      <div
        className="space-y-2 rounded-lg bg-black/30 px-3 py-2"
        role="status"
        aria-label="Uncertainty readout"
      >
        <div className="grid grid-cols-3 gap-2 font-mono text-xs text-slate-300 tabular-nums">
          <span>
            Δx = <span className="text-cyan">{num(a.x.sd, 3)}</span>
          </span>
          <span>
            Δp = <span className="text-magenta">{num(a.k.sd, 3)}</span>ℏ
          </span>
          <span>
            Δx·Δp = <span className="text-white">{num(product, 3)}</span>ℏ
          </span>
        </div>
        <Gauge product={product} />
        <p className="text-xs text-slate-400">
          <Equation tex="\Delta x\,\Delta p \ge \hbar/2" />{' '}
          {minimal
            ? '— equality: this Gaussian is a minimum-uncertainty state.'
            : '— above the limit, as every state must be.'}
        </p>
      </div>

      <Segmented<PacketShape>
        label="Packet shape"
        value={s.shape}
        options={[
          { value: 'gaussian', label: 'Gaussian' },
          { value: 'flattop', label: 'Flat-top' },
          { value: 'twopeaks', label: 'Two peaks' },
        ]}
        onChange={s.setShape}
      />
      <Slider
        label="Squeeze position (width)"
        min={0}
        max={100}
        step={0.5}
        value={toSlider(s.sigma)}
        onChange={(v) => s.set({ sigma: fromSlider(v) })}
        format={() => `σ = ${s.sigma.toFixed(2)}`}
        hint="Narrower in position ⇒ wider in momentum."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Slider
          label="Mean momentum p₀"
          min={-4}
          max={4}
          step={0.1}
          value={s.k0}
          onChange={(k0) => s.set({ k0 })}
          format={(v) => `${num(v, 1)}ℏ`}
        />
        <Slider
          label="Centre x₀"
          min={-4}
          max={4}
          step={0.1}
          value={s.x0}
          onChange={(x0) => s.set({ x0 })}
          format={(v) => num(v, 1)}
        />
        <Slider
          label="Chirp"
          min={-0.5}
          max={0.5}
          step={0.01}
          value={s.chirp}
          onChange={(chirp) => s.set({ chirp })}
          format={(v) => num(v, 2)}
          hint="Adds momentum spread without changing |ψ(x)|."
        />
        {s.shape === 'twopeaks' && (
          <Slider
            label="Peak separation"
            min={2}
            max={8}
            step={0.1}
            value={s.separation}
            onChange={(separation) => s.set({ separation })}
            format={(v) => v.toFixed(1)}
          />
        )}
      </div>
      <Button onClick={s.reset} label="Reset uncertainty demo to defaults">
        Reset
      </Button>
      <LiveDescription>
        {s.shape === 'gaussian' ? 'Gaussian' : s.shape === 'flattop' ? 'Flat-top' : 'Two-peaked'} packet.
        Position spread {num(a.x.sd, 2)}, momentum spread {num(a.k.sd, 2)}, product {num(product, 2)} times
        h-bar, which is {minimal ? 'exactly' : 'above'} the minimum of one half.
      </LiveDescription>
    </ControlPanel>
  );
}
