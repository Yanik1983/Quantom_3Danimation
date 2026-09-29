import { useUi } from '../../content/i18n';
import { Button, LiveDescription, Slider } from '../../ui/controls';
import { RichText } from '../../ui/RichText';
import { LOOKS, useSuperposition } from './store';

const pct = (p: number) => `${Math.round(p * 100)}%`;

export default function SuperpositionControls() {
  const s = useSuperposition();
  const t = useUi();
  return (
    <>
      <Slider
        label={t.leftRight}
        ltr
        min={0}
        max={1}
        step={0.01}
        value={s.pRight}
        onChange={s.setPRight}
        format={(p) => t.leftRightValue(pct(1 - p), pct(p))}
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={s.look}>
          {t.look}
        </Button>
        <Button onClick={s.lookMany}>{t.lookMany(LOOKS)}</Button>
      </div>
      <div aria-live="polite" className="min-h-[1.5rem] text-sm text-slate-200">
        {s.found && (
          <p>
            <RichText text={t.found(s.found)} />
          </p>
        )}
        {s.tally && (
          <p>
            <RichText text={t.tally(s.tally.left, s.tally.right)} />
          </p>
        )}
      </div>
      <LiveDescription>{t.mixDesc(pct(1 - s.pRight), pct(s.pRight))}</LiveDescription>
    </>
  );
}
