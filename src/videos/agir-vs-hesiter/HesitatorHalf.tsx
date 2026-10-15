import React from 'react';
import { TintGlow } from '../../components/Glow';
import { Pt } from '../../lib/geometry';
import { breathe, keyframes, lerp, mixColor, prog } from '../../lib/motion';
import { COLORS, EASE, FONT, GLOW, STROKE } from '../../theme';
import { hesitantStroke, partialArtwork, Stroke } from './artworks';
import { Workstation } from './Figure';
import { FIGURE, THOUGHT_SLOTS } from './layout';
import { CANVAS_RECT, CanvasFrame, Counter, innerRect } from './parts';
import { SCENE } from './scene';
import { HESITATOR, OPEN } from './timeline';

/** BAS — le Perfectionniste : il hésite, trace, efface, recommence, et ne publie jamais. */

const REST: Pt = [0.72, 0.78];
const STROKES: Stroke[] = HESITATOR.attempts.map((_, i) => hesitantStroke(SCENE.artwork, i));

type StrokeState = { stroke: Stroke | null; reach: number; cursor: Pt; press: number; erasing: boolean };

const tipOf = (s: Stroke, reach: number): Pt => partialArtwork([s], Math.max(0.001, reach)).tip ?? s[0];
const toward = (a: Pt, b: Pt, k: number): Pt => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

/** Trait visible, position du curseur, gomme. */
const strokeState = (t: number): StrokeState => {
  const [a0, a1] = HESITATOR.approach;
  const first0 = STROKES[0][0];
  // il s'approche du canvas, recule, puis se lance
  if (t >= a0 && t < HESITATOR.attempts[0].draw[0]) {
    const k = keyframes(t, [
      [a0, 0],
      [a0 + (a1 - a0) * 0.5, 0.8],
      [a0 + (a1 - a0) * 0.76, 0.5],
      [a1, 1],
    ]);
    return { stroke: null, reach: 0, cursor: toward(REST, first0, k), press: prog(t, a1 - 0.06, a1), erasing: false };
  }
  for (let i = HESITATOR.attempts.length - 1; i >= 0; i--) {
    const a = HESITATOR.attempts[i];
    const s = STROKES[i];
    const [d0, d1] = a.draw;
    const [e0, e1] = a.erase;
    if (t < d0 - 0.3) continue;
    if (t < d0) {
      // retour vers le début du trait (tentatives suivantes)
      const k = prog(t, d0 - 0.3, d0, EASE.inOut);
      return { stroke: null, reach: 0, cursor: toward(REST, s[0], k), press: prog(t, d0 - 0.08, d0), erasing: false };
    }
    if (t < d1) {
      // tracé lent, hésitant
      const reach = prog(t, d0, d1, EASE.inOut) * a.reach + 0.008 * Math.sin((t - d0) * 11);
      return { stroke: s, reach: Math.max(0, Math.min(a.reach, reach)), cursor: tipOf(s, reach), press: 1, erasing: false };
    }
    if (t < e0) {
      // il s'arrête, le crayon se lève un peu
      return { stroke: s, reach: a.reach, cursor: tipOf(s, a.reach), press: 1 - 0.6 * prog(t, d1, d1 + 0.2), erasing: false };
    }
    if (t < e1) {
      const reach = lerp(a.reach, a.keep, prog(t, e0, e1, EASE.inOut));
      return { stroke: s, reach, cursor: tipOf(s, reach), press: 1, erasing: true };
    }
    // après la gomme : la main revient au repos ; le fragment éventuel reste
    const k = prog(t, e1, e1 + 0.35, EASE.inOut);
    const end = tipOf(s, Math.max(a.keep, 0.001));
    return {
      stroke: a.keep > 0 ? s : null,
      reach: a.keep,
      cursor: toward(end, REST, k),
      press: 1 - prog(t, e1, e1 + 0.1),
      erasing: false,
    };
  }
  return { stroke: null, reach: 0, cursor: REST, press: 0, erasing: false };
};

