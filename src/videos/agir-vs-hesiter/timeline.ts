import { SCENE } from './scene';

/**
 * Timing global, partagé par les deux moitiés (mêmes repères, même durée).
 * Les repères sont écrits pour 18 s (cf. STORYBOARD.md) puis mis à l'échelle de SCENE.durationSec.
 */
const K = SCENE.durationSec / 18;
const s = (x: number) => x * K;
const FRAME = 1 / 30;

export const OPEN = {
  /** La ligne de séparation se trace du centre vers les bords. */
  line: [s(0), s(0.6)],
  /** Les silhouettes se dessinent (tracé progressif), puis les canvas s'allument. */
  figure: [s(0.5), s(1.2)],
  canvas: [s(1.15), s(1.5)],
  /** Compteurs et chronomètre en fondu. */
  counters: [s(1.25), s(1.5)],
  chrono: [s(1.25), s(1.5)],
} as const;

/* ------------------------------------------------------------------ */
/* Le Faiseur : une pièce par jour                                      */
/* ------------------------------------------------------------------ */

export type Piece = {
  index: number; // 0 .. pieces-1
  /** Le canvas vide de cette pièce apparaît (pièces dessinées uniquement). */
  canvasIn: number;
  drawStart: number;
  drawEnd: number;
  /** Coche (et tick sonore). */
  check: number;
  /** Le compteur passe à index + 1. */
  publish: number;
  /** Le canvas se réduit et glisse vers sa case (pièces dessinées). */
  slideStart: number;
  slideEnd: number;
  /** Rugosité du tracé (0 = net, 1 = brut, forme imparfaite). */
  rough: number;
  /** Pièce de l'accéléré : la case se remplit directement, sans tracé ni vol. */
  burst: boolean;
};

/** Pièces tracées une à une avant l'accéléré. */
const DRAWN = Math.min(SCENE.pieces, 6);
/** Accéléré : les jours défilent, la grille se remplit jusqu'à N, pile à 12 s. */
const BURST = { start: s(10.0), end: s(12.0) };

/** Inverse de l'easing in-out cubique : le compteur accélère puis ralentit en arrivant sur N. */
const inverseInOut = (y: number) => (y < 0.5 ? Math.cbrt(y / 4) : 1 - Math.cbrt(2 * (1 - y)) / 2);

const buildPieces = (): Piece[] => {
  const out: Piece[] = [];
  // pièces 1 et 2 : 1,2 s de tracé ; pièce 3 : transition ; ensuite cycle de 1,2 s
  const fixed = [
    { canvasIn: s(1.15), drawStart: s(1.5), drawEnd: s(2.7) },
    { canvasIn: s(3.2), drawStart: s(3.5), drawEnd: s(4.7) },
    { canvasIn: s(5.2), drawStart: s(5.5), drawEnd: s(6.3) },
  ];
  for (let i = 0; i < DRAWN; i++) {
    let canvasIn: number;
    let drawStart: number;
    let drawEnd: number;
    if (i < fixed.length) {
      ({ canvasIn, drawStart, drawEnd } = fixed[i]);
    } else {
      // gabarit d'un cycle, P = publication précédente
      const P = out[i - 1].publish;
      canvasIn = P + s(0.35);
      drawStart = P + s(0.5);
      drawEnd = P + s(1.05);
    }
    const check = drawEnd + s(0.02);
    const publish = drawEnd + s(0.1);
    out.push({
      index: i,
      canvasIn,
      drawStart,
      drawEnd,
      check,
      publish,
      slideStart: publish + s(0.05),
      slideEnd: publish + s(0.5),
      rough: i === 2 || i === 4 ? 1 : 0.3,
      burst: false,
    });
  }
  const m = SCENE.pieces - DRAWN;
  for (let j = 1; j <= m; j++) {
    const at = BURST.start + (BURST.end - BURST.start) * inverseInOut(j / m);
    out.push({
      index: DRAWN + j - 1,
      canvasIn: at,
      drawStart: at,
      drawEnd: at,
      check: at,
      publish: at,
      slideStart: at,
      slideEnd: at + s(0.25),
      rough: 0.25 + 0.6 * (((DRAWN + j) * 37) % 10) / 10,
      burst: true,
    });
  }
  return out;
};

export const PIECES = buildPieces();
export const DRAWN_PIECES = PIECES.filter((p) => !p.burst);

/** Nombre de pièces publiées à l'instant t. */
export const publishedAt = (t: number) => PIECES.filter((p) => t >= p.publish).length;

/** Chronomètre : une pièce par jour, J = publiées + 1 (plafonné à N). */
export const dayAt = (t: number) => Math.min(SCENE.pieces, publishedAt(t) + 1);

