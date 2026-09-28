import { num } from '../../lib/format';
import { energyEV } from '../../physics/hydrogen';

/** Hydrogen energy ladder E_n = −13.6 eV / n² with the selected level highlighted. */
export function EnergyLevels({ n }: { n: number }) {
  const levels = [1, 2, 3, 4, 5, 6];
  const W = 260;
  const H = 150;
  const top = 12;
  const bottom = H - 14;
  const y = (e: number) => top + ((0 - e) / 13.6057) * (bottom - top);
  return (
    <figure className="space-y-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Energy levels of hydrogen; level n = ${n} is highlighted at ${num(energyEV(n))} electronvolts.`}
      >
        <line x1={40} x2={W - 70} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,0.25)" strokeDasharray="3 3" />
        <text x={W - 64} y={y(0) + 4} fontSize="10" fill="rgba(226,232,240,0.6)">
          0 eV (ionized)
        </text>
        {levels.map((k) => {
          const e = energyEV(k);
          const on = k === n;
          return (
            <g key={k}>
              <line
                x1={40}
                x2={W - 70}
                y1={y(e)}
                y2={y(e)}
                stroke={on ? '#22e4ff' : 'rgba(139,92,246,0.7)'}
                strokeWidth={on ? 2.5 : 1.2}
              />
              {k <= 4 && (
                <>
                  <text x={8} y={y(e) + 4} fontSize="11" fill={on ? '#22e4ff' : 'rgba(226,232,240,0.75)'}>
                    n={k}
                  </text>
                  <text x={W - 64} y={y(e) + 4} fontSize="10" fill={on ? '#22e4ff' : 'rgba(226,232,240,0.6)'}>
                    {num(e)} eV
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="text-xs text-slate-400">
        Allowed energies E = −13.6 eV / n². Nothing in between.
      </figcaption>
    </figure>
  );
}
