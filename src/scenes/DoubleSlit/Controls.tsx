import { useUi } from '../../content/i18n';
import { sound } from '../../lib/sound';
import { Button, LiveDescription, Saw, Toggle } from '../../ui/controls';
import { PATTERN_AT, useDoubleSlit } from './store';

export default function DoubleSlitControls() {
  const s = useDoubleSlit();
  const t = useUi();
  const preparing = s.status === 'computing' || s.status === 'idle';
  const clear = s.detected >= PATTERN_AT;
  let saw: string | null = null;
  if (s.measuring) saw = clear ? t.sawNoStripes : s.detected > 0 ? t.sawDetecting : t.sawDetectorsReady;
  else if (s.detected > 0) saw = clear ? t.sawStripes : t.sawLanding;

  return (
    <>
      {s.status === 'error' ? (
        <p role="alert" className="text-sm text-magenta">
          {t.simError}
        </p>
      ) : (
        <Button variant="primary" disabled={preparing} onClick={() => s.setFiring(!s.firing)}>
          {preparing ? t.preparing : s.firing ? t.stopFiring : t.fire}
        </Button>
      )}
      <Toggle
        label={t.detectors}
        checked={s.measuring}
        onChange={(v) => {
          sound.relay();
          s.setMeasuring(v);
        }}
      />
      <Saw label={t.whatYouSaw} text={saw} />
      <LiveDescription>{t.landed(s.detected)}</LiveDescription>
    </>
  );
}
