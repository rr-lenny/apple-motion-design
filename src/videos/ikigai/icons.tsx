import React from 'react';
import { polar } from '../../lib/geometry';

/**
 * Pictogrammes « line art », centrés sur (0, 0), ~56 px.
 * Tous les tracés utilisent pathLength=1 : le tracé progressif se pilote avec `progress` (0-1).
 */

const star = (() => {
  const pts = Array.from({ length: 10 }, (_, i) => polar(0, 2, i % 2 ? 12 : 29, -90 + i * 36));
  return 'M' + pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(' L') + ' Z';
})();

const euro = (() => {
  const [x0, y0] = polar(3, 0, 13, -48);
  const [x1, y1] = polar(3, 0, 13, 48);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A13 13 0 1 0 ${x1.toFixed(2)} ${y1.toFixed(2)} M-15 -4 L4 -4 M-15 4 L4 4`;
})();

export const ICON_PATHS = {
  heart:
    'M0 22 C-10 14 -28 3 -28 -10 C-28 -20 -21 -26 -14 -26 C-7 -26 -2 -21 0 -16 C2 -21 7 -26 14 -26 C21 -26 28 -20 28 -10 C28 3 10 14 0 22 Z',
  star,
  globe: 'M0 -27 A27 27 0 1 1 0 27 A27 27 0 1 1 0 -27 M0 -27 A11 27 0 1 0 0 27 A11 27 0 1 0 0 -27 M-27 0 L27 0',
  coin: `M0 -27 A27 27 0 1 1 0 27 A27 27 0 1 1 0 -27 ${euro}`,
  check: 'M-19 1 L-6 13 L19 -13',
} as const;

export type IconName = keyof typeof ICON_PATHS;

export const TracedPath: React.FC<{
  d: string;
  progress: number;
  stroke: string;
  strokeWidth: number;
  transform?: string;
}> = ({ d, progress, stroke, strokeWidth, transform }) =>
  progress <= 0.001 ? null : (
    <path
      d={d}
      pathLength={1}
      strokeDasharray="1 1"
      strokeDashoffset={1 - progress}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      transform={transform}
    />
  );
