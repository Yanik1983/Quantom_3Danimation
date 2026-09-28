import { Html } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import { BoxGeometry, Color, Group, MeshBasicMaterial } from 'three';
import { useDisposable } from '../../hooks/useDisposable';
import type { SceneProps } from '../registry';
import { analyse, XS } from './analysis';
import { ComplexRibbon, type RibbonHandle } from '../../three/ComplexRibbon';
import { packetOf, useUncertainty } from './store';

/** Both panels show ±8 units (position in length units, momentum in ℏ/length). */
const RANGE = 8;
const PANEL_W = 7;
const WALL_Z = -1.4;
const BRACKET_Z = 1.1;

function Bracket({ group, color }: { group: React.RefObject<Group | null>; color: Color }) {
  const bar = useDisposable(() => new BoxGeometry(1, 0.05, 0.05), []);
  const cap = useDisposable(() => new BoxGeometry(0.05, 0.35, 0.05), []);
  const mat = useDisposable(
    () => new MeshBasicMaterial({ color: color.clone().multiplyScalar(1.6) }),
    [color],
  );
  return (
    <group ref={group} position={[0, -0.25, BRACKET_Z]}>
      <mesh geometry={bar} material={mat} name="bar" />
      <mesh geometry={cap} material={mat} name="capL" />
      <mesh geometry={cap} material={mat} name="capR" />
      <mesh geometry={cap} material={mat} name="mid" scale={[1, 0.6, 1]} />
    </group>
  );
}

function placeBracket(g: Group | null, mean: number, sd: number) {
  if (!g) return;
  const toX = (v: number) => (v / RANGE) * (PANEL_W / 2);
  const a = toX(mean - sd);
  const b = toX(mean + sd);
  const [bar, capL, capR, mid] = g.children;
  bar.scale.x = Math.max(b - a, 0.01);
  bar.position.x = (a + b) / 2;
  capL.position.x = a;
  capR.position.x = b;
  mid.position.x = toX(mean);
}

export default function UncertaintyScene(_props: SceneProps) {
  const posRibbon = useRef<RibbonHandle>(null);
  const momRibbon = useRef<RibbonHandle>(null);
  const posBracket = useRef<Group>(null);
  const momBracket = useRef<Group>(null);
  const cyan = useMemo(() => new Color(0.133, 0.894, 1.0), []);
  const magenta = useMemo(() => new Color(1.0, 0.239, 0.733), []);

  // Recompute only when the packet changes — nothing runs per frame.
  useEffect(() => {
    const update = () => {
      const a = analyse(packetOf(useUncertainty.getState()));
      posRibbon.current?.update(XS, a.psi, -RANGE, RANGE);
      momRibbon.current?.update(a.p, a.phi, -RANGE, RANGE);
      placeBracket(posBracket.current, a.x.mean, a.x.sd);
      placeBracket(momBracket.current, a.k.mean, a.k.sd);
    };
    update();
    return useUncertainty.subscribe(update);
  }, []);

  const label = 'pointer-events-none select-none whitespace-nowrap font-display text-sm text-slate-200';
  const panels = [
    {
      key: 'x',
      y: 2.35,
      ribbon: posRibbon,
      bracket: posBracket,
      color: cyan,
      title: 'Position ψ(x)',
      axis: 'x',
      samples: 420,
      text: 'text-cyan',
    },
    {
      key: 'p',
      y: -2.35,
      ribbon: momRibbon,
      bracket: momBracket,
      color: magenta,
      title: 'Momentum φ(p)',
      axis: 'p',
      samples: 220,
      text: 'text-magenta',
    },
  ];
  return (
    // Tilted toward the viewer so the imaginary part (depth) of each ribbon is visible.
    <group rotation={[0.32, -0.38, 0]} position={[0.4, -0.2, 0]}>
      {panels.map((p) => (
        <group key={p.key} position={[0, p.y, 0]}>
          <ComplexRibbon
            ref={p.ribbon}
            width={PANEL_W}
            amplitude={1.2}
            densityScale={1.5}
            samples={p.samples}
            wallZ={WALL_Z}
            wallColor={p.color}
          />
          <Bracket group={p.bracket} color={p.color} />
          <Html position={[-PANEL_W / 2 - 0.2, 1.4, WALL_Z]} zIndexRange={[5, 0]}>
            <span aria-hidden="true" className={label}>
              {p.title}
            </span>
          </Html>
          <Html position={[PANEL_W / 2 + 0.25, 0, 0]} center zIndexRange={[5, 0]}>
            <span
              aria-hidden="true"
              className={`pointer-events-none font-mono text-sm select-none ${p.text}`}
            >
              {p.axis}
            </span>
          </Html>
        </group>
      ))}
      <Html position={[-PANEL_W / 2 - 0.2, 0.55, 0]} zIndexRange={[5, 0]}>
        <span
          aria-hidden="true"
          className="pointer-events-none font-mono text-xs whitespace-nowrap text-violet select-none"
        >
          ⇅ Fourier transform
        </span>
      </Html>
    </group>
  );
}
