import { Suspense } from 'react';
import { SECTIONS } from '../content/sections';
import { SCENES } from '../scenes/registry';
import { useNav } from '../state/nav';
import { IntroScene } from './IntroScene';
import { STATIONS } from './stations';

/**
 * Mounts only the scenes within one station of the viewer. Unmounted scenes release
 * their GPU resources (see each scene's dispose effects).
 */
export function SceneWindow() {
  const active = useNav((s) => s.active);
  return (
    <>
      {active <= 1 && (
        <group position={STATIONS[0].center as [number, number, number]}>
          <IntroScene active={active === 0} />
        </group>
      )}
      {SECTIONS.map((sec) => {
        const entry = SCENES[sec.id];
        if (!entry || Math.abs(sec.station - active) > 1) return null;
        const { Scene } = entry;
        return (
          <group key={sec.id} position={STATIONS[sec.station].center as [number, number, number]}>
            <Suspense fallback={null}>
              <Scene active={sec.station === active} />
            </Suspense>
          </group>
        );
      })}
    </>
  );
}
