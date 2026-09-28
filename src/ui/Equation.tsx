import katex from 'katex';
import { memo, useMemo } from 'react';

interface Props {
  tex: string;
  display?: boolean;
  className?: string;
}

export const Equation = memo(function Equation({ tex, display = false, className }: Props) {
  const html = useMemo(
    () =>
      katex.renderToString(tex, {
        displayMode: display,
        throwOnError: false,
        strict: 'ignore',
        output: 'htmlAndMathml',
      }),
    [tex, display],
  );
  const Tag = display ? 'div' : 'span';
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
});
