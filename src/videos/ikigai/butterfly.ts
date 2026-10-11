import { circlePtsFrom, Pt, samplePath, scalePts, centroid, translatePts } from '../../lib/geometry';

/**
 * Papillon « line art » pour la métamorphose finale.
 * Coordonnées relatives au centre du corps ; ailes droites décrites dans le sens horaire,
 * en partant de la racine (contre le corps). Les ailes gauches sont leur miroir.
 */
const UPPER_WING = 'M6 -6 C 16 -66 58 -140 116 -146 C 166 -151 194 -114 184 -78 C 174 -44 126 -18 6 -6 Z';
const LOWER_WING = 'M6 5 C 56 9 120 22 128 62 C 135 100 100 126 72 115 C 44 104 18 56 6 5 Z';

export const WING_SAMPLES = 140;
/** Envergure ~440 px (~41 % de la largeur). */
export const BUTTERFLY_SCALE = 1.15;

const mirror = (pts: Pt[]): Pt[] => {
  const m = pts.map(([x, y]) => [-x, y] as Pt);
  // le miroir inverse le sens de parcours : on le rétablit en gardant la racine en premier
  return [m[0], ...m.slice(1).reverse()];
};

const upperRight = scalePts(samplePath(UPPER_WING, WING_SAMPLES), BUTTERFLY_SCALE, BUTTERFLY_SCALE, 0, 0);
const lowerRight = scalePts(samplePath(LOWER_WING, WING_SAMPLES), BUTTERFLY_SCALE, BUTTERFLY_SCALE, 0, 0);

/**
 * Ailes dans l'ordre des piliers après la rotation de 45° du diagramme :
 * passion -> haut droite, talent -> bas droite, utilité -> bas gauche, revenu -> haut gauche.
 * `toBody` : angle (degrés) qui pointe du centre du cercle vers le corps, pour que le
 * cercle et l'aile démarrent au même endroit (pas de vrille pendant le morphing).
 */
export const WINGS: Array<{ pts: Pt[]; toBody: number }> = [
  { pts: upperRight, toBody: 135 },
  { pts: lowerRight, toBody: 225 },
  { pts: mirror(lowerRight), toBody: 315 },
  { pts: mirror(upperRight), toBody: 45 },
];

/** Contour intérieur (nervure) : l'aile réduite vers son centre. */
export const innerWing = (pts: Pt[], k = 0.6): Pt[] => {
  const [ox, oy] = centroid(pts);
  return scalePts(pts, k, k, ox, oy);
};

export const wingAt = (i: number, cx: number, cy: number): Pt[] => translatePts(WINGS[i].pts, cx, cy);

export const circleForWing = (i: number, cx: number, cy: number, r: number): Pt[] =>
  circlePtsFrom(cx, cy, r, WING_SAMPLES, WINGS[i].toBody);

/** Corps + antennes (tracés à part, à dessiner avec scale(BUTTERFLY_SCALE)). Les antennes
 *  passent entre les ailes supérieures et dépassent au-dessus. */
export const BODY = {
  thorax: 'M0 -36 C 6 -36 6 -20 5 0 C 4 24 3 46 0 58 C -3 46 -4 24 -5 0 C -6 -20 -6 -36 0 -36 Z',
  head: { cy: -45, r: 7 },
  antennaRight: 'M2 -52 C 5 -95 9 -128 24 -160',
  antennaLeft: 'M-2 -52 C -5 -95 -9 -128 -24 -160',
  antennaTips: [
    [24, -160],
    [-24, -160],
  ] as Pt[],
};
