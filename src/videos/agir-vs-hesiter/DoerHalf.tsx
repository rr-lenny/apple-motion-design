import React from 'react';
import { spring } from 'remotion';
import { TintGlow } from '../../components/Glow';
import { Pt } from '../../lib/geometry';
import { breathe, lerp, mixColor, prog } from '../../lib/motion';
import { COLORS, EASE, GLOW, SPRING, STROKE } from '../../theme';
import { Artwork, partialArtwork, pieceArtwork, strokePath } from './artworks';
import { Workstation } from './Figure';
import { GRID } from './layout';
import { CANVAS_RECT, CanvasFrame, CheckMark, Counter, innerRect, lerpRect, Rect } from './parts';
import { SCENE } from './scene';
import { DOER, DRAWN_PIECES, OPEN, Piece, PIECES, publishedAt } from './timeline';

/** HAUT — le Faiseur : il dessine, publie, recommence. */

const ARTS: Artwork[] = PIECES.map((p) => pieceArtwork(SCENE.artwork, p.index, p.rough));
const REST: Pt = [0.72, 0.78];
const LAST_DRAWN = DRAWN_PIECES[DRAWN_PIECES.length - 1];
/** Canvas « pose longue » de l'accéléré : il apparaît pendant que la dernière pièce tracée glisse. */
const BURST_CANVAS_IN = LAST_DRAWN.slideStart + 0.3;

const drawProgress = (p: Piece, t: number) => prog(t, p.drawStart, p.drawEnd, EASE.inOut);

/** Position du curseur et appui du stylet. */
const cursorAt = (t: number): { at: Pt; press: number } => {
  for (const p of DRAWN_PIECES) {
    const art = ARTS[p.index];
    const first = art[0][0];
    const approach = Math.min(0.3, p.drawStart - p.canvasIn);
    if (t >= p.drawStart - approach && t < p.drawStart) {
      const k = prog(t, p.drawStart - approach, p.drawStart, EASE.inOut);
      return { at: [lerp(REST[0], first[0], k), lerp(REST[1], first[1], k)], press: prog(t, p.drawStart - 0.08, p.drawStart) };
    }
    if (t >= p.drawStart && t < p.drawEnd) {
      const { tip } = partialArtwork(art, drawProgress(p, t));
      return { at: tip ?? first, press: 1 };
    }
    if (t >= p.drawEnd && t < p.drawEnd + 0.3) {
      const last = partialArtwork(art, 1).tip ?? first;
      const k = prog(t, p.drawEnd, p.drawEnd + 0.3, EASE.inOut);
      return { at: [lerp(last[0], REST[0], k), lerp(last[1], REST[1], k)], press: 1 - prog(t, p.drawEnd, p.drawEnd + 0.08) };
    }
  }
  // accéléré : la main continue un geste de tracé en boucle, sans à-coup
  const [b0, b1] = DOER.burst;
  const on = prog(t, BURST_CANVAS_IN, BURST_CANVAS_IN + 0.3, EASE.inOut) * (1 - prog(t, b1, b1 + 0.4, EASE.inOut));
  if (on > 0) {
    const w = (t - b0) * 5.5;
    const loop: Pt = [0.5 + 0.22 * Math.sin(w), 0.5 + 0.16 * Math.sin(w * 2)];
    return { at: [lerp(REST[0], loop[0], on), lerp(REST[1], loop[1], on)], press: on };
  }
  return { at: REST, press: 0 };
};

/** Couleur du halo du Faiseur : blanc -> bleu au premier croquis -> vert à l'accomplissement. */
const doerGlow = (t: number) => {
  const blue = mixColor(t, PIECES[0].drawStart - 0.1, PIECES[0].drawStart + 0.5, COLORS.white, SCENE.colors.doer);
  return mixColor(t, DOER.cascade[0], DOER.cascade[1], blue, SCENE.colors.doerDone);
};

type Thumb = { rect: Rect; art: Artwork; color: string; intensity: number; line: string; opacity: number };

