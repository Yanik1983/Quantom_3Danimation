import { useState } from 'react';
import { num } from '../../lib/format';
import type { BellSummary } from './store';

/**
 * Correlation E = ⟨AB⟩ versus the angle between the two detector settings: quantum
 * prediction −cos Δ against the hidden-variable model's straight line, with measured
 * points (±1 standard error). Series colours validated for CVD separation on the dark
 * card surface; identity is also carried by line style and marker shape.
 */
const Q = '#2196c0';
const C = '#e94f9f';
const W = 320;
const H = 196;
const M = { l: 34, r: 12, t: 26, b: 30 };
/** Inset so markers at 0° and 180° clear the axis labels. */
const PAD = 10;
const x = (deg: number) => M.l + PAD + (deg / 180) * (W - M.l - M.r - 2 * PAD);
const y = (e: number) => M.t + ((1 - e) / 2) * (H - M.t - M.b);

interface Point {
  delta: number;
  q: number;
  qse: number;
  c: number;
  cse: number;
  n: number;
}

/** Pool setting pairs that share the same angle difference. */
function byAngle(summary: BellSummary | null): Point[] {
  if (!summary) return [];
  const groups = new Map<number, Point>();
  for (const cell of summary.cells) {
    if (cell.n === 0) continue;
    const d = Math.round((cell.delta * 180) / Math.PI);
    const g = groups.get(d) ?? { delta: d, q: 0, qse: 0, c: 0, cse: 0, n: 0 };
    g.q += cell.q * cell.n;
    g.c += cell.c * cell.n;
    g.n += cell.n;
    groups.set(d, g);
  }
  return [...groups.values()]
    .map((g) => {
      const q = g.q / g.n;
      const c = g.c / g.n;
      return {
        ...g,
        q,
        c,
        qse: Math.sqrt(Math.max(1 - q * q, 1e-6) / g.n),
        cse: Math.sqrt(Math.max(1 - c * c, 1e-6) / g.n),
      };
    })
    .sort((a, b) => a.delta - b.delta);
}

function curve(f: (deg: number) => number): string {
  let d = '';
  for (let deg = 0; deg <= 180; deg += 3)
    d += `${deg ? 'L' : 'M'}${x(deg).toFixed(1)},${y(f(deg)).toFixed(1)}`;
  return d;
}
const QUANTUM_PATH = curve((deg) => -Math.cos((deg * Math.PI) / 180));
const CLASSICAL_PATH = curve((deg) => -1 + (2 * deg) / 180);

