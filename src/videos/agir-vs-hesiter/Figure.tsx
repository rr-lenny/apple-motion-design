import React from 'react';
import { TintGlow } from '../../components/Glow';
import { Pt } from '../../lib/geometry';
import { clamp01, lerp } from '../../lib/motion';
import { COLORS, STROKE } from '../../theme';
import { DESK, FIGURE, TABLET } from './layout';

/**
 * Poste de travail + silhouette filaire (homme assis de 3/4 dos), en coordonnées « bande ».
 * Identique dans les deux moitiés : seuls l'état (couleurs, curseur, tête) changent.
 */

/** Pointe du stylet sur la tablette pour une position (u, v) du curseur à l'écran. */
export const tabletPoint = (u: number, v: number): Pt => {
  const [bl, br, fr, fl] = TABLET;
  const back: Pt = [lerp(bl[0], br[0], u), lerp(bl[1], br[1], u)];
  const front: Pt = [lerp(fl[0], fr[0], u), lerp(fl[1], fr[1], u)];
  return [lerp(back[0], front[0], v), lerp(back[1], front[1], v)];
};

/** Bras à deux segments (épaule fixe) : position du coude, coude vers le bas. */
const elbowFor = (hand: Pt): Pt => {
  const [sx, sy] = FIGURE.shoulder;
  const l1 = FIGURE.upperArm;
  const l2 = FIGURE.forearm;
  const dx = hand[0] - sx;
  const dy = hand[1] - sy;
  const d = Math.min(l1 + l2 - 1, Math.max(Math.abs(l1 - l2) + 1, Math.hypot(dx, dy)));
  const base = Math.atan2(dy, dx);
  const off = Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d));
  const a = [base + off, base - off].map((ang) => [sx + l1 * Math.cos(ang), sy + l1 * Math.sin(ang)] as Pt);
  return a[0][1] > a[1][1] ? a[0] : a[1];
};

// Tracés fixes (ordre = ordre d'apparition au tracé d'ouverture)
const CHAIR = [
  'M208 560 L200 446 Q200 425 221 425 L236 425 Q255 425 255 446 L259 560',
  'M214 562 L354 562 L346 577 L221 577 Z',
  'M285 577 L285 619 M241 641 L285 619 L331 641 M285 619 L287 646',
];
const LEG =
  'M330 551 L398 547 Q411 549 409 562 L407 635 L433 637 Q438 646 429 649 L389 649 L391 577 L330 577';
const TORSO =
  'M288 372 C262 377 241 391 236 420 L238 482 C240 521 246 545 258 558 L341 558 C348 520 352 470 350 433 C361 410 349 391 322 375 Z';
const HEAD_DETAIL = 'M323 328 Q333 336 325 348'; // oreille : suggère la vue de 3/4 dos
const DESK_PATHS = [
  `M${DESK.backX[0]} ${DESK.backY} L${DESK.backX[1]} ${DESK.backY} L${DESK.frontX[1]} ${DESK.frontY} L${DESK.frontX[0]} ${DESK.frontY} Z`,
  `M${DESK.frontX[0] + 10} ${DESK.frontY} L${DESK.frontX[0] + 10} ${DESK.legBottom} M${DESK.frontX[1] - 10} ${DESK.frontY} L${DESK.frontX[1] - 10} ${DESK.legBottom}`,
];
const TABLET_PATH = `M${TABLET.map((p) => p.join(' ')).join(' L')} Z`;
const STAND = 'M650 473 L650 500 M612 503 L688 503';

export type FigureState = {
  /** Tracé d'ouverture 0 -> 1. */
  trace: number;
  /** Couleur du contour (blanc, puis gris pour le Perfectionniste). */
  line: string;
  /** Couleur et intensité du halo. */
  glow: string;
  intensity: number;
  /** Position du curseur dans le canvas (u, v) et appui du stylet (0 = levé, 1 = posé). */
  cursor: Pt;
  press: number;
  /** Inclinaison de la tête vers le bas (0 -> 1). */
  headDrop: number;
};

