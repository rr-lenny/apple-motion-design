import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Glow, GlowDefs } from '../../components/Glow';
import { Stage } from '../../components/Stage';
import { loadFonts } from '../../lib/fonts';
import { lerp, prog } from '../../lib/motion';
import { COLORS, EASE, FONT, GLOW, VIDEO } from '../../theme';
import { DoerHalf } from './DoerHalf';
import { HesitatorHalf } from './HesitatorHalf';
import { BAND, CANVAS, GRID, LABEL, SPLIT_Y } from './layout';
import { SCENE } from './scene';
import { SoundDesign } from './SoundDesign';
import { dayAt, DOER, FINAL, OPEN, PIECES } from './timeline';

loadFonts();

export const agirDurationInFrames = Math.round(SCENE.durationSec * VIDEO.fps);

/** Largeur (demi) de l'interruption de la ligne sous le chrono, puis sous la phrase finale. */
const gapAt = (t: number) => {
  const chrono = 30 + `${SCENE.texts.day}${dayAt(t)}`.length * 9;
  const final = 40 + [...SCENE.texts.final].length * 14;
  return lerp(chrono, final, prog(t, FINAL.typeStart - 0.1, FINAL.typeStart + 0.2, EASE.inOut));
};

/** Ligne de séparation lumineuse, tracée du centre vers les bords, interrompue en fondu au centre. */
const Separator: React.FC<{ t: number }> = ({ t }) => {
  const k = prog(t, OPEN.line[0], OPEN.line[1], EASE.out);
  if (k <= 0) return null;
  const half = (VIDEO.width / 2) * k;
  const gap = gapAt(t) * prog(t, OPEN.chrono[0], OPEN.chrono[1], EASE.out);
  return (
    <g>
      <defs>
        <mask id="sep-mask" maskUnits="userSpaceOnUse" x={0} y={SPLIT_Y - 200} width={VIDEO.width} height={400}>
          <rect x={0} y={SPLIT_Y - 200} width={VIDEO.width} height={400} fill="white" />
          {gap > 1 && <rect x={540 - gap} y={SPLIT_Y - 40} width={2 * gap} height={80} rx={40} fill="black" filter="url(#soft-14)" />}
        </mask>
      </defs>
      <g mask="url(#sep-mask)">
        <Glow intensity={GLOW.on}>
          <line x1={540 - half} y1={SPLIT_Y} x2={540 + half} y2={SPLIT_Y} stroke={COLORS.white} strokeWidth={2} strokeLinecap="round" />
        </Glow>
      </g>
    </g>
  );
};

/** Chronomètre commun, centré sur la ligne : « J1 » -> « J30 ». */
const Chrono: React.FC<{ t: number }> = ({ t }) => {
  const o = prog(t, OPEN.chrono[0], OPEN.chrono[1], EASE.out) * (1 - prog(t, FINAL.chronoOut[0], FINAL.chronoOut[1], EASE.in));
  if (o <= 0.01) return null;
  return (
    <g opacity={o}>
      <Glow intensity={0.7}>
        <text
          x={540}
          y={SPLIT_Y + 9}
          textAnchor="middle"
          fill={COLORS.white}
          fontFamily={FONT.family}
          fontWeight={FONT.weight}
          fontSize={26}
          letterSpacing="0.08em"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {`${SCENE.texts.day}${dayAt(t)}`}
        </text>
      </Glow>
    </g>
  );
};

/** Phrase finale, lettre par lettre (une par image), au centre de la ligne. */
const FinalLine: React.FC<{ t: number }> = ({ t }) => {
  if (t < FINAL.typeStart) return null;
  const chars = [...SCENE.texts.final];
  return (
    <Glow intensity={1.2}>
      <text
        x={540}
        y={SPLIT_Y + 15}
        textAnchor="middle"
        fontFamily={FONT.family}
        fontWeight={FONT.weight}
        fontSize={44}
        letterSpacing="0.03em"
        fill={SCENE.colors.final}
      >
        {chars.map((c, i) => (
          <tspan key={i} opacity={prog(t, FINAL.typeStart + i * FINAL.charSec, FINAL.typeStart + (i + 3) * FINAL.charSec)}>
            {c}
          </tspan>
        ))}
      </text>
    </Glow>
  );
};

