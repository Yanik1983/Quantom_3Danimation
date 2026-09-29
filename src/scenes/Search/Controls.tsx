import { useUi } from '../../content/i18n';
import { Button, LiveDescription } from '../../ui/controls';
import { RichText } from '../../ui/RichText';
import { CUP_LABELS, useSearch } from './store';

const pct = (a: number) => `${Math.round(a * a * 100)}%`;

export default function SearchControls() {
  const s = useSearch();
  const t = useUi();
  const done = s.stage === 4;
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={s.next} disabled={done}>
          {t.searchStep(Math.min(s.stage, 3) + 1, t.searchSteps[Math.min(s.stage, 3)])}
        </Button>
        <Button onClick={s.hideNew}>{t.hideNew}</Button>
      </div>
      <div aria-live="polite" className="min-h-[3rem] text-sm leading-relaxed text-slate-200">
        <p>
          {done && s.found !== null ? (
            <RichText text={t.searchFound(CUP_LABELS[s.found])} />
          ) : (
            t.searchInfo[s.stage]
          )}
        </p>
      </div>
      <LiveDescription>
        {t.searchChances(CUP_LABELS.map((c, i) => `${c} ${pct(s.amps[i])}`).join(', '))}
      </LiveDescription>
    </>
  );
}
