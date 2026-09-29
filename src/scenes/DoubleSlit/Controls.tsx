import { useUi } from '../../content/i18n';
import { Button, LiveDescription, Slider, Toggle } from '../../ui/controls';
import { useDoubleSlit } from './store';
import { zoomLabel } from './zoom';

export default function DoubleSlitControls() {
  const s = useDoubleSlit();
  const t = useUi();
  const preparing = s.status === 'computing' || s.status === 'idle';

  return (
    <>
      <Slider
        label={t.zoom}
        min={0}
        max={1}
        step={0.01}
        value={s.zoom}
        onChange={s.setZoom}
        format={(z) => zoomLabel(z, t.zoomStages)}
      />
      {s.status === 'error' ? (
        <p role="alert" className="text-sm text-magenta">
          {t.simError}
        </p>
      ) : (
        <Button variant="primary" disabled={preparing} onClick={() => s.setFiring(!s.firing)}>
          {preparing ? t.preparing : s.firing ? t.stopFiring : t.fire}
        </Button>
      )}
      <Toggle label={t.watchSlits} checked={s.measuring} onChange={s.setMeasuring} />
      <LiveDescription>
        {t.landed(s.detected)} {s.measuring ? t.watchedDesc : t.unwatchedDesc}
      </LiveDescription>
    </>
  );
}