/** Légendes optionnelles (micro-texte gris, sans glow), en haut à gauche de chaque bande. */
const Labels: React.FC<{ t: number }> = ({ t }) => {
  if (!SCENE.showLabels) return null;
  const o = prog(t, OPEN.counters[0], OPEN.counters[1]);
  const style = { fontFamily: FONT.family, fontWeight: FONT.weight, fontSize: LABEL.size, letterSpacing: FONT.microTracking } as const;
  return (
    <g opacity={o} fill={COLORS.grey}>
      <text x={LABEL.x} y={BAND.topY + LABEL.y} {...style}>
        {SCENE.texts.labels.top.toUpperCase()}
      </text>
      <text x={LABEL.x} y={BAND.bottomY + LABEL.y} {...style}>
        {SCENE.texts.labels.bottom.toUpperCase()}
      </text>
    </g>
  );
};

export const AgirVsHesiter: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const dim = lerp(1, FINAL.dimTo, prog(t, FINAL.dim[0], FINAL.dim[1], EASE.inOut));
  const black = prog(t, FINAL.fadeBlack[0], FINAL.fadeBlack[1], EASE.inOut);
  const canvasLight = prog(t, OPEN.canvas[0], OPEN.canvas[1]);
  const gridHalo = prog(t, DOER.halo[0], DOER.halo[1], EASE.out);
  const doerColor = t < DOER.cascade[0] ? SCENE.colors.doer : SCENE.colors.doerDone;
  const doerOn = prog(t, PIECES[0].drawStart, PIECES[0].drawStart + 0.6);
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bgEdge }}>
      <SoundDesign />
      <Stage
        zoom={1}
        focus={{ x: 540, y: SPLIT_Y }}
        ambient={[
          { color: COLORS.white, level: 0.35 * canvasLight * dim, x: CANVAS.cx, y: BAND.topY + CANVAS.cy, radius: 420 },
          { color: doerColor, level: 0.6 * doerOn * dim, x: CANVAS.cx, y: BAND.topY + CANVAS.cy, radius: 420 },
          { color: SCENE.colors.doerDone, level: 0.9 * gridHalo * dim, x: 540, y: BAND.topY + GRID.y0 + 80, radius: 460 },
          { color: COLORS.white, level: 0.3 * canvasLight * dim, x: CANVAS.cx, y: BAND.bottomY + CANVAS.cy, radius: 420 },
        ]}
      >
        <svg width={VIDEO.width} height={VIDEO.height} viewBox={`0 0 ${VIDEO.width} ${VIDEO.height}`}>
          <GlowDefs />
          <defs>
            <clipPath id="half-top">
              <rect x={0} y={0} width={VIDEO.width} height={SPLIT_Y - 3} />
            </clipPath>
            <clipPath id="half-bottom">
              <rect x={0} y={SPLIT_Y + 3} width={VIDEO.width} height={SPLIT_Y - 3} />
            </clipPath>
          </defs>
          <g clipPath="url(#half-top)">
            <g transform={`translate(0 ${BAND.topY})`}>
              <DoerHalf t={t} frame={frame} fps={fps} dim={dim} idPrefix="top" />
            </g>
          </g>
          <g clipPath="url(#half-bottom)">
            <g transform={`translate(0 ${BAND.bottomY})`}>
              <HesitatorHalf t={t} frame={frame} fps={fps} dim={dim} idPrefix="bottom" />
            </g>
          </g>
          <Separator t={t} />
          <Chrono t={t} />
          <FinalLine t={t} />
          <Labels t={t} />
        </svg>
      </Stage>
      <AbsoluteFill style={{ backgroundColor: '#000', opacity: black }} />
    </AbsoluteFill>
  );
};