export const DOER = {
  burst: [BURST.start, BURST.end],
  /** Vague de lumière en cascade sur la grille pleine (bleu -> vert). */
  cascade: [s(12.1), s(13.4)],
  /** Halo doux derrière la grille. */
  halo: [s(12.1), s(13.6)],
  /** Les coches deviennent bleues après les deux premières pièces. */
  greenChecks: 2,
} as const;

/* ------------------------------------------------------------------ */
/* Le Perfectionniste                                                   */
/* ------------------------------------------------------------------ */

export type Attempt = {
  draw: readonly [number, number];
  /** Longueur atteinte (fraction du trait). */
  reach: number;
  /** Gommage : [début, fin] et longueur restante après gommage. */
  erase: readonly [number, number];
  keep: number;
};

export const HESITATOR = {
  /** Le curseur s'approche du canvas puis recule, avant tout trait. */
  approach: [s(1.5), s(2.0)],
  /** Trois tentatives ; la dernière n'est gommée qu'au bout : c'est le trait inachevé. */
  attempts: [
    { draw: [s(2.0), s(2.3)], reach: 0.35, erase: [s(2.4), s(2.7)], keep: 0 },
    { draw: [s(3.0), s(3.6)], reach: 0.55, erase: [s(3.9), s(4.2)], keep: 0 },
    { draw: [s(4.6), s(5.1)], reach: 0.6, erase: [s(5.4), s(5.55)], keep: 0.51 },
  ] as Attempt[],
  /** Contour blanc -> gris (ease-out : ~60 % du gris à 2,5 s). */
  dim: [s(1.5), s(4.0)],
  /** Fond continu de 6 à 12 s : dérive caméra, teinte rouge, pulsation. */
  background: [s(6.0), s(12.0)],
  cameraTo: 1.12,
  redTint: [s(6.0), s(11.0)],
  pulsePeriod: s(1.5),
  /** 6 -> 8 s : onglets sans texte qui apparaissent derrière lui. */
  tabs: [s(6.3), s(6.75), s(7.2), s(7.65), s(8.0)],
  /** 8 -> 10 s : zoom ×3 à l'intérieur du canvas sur le bout du trait + cercle de focalisation. */
  innerZoom: { span: [s(8.0), s(9.0)], to: 3 },
  focusCircle: [s(8.2), s(12.0)],
  /** 10 -> 12 s : le curseur s'approche, recule, se rapproche, sans jamais toucher. */
  hesitate: [s(10.0), s(12.0)],
  /** Battements sourds (son), calés sur la pulsation. */
  heartbeats: [s(6.15), s(7.65), s(9.15), s(10.65)],
  /** Tout se retire d'un coup en fondu ; la caméra revient. */
  withdraw: [s(12.0), s(12.4)],
  cameraBack: [s(12.0), s(13.0)],
  /** La tête s'abaisse (9 px, 4°). */
  headDrop: [s(13.5), s(15.3)],
  /** Pensées : texte (index dans SCENE.texts.thoughts), bulle vide, « ? » ou boucle. */
  thoughts: [
    { kind: 'text', text: 0, at: s(2.5), dur: s(1.25), slot: 0, color: 'loop' },
    { kind: 'empty', at: s(3.2), dur: s(0.6), slot: 3, color: 'loop' },
    { kind: 'text', text: 1, at: s(3.9), dur: s(1.2), slot: 1, color: 'loop', withLoop: true },
    { kind: 'empty', at: s(4.8), dur: s(0.6), slot: 4, color: 'loop' },
    { kind: 'text', text: 2, at: s(5.2), dur: s(1.2), slot: 0, color: 'loop' },
    { kind: 'question', at: s(6.8), dur: s(1.2), slot: 2, color: 'doubt' },
    { kind: 'text', text: 2, at: s(8.5), dur: s(1.3), slot: 1, color: 'doubt' },
  ] as Array<{
    kind: 'text' | 'empty' | 'question';
    text?: number;
    at: number;
    dur: number;
    slot: number;
    color: 'loop' | 'doubt';
    withLoop?: boolean;
  }>,
} as const;

/* ------------------------------------------------------------------ */
/* Phrase finale                                                        */
/* ------------------------------------------------------------------ */

export const FINAL = {
  /** Les deux moitiés descendent à ~40 % (sauf les compteurs). */
  dim: [s(15.5), s(15.9)],
  dimTo: 0.4,
  chronoOut: [s(15.45), s(15.65)],
  /** Apparition lettre par lettre, une lettre par image. */
  typeStart: s(15.5),
  charSec: FRAME,
  /** Tenue 1,5 s puis fondu au noir : la dernière image est entièrement noire. */
  hold: [s(16.0), s(17.5)],
  fadeBlack: [s(17.5), SCENE.durationSec - FRAME],
} as const;
