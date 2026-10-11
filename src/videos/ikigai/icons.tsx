import React from 'react';
import { lerp, prog } from '../../lib/motion';
import { COLORS, EASE, STROKE } from '../../theme';

/**
 * Pictogrammes « line art » des 4 piliers, centrés sur (0, 0), ~64 px.
 * Chacun se trace progressivement puis garde une micro-animation qui lui est propre.
 * Les tracés utilisent pathLength=1 : `progress` (0-1) pilote le dessin.
 */

export const TracedPath: React.FC<{
  d: string;
  progress: number;
  stroke: string;
  strokeWidth?: number;
  transform?: string;
  fill?: string;
  opacity?: number;
}> = ({ d, progress, stroke, strokeWidth = STROKE.main, transform, fill = 'none', opacity = 1 }) =>
  progress <= 0.001 ? null : (
    <path
      d={d}
      pathLength={1}
      strokeDasharray="1 1"
      strokeDashoffset={1 - progress}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      transform={transform}
      opacity={opacity}
    />
  );

type IconProps = { t: number; start: number; color: string };

/** Passion : flamme double, la flamme intérieure vacille. */
const Flame: React.FC<IconProps> = ({ t, start, color }) => {
  const outer = prog(t, start, start + 0.55, EASE.out);
  const inner = prog(t, start + 0.25, start + 0.7, EASE.out);
  const flicker = 1 + 0.06 * Math.sin((t - start) * 11) * inner;
  return (
    <g transform="translate(0 -2)">
      <TracedPath
        d="M2 -32 C 6 -20 22 -12 22 6 C 22 21 12 31 0 31 C -12 31 -22 21 -22 7 C -22 -5 -14 -13 -9 -19 C -8 -11 -5 -6 -1 -4 C -3 -14 -2 -24 2 -32 Z"
        progress={outer}
        stroke={color}
      />
      <g transform={`translate(0 27) scale(1 ${flicker}) translate(0 -27)`}>
        <TracedPath
          d="M0 3 C 4 9 9 13 9 19 C 9 24 5 27 0 27 C -5 27 -9 24 -9 19 C -9 13 -4 9 0 3 Z"
          progress={inner}
          stroke={color}
        />
      </g>
    </g>
  );
};

/** Talent : plume de vectorisation (l'outil « plume » des designers) qui trace une courbe. */
const Pen: React.FC<IconProps> = ({ t, start, color }) => {
  const body = prog(t, start, start + 0.5, EASE.out);
  const details = prog(t, start + 0.2, start + 0.6, EASE.out);
  const curve = prog(t, start + 0.45, start + 0.95, EASE.inOut);
  const anchor = prog(t, start + 0.85, start + 1.05, EASE.overshoot);
  return (
    <g transform="translate(-6 -6) rotate(-18)">
      <TracedPath
        d="M0 31 L-16 7 C -18 3 -17 -2 -14 -6 L-10 -14 L10 -14 L14 -6 C 17 -2 18 3 16 7 Z"
        progress={body}
        stroke={color}
      />
      <TracedPath d="M-10 -14 L-10 -24 L10 -24 L10 -14" progress={details} stroke={color} />
      <TracedPath d="M0 31 L0 7" progress={details} stroke={color} />
      {details > 0.01 && <circle cy={2} r={4 * details} fill="none" stroke={color} strokeWidth={STROKE.main} />}
      {/* la courbe qu'elle dessine, avec son point d'ancrage */}
      <TracedPath d="M0 31 C 8 44 26 44 34 34" progress={curve} stroke={color} strokeWidth={STROKE.thin} />
      {anchor > 0.01 && (
        <rect
          x={34 - 3.5 * anchor}
          y={34 - 3.5 * anchor}
          width={7 * anchor}
          height={7 * anchor}
          fill={COLORS.bg}
          stroke={color}
          strokeWidth={STROKE.thin}
        />
      )}
    </g>
  );
};

/** Utilité (le monde) : planète et satellite en orbite. */
const Orbit: React.FC<IconProps> = ({ t, start, color }) => {
  const planet = prog(t, start, start + 0.45, EASE.out);
  const ring = prog(t, start + 0.2, start + 0.7, EASE.out);
  const sat = prog(t, start + 0.55, start + 0.8, EASE.out);
  const theta = 1.2 + ((t - start) * 2 * Math.PI) / 2.4;
  const sx = 31 * Math.cos(theta);
  const sy = 11 * Math.sin(theta);
  const behind = Math.sin(theta) < 0;
  const satellite = sat > 0.01 && <circle cx={sx} cy={sy} r={3.4 * sat} fill={color} opacity={behind ? 0.45 : 1} />;
  return (
    <g>
      <g transform="rotate(-22)">
        <TracedPath d="M-31 0 A31 11 0 0 1 31 0" progress={ring} stroke={color} opacity={0.55} />
        {behind && satellite}
      </g>
      <TracedPath
        d="M0 -16 A16 16 0 1 1 0 16 A16 16 0 1 1 0 -16"
        progress={planet}
        stroke={color}
        fill={planet > 0.98 ? COLORS.bg : 'none'}
      />
      <TracedPath
        d="M-9 -6 A12 12 0 0 1 6 -11"
        progress={planet}
        stroke={color}
        strokeWidth={STROKE.thin}
        opacity={0.6}
      />
      <g transform="rotate(-22)">
        <TracedPath d="M31 0 A31 11 0 0 1 -31 0" progress={ring} stroke={color} />
        {!behind && satellite}
      </g>
    </g>
  );
};

/** Revenu : pile de pièces qui tombent une à une (isométrique). */
const Coins: React.FC<IconProps> = ({ t, start, color }) => (
  <g transform="translate(0 -9)">
    {[0, 1, 2].map((k) => {
      const k0 = start + k * 0.12;
      const fall = prog(t, k0, k0 + 0.32, EASE.overshoot);
      if (fall <= 0) return null;
      const y = 16 - k * 9 - lerp(26, 0, fall);
      const rx = 17;
      const ry = 6;
      const h = 6;
      return (
        <g key={k} opacity={prog(t, k0, k0 + 0.12)}>
          <path
            d={`M${-rx} ${y} L${-rx} ${y + h} A${rx} ${ry} 0 0 0 ${rx} ${y + h} L${rx} ${y} A${rx} ${ry} 0 0 0 ${-rx} ${y} Z`}
            fill={COLORS.bg}
            stroke={color}
            strokeWidth={STROKE.main}
            strokeLinejoin="round"
          />
          <path d={`M${-rx} ${y} A${rx} ${ry} 0 0 0 ${rx} ${y}`} fill="none" stroke={color} strokeWidth={STROKE.main} />
          {k === 2 && (
            <ellipse cx={0} cy={y} rx={9} ry={3} fill="none" stroke={color} strokeWidth={STROKE.thin} opacity={0.7} />
          )}
        </g>
      );
    })}
  </g>
);

export const PILLAR_ICONS = { flame: Flame, pen: Pen, orbit: Orbit, coins: Coins } as const;
export type PillarIconName = keyof typeof PILLAR_ICONS;

export const CHECK_PATH = 'M-19 1 L-6 13 L19 -13';
