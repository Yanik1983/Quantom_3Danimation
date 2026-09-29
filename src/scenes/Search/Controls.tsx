import { useUi } from '../../content/i18n';
import { Button, LiveDescription, Saw } from '../../ui/controls';
import { classicProgress, CUP_LABELS, useSearch } from './store';

const pct = (a: number) => `${Math.round(a * a * 100)}%`;

export default function SearchControls() {
  const s = useSearch();
  const t = useUi();

  if (s.mode === 'classic') {
    const { tries, found } = classicProgress(s);
    const saw = found ? t.sawClassicFound(tries) : tries > 0 ? t.sawEmpty(tries) : null;
    return (
      <>
        <div className="flex flex-wrap gap-2">
          {CUP_LABELS.map((cup, i) => (
            <Button
              key={cup}
              onClick={() => s.lift(i)}
              disabled={found || s.lifted[i]}
              label={t.liftCup(cup)}
            >
              <span dir="ltr" className="font-mono">
                {cup}
              </span>
            </Button>
          ))}
        </div>
        <Saw label={t.whatYouSaw} text={saw} />
        {found && (
          <Button variant="primary" onClick={s.startQuantum}>
            {t.startQuantum}
          </Button>
        )}
      </>
    );
  }

  const done = s.stage === 4;
  const saw = done && s.found !== null ? t.searchFound(CUP_LABELS[s.found]) : t.searchInfo[s.stage];
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {!done && (
          <Button variant="primary" onClick={s.next}>
            {t.searchStep(s.stage + 1, t.searchSteps[s.stage])}
          </Button>
        )}
        <Button variant={done ? 'primary' : 'ghost'} onClick={s.hideNew}>
          {t.hideNew}
        </Button>
      </div>
      <Saw label={t.whatYouSaw} text={saw} />
      <LiveDescription>
        {t.searchChances(CUP_LABELS.map((c, i) => `${c} ${pct(s.amps[i])}`).join(', '))}
      </LiveDescription>
    </>
  );
}
