import { Fragment, type ReactNode } from 'react';
import { Equation } from './Equation';

/** Minimal markup: `$tex$` → inline KaTeX, `**text**` → emphasis. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\$[^$]+\$)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          return <Equation key={i} tex={part.slice(1, -1)} />;
        }
        const bits: ReactNode[] = part.split(/(\*\*[^*]+\*\*)/g).map((b, j) =>
          b.startsWith('**') && b.endsWith('**') ? (
            <strong key={j} className="font-semibold text-white">
              {b.slice(2, -2)}
            </strong>
          ) : (
            <Fragment key={j}>{b}</Fragment>
          ),
        );
        return <Fragment key={i}>{bits}</Fragment>;
      })}
    </>
  );
}
