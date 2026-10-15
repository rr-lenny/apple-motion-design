import { LAYOUT, VIDEO } from '../../theme';
import { SCENE } from './scene';

/**
 * Mise en page commune aux deux moitiés. Chaque moitié fait 960 px de haut, mais son contenu
 * tient dans une bande de 710 px collée à la ligne centrale, pour rester dans les marges de
 * sécurité (12 % en haut et en bas). Coordonnées « bande » : x 0..1080, y 0..710.
 */
export const SPLIT_Y = VIDEO.height / 2;

export const BAND = {
  height: 710,
  /** Origine (y écran) de la bande du haut et de celle du bas. */
  topY: LAYOUT.safeY, // 230
  bottomY: SPLIT_Y + 20, // 980
} as const;

/** Écran-canvas (la « création ») : élément central de chaque moitié. */
export const CANVAS = { cx: 650, cy: 360, w: 340, h: 226, pad: 22 } as const;

/** Bureau vu de 3/4 : bord arrière, bord avant, pieds. */
export const DESK = {
  backY: 500,
  frontY: 540,
  backX: [410, 905] as const,
  frontX: [335, 935] as const,
  legBottom: 655,
} as const;

/** Tablette graphique posée sur le bureau (quadrilatère : arrière-gauche, arrière-droit, avant-droit, avant-gauche). */
export const TABLET = [
  [468, 507],
  [592, 507],
  [604, 531],
  [458, 531],
] as const;

/** Silhouette assise, vue de 3/4 dos, tournée vers l'écran. */
export const FIGURE = {
  head: { cx: 300, cy: 334, rx: 30, ry: 35 },
  /** Épaule du bras qui dessine. */
  shoulder: [357, 404] as const,
  upperArm: 92,
  forearm: 104,
} as const;

/** Grille de vignettes du Faiseur, en haut de sa bande. */
export const GRID = (() => {
  const rows = 3;
  const cols = Math.ceil(SCENE.pieces / rows);
  const gap = 10;
  const w = Math.min(66, (VIDEO.width - 2 * LAYOUT.safeX - 120 - (cols - 1) * gap) / cols);
  const h = w * (CANVAS.h / CANVAS.w);
  const total = cols * w + (cols - 1) * gap;
  const x0 = (VIDEO.width - total) / 2;
  const y0 = 58; // la ligne au-dessus est réservée aux légendes optionnelles
  const slot = (i: number) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    return { x: x0 + c * (w + gap), y: y0 + r * (h + gap), w, h };
  };
  return { rows, cols, w, h, gap, x0, y0, slot, bottom: y0 + rows * (h + gap) - gap };
})();

/** Compteur « PUBLIÉ : N », en bas à gauche de chaque bande (hors de l'axe du chrono). */
export const COUNTER = { x: LAYOUT.safeX, y: 680, size: 28 } as const;

/** Légendes optionnelles, en haut à gauche de chaque bande. */
export const LABEL = { x: LAYOUT.safeX, y: 34, size: 22 } as const;

/** Centres des pensées autour de la tête (slots), bulles entières dans les marges. */
export const THOUGHT_SLOTS: ReadonlyArray<readonly [number, number]> = [
  [214, 192],
  [300, 142],
  [410, 236],
  [176, 292],
  [418, 300],
];