/** Une pensée : bulle filaire avec texte, petite bulle vide, ou « ? ». */
const Thought: React.FC<{ t: number; th: (typeof HESITATOR.thoughts)[number]; id: string }> = ({ t, th, id }) => {
  const enter = prog(t, th.at, th.at + 0.25, EASE.out);
  const leave = prog(t, th.at + th.dur - 0.25, th.at + th.dur, EASE.in);
  const o = enter * (1 - leave);
  if (o <= 0.01) return null;
  const [x, y] = THOUGHT_SLOTS[th.slot];
  const drift = -12 * prog(t, th.at, th.at + th.dur, EASE.out);
  const blur = 6 * (1 - enter) + 8 * leave;
  const scale = lerp(0.85, 1, enter);
  const color = th.color === 'doubt' ? SCENE.colors.doubt : SCENE.colors.loop;
  const [hx, hy] = [FIGURE.head.cx, FIGURE.head.cy - FIGURE.head.ry - 8];
  let body: React.ReactNode;
  let trail = true;
  // demi-dimensions de la bulle (pour arrêter la traînée sur son bord)
  let half: Pt = [30, 22];
  if (th.kind === 'text') {
    const text = SCENE.texts.thoughts[th.text ?? 0];
    const loopW = th.withLoop ? 44 : 0;
    const w = 46 + text.length * 17.5 + loopW;
    half = [w / 2, 32];
    body = (
      <>
        <rect x={-w / 2} y={-32} width={w} height={64} rx={32} fill={COLORS.bg} stroke={color} strokeWidth={STROKE.main} />
        <text x={-loopW / 2} y={11} textAnchor="middle" fill={COLORS.white} fontFamily={FONT.family} fontWeight={500} fontSize={34}>
          {text}
        </text>
        {th.withLoop && (
          // flèche circulaire de boucle ↻, qui tourne
          <g transform={`translate(${w / 2 - 34} 0) rotate(${-220 * prog(t, th.at, th.at + th.dur, EASE.inOut)})`}>
            <path d="M10 -9 A13 13 0 1 0 13 4" fill="none" stroke={color} strokeWidth={STROKE.main} strokeLinecap="round" />
            <path d="M5 -13 L11 -9 L15 -15" fill="none" stroke={color} strokeWidth={STROKE.main} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}
      </>
    );
  } else if (th.kind === 'empty') {
    body = <ellipse rx={30} ry={22} fill="none" stroke={color} strokeWidth={STROKE.main} />;
  } else {
    trail = false;
    body = (
      <text y={20} textAnchor="middle" fill="none" stroke={color} strokeWidth={2.2} fontFamily={FONT.family} fontWeight={600} fontSize={60}>
        ?
      </text>
    );
  }
  // petites bulles de pensée dans l'espace libre entre le haut de la tête et le bord de la bulle
  const [bx, by] = [x, y + drift];
  const [dx, dy] = [hx - bx, hy - by];
  const len = Math.hypot(dx, dy);
  const edge = (half[0] * half[1]) / Math.hypot(half[1] * dx, half[0] * dy); // rayon de l'ellipse vers la tête
  const [ex, ey] = [bx + dx * edge * scale, by + dy * edge * scale];
  const gap = len * (1 - edge * scale);
  const dots = trail
    ? [0.3, 0.68]
        .filter((_, i) => gap > 26 + 20 * i)
        .map((k, i) => (
          <circle key={i} cx={lerp(hx, ex, k)} cy={lerp(hy, ey, k)} r={3.5 + 2.5 * i} fill="none" stroke={color} strokeWidth={STROKE.thin} />
        ))
    : null;
  return (
    <TintGlow id={id} color={color} intensity={1.05} opacity={o}>
      <g style={{ filter: blur > 0.2 ? `blur(${blur}px)` : undefined }}>
        {dots}
        <g transform={`translate(${x} ${y + drift}) scale(${scale})`}>{body}</g>
      </g>
    </TintGlow>
  );
};

export const HesitatorHalf: React.FC<{ t: number; frame: number; fps: number; dim: number; idPrefix: string }> = ({
  t,
  dim,
  idPrefix,
}) => {
  const trace = prog(t, OPEN.figure[0], OPEN.figure[1], EASE.inOut);
  // le contour se ternit vite (ease-out), sans descendre sous le gris #6B6B6B
  const fade = prog(t, HESITATOR.dim[0], HESITATOR.dim[1], EASE.out);
  const line = mixColor(fade, 0, 1, COLORS.white, '#7C7C7C');
  const glow = mixColor(fade, 0, 1, COLORS.white, COLORS.grey);
  const intensity = Math.max(GLOW.idle, lerp(GLOW.on, 0.4, fade)) * breathe(t, 2);
  const st = strokeState(t);
  const openLight = prog(t, OPEN.canvas[0], OPEN.canvas[1], EASE.out);
  const inner = innerRect(CANVAS_RECT);
  const drawn = st.stroke && st.reach > 0.002 ? partialArtwork([st.stroke], st.reach).strokes : [];
  const cx = inner.x + st.cursor[0] * inner.w;
  const cy = inner.y + st.cursor[1] * inner.h;
  const showCursor = t > HESITATOR.approach[0];

  return (
    <g>
      <g opacity={dim}>
        <Workstation id={`${idPrefix}-fig`} s={{ trace, line, glow, intensity: intensity * 0.6, cursor: st.cursor, press: st.press, headDrop: 0 }} />
        <CanvasFrame
          id={`${idPrefix}-canvas`}
          rect={CANVAS_RECT}
          line={line}
          glow={glow}
          intensity={intensity * (0.6 + 0.5 * openLight)}
          light={openLight}
          art={drawn}
          artColor={line}
          opacity={Math.min(1, openLight * 1.4)}
        />
        {showCursor && (
          <g opacity={0.9}>
            {st.erasing ? (
              // gomme : petit rectangle qui remonte le trait
              <rect x={cx - 8} y={cy - 6} width={16} height={12} rx={2.5} fill={COLORS.bg} stroke={line} strokeWidth={STROKE.thin} />
            ) : (
              <circle cx={cx} cy={cy} r={4} fill={st.press > 0.5 ? line : 'none'} stroke={line} strokeWidth={STROKE.thin} />
            )}
          </g>
        )}
        {HESITATOR.thoughts.map((th, i) => (
          <Thought key={i} t={t} th={th} id={`${idPrefix}-thought-${i}`} />
        ))}
      </g>
      <Counter t={t} value={0} changedAt={-1} opacity={prog(t, OPEN.counters[0], OPEN.counters[1], EASE.out)} />
    </g>
  );
};
