import { useEffect, useMemo, type DependencyList } from 'react';

/**
 * useMemo for three.js resources: the value is disposed when it is replaced or when the
 * component unmounts, so scenes release GPU memory as the viewer travels on.
 * Call sites are dependency-checked by ESLint (see `additionalHooks` in eslint.config.js).
 */
export function useDisposable<T extends { dispose(): void }>(factory: () => T, deps: DependencyList): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(factory, deps);
  useEffect(() => () => value.dispose(), [value]);
  return value;
}
