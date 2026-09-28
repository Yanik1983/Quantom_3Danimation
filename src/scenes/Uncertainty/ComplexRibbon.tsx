import { forwardRef, useImperativeHandle, useMemo } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Line,
  LineBasicMaterial,
  MeshBasicMaterial,
} from 'three';
import { useDisposable } from '../../hooks/useDisposable';
import { phaseColor } from '../../lib/colors';

export interface RibbonHandle {
  /**
   * Plot the complex function (values interleaved re/im at `coords`) over [lo, hi],
   * mapped to world x ∈ [−width/2, width/2]; Re → up, Im → toward the viewer.
   */
  update(coords: Float64Array, values: Float64Array, lo: number, hi: number): void;
}

interface Props {
  width: number;
  /** World units per unit of amplitude. */
  amplitude: number;
  /** World units per unit of |value|² for the density wall. */
  densityScale: number;
  /** Maximum samples drawn. */
  samples: number;
  wallZ: number;
  wallColor: Color;
}

const tmp = new Color();

/**
 * A complex function drawn as a twisted ribbon from the axis out to (Re, Im), coloured by
 * phase, plus its |value|² as a filled curve on a wall behind — the standard way to see a
 * complex wave in 3D.
 */
export const ComplexRibbon = forwardRef<RibbonHandle, Props>(function ComplexRibbon(
  { width, amplitude, densityScale, samples, wallZ, wallColor },
  ref,
) {
  const geo = useDisposable(() => {
    const ribbon = new BufferGeometry();
    ribbon.setAttribute('position', new BufferAttribute(new Float32Array(samples * 2 * 3), 3));
    ribbon.setAttribute('color', new BufferAttribute(new Float32Array(samples * 2 * 3), 3));
    const curve = new BufferGeometry();
    curve.setAttribute('position', new BufferAttribute(new Float32Array(samples * 3), 3));
    curve.setAttribute('color', new BufferAttribute(new Float32Array(samples * 3), 3));
    const wall = new BufferGeometry();
    wall.setAttribute('position', new BufferAttribute(new Float32Array(samples * 2 * 3), 3));
    wall.setAttribute('color', new BufferAttribute(new Float32Array(samples * 2 * 3), 3));
    const index: number[] = [];
    for (let i = 0; i < samples - 1; i++) {
      const a = 2 * i;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    ribbon.setIndex(index);
    wall.setIndex(index);
    const axis = new BufferGeometry();
    axis.setAttribute(
      'position',
      new BufferAttribute(new Float32Array([-width / 2, 0, 0, width / 2, 0, 0]), 3),
    );
    const all = [ribbon, curve, wall, axis];
    return { ribbon, curve, wall, axis, dispose: () => all.forEach((g) => g.dispose()) };
  }, [samples, width]);

  const mats = useDisposable(() => {
    const ribbon = new MeshBasicMaterial({
      vertexColors: true,
      side: DoubleSide,
      transparent: true,
      opacity: 0.55,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const curve = new LineBasicMaterial({ vertexColors: true });
    const wall = new MeshBasicMaterial({
      vertexColors: true,
      side: DoubleSide,
      transparent: true,
      opacity: 0.8,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const axis = new LineBasicMaterial({ color: new Color(0.35, 0.4, 0.65) });
    const all = [ribbon, curve, wall, axis];
    return { ribbon, curve, wall, axis, dispose: () => all.forEach((m) => m.dispose()) };
  }, []);

  const curveLine = useMemo(() => new Line(geo.curve, mats.curve), [geo, mats]);

  useImperativeHandle(
    ref,
    () => ({
      update(coords, values, lo, hi) {
        let first = 0;
        while (first < coords.length && coords[first] < lo) first++;
        let last = first;
        while (last < coords.length && coords[last] <= hi) last++;
        const stride = Math.max(1, Math.ceil((last - first) / samples));
        const rp = geo.ribbon.attributes.position.array as Float32Array;
        const rc = geo.ribbon.attributes.color.array as Float32Array;
        const cp = geo.curve.attributes.position.array as Float32Array;
        const cc = geo.curve.attributes.color.array as Float32Array;
        const wp = geo.wall.attributes.position.array as Float32Array;
        const wc = geo.wall.attributes.color.array as Float32Array;
        let n = 0;
        for (let i = first; i < last && n < samples; i += stride, n++) {
          const X = ((coords[i] - lo) / (hi - lo) - 0.5) * width;
          const re = values[2 * i];
          const im = values[2 * i + 1];
          const mag = Math.hypot(re, im);
          phaseColor(Math.atan2(im, re), tmp);
          const b = Math.min(1, mag * 1.6);
          rp.set([X, 0, 0, X, re * amplitude, im * amplitude], 6 * n);
          rc.set([tmp.r * b * 0.4, tmp.g * b * 0.4, tmp.b * b * 0.4, tmp.r * b, tmp.g * b, tmp.b * b], 6 * n);
          cp.set([X, re * amplitude, im * amplitude], 3 * n);
          cc.set([tmp.r * 1.4, tmp.g * 1.4, tmp.b * 1.4], 3 * n);
          const h = mag * mag * densityScale;
          wp.set([X, 0, wallZ, X, h, wallZ], 6 * n);
          const w = wallColor;
          wc.set([w.r * 0.15, w.g * 0.15, w.b * 0.15, w.r, w.g, w.b], 6 * n);
        }
        for (const g of [geo.ribbon, geo.curve, geo.wall]) {
          g.attributes.position.needsUpdate = true;
          g.attributes.color.needsUpdate = true;
          g.computeBoundingSphere();
        }
        geo.ribbon.setDrawRange(0, Math.max(0, (n - 1) * 6));
        geo.wall.setDrawRange(0, Math.max(0, (n - 1) * 6));
        geo.curve.setDrawRange(0, n);
      },
    }),
    [geo, samples, width, amplitude, densityScale, wallZ, wallColor],
  );

  return (
    <group>
      <mesh geometry={geo.wall} material={mats.wall} />
      <mesh geometry={geo.ribbon} material={mats.ribbon} />
      <primitive object={curveLine} />
      <lineSegments geometry={geo.axis} material={mats.axis} />
    </group>
  );
});
