import phaseColor from './common/phaseColor.glsl?raw';
import doubleSlitCommon from './doubleSlit/common.glsl?raw';

const CHUNKS: Record<string, string> = { phaseColor, doubleSlitCommon };

/** Resolve `#include <name>` against our own GLSL chunks (three's built-ins are untouched). */
export function glsl(src: string): string {
  return src.replace(/#include <(\w+)>/g, (m, name: string) => CHUNKS[name] ?? m);
}