const Traced: React.FC<{ d: string; p: number; stroke: string; fill?: string; width?: number }> = ({
  d,
  p,
  stroke,
  fill = 'none',
  width = STROKE.main,
}) =>
  p <= 0.001 ? null : (
    <path
      d={d}
      pathLength={1}
      strokeDasharray="1 1"
      strokeDashoffset={1 - p}
      stroke={stroke}
      strokeWidth={width}
      fill={fill}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );

/** Décale une polyligne de `d` px sur sa normale (contour d'un membre). */
const offsetLine = (pts: Pt[], d: number): Pt[] =>
  pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [p[0] - ((b[1] - a[1]) / len) * d, p[1] + ((b[0] - a[0]) / len) * d] as Pt;
  });

const poly = (pts: Pt[]) => 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L');

export const Workstation: React.FC<{ id: string; s: FigureState }> = ({ id, s }) => {
  // tracé d'ouverture : la tête et le buste d'abord, puis le bras, la chaise, le bureau
  const part = (i: number, n = 9) => clamp01((s.trace * (n + 2) - i) / 3);

  // stylet : la pointe suit le curseur, levée quand il n'appuie pas
  const tip = tabletPoint(s.cursor[0], s.cursor[1]);
  const lift = (1 - s.press) * 12;
  const penTip: Pt = [tip[0] - lift * 0.3, tip[1] - lift];
  const hand: Pt = [penTip[0] - 9, penTip[1] - 15];
  const elbow = elbowFor(hand);
  const shoulder: Pt = [FIGURE.shoulder[0], FIGURE.shoulder[1]];
  const arm: Pt[] = [shoulder, elbow, hand];
  const armP = part(2);
  const { cx, cy, rx, ry } = FIGURE.head;
  const headRot = -8 + 4 * s.headDrop;
  const headDy = 9 * s.headDrop;

  /** Le même dessin sert deux fois : net (avec remplissages qui masquent l'arrière) et halo (traits seuls). */
  const draw = (halo: boolean) => {
    const fill = !halo && part(1) > 0.6 ? COLORS.bg : 'none';
    return (
      <>
        {DESK_PATHS.map((d, i) => (
          <Traced key={`d${i}`} d={d} p={part(6 + i)} stroke={s.line} width={i ? STROKE.thin : STROKE.main} />
        ))}
        <Traced d={TABLET_PATH} p={part(7)} stroke={s.line} width={STROKE.thin} />
        <Traced d={STAND} p={part(8)} stroke={s.line} />
        {CHAIR.map((d, i) => (
          <Traced key={`c${i}`} d={d} p={part(4 + i * 0.6)} stroke={s.line} fill={i === 1 ? fill : 'none'} />
        ))}
        <Traced d={LEG} p={part(3)} stroke={s.line} fill={fill} />
        <Traced d={TORSO} p={part(1)} stroke={s.line} fill={fill} />
        <g transform={`translate(0 ${headDy}) rotate(${headRot} ${cx} ${cy + ry})`}>
          <Traced d={`M${cx} ${cy - ry} A${rx} ${ry} 0 1 1 ${cx - 0.01} ${cy - ry} Z`} p={part(0)} stroke={s.line} fill={fill} />
          <Traced d={HEAD_DETAIL} p={part(1)} stroke={s.line} width={STROKE.thin} />
        </g>
        {armP > 0.001 && (
          <g opacity={armP}>
            {halo ? (
              // halo du bras : ses deux contours seulement
              <>
                <path d={poly(offsetLine(arm, 9.5))} stroke={s.line} strokeWidth={STROKE.main} fill="none" />
                <path d={poly(offsetLine(arm, -9.5))} stroke={s.line} strokeWidth={STROKE.main} fill="none" />
              </>
            ) : (
              // bras net : trait épais clair recouvert d'un trait sombre = contour qui masque l'arrière
              <>
                <path d={poly(arm)} stroke={s.line} strokeWidth={21} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <path d={poly(arm)} stroke={COLORS.bg} strokeWidth={16} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </>
            )}
            <line x1={penTip[0]} y1={penTip[1]} x2={penTip[0] - 16} y2={penTip[1] - 30} stroke={s.line} strokeWidth={STROKE.main} strokeLinecap="round" />
          </g>
        )}
      </>
    );
  };

  return (
    <TintGlow id={id} color={s.glow} intensity={s.intensity} halo={draw(true)}>
      {draw(false)}
    </TintGlow>
  );
};
