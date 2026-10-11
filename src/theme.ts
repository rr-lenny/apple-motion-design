import { Easing } from 'remotion';

/**
 * Système visuel « neon glow » — source unique de vérité.
 * Toutes les vidéos du dépôt lisent leurs réglages ici pour garder un style identique.
 */

export const VIDEO = {
  width: 1080,
  height: 1920,
  fps: 30,
} as const;

/** Palette sémantique : la couleur est un événement, pas un décor. */
export const COLORS = {
  /** Fond : noir profond, jamais un gris plat. */
  bg: '#020202',
  bgEdge: '#000000',
  /** État neutre, élément principal par défaut. */
  white: '#F2F2F2',
  /** Inactif, grilles, pointillés. */
  grey: '#6B6B6B',
  greyDark: '#2A2A2A',
  /** Tension, danger, trop rapide, erreur. */
  red: '#FF3B3B',
  /** Bonne direction, durable, validé. */
  green: '#3BFF6B',
  /** Conclusion, valeur, mot-clé final. */
  yellow: '#FFD93B',
  /** Progression, case cochée, accompli. */
  blue: '#2D9CFF',
  /** Épanouissement, métamorphose : couleur unique du moment final d'accomplissement. */
  violet: '#B57CFF',
} as const;

export type ColorName = keyof typeof COLORS;

export const STROKE = {
  /** Contour fin « line art » (à 1080 px de large). */
  thin: 2,
  main: 2.5,
  bold: 3,
  /** Pointillés : tiret / espace. */
  dash: [3, 9] as const,
} as const;

/** Bloom en 3 couches : trait net + halo proche + halo large. */
export const GLOW = {
  near: { blur: 10, opacity: 0.6 },
  wide: { blur: 44, opacity: 0.26 },
  /**
   * Gain d'alpha appliqué après le flou : un trait de 2,5 px flouté à 10 px est presque
   * invisible, le gain redonne au halo la densité des références.
   */
  nearGain: 4.2,
  wideGain: 5.5,
  /** Niveaux d'intensité (multiplicateur des halos). */
  off: 0.12,
  idle: 0.35,
  rest: 0.75,
  on: 1,
  active: 1.45,
  /** Respiration des éléments immobiles : ±5 % sur ~3,5 s. */
  breathe: { amplitude: 0.05, period: 3.5 },
} as const;

/** Halo ambiant diffus derrière l'élément principal (~15 % de sa couleur). */
export const AMBIENT = {
  opacity: 0.15,
  radius: 540,
} as const;

export const VIGNETTE = {
  /** Opacité du noir sur les bords. */
  strength: 0.75,
  /** Début du dégradé (en % du rayon). */
  inner: 0.45,
} as const;

export const GRAIN = {
  /** 2-4 % : juste assez pour casser l'aplat numérique. */
  opacity: 0.032,
  /** Taille d'un grain en px. */
  size: 2,
} as const;

export const FONT = {
  family: "'Montserrat', 'Inter', sans-serif",
  familyJp: "'NotoJP117', 'NotoJP119', 'NotoJP98', 'NotoJP75', 'Montserrat', sans-serif",
  weight: 600,
  /** Sous-titres : 34-44 px. */
  size: 42,
  lineHeight: 1.32,
  tracking: '0.015em',
  /** Micro-texte des graphiques : 22-28 px, majuscules, interlettrage large. */
  microSize: 24,
  microTracking: '0.24em',
  /** Glow du texte (px). */
  glowBlur: 8,
  /**
   * Apparition des sous-titres : 'word' = chaque mot en fondu + flou + montée au moment
   * où il est prononcé ; 'type' = machine à écrire lettre par lettre.
   */
  captionMode: 'word' as 'word' | 'type',
  /** Durée d'apparition d'un mot (mode 'word'). */
  wordEnterSec: 0.32,
  /** Machine à écrire : 25-35 ms par caractère. */
  typeCharSec: 0.03,
  /** Apparition d'un caractère (fondu court). */
  typeFadeSec: 0.07,
  /** Sortie : fondu rapide 200-300 ms. */
  exitSec: 0.24,
  /** Apparition « fondu + flou » : flou initial et montée. */
  enterBlur: 8,
  enterRise: 10,
} as const;

/** Aucun mouvement linéaire. */
export const EASE = {
  /** Entrées. */
  out: Easing.out(Easing.cubic),
  outExpo: Easing.out(Easing.exp),
  /** Déplacements. */
  inOut: Easing.inOut(Easing.cubic),
  /** Sorties. */
  in: Easing.in(Easing.cubic),
  /** Trajectoire déjà lancée : part vite et ralentit (enchaîne une accélération sans à-coup). */
  glide: Easing.out(Easing.quad),
  /** Arrivée avec micro-overshoot (~3 %). */
  overshoot: Easing.out(Easing.back(0.9)),
} as const;

/** Spring amorti pour les rebonds. */
export const SPRING = { stiffness: 100, damping: 14, mass: 1 } as const;

export const LAYOUT = {
  /** Marges de sécurité 9:16 (interfaces des réseaux sociaux). */
  safeX: 0.08 * VIDEO.width,
  safeY: 0.12 * VIDEO.height,
  /** Point focal : centré, légèrement au-dessus du milieu. */
  focusX: VIDEO.width / 2,
  focusY: 820,
  /** Centre vertical du bloc de sous-titres (~15 % de marge basse). */
  subtitleY: 1545,
} as const;

export const CAMERA = {
  /** Dérive lente et continue : 100 % -> 107 %. */
  zoomFrom: 1,
  zoomTo: 1.07,
  /** Parallax : l'arrière-plan bouge à cette fraction du premier plan. */
  parallax: 0.35,
} as const;

/** Traînées de mouvement sur les objets rapides. */
export const TRAIL = {
  copies: 5,
  /** Décalage temporel entre deux copies (s). */
  step: 0.02,
  /** Opacité conservée d'une copie à la suivante. */
  decay: 0.55,
} as const;

/** Fondu à travers le noir entre deux scènes : 400-600 ms. */
export const TRANSITION = { fadeSec: 0.5 } as const;

/**
 * Mixage. Les effets (public/sfx) sont normalisés à -1 dBFS : leur niveau final est
 * `sfx` x le gain propre à chaque son. Effets graves et profonds, mais toujours sous la voix.
 */
export const AUDIO = {
  /** Voix off mono -> stéréo : +3 dB pour retrouver le niveau d'origine. */
  voice: Math.SQRT2,
  /** Bus des effets ponctuels. */
  sfx: 0.85,
  /** Nappe sub continue (profondeur), très basse. */
  bed: 0.12,
} as const;
