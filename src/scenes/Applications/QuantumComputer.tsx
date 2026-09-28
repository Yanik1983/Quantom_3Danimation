import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  LineBasicMaterial,
  LineDashedMaterial,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
} from 'three';
import { useDisposable } from '../../hooks/useDisposable';
import { selectReducedMotion, useSettings } from '../../state/settings';
import { register, useApplications } from './store';

const BAR_W = 0.5;
const GAP = 0.78;
const SCALE = 2.4;
const xOf = (i: number) => (i - 3.5) * GAP;
const POS = new Color(0.13, 0.89, 1.0);
const NEG = new Color(1.0, 0.24, 0.73);

/**
 * Three qubits = eight basis states. Each bar is a real amplitude (Grover's algorithm keeps
 * them real): up = positive, down = negative. The oracle flips the marked bar's sign; the
 * diffusion step reflects every bar about the dashed mean line, pumping amplitude into it.
 */
export function QuantumComputer() {
  const marked = useApplications((s) => s.marked);
  const geo = useDisposable(() => {
    const bar = new BoxGeometry(BAR_W, 1, BAR_W);
    bar.translate(0, 0.5, 0);
    const ring = new RingGeometry(0.36, 0.42, 40);
    const line = new BufferGeometry();
    line.setAttribute(
      'position',
      new BufferAttribute(new Float32Array([xOf(0) - 0.5, 0, 0, xOf(7) + 0.5, 0, 0]), 3),
    );
    line.setAttribute('lineDistance', new BufferAttribute(new Float32Array([0, 7 * GAP + 1]), 1));
    const base = line.clone();
    const all = [bar, ring, line, base];
    return { bar, ring, line, base, dispose: () => all.forEach((g) => g.dispose()) };
  }, []);
  const mats = useDisposable(() => {
    const bars = Array.from({ length: 8 }, () => new MeshBasicMaterial({ color: new Color() }));
    const ring = new MeshBasicMaterial({ color: new Color(1.8, 1.6, 0.6) });
    const mean = new LineDashedMaterial({ color: new Color(0.9, 0.9, 1.3), dashSize: 0.12, gapSize: 0.1 });
    const base = new LineBasicMaterial({ color: new Color(0.3, 0.35, 0.6) });
    return { bars, ring, mean, base, dispose: () => [...bars, ring, mean, base].forEach((m) => m.dispose()) };
  }, []);
  const bars = useRef<(Mesh | null)[]>([]);
  const labels = useRef<(HTMLSpanElement | null)[]>([]);
  const meanLine = useRef<Mesh>(null);
  const shown = useRef(new Float64Array(8));

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const reduced = selectReducedMotion(useSettings.getState());
    const k = reduced ? 1 : 1 - Math.exp(-7 * dt);
    let mean = 0;
    for (let i = 0; i < 8; i++) {
      const a = register.amp[2 * i]; // Grover amplitudes stay real
      shown.current[i] += (a - shown.current[i]) * k;
      mean += a / 8;
      const h = shown.current[i] * SCALE;
      const b = bars.current[i];
      if (b) {
        b.scale.set(1, Math.max(Math.abs(h), 0.002), 1);
        b.rotation.z = h < 0 ? Math.PI : 0;
        mats.bars[i].color.copy(h >= 0 ? POS : NEG).multiplyScalar(0.9);
      }
      const lab = labels.current[i];
      if (lab) lab.textContent = `${Math.round(register.probability(i) * 100)}%`;
    }
    if (meanLine.current) meanLine.current.position.y = mean * SCALE;
  });

  return (
    <group position={[0, -0.2, 0]} rotation={[0.15, -0.25, 0]}>
      <lineSegments geometry={geo.base} material={mats.base} />
      <lineSegments ref={meanLine} geometry={geo.line} material={mats.mean} />
      {Array.from({ length: 8 }, (_, i) => (
        <group key={i} position={[xOf(i), 0, 0]}>
          <mesh
            ref={(m) => {
              bars.current[i] = m;
            }}
            geometry={geo.bar}
            material={mats.bars[i]}
          />
          {i === marked && <mesh geometry={geo.ring} material={mats.ring} position={[0, -2.75, 0]} />}
          <Html position={[0, -2.75, 0]} center zIndexRange={[5, 0]}>
            <span
              aria-hidden="true"
              className="pointer-events-none font-mono text-xs text-slate-300 select-none"
            >
              |{i.toString(2).padStart(3, '0')}⟩
            </span>
          </Html>
          <Html position={[0, 2.75, 0]} center zIndexRange={[5, 0]}>
            <span
              ref={(el) => {
                labels.current[i] = el;
              }}
              aria-hidden="true"
              className="pointer-events-none font-mono text-xs text-cyan select-none"
            />
          </Html>
        </group>
      ))}
    </group>
  );
}
