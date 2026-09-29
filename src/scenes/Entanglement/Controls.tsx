import { useUi } from '../../content/i18n';
import { Button } from '../../ui/controls';
import { RichText } from '../../ui/RichText';
import { MANY, useEntanglement } from './store';

export default function EntanglementControls() {
  const s = useEntanglement();
  const t = useUi();
  const arrow = (v: 1 | -1) => (v > 0 ? t.up : t.down);
  const { pairs, opposite, leftUp, last } = s.summary;
  const busy = s.inFlight > 0;
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={s.measurePair} disabled={busy}>
          {t.measurePair}
        </Button>
        <Button onClick={s.measureMany} disabled={busy}>
          {t.measureMany(MANY)}
        </Button>
      </div>
      <div aria-live="polite" className="min-h-[3rem] space-y-1 text-sm text-slate-200">
        {last && (
          <p>
            <RichText text={t.pairResult(arrow(last.left), arrow(last.right))} />
          </p>
        )}
        {pairs > 0 && (
          <p>
            <RichText text={t.opposite(opposite, pairs)} />{' '}
            <span className="text-slate-400">{t.leftWas(leftUp, pairs - leftUp)}</span>
          </p>
        )}
      </div>
    </>
  );
}