export const DoerHalf: React.FC<{ t: number; frame: number; fps: number; dim: number; idPrefix: string }> = ({
  t,
  frame,
  fps,
  dim,
  idPrefix,
}) => {
  const glow = doerGlow(t);
  const drawing = DRAWN_PIECES.some((p) => t >= p.drawStart && t < p.drawEnd + 0.2);
  const intensity = (GLOW.on + 0.2 * (drawing ? 1 : 0)) * breathe(t);
  const cursor = cursorAt(t);
  const trace = prog(t, OPEN.figure[0], OPEN.figure[1], EASE.inOut);
  const openLight = prog(t, OPEN.canvas[0], OPEN.canvas[1], EASE.out);

  // --- canvas principal : la pièce tracée en cours (de son apparition jusqu'au glissement)
  const current = [...DRAWN_PIECES].reverse().find((p) => t >= p.canvasIn && t < p.slideStart);

  // --- vignettes : pièces qui glissent, cases remplies par l'accéléré, vague finale
  const thumbs: Thumb[] = [];
  const cascadeSpan = DOER.cascade[1] - DOER.cascade[0];
  for (const p of PIECES) {
    if (t < p.slideStart) continue;
    const slot = GRID.slot(p.index);
    let rect: Rect;
    let color: string;
    let inten: number;
    let line: string;
    let opacity = 1;
    if (!p.burst) {
      // glisse avec inertie, s'allume en bleu à l'arrivée, se stabilise en blanc doux
      rect = lerpRect(CANVAS_RECT, slot, prog(t, p.slideStart, p.slideEnd, EASE.inOut));
      const settle = prog(t, p.slideEnd, p.slideEnd + 0.8, EASE.out);
      color = mixColor(settle, 0, 1, SCENE.colors.doer, COLORS.white);
      inten = lerp(1.15, 0.5, settle);
      line = COLORS.white;
    } else {
      // accéléré : la case se remplit sur place, fondu blanc doux + léger agrandissement
      const k = prog(t, p.slideStart, p.slideEnd, EASE.out);
      const sc = lerp(0.9, 1, k);
      rect = { x: slot.x + (slot.w * (1 - sc)) / 2, y: slot.y + (slot.h * (1 - sc)) / 2, w: slot.w * sc, h: slot.h * sc };
      color = COLORS.white;
      inten = 0.5;
      line = COLORS.white;
      opacity = k;
    }
    // vague de lumière en cascade (bleu -> vert) sur la grille pleine
    const r = Math.floor(p.index / GRID.cols);
    const c = p.index % GRID.cols;
    const delay = ((c + r * 1.5) / (GRID.cols + GRID.rows * 1.5)) * cascadeSpan * 0.75;
    const wave = prog(t, DOER.cascade[0] + delay, DOER.cascade[0] + delay + 0.3, EASE.out);
    if (wave > 0) {
      const after = prog(t, DOER.cascade[0] + delay + 0.3, DOER.cascade[0] + delay + 0.9, EASE.inOut);
      color = mixColor(after, 0, 1, SCENE.colors.doer, SCENE.colors.doerDone);
      inten = lerp(inten, 1.5, wave) - 0.6 * after;
    }
    thumbs.push({ rect, art: ARTS[p.index], color, intensity: inten, line, opacity });
  }

  // halos regroupés par teinte et intensité (quelques filtres au lieu d'un par vignette)
  const groups = new Map<string, Thumb[]>();
  for (const th of thumbs) {
    const key = `${th.color}|${th.intensity.toFixed(1)}`;
    groups.set(key, [...(groups.get(key) ?? []), th]);
  }

  // --- canvas « pose longue » pendant l'accéléré : les pièces se superposent en fondu
  const burstOn = prog(t, BURST_CANVAS_IN, BURST_CANVAS_IN + 0.3, EASE.out);
  const burstLayers =
    burstOn > 0
      ? PIECES.filter((p) => p.burst && t >= p.publish - 0.2)
          .map((p) => ({ art: ARTS[p.index], o: Math.exp(-Math.max(0, t - p.publish) / 0.35) * prog(t, p.publish - 0.2, p.publish) }))
          .filter((l) => l.o > 0.04)
      : [];
  const lastBurst = PIECES[PIECES.length - 1];

  // --- compteur
  const published = publishedAt(t);
  const changedAt = published > 0 ? PIECES[published - 1].publish : -1;
  const gap = published > 1 ? PIECES[published - 1].publish - PIECES[published - 2].publish : 1;

  return (
    <g>
      <g opacity={dim}>
        <Workstation
          id={`${idPrefix}-fig`}
          s={{ trace, line: COLORS.white, glow, intensity: intensity * 0.6, cursor: cursor.at, press: cursor.press, headDrop: 0 }}
        />
        {current &&
          (() => {
            const p = current;
            const appear = p.index === 0 ? openLight : prog(t, p.canvasIn, p.canvasIn + 0.25, EASE.out);
            const scale = lerp(0.94, 1, appear);
            const rect: Rect = {
              x: CANVAS_RECT.x + (CANVAS_RECT.w * (1 - scale)) / 2,
              y: CANVAS_RECT.y + (CANVAS_RECT.h * (1 - scale)) / 2,
              w: CANVAS_RECT.w * scale,
              h: CANVAS_RECT.h * scale,
            };
            const { strokes, tip } = partialArtwork(ARTS[p.index], drawProgress(p, t));
            const inner = innerRect(rect);
            return (
              <g>
                <CanvasFrame
                  id={`${idPrefix}-canvas`}
                  rect={rect}
                  line={COLORS.white}
                  glow={glow}
                  intensity={intensity * (0.6 + 0.5 * appear)}
                  light={appear}
                  art={strokes}
                  opacity={p.index === 0 ? Math.min(1, appear * 1.4) : appear}
                />
                {tip && t < p.drawEnd + 0.15 && (
                  <circle
                    cx={inner.x + cursor.at[0] * inner.w}
                    cy={inner.y + cursor.at[1] * inner.h}
                    r={4}
                    fill={cursor.press > 0.5 ? COLORS.white : 'none'}
                    stroke={COLORS.white}
                    strokeWidth={STROKE.thin}
                  />
                )}
              </g>
            );
          })()}
        {burstOn > 0 && (
          <CanvasFrame
            id={`${idPrefix}-burst`}
            rect={CANVAS_RECT}
            line={COLORS.white}
            glow={glow}
            intensity={intensity * 0.8}
            light={burstOn}
            art={t >= lastBurst.publish ? ARTS[lastBurst.index] : []}
            opacity={burstOn * (t >= lastBurst.publish ? 1 : 0.5)}
          />
        )}
        {burstLayers.length > 0 && (
          <g opacity={0.5 * burstOn}>
            {burstLayers.map((l, i) => {
              const inner = innerRect(CANVAS_RECT);
              return (
                <g key={i} opacity={l.o}>
                  {l.art.map((s, j) => (
                    <path key={j} d={strokePath(s, inner.x, inner.y, inner.w, inner.h)} stroke={COLORS.white} strokeWidth={STROKE.main} fill="none" strokeLinecap="round" />
                  ))}
                </g>
              );
            })}
          </g>
        )}
        {/* pièces en vol et vignettes rangées (le halo ne part que des traits) */}
        {[...groups.entries()].map(([key, list], gi) => {
          const shapes = (halo: boolean) =>
            list.map((th, i) => {
              const inner = innerRect(th.rect);
              const k = th.rect.w / CANVAS_RECT.w;
              return (
                <g key={i} opacity={th.opacity}>
                  {!halo && (
                    <rect x={th.rect.x} y={th.rect.y} width={th.rect.w} height={th.rect.h} rx={7 * k} fill={th.color} opacity={0.07} />
                  )}
                  <rect
                    x={th.rect.x}
                    y={th.rect.y}
                    width={th.rect.w}
                    height={th.rect.h}
                    rx={7 * k}
                    fill="none"
                    stroke={th.line}
                    strokeWidth={Math.max(1.2, STROKE.main * k)}
                  />
                  {th.art.map((s, j) => (
                    <path
                      key={j}
                      d={strokePath(s, inner.x, inner.y, inner.w, inner.h)}
                      stroke={th.line}
                      strokeWidth={Math.max(1, STROKE.main * Math.max(0.45, k))}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                </g>
              );
            });
          return (
            <TintGlow key={key} id={`${idPrefix}-thumbs-${gi}`} color={list[0].color} intensity={list[0].intensity} halo={shapes(true)}>
              {shapes(false)}
            </TintGlow>
          );
        })}
        {/* coches : elles voyagent avec le canvas qui glisse et s'effacent en route */}
        {DRAWN_PIECES.map((p) => {
          if (t < p.check || t > p.slideEnd) return null;
          const k = spring({ frame: frame - Math.round(p.check * fps), fps, config: SPRING });
          const slide = prog(t, p.slideStart, p.slideEnd, EASE.inOut);
          const rect = lerpRect(CANVAS_RECT, GRID.slot(p.index), slide);
          const green = p.index < DOER.greenChecks;
          return (
            <CheckMark
              key={p.index}
              x={rect.x + rect.w - 6 * (1 - slide)}
              y={rect.y + 6 * (1 - slide)}
              k={k * lerp(1, 0.4, slide)}
              opacity={1 - prog(slide, 0.1, 0.6)}
              color={green ? SCENE.colors.doerDone : SCENE.colors.doer}
            />
          );
        })}
      </g>
      <Counter
        t={t}
        value={published}
        changedAt={changedAt}
        rollSec={Math.min(0.28, gap * 0.9)}
        opacity={prog(t, OPEN.counters[0], OPEN.counters[1], EASE.out)}
        numberColor={mixColor(t, DOER.cascade[0], DOER.cascade[0] + 0.4, COLORS.white, SCENE.colors.doerDone)}
      />
    </g>
  );
};
