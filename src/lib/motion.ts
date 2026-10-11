import { interpolate, interpolateColors } from 'remotion';
import { EASE, GLOW } from '../theme';

type EasingFn = (t: number) => number;

/** Progression 0 -> 1 entre t0 et t1 (secondes), avec easing, bornée. */
export const prog = (t: number, t0: number, t1: number, easing: EasingFn = EASE.out): number =>
  interpolate(t, [t0, t1], [0, 1], {
    easing,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

/** Interpolation d'une valeur entre t0 et t1, bornée. */
export const tween = (
  t: number,
  t0: number,
  t1: number,
  from: number,
  to: number,
  easing: EasingFn = EASE.out,
): number => from + (to - from) * prog(t, t0, t1, easing);

/**
 * Enchaîne plusieurs étapes [temps, valeur] : chaque segment est interpolé avec l'easing donné.
 * Avant la première étape -> première valeur, après la dernière -> dernière valeur.
 */
export const keyframes = (
  t: number,
  steps: ReadonlyArray<readonly [number, number]>,
  easing: EasingFn = EASE.inOut,
): number => {
  if (t <= steps[0][0]) return steps[0][1];
  for (let i = 1; i < steps.length; i++) {
    const [t1, v1] = steps[i];
    if (t <= t1) {
      const [t0, v0] = steps[i - 1];
      return tween(t, t0, t1, v0, v1, easing);
    }
  }
  return steps[steps.length - 1][1];
};

export const mixColor = (t: number, t0: number, t1: number, from: string, to: string, easing: EasingFn = EASE.out) =>
  interpolateColors(prog(t, t0, t1, easing), [0, 1], [from, to]);

export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Respiration lente du glow (±5 % sur ~3,5 s), déphasable. */
export const breathe = (t: number, phase = 0) =>
  1 + GLOW.breathe.amplitude * Math.sin((2 * Math.PI * t) / GLOW.breathe.period + phase);

/** Générateur pseudo-aléatoire déterministe (rendu image par image reproductible). */
export const seeded = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let r = Math.imul(s ^ (s >>> 15), 1 | s);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};
