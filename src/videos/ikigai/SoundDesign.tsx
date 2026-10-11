import React from 'react';
import { Audio, Sequence, staticFile, useVideoConfig } from 'remotion';
import { AUDIO } from '../../theme';
import { CUE } from './cues';
import { BOOKMARK, HOOK, NEEDLE_LOCK } from './timeline';

/**
 * Sound design minimaliste : un son n'existe que s'il sert un événement visuel
 * (apparition, validation, révélation). Effets générés par scripts/sound_design.py.
 * `at` = instant où le fichier démarre ; `gain` = niveau relatif dans le bus effets.
 */
const CUES: Array<{ src: string; at: number; gain: number }> = [
  // Accroche : le point s'allume, la comète trace l'ensō et se pose
  { src: 'ignite', at: 0, gain: 0.7 },
  { src: 'comet', at: HOOK.launch, gain: 0.4 },
  { src: 'tap_d6', at: HOOK.land - 0.05, gain: 0.35 },
  // Le cercle se referme, puis le nom apparaît
  { src: 'tap_a5', at: CUE.creation + 0.45, gain: 0.3 },
  { src: 'reveal', at: CUE.ikigai, gain: 0.55 },
  // Une touche par pilier, en montant
  ...CUE.pillar.map((at, i) => ({ src: `pillar_${i + 1}`, at, gain: 0.38 })),
  // L'aiguille trouve le nord
  { src: 'lock', at: CUE.trouver + NEEDLE_LOCK, gain: 0.35 },
  // Transition violette
  { src: 'swell', at: CUE.epanouir - 0.25, gain: 0.3 },
  // Enregistrer : le marque-page se forme, puis la coche valide
  { src: 'tap_d6', at: BOOKMARK.end - 0.08, gain: 0.3 },
  { src: 'confirm', at: CUE.oublier - 0.03, gain: 0.4 },
  // Fin : retour au point de lumière
  { src: 'end', at: CUE.nouvelles, gain: 0.35 },
];

export const SoundDesign: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <>
      {CUES.filter((c) => c.at >= 0).map((c, i) => (
        <Sequence key={`${c.src}-${i}`} from={Math.round(c.at * fps)} layout="none">
          <Audio src={staticFile(`sfx/${c.src}.wav`)} volume={AUDIO.sfx * c.gain} />
        </Sequence>
      ))}
    </>
  );
};
