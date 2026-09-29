import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import {
  BoxGeometry,
  Color,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  SpriteMaterial,
  TorusGeometry,
  Vector2,
} from 'three';
import { useDisposable } from '../../hooks/useDisposable';
import { selectReducedMotion, useSettings } from '../../state/settings';
import { textTexture } from '../../three/textSprite';
import type { SceneProps } from '../registry';
import { liftCup } from './actions';
import { amplitudesAt, CUP_LABELS, CUPS, useSearch, type Stage } from './store';

const CUP_X = (i: number) => (i - (CUPS - 1) / 2) * 1.12;
const CUP_Z = 0.25;
const BASELINE = 1.6;
/** Bar height for an amplitude of 1. */
const BAR_SCALE = 1.1;
/** In the lab, the model loops through the search on its own (card under cup 10). */
const IDLE_MARKED = 2;
const IDLE_STAGES: Stage[] = [1, 2, 3, 3];
const IDLE_HOLD = 1.6;

const POSITIVE = new Color(0.15, 1.05, 1.5);
const NEGATIVE = new Color(1.6, 0.22, 0.95);
const target = new Float64Array(CUPS);

/** An upside-down cup (open at the bottom), as a lathe profile. */
function cupGeometry() {
  const pts: Vector2[] = [];
  pts.push(new Vector2(0.36, 0), new Vector2(0.37, 0.03), new Vector2(0.31, 0.58));
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * (Math.PI / 2);
    pts.push(new Vector2(0.31 * Math.cos(a), 0.58 + 0.12 * Math.sin(a)));
  }
  return new LatheGeometry(pts, 40);
}

export default function SearchScene({ active }: SceneProps) {
  const cup = useDisposable(cupGeometry, []);
  const rim = useDisposable(() => new TorusGeometry(0.365, 0.014, 6, 48).rotateX(Math.PI / 2), []);
  const bar = useDisposable(() => new BoxGeometry(0.42, 1, 0.12), []);
  const base = useDisposable(() => new BoxGeometry(CUPS * 1.12 + 0.2, 0.012, 0.05), []);
  const card = useDisposable(() => new BoxGeometry(0.42, 0.02, 0.3), []);
  const cupMat = useDisposable(
    () => new MeshBasicMaterial({ color: new Color('#161c3d'), transparent: true, opacity: 0.88 }),
    [],
  );
  const rimMat = useDisposable(() => new MeshBasicMaterial({ color: new Color(0.55, 0.36, 0.96) }), []);
  const baseMat = useDisposable(() => new MeshBasicMaterial({ color: new Color(0.35, 0.4, 0.6) }), []);
  const cardMat = useDisposable(() => new MeshBasicMaterial({ color: new Color(2.4, 1.6, 0.5) }), []);
  const barMats = useDisposable(() => {
    const list = Array.from({ length: CUPS }, () => new MeshBasicMaterial({ color: POSITIVE.clone() }));
    return { list, dispose: () => list.forEach((m) => m.dispose()) };
  }, []);
  const labels = useDisposable(() => {
    const list = CUP_LABELS.map((l) => {
      const map = textTexture(l, '#dbe7ff', 64);
      return { map, mat: new SpriteMaterial({ map, transparent: true, depthWrite: false }) };
    });
    return {
      list,
      dispose: () =>
        list.forEach((l) => {
          l.map.dispose();
          l.mat.dispose();
        }),
    };
  }, []);

  const bars = useRef<(Mesh | null)[]>([]);
  const cups = useRef<(Group | null)[]>([]);
  const cardRef = useRef<Mesh>(null);
  const baseRef = useRef<Mesh>(null);
  const anim = useRef({ time: 0, shown: new Float64Array(CUPS), lift: new Float64Array(CUPS) });

  useEffect(() => {
    if (active) useSearch.getState().reset();
  }, [active]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const a = anim.current;
    a.time += dt;
    const st = useSearch.getState();
    const reduced = selectReducedMotion(useSettings.getState());

    let marked = st.marked;
    let found: number | null = null;
    const classic = active && st.mode === 'classic';
    if (classic) {
      // The normal computer's round: no qubits, no waves; lifted cups stay up.
      target.fill(0);
    } else if (active) {
      target.set(st.amps);
      if (st.stage === 4) found = st.found;
    } else {
      marked = IDLE_MARKED;
      const stage = IDLE_STAGES[Math.floor(a.time / IDLE_HOLD) % IDLE_STAGES.length];
      amplitudesAt(stage, marked, target);
    }

    const k = reduced ? 1 : Math.min(1, dt * 4);
    for (let i = 0; i < CUPS; i++) {
      a.shown[i] += (target[i] - a.shown[i]) * k;
      const amp = a.shown[i];
      const h = Math.max(0.002, Math.abs(amp) * BAR_SCALE);
      const m = bars.current[i];
      if (m) {
        m.visible = !classic;
        m.scale.y = h;
        m.position.y = BASELINE + (amp >= 0 ? h / 2 : -h / 2);
      }
      barMats.list[i].color.copy(amp >= 0 ? POSITIVE : NEGATIVE);
      // The measured cup lifts to reveal the card.
      const up = classic ? st.lifted[i] : found === i;
      a.lift[i] += ((up ? 0.75 : 0) - a.lift[i]) * k;
      const c = cups.current[i];
      if (c) c.position.y = a.lift[i];
    }
    if (baseRef.current) baseRef.current.visible = !classic;
    if (cardRef.current) {
      cardRef.current.position.x = CUP_X(marked);
      cardRef.current.visible = classic ? st.lifted[marked] : found !== null && found === marked;
    }
  });

  return (
    <group>
      <mesh ref={baseRef} geometry={base} material={baseMat} position={[0, BASELINE, CUP_Z]} />
      {CUP_LABELS.map((label, i) => (
        <group key={label} position={[CUP_X(i), 0, CUP_Z]}>
          <group
            ref={(g) => {
              cups.current[i] = g;
            }}
            onClick={(e) => {
              if (!active || useSearch.getState().mode !== 'classic') return;
              e.stopPropagation();
              liftCup(i);
            }}
          >
            <mesh geometry={cup} material={cupMat} />
            <mesh geometry={rim} material={rimMat} position={[0, 0.02, 0]} />
          </group>
          <mesh
            ref={(m) => {
              bars.current[i] = m;
            }}
            geometry={bar}
            material={barMats.list[i]}
          />
          <sprite material={labels.list[i].mat} position={[0, 0.1, 0.72]} scale={[0.34, 0.34, 1]} />
        </group>
      ))}
      <mesh ref={cardRef} geometry={card} material={cardMat} position={[0, 0.02, CUP_Z]} visible={false} />
    </group>
  );
}
