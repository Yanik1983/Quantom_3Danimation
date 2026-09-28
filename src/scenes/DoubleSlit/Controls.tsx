import { Button, ControlPanel, LiveDescription, Slider, Toggle } from '../../ui/controls';
import { useDoubleSlit } from './store';

const MIN_RATE = 0.5;
const MAX_RATE = 3000;
const toSlider = (rate: number) => (100 * Math.log(rate / MIN_RATE)) / Math.log(MAX_RATE / MIN_RATE);
const fromSlider = (v: number) => {
  const r = MIN_RATE * Math.pow(MAX_RATE / MIN_RATE, v / 100);
  return r < 10 ? Math.round(r * 2) / 2 : r < 100 ? Math.round(r) : Math.round(r / 10) * 10;
};
const fmtRate = (r: number) => `${r.toLocaleString('en-US')} / s`;

export default function DoubleSlitControls() {
  const s = useDoubleSlit();
  const computing = s.status === 'computing' || s.status === 'idle';

  return (
    <ControlPanel title="Double-slit controls">
      {computing ? (
        <div className="space-y-2" role="status">
          <p className="text-sm text-slate-300">Solving the Schrödinger equation on a 256 × 128 grid…</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan to-violet transition-[width]"
              style={{ width: `${Math.round(s.progress * 100)}%` }}
            />
          </div>
        </div>
      ) : s.status === 'error' ? (
        <p role="alert" className="text-sm text-magenta">
          The simulation worker failed to start in this browser.
        </p>
      ) : (
        <p className="flex items-baseline justify-between text-sm text-slate-300" role="status">
          <span>Particles detected</span>
          <span className="font-mono text-lg text-white tabular-nums">
            {s.detected.toLocaleString('en-US')}
          </span>
        </p>
      )}
      <Slider
        label="Emission rate"
        min={0}
        max={100}
        step={0.5}
        value={toSlider(s.rate)}
        onChange={(v) => s.setRate(fromSlider(v))}
        format={() => fmtRate(s.rate)}
        hint="Slow it down to follow single particles; speed it up to build the pattern."
      />
      <Toggle
        label="Measure which slit"
        checked={s.measuring}
        onChange={s.setMeasuring}
        hint="Detectors at the slits record each particle's path."
      />
      <Toggle
        label="Show quantum prediction"
        checked={s.showPrediction}
        onChange={s.setShowPrediction}
        hint="Overlay the calculated probability curve on the histogram."
      />
      <div className="flex gap-2">
        <Button onClick={s.clear}>Clear screen</Button>
        <Button onClick={s.reset} label="Reset double-slit experiment to defaults">
          Reset
        </Button>
      </div>
      <LiveDescription>
        {s.detected} particles detected.{' '}
        {s.measuring
          ? 'Which-path detectors are on: hits are coloured cyan for the upper slit and magenta for the lower one; together they form a smooth band with no stripes.'
          : 'No which-path information: the hits build up alternating bright and dark vertical stripes.'}
      </LiveDescription>
    </ControlPanel>
  );
}
