import React from 'react';
import { GLOW, VIDEO } from '../theme';

const REGION = { x: -400, y: -400, width: VIDEO.width + 800, height: VIDEO.height + 800 };

/** Filtres partagés, à placer une fois dans chaque <svg> qui utilise <Glow>. */
export const GlowDefs: React.FC = () => (
  <defs>
    <filter id="glow-near" filterUnits="userSpaceOnUse" {...REGION} colorInterpolationFilters="sRGB">
      <feGaussianBlur stdDeviation={GLOW.near.blur} />
      <feComponentTransfer>
        <feFuncA type="linear" slope={GLOW.nearGain} />
      </feComponentTransfer>
    </filter>
    <filter id="glow-wide" filterUnits="userSpaceOnUse" {...REGION} colorInterpolationFilters="sRGB">
      <feGaussianBlur stdDeviation={GLOW.wide.blur} />
      <feComponentTransfer>
        <feFuncA type="linear" slope={GLOW.wideGain} />
      </feComponentTransfer>
    </filter>
    <filter id="soft-6" filterUnits="userSpaceOnUse" {...REGION}>
      <feGaussianBlur stdDeviation={6} />
    </filter>
    <filter id="soft-14" filterUnits="userSpaceOnUse" {...REGION}>
      <feGaussianBlur stdDeviation={14} />
    </filter>
  </defs>
);

/**
 * Bloom en 3 couches : halo large + halo proche + trait net.
 * `intensity` module les halos (0 = éteint, 1 = allumé, ~1.5 = actif).
 */
export const Glow: React.FC<{
  intensity?: number;
  opacity?: number;
  children: React.ReactNode;
}> = ({ intensity = GLOW.on, opacity = 1, children }) => {
  const near = Math.min(1, GLOW.near.opacity * intensity);
  const wide = Math.min(1, GLOW.wide.opacity * intensity);
  if (opacity <= 0.001) return null;
  return (
    <g opacity={opacity}>
      {wide > 0.003 && (
        <g filter="url(#glow-wide)" opacity={wide}>
          {children}
        </g>
      )}
      {near > 0.003 && (
        <g filter="url(#glow-near)" opacity={near}>
          {children}
        </g>
      )}
      {children}
    </g>
  );
};
