import React from 'react';
import { Audio, Sequence, staticFile, useVideoConfig } from 'remotion';
import { AUDIO } from '../../theme';
import { CUE } from './cues';
import { BOOKMARK, HOOK, NEEDLE_LOCK } from './timeline';

/**
 * Sound design : sobre et utile (un son n'existe que s'il sert un événement visuel),
 * ancré dans les basses pour la profondeur. Effets générés par scripts/sound_design.py.
 * `at` = instant où le fichier démarre ; `gain` = niveau relatif dans le bus effets.
 */
const MERGE_RISE = 0.55; // montée du son « merge » avant l'impact (cf. sound_design.py)

const CUES: Array<{ src: string; at: number; gain: number }> = [
  // Accroche : le point s'allume, la comète trace l'ensō et se pose
  { src: 'ignite', at: 0, gain: 0.75 },
  { src: 'comet', at: HOOK.launch, gain: 0.45 },
  { src: 'land', at: HOOK.land - 0.04, gain: 0.55 },
  // Le cercle se referme, le nom apparaît, l'anneau se sépare en 4
  { src: 'close', at: CUE.creation + 0.45, gain: 0.5 },
  { src: 'reveal', at: CUE.ikigai, gain: 0.9 },
  { src: 'split', at: CUE.quatre - 0.03, gain: 0.5 },
  // Une note de basse par pilier, en montant
  ...CUE.pillar.map((at, i) => ({ src: `pillar_${i + 1}`, at, gain: 0.5 })),
  // L'aiguille trouve le nord
  { src: 'lock', at: CUE.trouver + NEEDLE_LOCK, gain: 0.45 },
  // Transition violette
  { src: 'swell', at: CUE.epanouir - 0.3, gain: 0.5 },
  // Les cercles fusionnent (impact quand le cercle unique est formé), puis la coche valide
  { src: 'merge', at: BOOKMARK.start - MERGE_RISE, gain: 0.5 },
  { src: 'confirm', at: CUE.oublier - 0.03, gain: 0.45 },
  // Fin : résolution grave
  { src: 'end', at: CUE.nouvelles, gain: 0.6 },
];

export const SoundDesign: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <>
      {/* nappe sub continue : la profondeur (fondus intégrés au fichier) */}
      <Audio src={staticFile('sfx/bed.wav')} volume={AUDIO.bed} />
      {CUES.filter((c) => c.at >= 0).map((c, i) => (
        <Sequence key={`${c.src}-${i}`} from={Math.round(c.at * fps)} layout="none">
          <Audio src={staticFile(`sfx/${c.src}.wav`)} volume={AUDIO.sfx * c.gain} />
        </Sequence>
      ))}
    </>
  );
};
