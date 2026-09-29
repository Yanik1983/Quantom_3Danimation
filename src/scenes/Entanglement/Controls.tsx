import { useUi } from '../../content/i18n';
import { Button, Saw } from '../../ui/controls';
import { MANY, useEntanglement } from './store';

export default function EntanglementControls() {
  const s = useEntanglement();
  const t = useUi();
  const { pairs, matched, leftZero, last } = s.summary;
  const busy = s.inFlight > 0;

  let saw: string | null = null;
  if (pairs === 1 && last) saw = t.sawFirstPair(last.left, last.right);
  else if (pairs > 1 && last) {
    saw = t.sawPairs(matched, pairs, leftZero);
    if (pairs >= MANY && !busy) saw += ` ${t.sawGloves}`;
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={s.measurePair} disabled={busy}>
          {t.measurePair}
        </Button>
        <Button onClick={s.measureMany} disabled={busy}>
          {t.measurePairs(MANY)}
        </Button>
      </div>
      <Saw label={t.whatYouSaw} text={saw} />
    </>
  );
}
