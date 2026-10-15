import React from 'react';
import { Audio, interpolate, Sequence, staticFile, useVideoConfig } from 'remotion';
import { DOER, DRAWN_PIECES, FINAL, HESITATOR } from './timeline';

/**
 * Sound design discret (sans voix off), généré par scripts/sfx_agir.py.
 * Haut : un tick par pièce, sur la coche, en gamme montante ; l'accéléré monte jusqu'au sommet
 * de 12 s, qui se pose sur un accord grave. Bas : gommes, puis battement sourd pendant
 * l'hésitation, coupé à 12 s. Fin : un coup de basse doux + shimmer court.
 */
const MIX = { pad: 0.5, tick: 0.55, rise: 0.5, peak: 0.6, erase: 0.4, heartbeat: 0.55, final: 0.8 } as const;

const CUES: Array<{ src: string; at: number; gain: number }> = [
  ...DRAWN_PIECES.map((p) => ({ src: `tick_${String(p.index + 1).padStart(2, '0')}`, at: p.check, gain: MIX.tick })),
  { src: 'rise', at: DOER.burst[0], gain: MIX.rise },
  { src: 'peak', at: DOER.burst[1], gain: MIX.peak },
  ...HESITATOR.attempts.map((a) => ({ src: 'erase', at: a.erase[0], gain: MIX.erase * (a.keep > 0 ? 0.6 : 1) })),
  ...HESITATOR.heartbeats.map((at) => ({ src: 'heartbeat', at, gain: MIX.heartbeat })),
  { src: 'final', at: FINAL.typeStart, gain: MIX.final },
];

export const SoundDesign: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <>
      <Audio
        src={staticFile('sfx/agir/pad.wav')}
        volume={(f) =>
          MIX.pad *
          interpolate(f / fps, [FINAL.fadeBlack[0] - 0.5, FINAL.fadeBlack[1]], [1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
        }
      />
      {CUES.map((c, i) => (
        <Sequence key={`${c.src}-${i}`} from={Math.round(c.at * fps)} layout="none">
          <Audio src={staticFile(`sfx/agir/${c.src}.wav`)} volume={c.gain} />
        </Sequence>
      ))}
    </>
  );
};
