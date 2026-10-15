import { Pt } from '../../lib/geometry';
import { seeded } from '../../lib/motion';
import type { ArtworkKind } from './scene';

/**
 * « Objets créés » : chaque pièce est une liste de traits (polylignes) en coordonnées
 * normalisées u, v ∈ [0, 1] dans la zone utile du canvas. Le même tracé sert au canvas,
 * aux vignettes et à la position du curseur pendant le dessin.
 */
export type Stroke = Pt[];
export type Artwork = Stroke[];

/** Rapport largeur / hauteur de la zone utile du canvas (pour des cercles ronds). */
const ASPECT = 296 / 182;

const circle = (cu: number, cv: number, r: number, from = -90, sweep = 360, n = 28): Stroke =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = ((from + (sweep * i) / n) * Math.PI) / 180;
    return [cu + (r / ASPECT) * Math.cos(a), cv + r * Math.sin(a)] as Pt;
  });

const line = (...pts: Array<[number, number]>): Stroke => pts.map(([u, v]) => [u, v] as Pt);

/** Courbe de Bézier quadratique échantillonnée. */
const quad = (a: [number, number], c: [number, number], b: [number, number], n = 14): Stroke =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return [
      (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t ** 2 * b[0],
      (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t ** 2 * b[1],
    ] as Pt;
  });

/* ---------------------------------------------------------------- croquis */

const SKETCHES: Array<() => Artwork> = [
  // montagnes et soleil
  () => [line([0.04, 0.88], [0.3, 0.36], [0.45, 0.6], [0.63, 0.24], [0.96, 0.88]), circle(0.84, 0.26, 0.11)],
  // maison
  () => [
    line([0.3, 0.9], [0.3, 0.48], [0.7, 0.48], [0.7, 0.9]),
    line([0.24, 0.52], [0.5, 0.14], [0.76, 0.52]),
    line([0.45, 0.9], [0.45, 0.68], [0.55, 0.68], [0.55, 0.9]),
  ],
  // arbre
  () => [line([0.5, 0.92], [0.5, 0.55]), circle(0.5, 0.36, 0.25, 100, 340, 32), line([0.5, 0.7], [0.62, 0.58])],
  // visage
  () => [circle(0.5, 0.5, 0.4), circle(0.41, 0.42, 0.04), circle(0.59, 0.42, 0.04), quad([0.38, 0.62], [0.5, 0.75], [0.62, 0.62])],
  // tasse fumante
  () => [
    line([0.32, 0.45], [0.36, 0.88], [0.62, 0.88], [0.66, 0.45], [0.32, 0.45]),
    quad([0.66, 0.55], [0.8, 0.62], [0.65, 0.76]),
    quad([0.44, 0.36], [0.4, 0.24], [0.46, 0.12]),
    quad([0.54, 0.36], [0.5, 0.24], [0.56, 0.12]),
  ],
  // ampoule
  () => [circle(0.5, 0.4, 0.27, 140, 260, 26), line([0.43, 0.66], [0.43, 0.8], [0.57, 0.8], [0.57, 0.66]), line([0.45, 0.88], [0.55, 0.88])],
  // vague et bateau
  () => [
    line([0.05, 0.75], [0.2, 0.68], [0.35, 0.75], [0.5, 0.68], [0.65, 0.75], [0.8, 0.68], [0.95, 0.75]),
    line([0.38, 0.6], [0.62, 0.6], [0.56, 0.68], [0.44, 0.68], [0.38, 0.6]),
    line([0.5, 0.6], [0.5, 0.2], [0.66, 0.52], [0.5, 0.52]),
  ],
  // étoile
  () => [line(...Array.from({ length: 11 }, (_, i) => {
    const a = ((-90 + i * 144) * Math.PI) / 180;
    return [0.5 + (0.38 / ASPECT) * Math.cos(a), 0.52 + 0.38 * Math.sin(a)] as [number, number];
  }))],
];

/* ---------------------------------------------------------------- autres objets */

const LOGOS: Array<() => Artwork> = [
  () => [circle(0.5, 0.5, 0.34), line([0.5, 0.22], [0.75 - 0.07, 0.7], [0.32, 0.7], [0.5, 0.22])],
  () => [line(...Array.from({ length: 7 }, (_, i) => {
    const a = ((30 + i * 60) * Math.PI) / 180;
    return [0.5 + (0.36 / ASPECT) * Math.cos(a), 0.5 + 0.36 * Math.sin(a)] as [number, number];
  })), circle(0.5, 0.5, 0.12)],
  () => [circle(0.42, 0.5, 0.26), circle(0.58, 0.5, 0.26)],
  () => [line([0.3, 0.78], [0.3, 0.22], [0.5, 0.55], [0.7, 0.22], [0.7, 0.78])],
];

const music = (seed: number): Artwork => {
  const rand = seeded(seed);
  const staff = [0.3, 0.4, 0.5, 0.6, 0.7].map((v) => line([0.05, v], [0.95, v]));
  const notes: Artwork = [];
  for (let i = 0; i < 6; i++) {
    const u = 0.14 + i * 0.14;
    const v = 0.32 + Math.round(rand() * 7) * 0.05;
    notes.push(circle(u, v, 0.035, 0, 360, 10), line([u + 0.03 / ASPECT * 1.1, v], [u + 0.03 / ASPECT * 1.1, v - 0.22]));
  }
  return [...staff, ...notes];
};

