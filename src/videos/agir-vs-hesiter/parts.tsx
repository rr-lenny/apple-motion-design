import React from 'react';
import { TintGlow } from '../../components/Glow';
import { lerp, prog } from '../../lib/motion';
import { COLORS, EASE, FONT, STROKE } from '../../theme';
import { Artwork, strokePath } from './artworks';
import { CANVAS, COUNTER } from './layout';
import { SCENE } from './scene';

export type Rect = { x: number; y: number; w: number; h: number };

export const CANVAS_RECT: Rect = { x: CANVAS.cx - CANVAS.w / 2, y: CANVAS.cy - CANVAS.h / 2, w: CANVAS.w, h: CANVAS.h };

export const lerpRect = (a: Rect, b: Rect, k: number): Rect => ({
  x: lerp(a.x, b.x, k),
  y: lerp(a.y, b.y, k),
  w: lerp(a.w, b.w, k),
  h: lerp(a.h, b.h, k),
});

/** Zone utile (où l'on dessine) d'un cadre, proportionnelle à sa taille. */
export const innerRect = (r: Rect): Rect => {
  const p = CANVAS.pad * (r.w / CANVAS.w);
  return { x: r.x + p, y: r.y + p, w: r.w - 2 * p, h: r.h - 2 * p };
};

/** Cadre-canvas : contour, lueur d'écran allumé et traits de l'œuvre. */
export const CanvasFrame: React.FC<{
  id: string;
  rect: Rect;
  line: string;
  glow: string;
  intensity: number;
  /** Luminosité de l'écran (0 éteint, 1 allumé). */
  light: number;
  art?: Artwork;
  artColor?: string;
  opacity?: number;
}> = ({ id, rect, line, glow, intensity, light, art, artColor = COLORS.white, opacity = 1 }) => {
  const k = rect.w / CANVAS.w;
  const inner = innerRect(rect);
  const radius = 7 * k;
  const shapes = (halo: boolean) => (
    <>
      {!halo && light > 0.01 && (
        <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx={radius} fill={glow} opacity={0.07 * light} stroke="none" />
      )}
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.w}
        height={rect.h}
        rx={radius}
        fill="none"
        stroke={line}
        strokeWidth={STROKE.main * Math.max(0.6, k)}
      />
      {art?.map((s, i) => (
        <path
          key={i}
          d={strokePath(s, inner.x, inner.y, inner.w, inner.h)}
          stroke={artColor}
          strokeWidth={STROKE.main * Math.max(0.55, k)}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </>
  );
  return (
    <TintGlow id={id} color={glow} intensity={intensity} opacity={opacity} halo={shapes(true)}>
      {shapes(false)}
    </TintGlow>
  );
};

/** Coche de validation, qui apparaît avec un ressort. */
export const CheckMark: React.FC<{ x: number; y: number; k: number; opacity: number; color?: string }> = ({
  x,
  y,
  k,
  opacity,
  color = COLORS.green,
}) =>
  k <= 0.01 || opacity <= 0.01 ? null : (
    <TintGlow id={`check-${Math.round(x)}-${Math.round(y)}`} color={color} intensity={1.3} opacity={opacity}>
      <g transform={`translate(${x} ${y}) scale(${k})`}>
        <circle r={17} fill={COLORS.bg} stroke={color} strokeWidth={STROKE.main} />
        <path d="M-8 0 L-2.5 6 L8.5 -6" stroke={color} strokeWidth={STROKE.bold} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </TintGlow>
  );

/** Compteur « PUBLIÉ : N » (micro-texte, chiffres à chasse fixe) ; le chiffre roule quand il change. */
export const Counter: React.FC<{
  t: number;
  value: number;
  /** Instant du dernier changement de valeur (pour l'animation), -1 si aucun. */
  changedAt: number;
  /** Durée du roulement (plus courte quand les valeurs s'enchaînent vite). */
  rollSec?: number;
  opacity: number;
  numberColor?: string;
}> = ({ t, value, changedAt, rollSec = 0.28, opacity, numberColor = COLORS.white }) => {
  if (opacity <= 0.01) return null;
  const k = changedAt < 0 ? 1 : prog(t, changedAt, changedAt + rollSec, EASE.out);
  const style = {
    fontFamily: FONT.family,
    fontWeight: FONT.weight,
    fontSize: COUNTER.size,
    letterSpacing: FONT.microTracking,
    fontVariantNumeric: 'tabular-nums',
  } as const;
  // le libellé finit en x = labelEnd, le chiffre commence juste après
  const labelEnd = COUNTER.x + 236;
  const y = COUNTER.y;
  const clip = `counter-clip-${Math.round(y)}`;
  return (
    <g opacity={opacity} style={{ filter: 'drop-shadow(0 0 5px rgba(242,242,242,0.3))' }}>
      <text x={labelEnd} y={y} textAnchor="end" fill={COLORS.white} opacity={0.8} {...style}>
        {`${SCENE.texts.counter}\u00A0:\u00A0`}
      </text>
      <clipPath id={clip}>
        <rect x={labelEnd - 4} y={y - 26} width={110} height={32} />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        {k < 1 && value > 0 && (
          <text x={labelEnd} y={y - 30 * k} fill={numberColor} opacity={1 - k} {...style}>
            {value - 1}
          </text>
        )}
        <text x={labelEnd} y={y + 30 * (1 - k)} fill={numberColor} opacity={k} {...style}>
          {value}
        </text>
      </g>
    </g>
  );
};
