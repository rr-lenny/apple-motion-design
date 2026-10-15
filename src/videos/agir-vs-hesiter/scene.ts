import { COLORS } from '../../theme';

/**
 * « Celui qui agit vs celui qui hésite » — paramètres modifiables.
 * Tout le reste (timing, mise en page) se recalcule à partir d'ici.
 */

/** Ce que les personnages créent : le canvas, la grille et les vignettes s'adaptent. */
export type ArtworkKind = 'croquis' | 'logo' | 'morceau' | 'texte' | 'code';

export const SCENE = {
  /** Durée totale (s). Les phases gardent leurs proportions (cf. timeline.ts). */
  durationSec: 18,
  /** Nombre de pièces publiées par le Faiseur (= jours du chronomètre). */
  pieces: 30,
  /** Objet créé. */
  artwork: 'croquis' as ArtworkKind,
  texts: {
    /** Compteur : « PUBLIÉ : N ». */
    counter: 'PUBLIÉ',
    /** Préfixe du chronomètre : « J1 » ... « J30 ». */
    day: 'J',
    /** Pensées du Perfectionniste (1-2 mots). */
    thoughts: ['et si…', 'pas encore', 'pas assez'],
    /** Phrase finale. */
    final: 'Fait > Parfait',
    /** Légendes optionnelles (sans glow). */
    labels: { top: 'Faiseur', bottom: 'Penseur' },
  },
  /** Afficher les légendes « Faiseur » / « Penseur » (seulement si le contraste ne suffit pas). */
  showLabels: false,
  colors: {
    /** Phrase finale. */
    final: COLORS.yellow,
    /** Faiseur : glow bleu, puis vert à l'accomplissement. */
    doer: COLORS.blue,
    doerDone: COLORS.green,
    /** Perfectionniste : pensées et tension. */
    doubt: COLORS.red,
    loop: COLORS.purple,
  },
} as const;