const textBlock = (seed: number): Artwork => {
  const rand = seeded(seed);
  const out: Artwork = [line([0.08, 0.16], [0.08 + 0.45 + rand() * 0.2, 0.16])];
  for (let i = 0; i < 6; i++) {
    const v = 0.34 + i * 0.1;
    out.push(line([0.08, v], [0.08 + (i === 5 ? 0.4 : 0.72 + rand() * 0.18), v]));
  }
  return out;
};

const codeBlock = (seed: number): Artwork => {
  const rand = seeded(seed);
  const indents = [0, 1, 2, 2, 1, 2, 1, 0];
  return indents.map((ind, i) => {
    const v = 0.12 + i * 0.105;
    const u0 = 0.08 + ind * 0.07;
    return line([u0, v], [u0 + 0.15 + rand() * 0.45, v]);
  });
};

/* ---------------------------------------------------------------- rugosité */

/** Ajoute un tremblé de main (bruit lissé) : `rough` 0 = trait net, 1 = trait brut. */
const roughen = (art: Artwork, rough: number, seed: number): Artwork => {
  const rand = seeded(seed);
  const amp = 0.003 + rough * 0.016;
  return art.map((stroke) => {
    // densifie pour que le tremblé suive le trait
    const dense: Pt[] = [];
    for (let i = 0; i < stroke.length - 1; i++) {
      const [a, b] = [stroke[i], stroke[i + 1]];
      const n = Math.max(1, Math.ceil(Math.hypot((b[0] - a[0]) * ASPECT, b[1] - a[1]) / 0.03));
      for (let k = 0; k < n; k++) dense.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
    }
    dense.push(stroke[stroke.length - 1]);
    let nu = 0;
    let nv = 0;
    return dense.map(([u, v]) => {
      nu = nu * 0.7 + (rand() - 0.5) * 0.6;
      nv = nv * 0.7 + (rand() - 0.5) * 0.6;
      return [u + (nu * amp) / ASPECT, v + nv * amp] as Pt;
    });
  });
};

/** La pièce n° index du Faiseur. */
export const pieceArtwork = (kind: ArtworkKind, index: number, rough: number): Artwork => {
  const base =
    kind === 'croquis'
      ? SKETCHES[index % SKETCHES.length]()
      : kind === 'logo'
        ? LOGOS[index % LOGOS.length]()
        : kind === 'morceau'
          ? music(index + 1)
          : kind === 'texte'
            ? textBlock(index + 1)
            : codeBlock(index + 1);
  return roughen(base, rough, 1000 + index * 17);
};

/**
 * Le trait du Perfectionniste : toujours le même début de pièce, légèrement décalé à
 * chaque tentative.
 */
export const hesitantStroke = (kind: ArtworkKind, attempt: number): Stroke => {
  const first = pieceArtwork(kind, 0, 0)[0];
  const du = 0.012 * attempt;
  const dv = -0.018 * attempt;
  return first.map(([u, v]) => [u + du, v + dv] as Pt);
};

/* ---------------------------------------------------------------- tracé progressif */

const strokeLen = (s: Stroke) => s.reduce((acc, p, i) => (i ? acc + Math.hypot((p[0] - s[i - 1][0]) * ASPECT, p[1] - s[i - 1][1]) : 0), 0);

/**
 * Portion dessinée d'une œuvre pour une progression p ∈ [0, 1] (longueur cumulée),
 * et position de la pointe (là où se trouve le curseur).
 */
export const partialArtwork = (art: Artwork, p: number): { strokes: Artwork; tip: Pt | null } => {
  const lens = art.map(strokeLen);
  const total = lens.reduce((a, b) => a + b, 0);
  let left = Math.max(0, Math.min(1, p)) * total;
  const strokes: Artwork = [];
  let tip: Pt | null = null;
  for (let i = 0; i < art.length && left > 0; i++) {
    const s = art[i];
    if (left >= lens[i]) {
      strokes.push(s);
      left -= lens[i];
      tip = s[s.length - 1];
      continue;
    }
    const part: Pt[] = [s[0]];
    for (let k = 1; k < s.length; k++) {
      const seg = Math.hypot((s[k][0] - s[k - 1][0]) * ASPECT, s[k][1] - s[k - 1][1]);
      if (left >= seg) {
        part.push(s[k]);
        left -= seg;
      } else {
        const r = seg ? left / seg : 0;
        const q: Pt = [s[k - 1][0] + (s[k][0] - s[k - 1][0]) * r, s[k - 1][1] + (s[k][1] - s[k - 1][1]) * r];
        part.push(q);
        left = 0;
        break;
      }
    }
    strokes.push(part);
    tip = part[part.length - 1];
  }
  return { strokes, tip };
};

/** Polyline SVG d'un trait projeté dans un rectangle. */
export const strokePath = (s: Stroke, x: number, y: number, w: number, h: number) =>
  s.length < 2 ? '' : 'M' + s.map(([u, v]) => `${(x + u * w).toFixed(1)} ${(y + v * h).toFixed(1)}`).join(' L');
