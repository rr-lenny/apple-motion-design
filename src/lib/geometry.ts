export type Pt = readonly [number, number];

export const deg = (a: number) => (a * Math.PI) / 180;

export const polar = (cx: number, cy: number, r: number, angleDeg: number): Pt => [
  cx + r * Math.cos(deg(angleDeg)),
  cy + r * Math.sin(deg(angleDeg)),
];

export const toPath = (pts: ReadonlyArray<Pt>, closed = false) =>
  pts.length === 0
    ? ''
    : 'M' + pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(' L') + (closed ? ' Z' : '');

/**
 * Arc de cercle vu en perspective : le cercle (cx, cy, r) est incliné autour de l'axe X
 * de `tiltDeg` (0 = face caméra, 90 = vu par la tranche).
 */
export const tiltedArc = (
  cx: number,
  cy: number,
  r: number,
  fromDeg: number,
  toDeg: number,
  tiltDeg = 0,
  steps = 160,
): Pt[] => {
  const k = Math.cos(deg(tiltDeg));
  const n = Math.max(2, Math.ceil((steps * Math.abs(toDeg - fromDeg)) / 360));
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = deg(fromDeg + ((toDeg - fromDeg) * i) / n);
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a) * k]);
  }
  return pts;
};

/** Ré-échantillonne une polyligne fermée en n points équidistants (pour les morphings). */
export const resample = (pts: ReadonlyArray<Pt>, n: number): Pt[] => {
  const ring = [...pts, pts[0]];
  const seg: number[] = [];
  let total = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const l = Math.hypot(ring[i + 1][0] - ring[i][0], ring[i + 1][1] - ring[i][1]);
    seg.push(l);
    total += l;
  }
  const out: Pt[] = [];
  let i = 0;
  let acc = 0;
  for (let k = 0; k < n; k++) {
    const target = (total * k) / n;
    while (i < seg.length - 1 && acc + seg[i] < target) {
      acc += seg[i];
      i++;
    }
    const u = seg[i] === 0 ? 0 : (target - acc) / seg[i];
    out.push([ring[i][0] + (ring[i + 1][0] - ring[i][0]) * u, ring[i][1] + (ring[i + 1][1] - ring[i][1]) * u]);
  }
  return out;
};

export const morph = (a: ReadonlyArray<Pt>, b: ReadonlyArray<Pt>, k: number): Pt[] =>
  a.map(([x, y], i) => [x + (b[i][0] - x) * k, y + (b[i][1] - y) * k] as Pt);

/** Cercle échantillonné, départ en haut, sens horaire. */
export const circlePts = (cx: number, cy: number, r: number, n: number): Pt[] =>
  Array.from({ length: n }, (_, i) => polar(cx, cy, r, -90 + (360 * i) / n));

/** Arc arrondi (quart de cercle) échantillonné entre deux angles. */
const arcPts = (cx: number, cy: number, r: number, a0: number, a1: number, steps = 10): Pt[] =>
  Array.from({ length: steps + 1 }, (_, i) => polar(cx, cy, r, a0 + ((a1 - a0) * i) / steps));

/**
 * Signet (marque-page) : départ en haut au centre, sens horaire, coins supérieurs arrondis,
 * encoche en V en bas.
 */
export const bookmarkPts = (cx: number, cy: number, w: number, h: number, notch: number, radius = 18): Pt[] => {
  const l = cx - w / 2;
  const r = cx + w / 2;
  const top = cy - h / 2;
  const bottom = cy + h / 2;
  return [
    [cx, top],
    ...arcPts(r - radius, top + radius, radius, -90, 0),
    [r, bottom],
    [cx, bottom - notch],
    [l, bottom],
    ...arcPts(l + radius, top + radius, radius, 180, 270),
  ];
};

/** Cercle échantillonné à partir de l'angle `startDeg`, sens horaire. */
export const circlePtsFrom = (cx: number, cy: number, r: number, n: number, startDeg: number): Pt[] =>
  Array.from({ length: n }, (_, i) => polar(cx, cy, r, startDeg + (360 * i) / n));

/**
 * Échantillonne un chemin SVG simple (commandes absolues M, L, C, Z) en polyligne,
 * puis le ré-échantillonne en n points équidistants (pour les morphings).
 */
export const samplePath = (d: string, n: number, curveSteps = 24): Pt[] => {
  const tokens = d.match(/[MLCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
  const pts: Pt[] = [];
  let i = 0;
  let cmd = '';
  let cur: Pt = [0, 0];
  const num = () => parseFloat(tokens[i++]);
  while (i < tokens.length) {
    if (/[MLCZ]/i.test(tokens[i])) cmd = tokens[i++].toUpperCase();
    if (cmd === 'M' || cmd === 'L') {
      cur = [num(), num()];
      pts.push(cur);
    } else if (cmd === 'C') {
      const p1: Pt = [num(), num()];
      const p2: Pt = [num(), num()];
      const p3: Pt = [num(), num()];
      const p0 = cur;
      for (let k = 1; k <= curveSteps; k++) {
        const u = k / curveSteps;
        const a = (1 - u) ** 3;
        const b = 3 * (1 - u) ** 2 * u;
        const c = 3 * (1 - u) * u ** 2;
        const e = u ** 3;
        pts.push([a * p0[0] + b * p1[0] + c * p2[0] + e * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + e * p3[1]]);
      }
      cur = p3;
    } else if (i < tokens.length && !/[MLCZ]/i.test(tokens[i])) {
      // Z suivi d'un nombre : chemin mal formé, on avance pour ne pas boucler
      i++;
    }
  }
  // supprime le dernier point s'il recouvre le premier (chemin fermé)
  const [fx, fy] = pts[0];
  const [lx, ly] = pts[pts.length - 1];
  if (Math.hypot(fx - lx, fy - ly) < 0.5) pts.pop();
  return resample(pts, n);
};

export const translatePts = (pts: ReadonlyArray<Pt>, dx: number, dy: number): Pt[] =>
  pts.map(([x, y]) => [x + dx, y + dy] as Pt);

/** Homothétie autour d'un point. */
export const scalePts = (pts: ReadonlyArray<Pt>, sx: number, sy: number, ox: number, oy: number): Pt[] =>
  pts.map(([x, y]) => [ox + (x - ox) * sx, oy + (y - oy) * sy] as Pt);

export const centroid = (pts: ReadonlyArray<Pt>): Pt => {
  const s = pts.reduce((acc, [x, y]) => [acc[0] + x, acc[1] + y], [0, 0]);
  return [s[0] / pts.length, s[1] / pts.length];
};
