import { Button, LiveDescription, Slider, Toggle } from '../../ui/controls';
import { useDoubleSlit } from './store';
import { zoomLabel } from './zoom';

export default function DoubleSlitControls() {
  const s = useDoubleSlit();
  const preparing = s.status === 'computing' || s.status === 'idle';

  return (
    <>
      <Slider
        label="Zoom"
        min={0}
        max={1}
        step={0.01}
        value={s.zoom}
        onChange={s.setZoom}
        format={zoomLabel}
      />
      {s.status === 'error' ? (
        <p role="alert" className="text-sm text-magenta">
          The simulation could not start in this browser.
        </p>
      ) : (
        <Button variant="primary" disabled={preparing} onClick={() => s.setFiring(!s.firing)}>
          {preparing ? 'Preparing the simulation…' : s.firing ? 'Stop firing' : 'Fire particles'}
        </Button>
      )}
      <Toggle label="Watch the slits" checked={s.measuring} onChange={s.setMeasuring} />
      <LiveDescription>
        {s.detected} particles have landed.{' '}
        {s.measuring
          ? 'Detectors watch the slits: the dots form one smooth band, with no stripes.'
          : 'The slits are not watched: the dots build up bright and dark stripes.'}
      </LiveDescription>
    </>
  );
}
