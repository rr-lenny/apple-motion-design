import { CUE } from './cues';

/**
 * Repères d'animation qui ne dépendent pas d'un mot précis.
 * HOOK et FLAP_PERIOD sont partagés avec scripts/sound_design.py : garder les mêmes valeurs.
 */

/** Accroche : allumage, la comète part du centre, trace l'ensō, revient se poser. */
export const HOOK = { launch: 0.15, travel: 0.4, arrive: 1.5, land: 1.85 } as const;

/** Métamorphose des 4 cercles en papillon (sur « t'épanouir »). */
export const METAMORPH = { start: CUE.epanouir + 0.2, end: CUE.epanouir + 0.95 } as const;

/** Un battement d'ailes complet (s). */
export const FLAP_PERIOD = 0.5;

/** Le papillon replié (un simple trait) se déploie en marque-page. */
export const BOOKMARK_UNFOLD = { start: CUE.enregistrer, end: CUE.enregistrer + 0.45 } as const;
