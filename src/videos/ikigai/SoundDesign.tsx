import React from 'react';
import { Audio, interpolate, Sequence, staticFile, useVideoConfig } from 'remotion';
import { AUDIO } from '../../theme';
import { CUE } from './cues';
import { BOOKMARK_UNFOLD, HOOK, METAMORPH } from './timeline';

/**
 * Sound design : chaque effet (public/sfx, généré par scripts/sound_design.py) est
 * accroché au même repère que le mouvement qu'il accompagne.
 * `at` = instant où le fichier démarre ; `gain` = niveau relatif dans le bus effets.
 */
const CUES: Array<{ src: string; at: number; gain: number }> = [
  // Accroche
  { src: 'ignite', at: 0, gain: 0.85 },
  { src: 'comet', at: HOOK.launch, gain: 0.75 },
  { src: 'chime_soft', at: HOOK.arrive, gain: 0.5 },
  { src: 'tilt', at: CUE.changer - 0.05, gain: 0.5 },
  { src: 'light_on', at: CUE.bonheur - 0.05, gain: 0.42 },
  { src: 'orb_move', at: CUE.volonte, gain: 0.45 },
  { src: 'ring_close', at: CUE.creation + 0.4, gain: 0.5 },
  // Le principe
  { src: 'pre_reveal', at: CUE.ikigai - 0.8, gain: 0.5 },
  { src: 'reveal', at: CUE.ikigai, gain: 0.62 },
  { src: 'split', at: CUE.quatre - 0.05, gain: 0.55 },
  // Les 4 piliers : une note par pilier + la signature de son pictogramme
  ...CUE.pillar.map((at, i) => ({ src: `pillar_${i + 1}`, at, gain: 0.55 })),
  { src: 'icon_flame', at: CUE.pillarWord[0] - 0.12, gain: 0.4 },
  { src: 'icon_pen', at: CUE.pillarWord[1] - 0.12 + 0.45, gain: 0.7 },
  { src: 'icon_orbit', at: CUE.pillarWord[2] - 0.12, gain: 0.32 },
  { src: 'icon_coins', at: CUE.pillarWord[3] - 0.12 + 0.17, gain: 0.42 },
  { src: 'enfin_riser', at: CUE.pillar[3] - 0.75, gain: 0.45 },
  // L'équilibre, la direction, le sens
  { src: 'balance', at: CUE.equilibre - 0.05, gain: 0.45 },
  { src: 'compass', at: CUE.trouver, gain: 0.6 },
  { src: 'dots_rise', at: CUE.sens - 0.08, gain: 0.4 },
  // Éclosion et métamorphose
  { src: 'bloom_riser', at: CUE.epanouir - 0.7, gain: 0.5 },
  { src: 'metamorph', at: METAMORPH.start, gain: 0.7 },
  { src: 'flutter', at: METAMORPH.end, gain: 0.5 },
  // Appel à l'action
  { src: 'fold', at: CUE.hesite, gain: 0.5 },
  { src: 'save', at: BOOKMARK_UNFOLD.end - 0.12, gain: 0.6 },
  { src: 'check', at: CUE.oublier - 0.05, gain: 0.55 },
  { src: 'implode', at: CUE.aBientot, gain: 0.45 },
  ...[0, 0.42, 0.84].map((d, i) => ({ src: `ripple_${i + 1}`, at: CUE.nouvelles + d, gain: 0.42 - 0.07 * i })),
];

export const SoundDesign: React.FC<{ durationSec: number }> = ({ durationSec }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      <Audio
        src={staticFile('sfx/bed.wav')}
        volume={(f) =>
          AUDIO.bed *
          interpolate(f / fps, [0, AUDIO.bedFade, durationSec - AUDIO.bedFade, durationSec], [0, 1, 1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
        }
      />
      {CUES.filter((c) => c.at >= 0).map((c, i) => (
        <Sequence key={`${c.src}-${i}`} from={Math.round(c.at * fps)} layout="none">
          <Audio src={staticFile(`sfx/${c.src}.wav`)} volume={AUDIO.sfx * c.gain} />
        </Sequence>
      ))}
    </>
  );
};
