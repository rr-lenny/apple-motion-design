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

/**
 * Bloom teinté : le trait garde sa couleur (ex. contour blanc) mais ses halos prennent
 * `color` (ex. glow bleu). `id` doit être unique dans le <svg>.
 */
export const TintGlow: React.FC<{
  id: string;
  color: string;
  intensity?: number;
  opacity?: number;
  /** Ce qui rayonne, si différent du contenu (ex. les traits seuls, sans les remplissages). */
  halo?: React.ReactNode;
  children: React.ReactNode;
}> = ({ id, color, intensity = GLOW.on, opacity = 1, halo, children }) => {
  const near = Math.min(1, GLOW.near.opacity * intensity);
  const wide = Math.min(1, GLOW.wide.opacity * intensity);
  if (opacity <= 0.001) return null;
  const layer = (name: string, blur: number, gain: number) => (
    <filter id={`${id}-${name}`} filterUnits="userSpaceOnUse" {...REGION} colorInterpolationFilters="sRGB">
      <feGaussianBlur in="SourceAlpha" stdDeviation={blur} result="b" />
      <feFlood floodColor={color} result="c" />
      <feComposite in="c" in2="b" operator="in" result="t" />
      <feComponentTransfer in="t">
        <feFuncA type="linear" slope={gain} />
      </feComponentTransfer>
    </filter>
  );
  return (
    <g opacity={opacity}>
      <defs>
        {layer('wide', GLOW.wide.blur, GLOW.wideGain)}
        {layer('near', GLOW.near.blur, GLOW.nearGain)}
      </defs>
      {wide > 0.003 && (
        <g filter={`url(#${id}-wide)`} opacity={wide}>
          {halo ?? children}
        </g>
      )}
      {near > 0.003 && (
        <g filter={`url(#${id}-near)`} opacity={near}>
          {halo ?? children}
        </g>
      )}
      {children}
    </g>
  );
};
