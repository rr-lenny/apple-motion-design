import { CUE } from './cues';

/**
 * Repères d'animation qui ne dépendent pas d'un mot précis.
 * HOOK est partagé avec scripts/sound_design.py : garder les mêmes valeurs.
 */

/** Accroche : allumage, la comète part du centre, trace l'ensō, revient se poser. */
export const HOOK = { launch: 0.15, travel: 0.4, arrive: 1.5, land: 1.85 } as const;

/** Ressort de l'aiguille (stiffness 100, damping 14) : premier passage sur le nord. */
export const NEEDLE_LOCK = 0.33;

/** Les 4 cercles fusionnés deviennent un marque-page. */
export const BOOKMARK = { start: CUE.enregistrer, end: CUE.enregistrer + 0.55 } as const;