export function CorrelationChart({ summary }: { summary: BellSummary | null }) {
  const points = byAngle(summary);
  const [hover, setHover] = useState<{ p: Point; which: 'q' | 'c' } | null>(null);

  return (
    <figure className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300" aria-hidden="true">
        <span className="flex items-center gap-1.5">
          <svg width="18" height="8">
            <line x1="0" x2="18" y1="4" y2="4" stroke={Q} strokeWidth="2" />
          </svg>
          Quantum (entangled pairs)
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="18" height="8">
            <line x1="0" x2="18" y1="4" y2="4" stroke={C} strokeWidth="2" strokeDasharray="4 3" />
          </svg>
          Hidden instructions (classical)
        </span>
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label="Correlation between Alice's and Bob's results versus the angle between their detector settings. The quantum curve is minus cosine of the angle; the classical model is a straight line from −1 to +1. Measured points follow the quantum curve."
        >
          {[-1, -0.5, 0, 0.5, 1].map((e) => (
            <g key={e}>
              <line x1={M.l} x2={W - M.r} y1={y(e)} y2={y(e)} stroke="rgba(255,255,255,0.07)" />
              <text x={M.l - 6} y={y(e) + 3} fontSize="9" textAnchor="end" fill="rgba(203,213,225,0.7)">
                {num(e, 1)}
              </text>
            </g>
          ))}
          {[0, 45, 90, 120, 135, 180].map((d) => (
            <text
              key={d}
              x={x(d)}
              y={H - M.b + 14}
              fontSize="9"
              textAnchor="middle"
              fill="rgba(203,213,225,0.7)"
            >
              {d}°
            </text>
          ))}
          <text
            x={(M.l + W - M.r) / 2}
            y={H - 4}
            fontSize="9"
            textAnchor="middle"
            fill="rgba(203,213,225,0.7)"
          >
            angle between settings
          </text>
          <text x={M.l} y={12} fontSize="9" fill="rgba(203,213,225,0.7)">
            correlation ⟨AB⟩
          </text>
          <path d={CLASSICAL_PATH} fill="none" stroke={C} strokeWidth="2" strokeDasharray="5 4" />
          <path d={QUANTUM_PATH} fill="none" stroke={Q} strokeWidth="2" />
          {/* Direct labels near the curves' right ends. */}
          <text
            x={x(150)}
            y={y(-1 + (2 * 150) / 180) + 14}
            fontSize="9"
            fill="rgba(226,232,240,0.85)"
            textAnchor="middle"
          >
            classical
          </text>
          <text
            x={x(112)}
            y={y(-Math.cos((112 * Math.PI) / 180)) - 8}
            fontSize="9"
            fill="rgba(226,232,240,0.85)"
            textAnchor="end"
          >
            quantum
          </text>
          {points.map((p) => (
            <g key={p.delta}>
              {(['c', 'q'] as const).map((which) => {
                const e = which === 'q' ? p.q : p.c;
                const se = which === 'q' ? p.qse : p.cse;
                const cx = x(p.delta) + (which === 'q' ? 4 : -4);
                const color = which === 'q' ? Q : C;
                const label = `${which === 'q' ? 'Quantum' : 'Classical model'} at ${p.delta}°: ${num(e, 3)} ± ${num(se, 3)} from ${p.n} pairs`;
                return (
                  <g
                    key={which}
                    tabIndex={0}
                    role="img"
                    aria-label={label}
                    onPointerEnter={() => setHover({ p, which })}
                    onPointerLeave={() => setHover(null)}
                    onFocus={() => setHover({ p, which })}
                    onBlur={() => setHover(null)}
                    className="cursor-default outline-none"
                  >
                    <line x1={cx} x2={cx} y1={y(e - se)} y2={y(e + se)} stroke={color} strokeWidth="1.5" />
                    {which === 'q' ? (
                      <circle cx={cx} cy={y(e)} r="4" fill={color} stroke="#0e101c" strokeWidth="2" />
                    ) : (
                      <rect
                        x={cx - 4}
                        y={y(e) - 4}
                        width="8"
                        height="8"
                        rx="1"
                        fill={color}
                        stroke="#0e101c"
                        strokeWidth="2"
                      />
                    )}
                    <circle cx={cx} cy={y(e)} r="12" fill="transparent" />
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
        {hover && (
          <div
            className="pointer-events-none absolute rounded-md border border-white/10 bg-[#0e101c]/95 px-2 py-1 text-xs shadow-lg"
            style={{
              left: `${(x(hover.p.delta) / W) * 100}%`,
              top: `${(y(hover.which === 'q' ? hover.p.q : hover.p.c) / H) * 100}%`,
              transform: 'translate(-50%, -130%)',
            }}
          >
            <p className="font-mono text-white tabular-nums">
              {num(hover.which === 'q' ? hover.p.q : hover.p.c, 3)} ±{' '}
              {num(hover.which === 'q' ? hover.p.qse : hover.p.cse, 3)}
            </p>
            <p className="flex items-center gap-1 text-slate-400">
              <svg width="12" height="6" aria-hidden="true">
                <line
                  x1="0"
                  x2="12"
                  y1="3"
                  y2="3"
                  stroke={hover.which === 'q' ? Q : C}
                  strokeWidth="2"
                  strokeDasharray={hover.which === 'q' ? undefined : '3 2'}
                />
              </svg>
              {hover.which === 'q' ? 'Quantum' : 'Classical model'} · {hover.p.delta}° · {hover.p.n} pairs
            </p>
          </div>
        )}
      </div>
      <details className="text-xs text-slate-300">
        <summary className="cursor-pointer text-slate-400 hover:text-slate-200">Show data table</summary>
        <table className="mt-2 w-full font-mono tabular-nums">
          <thead className="text-slate-400">
            <tr>
              <th className="text-left font-normal">Angle</th>
              <th className="text-right font-normal">Pairs</th>
              <th className="text-right font-normal">Quantum</th>
              <th className="text-right font-normal">Classical</th>
              <th className="text-right font-normal">−cos Δ</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.delta}>
                <td>{p.delta}°</td>
                <td className="text-right">{p.n}</td>
                <td className="text-right">{num(p.q, 3)}</td>
                <td className="text-right">{num(p.c, 3)}</td>
                <td className="text-right">{num(-Math.cos((p.delta * Math.PI) / 180), 3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
