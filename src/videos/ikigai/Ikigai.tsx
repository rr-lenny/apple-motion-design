import React from 'react';
import { AbsoluteFill, Audio, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Glow, GlowDefs } from '../../components/Glow';
import { AmbientLight, Stage } from '../../components/Stage';
import { buildCaptions, Subtitles } from '../../components/Subtitles';
import { bookmarkPts, circlePts, morph, polar, Pt, resample, scalePts, tiltedArc, toPath } from '../../lib/geometry';
import { loadFonts } from '../../lib/fonts';
import { breathe, keyframes, lerp, mixColor, prog, seeded } from '../../lib/motion';
import { AUDIO, CAMERA, COLORS, EASE, FONT, GLOW, LAYOUT, SPRING, STROKE, TRAIL, VIDEO } from '../../theme';
import { BODY, BUTTERFLY_SCALE, circleForWing, innerWing, WING_SAMPLES, wingAt } from './butterfly';
import { SCREENS } from './captions';
import { CUE, WORDS } from './cues';
import { CHECK_PATH, PILLAR_ICONS, PillarIconName, TracedPath } from './icons';
import { SoundDesign } from './SoundDesign';
import { BOOKMARK_UNFOLD, FLAP_PERIOD, HOOK, METAMORPH } from './timeline';

loadFonts();

/** Durée totale : voix off + respiration finale. */
export const IKIGAI_DURATION_SEC = CUE.voiceEnd + 1.15;

const CAPTIONS = buildCaptions(SCREENS, WORDS, IKIGAI_DURATION_SEC - 0.2);

const CX = LAYOUT.focusX;
const CY = LAYOUT.focusY;

// Géométrie
const RING_R = 200; // ensō / anneau IKIGAI (~37 % de la largeur)
const ENSO_FROM = -105; // départ du tracé (degrés, 0 = droite, sens horaire)
const ENSO_SWEEP = 330; // l'ensō reste ouvert de 30°
const TILT = 74; // inclinaison « changement de perception »
const FLOOR_Y = 1000;
const HOVER_Y = 700;
const PETAL_R = 160; // les 4 cercles
const PETAL_D = 104; // distance centre -> centre de chaque cercle (diagramme ~49 % de la largeur)

/** Les 4 piliers, dans l'ordre de la voix off : haut, droite, bas, gauche. */
const PILLARS: Array<{ dir: Pt; icon: PillarIconName; label: string }> = [
  { dir: [0, -1], icon: 'flame', label: 'PASSION' },
  { dir: [1, 0], icon: 'pen', label: 'TALENT' },
  { dir: [0, 1], icon: 'orbit', label: 'UTILITÉ' },
  { dir: [-1, 0], icon: 'coins', label: 'REVENU' },
];

type SpringConfig = { stiffness: number; damping: number; mass: number };
const springAt = (frame: number, fps: number, startSec: number, config: SpringConfig = SPRING) =>
  spring({ frame: frame - Math.round(startSec * fps), fps, config });

/* ------------------------------------------------------------------ */
/* Acte 1 : l'accroche (comète + ensō), la perspective, le cercle       */
/* ------------------------------------------------------------------ */

const ensoState = (t: number) => {
  const tilt = keyframes(t, [
    [CUE.changer - 0.05, 0],
    [CUE.changer + 0.8, TILT],
    [CUE.volonte - 0.05, TILT],
    [CUE.volonte + 0.7, 0],
  ]);
  const cy = keyframes(t, [
    [CUE.changer - 0.05, CY],
    [CUE.changer + 0.8, FLOOR_Y],
    [CUE.volonte - 0.05, FLOOR_Y],
    [CUE.volonte + 0.7, CY],
  ]);
  // la comète trace l'ensō : le trait suit exactement sa tête
  const trace = prog(t, HOOK.travel, HOOK.arrive, EASE.glide);
  const close = prog(t, CUE.creation, CUE.creation + 0.5, EASE.inOut);
  const sweep = ENSO_SWEEP * trace + (360 - ENSO_SWEEP) * close;
  const intensity =
    GLOW.on *
      (1 +
        0.5 * (prog(t, HOOK.arrive - 0.1, HOOK.arrive + 0.15) - prog(t, HOOK.arrive + 0.15, CUE.qui)) +
        0.45 * (prog(t, CUE.creation + 0.4, CUE.creation + 0.6) - prog(t, CUE.creation + 0.6, CUE.principe)) +
        0.2 * prog(t, CUE.ikigai, CUE.ikigai + 0.4) +
        0.3 * prog(t, CUE.quatre - 0.25, CUE.quatre)) -
    0.35 * prog(t, CUE.bonheur, CUE.bonheur + 0.4) * (1 - prog(t, CUE.si, CUE.si + 0.4));
  return { tilt, cy, sweep, intensity };
};

const orbState = (t: number, frame: number, fps: number) => {
  const e = ensoState(t);
  // Allumage (ressort) amorcé juste avant la première image : le point est déjà visible à t = 0.
  const ignite = springAt(frame, fps, -0.1, { stiffness: 170, damping: 11, mass: 1 });
  // Comète : centre -> départ de l'ensō -> tour du cercle -> retour au centre.
  const start = polar(CX, CY, RING_R, ENSO_FROM);
  const end = polar(CX, CY, RING_R, ENSO_FROM + ENSO_SWEEP);
  let x: number = CX;
  let y: number = CY;
  if (t >= HOOK.launch && t < HOOK.travel) {
    const k = prog(t, HOOK.launch, HOOK.travel, EASE.in);
    [x, y] = [lerp(CX, start[0], k), lerp(CY, start[1], k)];
  } else if (t >= HOOK.travel && t < HOOK.arrive) {
    [x, y] = polar(CX, CY, RING_R, ENSO_FROM + e.sweep);
  } else if (t >= HOOK.arrive && t < HOOK.land) {
    const k = prog(t, HOOK.arrive, HOOK.land, EASE.overshoot);
    [x, y] = [lerp(end[0], CX, k), lerp(end[1], CY, k)];
  }
  // Perspective : s'élève au-dessus du sol.
  const rise = prog(t, CUE.changer - 0.05, CUE.changer + 0.85, EASE.inOut);
  y = lerp(y, HOVER_Y + Math.sin(t * 2.1) * 4, rise);
  // Volonté : rejoint l'extrémité ouverte de l'ensō, puis referme le cercle.
  const go = prog(t, CUE.volonte, CUE.volonte + 0.7, EASE.inOut);
  const close = prog(t, CUE.creation, CUE.creation + 0.5, EASE.inOut);
  const [gx, gy] = tiltedArc(CX, e.cy, RING_R, ENSO_FROM + e.sweep, ENSO_FROM + e.sweep, e.tilt, 1)[0];
  if (go > 0) {
    x = lerp(x, gx, go);
    y = lerp(y, gy, go);
  }
  if (close > 0) {
    [x, y] = [gx, gy];
  }
  const bonheur = springAt(frame, fps, CUE.bonheur);
  const moving = prog(t, HOOK.launch, HOOK.travel) * (1 - prog(t, HOOK.arrive, HOOK.land));
  const r = 8 * ignite + 3 * rise + 3 * bonheur * (1 - prog(t, CUE.si, CUE.volonte)) - 3 * go;
  // se fond dans l'anneau une fois le cercle refermé
  const opacity = 1 - prog(t, CUE.creation + 0.35, CUE.creation + 0.6);
  const intensity =
    GLOW.on +
    1.1 * (1 - prog(t, 0.05, 0.7)) +
    0.35 * moving +
    0.6 * bonheur * (1 - prog(t, CUE.si, CUE.si + 0.4)) +
    0.3 * prog(t, CUE.si, CUE.si + 0.25);
  return { x, y, r: Math.max(0, r), opacity, intensity };
};

const Orb: React.FC<{ x: number; y: number; r: number; intensity: number; color?: string }> = ({
  x,
  y,
  r,
  intensity,
  color = COLORS.white,
}) => (
  <Glow intensity={intensity}>
    <circle cx={x} cy={y} r={r * 2.2} fill={color} opacity={0.18} filter="url(#soft-6)" />
    <circle cx={x} cy={y} r={r} fill={color} />
  </Glow>
);

const Ripple: React.FC<{
  t: number;
  start: number;
  from: number;
  to: number;
  cx?: number;
  cy?: number;
  dur?: number;
  color?: string;
}> = ({ t, start, from, to, cx = CX, cy = CY, dur = 1.1, color = COLORS.white }) => {
  const k = prog(t, start, start + dur, EASE.out);
  if (k <= 0 || k >= 1) return null;
  return (
    <Glow intensity={0.8} opacity={0.6 * (1 - k)}>
      <circle cx={cx} cy={cy} r={lerp(from, to, k)} fill="none" stroke={color} strokeWidth={STROKE.thin} />
    </Glow>
  );
};

const ActOne: React.FC<{ t: number; frame: number; fps: number }> = ({ t, frame, fps }) => {
  if (t >= CUE.quatre) return null;
  const e = ensoState(t);
  const o = orbState(t, frame, fps);
  const pts = e.sweep > 0.5 ? tiltedArc(CX, e.cy, RING_R, ENSO_FROM, ENSO_FROM + e.sweep, e.tilt) : [];
  const closed = e.sweep >= 359.9;
  const beam = keyframes(
    t,
    [
      [CUE.bonheur - 0.05, 0],
      [CUE.bonheur + 0.5, 1],
      [CUE.si, 1],
      [CUE.si + 0.35, 0],
    ],
    EASE.out,
  );
  const scale =
    1 + 0.03 * (prog(t, CUE.principeStart, CUE.ikigai + 0.6, EASE.inOut) - prog(t, CUE.elle, CUE.quatre, EASE.inOut));
  // traînée de mouvement : copies décroissantes quand le point se déplace vite
  const trail = Array.from({ length: TRAIL.copies }, (_, k) => {
    const tk = t - (k + 1) * TRAIL.step;
    const ok = orbState(tk, frame - (k + 1) * TRAIL.step * fps, fps);
    const speed = Math.hypot(ok.x - o.x, ok.y - o.y) / (k + 1);
    return { ...ok, alpha: Math.pow(TRAIL.decay, k + 1) * Math.min(1, speed / 6) };
  });
  const ry = RING_R * Math.cos((e.tilt * Math.PI) / 180);

  return (
    <g transform={`translate(${CX} ${CY}) scale(${scale}) translate(${-CX} ${-CY})`}>
      {/* Faisceau conique doux depuis le point de lumière */}
      {beam > 0.01 && (
        <g opacity={beam} filter="url(#soft-14)">
          <defs>
            <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={COLORS.white} stopOpacity={0.32} />
              <stop offset="1" stopColor={COLORS.white} stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <path
            d={`M${o.x - 6} ${o.y + 8} L${CX - RING_R * 0.92} ${e.cy} A${RING_R * 0.92} ${ry * 0.92} 0 0 0 ${
              CX + RING_R * 0.92
            } ${e.cy} L${o.x + 6} ${o.y + 8} Z`}
            fill="url(#beam)"
          />
          <ellipse cx={CX} cy={e.cy} rx={RING_R * 0.9} ry={ry * 0.9} fill={COLORS.white} opacity={0.14} />
        </g>
      )}
      {/* Ensō */}
      {pts.length > 1 && (
        <Glow intensity={e.intensity * breathe(t)}>
          <path
            d={toPath(pts, closed)}
            fill="none"
            stroke={COLORS.white}
            strokeWidth={STROKE.main}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Glow>
      )}
      {/* Traînée + point de lumière */}
      {trail.map(
        (c, k) =>
          c.alpha > 0.02 &&
          c.opacity > 0 && (
            <circle
              key={k}
              cx={c.x}
              cy={c.y}
              r={c.r * (1 - 0.12 * (k + 1))}
              fill={COLORS.white}
              opacity={c.alpha * c.opacity * 0.75}
              filter="url(#soft-6)"
            />
          ),
      )}
      {o.opacity > 0.01 && (
        <g opacity={o.opacity}>
          <Orb x={o.x} y={o.y} r={o.r} intensity={o.intensity * breathe(t, 1)} />
        </g>
      )}
      <Ripple t={t} start={0.02} from={10} to={150} dur={0.9} />
      <Ripple t={t} start={HOOK.land - 0.12} from={12} to={110} dur={0.8} />
      <Ripple t={t} start={CUE.creation + 0.45} from={RING_R} to={RING_R * 1.32} cy={CY} />
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* Titre IKIGAI                                                         */
/* ------------------------------------------------------------------ */

const enterStyle = (t: number, start: number, end: number) => {
  const k = prog(t, start, start + 0.55, EASE.out);
  const out = 1 - prog(t, end, end + 0.3, EASE.in);
  return { k, opacity: k * out, blur: FONT.enterBlur * (1 - k), rise: FONT.enterRise * (1 - k) };
};

const Title: React.FC<{ t: number }> = ({ t }) => {
  const kanji = enterStyle(t, CUE.principe, CUE.elle);
  const title = enterStyle(t, CUE.ikigai, CUE.elle);
  if (kanji.opacity <= 0 && title.opacity <= 0) return null;
  const spacing = lerp(0.22, 0.34, prog(t, CUE.ikigai, CUE.ikigai + 1.2, EASE.out));
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          top: CY - 74,
          width: VIDEO.width,
          textAlign: 'center',
          fontFamily: FONT.familyJp,
          fontWeight: 500,
          fontSize: 28,
          letterSpacing: '0.4em',
          paddingLeft: '0.4em',
          color: COLORS.white,
          // micro-label secondaire : atténué mais lisible (contraste > 7:1)
          opacity: kanji.opacity * 0.72,
          filter: `blur(${kanji.blur}px)`,
          transform: `translateY(${kanji.rise}px)`,
          textShadow: `0 0 8px rgba(242,242,242,0.25)`,
        }}
      >
        生き甲斐
      </div>
      <div
        style={{
          position: 'absolute',
          top: CY - 24,
          width: VIDEO.width,
          textAlign: 'center',
          fontFamily: FONT.family,
          fontWeight: FONT.weight,
          fontSize: 44,
          letterSpacing: `${spacing}em`,
          paddingLeft: `${spacing}em`,
          color: COLORS.yellow,
          opacity: title.opacity,
          filter: `blur(${title.blur}px)`,
          transform: `translateY(${title.rise}px)`,
          textShadow: `0 0 10px rgba(255,217,59,0.7), 0 0 34px rgba(255,217,59,0.35)`,
        }}
      >
        IKIGAI
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Actes 2-4 : les 4 cercles                                            */
/* ------------------------------------------------------------------ */

/** Rotation du diagramme avant la métamorphose : les cercles rejoignent les diagonales (ailes). */
const bloomRotation = (t: number) => 45 * prog(t, CUE.pleinement, METAMORPH.start + 0.05, EASE.inOut);

const petalState = (i: number, t: number, frame: number, fps: number) => {
  // Séparation de l'anneau en 4 (légèrement décalée par cercle)
  const s0 = CUE.quatre + i * 0.05;
  const split = prog(t, s0, s0 + 0.75, EASE.overshoot);
  const bloomSpring = springAt(frame, fps, CUE.epanouir);
  const d = PETAL_D * split + 12 * bloomSpring;
  const r = lerp(RING_R, PETAL_R, prog(t, s0, s0 + 0.75, EASE.out)) + 4 * bloomSpring;
  const rot = bloomRotation(t);
  const [dx, dy] = PILLARS[i].dir;
  const a = (rot * Math.PI) / 180;
  const cx = CX + d * (dx * Math.cos(a) - dy * Math.sin(a));
  const cy = CY + d * (dx * Math.sin(a) + dy * Math.cos(a));

  // État lumineux : gris éteint -> actif -> « acquis »
  const on = CUE.pillar[i];
  const next = i < 3 ? CUE.pillar[i + 1] : CUE.cet;
  const dim = prog(t, CUE.piliers + 0.15, CUE.piliers + 0.75);
  const lit = prog(t, on, on + 0.35);
  const pre = i === 3 ? prog(t, CUE.enfin + 0.08, CUE.enfin + 0.5) : 0;
  const settle = prog(t, next, next + 0.4);
  const equal = prog(t, CUE.cet, CUE.cet + 0.4);
  let intensity = lerp(1.4, GLOW.idle, dim);
  intensity = lerp(intensity, 0.55, pre);
  intensity = lerp(intensity, GLOW.active, lit);
  intensity = lerp(intensity, GLOW.rest, settle * (i < 3 ? 1 : 0));
  intensity = lerp(intensity, GLOW.on, equal);
  intensity = lerp(intensity, 0.62, prog(t, CUE.sens - 0.1, CUE.sens + 0.3) * (1 - prog(t, CUE.etDe, CUE.pleinement)));
  intensity = lerp(intensity, 1.15, prog(t, CUE.pleinement, CUE.pleinement + 0.4));
  intensity = lerp(intensity, GLOW.active, prog(t, CUE.epanouir, CUE.epanouir + 0.4));

  let color = mixColor(dim, 0, 1, COLORS.white, COLORS.grey);
  color = mixColor(Math.max(lit, pre * 0.45), 0, 1, color, COLORS.white);
  // une seule couleur pour l'accomplissement : le violet
  color = mixColor(t, CUE.epanouir - 0.05, CUE.epanouir + 0.35, color, COLORS.violet);
  const opacity = lerp(1, 0.78, settle * (i < 3 ? 1 : 0) * (1 - equal));
  // Pendant la séparation, les 4 copies se superposent : on évite que leurs halos s'additionnent.
  const overlap = lerp(0.3, 1, split);
  return { cx, cy, r, color, intensity: intensity * overlap, opacity };
};

/** Zone centrale (intersection des 4 cercles) : carré curviligne bordé de 4 arcs. */
const centerPath = (d: number, r: number) => {
  const c = (-d + Math.sqrt(2 * r * r - d * d)) / 2;
  const p = (x: number, y: number) => `${(CX + x).toFixed(2)} ${(CY + y).toFixed(2)}`;
  const arc = `A${r} ${r} 0 0 1`;
  return `M${p(-c, -c)} ${arc} ${p(c, -c)} ${arc} ${p(c, c)} ${arc} ${p(-c, c)} ${arc} ${p(-c, -c)} Z`;
};

const Label: React.FC<{ i: number; t: number; color: string; opacity: number }> = ({ i, t, color, opacity }) => {
  const enter = prog(t, CUE.pillar[i] + 0.05, CUE.pillar[i] + 0.55, EASE.out);
  const out = 1 - prog(t, CUE.remettre, CUE.remettre + 0.35, EASE.in);
  const o = enter * out * opacity;
  if (o <= 0.01) return null;
  const off = PETAL_D + PETAL_R;
  const [dx, dy] = PILLARS[i].dir;
  const x = CX + dx * (off + 22);
  const y = CY + dy * (off + (dy < 0 ? 26 : 46)) + (dx !== 0 ? 9 : 0);
  return (
    <text
      x={x}
      y={y + 10 * (1 - enter)}
      textAnchor={dx > 0 ? 'start' : dx < 0 ? 'end' : 'middle'}
      fontFamily={FONT.family}
      fontWeight={FONT.weight}
      fontSize={FONT.microSize}
      letterSpacing={FONT.microTracking}
      fill={color}
      opacity={o}
      style={{ filter: `blur(${FONT.enterBlur * (1 - enter)}px) drop-shadow(0 0 6px rgba(242,242,242,0.35))` }}
    >
      {PILLARS[i].label}
    </text>
  );
};

const Petals: React.FC<{ t: number; frame: number; fps: number }> = ({ t, frame, fps }) => {
  if (t < CUE.quatre || t >= METAMORPH.start) return null;
  const states = PILLARS.map((_, i) => petalState(i, t, frame, fps));
  const fill = prog(t, CUE.epanouir, CUE.epanouir + 0.4);
  // milieu de la partie de chaque cercle qui n'appartient qu'à son pilier
  const inner = Math.sqrt(PETAL_R * PETAL_R - PETAL_D * PETAL_D);
  const iconOffset = (inner + PETAL_D + PETAL_R) / 2;
  return (
    <g>
      {states.map((s, i) => (
        <g key={i} opacity={s.opacity}>
          {fill > 0.01 && <circle cx={s.cx} cy={s.cy} r={s.r} fill={s.color} opacity={0.06 * fill} />}
          <Glow intensity={s.intensity * breathe(t, i * 1.3)}>
            <circle cx={s.cx} cy={s.cy} r={s.r} fill="none" stroke={s.color} strokeWidth={STROKE.main} />
          </Glow>
        </g>
      ))}
      {PILLARS.map((p, i) => {
        const s = states[i];
        const start = CUE.pillarWord[i] - 0.12;
        const out = 1 - prog(t, CUE.remettre, CUE.remettre + 0.35, EASE.in);
        if (t < start || out <= 0) return null;
        const Icon = PILLAR_ICONS[p.icon];
        return (
          <g
            key={`icon-${i}`}
            opacity={out * s.opacity}
            transform={`translate(${CX + p.dir[0] * iconOffset} ${CY + p.dir[1] * iconOffset})`}
          >
            <Glow intensity={s.intensity * 0.8}>
              <Icon t={t} start={start} color={s.color} />
            </Glow>
          </g>
        );
      })}
      {PILLARS.map((_, i) => (
        <Label key={`label-${i}`} i={i} t={t} color={states[i].color} opacity={states[i].opacity} />
      ))}
    </g>
  );
};

/* Équilibre -> direction -> sens */
const Compass: React.FC<{ t: number; frame: number; fps: number }> = ({ t, frame, fps }) => {
  const core = prog(t, CUE.equilibre, CUE.equilibre + 0.5, EASE.out);
  const out = 1 - prog(t, CUE.etDe, CUE.pleinement, EASE.in);
  if (core <= 0 || out <= 0) return null;
  const path = centerPath(PETAL_D, PETAL_R);
  const needleIn = prog(t, CUE.trouver - 0.05, CUE.trouver + 0.3, EASE.out);
  const swing = springAt(frame, fps, CUE.trouver);
  const angle = -150 * (1 - swing);
  const line = prog(t, CUE.sens - 0.08, CUE.sens + 0.55, EASE.out);
  const top = CY - 84;
  const end = CY - PETAL_D - PETAL_R - 70;
  return (
    <g opacity={out}>
      <path d={path} fill={COLORS.yellow} opacity={0.13 * core} />
      <Glow intensity={GLOW.on * core * breathe(t)}>
        <TracedPath d={path} progress={core} stroke={COLORS.yellow} />
      </Glow>
      {needleIn > 0.01 && (
        <g opacity={needleIn} transform={`translate(${CX} ${CY}) rotate(${angle}) scale(${lerp(0.7, 1, needleIn)})`}>
          <Glow intensity={GLOW.active}>
            {/* aiguille bicolore : nord plein (jaune), sud en contour (gris) */}
            <path d="M0 -84 L12 0 L-12 0 Z" fill={COLORS.yellow} />
            <path
              d="M12 0 L0 70 L-12 0"
              fill={COLORS.bg}
              stroke={COLORS.grey}
              strokeWidth={STROKE.thin}
              strokeLinejoin="round"
            />
            <circle r={4} fill={COLORS.bg} stroke={COLORS.yellow} strokeWidth={STROKE.thin} />
          </Glow>
        </g>
      )}
      {line > 0.01 && (
        <g>
          <Glow intensity={GLOW.on}>
            <line
              x1={CX}
              y1={top - 8}
              x2={CX}
              y2={lerp(top - 8, end, line)}
              stroke={COLORS.yellow}
              strokeWidth={STROKE.main}
              strokeDasharray={STROKE.dash.join(' ')}
              strokeLinecap="round"
            />
          </Glow>
          <g opacity={prog(t, CUE.sens + 0.35, CUE.sens + 0.7)}>
            <Orb x={CX} y={end - 8} r={6} intensity={GLOW.active * breathe(t, 2)} color={COLORS.yellow} />
          </g>
        </g>
      )}
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* Métamorphose : les 4 cercles deviennent les 4 ailes d'un papillon    */
/* ------------------------------------------------------------------ */

const BOOKMARK = resample(bookmarkPts(CX, CY, 150, 200, 46), WING_SAMPLES);

/** Angle de battement (degrés) : 0 = ailes à plat, 90 = ailes repliées (vues par la tranche). */
const flapAngle = (t: number) => {
  const ft = t - METAMORPH.end;
  const amp = 52 * prog(t, METAMORPH.end - 0.1, METAMORPH.end + 0.2);
  const flap = ft > 0 ? (amp * (1 - Math.cos((2 * Math.PI * ft) / FLAP_PERIOD))) / 2 : 0;
  return lerp(flap, 84, prog(t, CUE.hesite, CUE.hesite + 0.4, EASE.inOut));
};

const Butterfly: React.FC<{ t: number; frame: number; fps: number }> = ({ t, frame, fps }) => {
  const vanish = prog(t, BOOKMARK_UNFOLD.start, BOOKMARK_UNFOLD.start + 0.15);
  if (t < METAMORPH.start || vanish >= 1) return null;
  const m = prog(t, METAMORPH.start, METAMORPH.end, EASE.inOut);
  const kx = Math.cos((flapAngle(t) * Math.PI) / 180);
  const fold = prog(t, CUE.hesite, CUE.hesite + 0.4, EASE.inOut);
  const color = mixColor(t, CUE.hesite, CUE.hesite + 0.4, COLORS.violet, COLORS.white);
  const intensity = lerp(GLOW.active, GLOW.on, fold) * breathe(t);
  const wings = PILLARS.map((_, i) => {
    const s = petalState(i, t, frame, fps);
    const target = wingAt(i, CX, CY);
    const pts = morph(circleForWing(i, s.cx, s.cy, s.r), target, m);
    return { pts: scalePts(pts, kx, 1, CX, CY), inner: scalePts(innerWing(target), kx, 1, CX, CY) };
  });
  const detail = prog(t, METAMORPH.start + 0.35, METAMORPH.end + 0.1, EASE.out) * (1 - fold);
  const body = prog(t, METAMORPH.start + 0.3, METAMORPH.end, EASE.out);
  return (
    <g opacity={1 - vanish}>
      {wings.map((w, i) => (
        <path key={`fill-${i}`} d={toPath(w.pts, true)} fill={COLORS.violet} opacity={0.07 * m * (1 - fold)} />
      ))}
      <Glow intensity={intensity}>
        {wings.map((w, i) => (
          <path
            key={`wing-${i}`}
            d={toPath(w.pts, true)}
            fill="none"
            stroke={color}
            strokeWidth={STROKE.main}
            strokeLinejoin="round"
          />
        ))}
      </Glow>
      {detail > 0.01 && (
        <Glow intensity={GLOW.rest}>
          {wings.map((w, i) => (
            <path
              key={`inner-${i}`}
              d={toPath(w.inner, true)}
              fill="none"
              stroke={COLORS.violet}
              strokeWidth={STROKE.thin}
              opacity={0.6 * detail}
            />
          ))}
        </Glow>
      )}
      {body > 0.01 && (
        <g transform={`translate(${CX} ${CY}) scale(${BUTTERFLY_SCALE})`} opacity={1 - fold}>
          <Glow intensity={GLOW.active}>
            <TracedPath d={BODY.thorax} progress={body} stroke={COLORS.violet} fill="rgba(181,124,255,0.28)" />
            <TracedPath d={BODY.antennaRight} progress={body} stroke={COLORS.violet} strokeWidth={STROKE.thin} />
            <TracedPath d={BODY.antennaLeft} progress={body} stroke={COLORS.violet} strokeWidth={STROKE.thin} />
            <circle
              cy={BODY.head.cy}
              r={BODY.head.r * body}
              fill="rgba(181,124,255,0.28)"
              stroke={COLORS.violet}
              strokeWidth={STROKE.main}
            />
            {BODY.antennaTips.map(([x, y], k) => (
              <circle
                key={k}
                cx={x}
                cy={y}
                r={3 * prog(t, METAMORPH.end - 0.1, METAMORPH.end + 0.15)}
                fill={COLORS.violet}
              />
            ))}
          </Glow>
        </g>
      )}
    </g>
  );
};

/* Étincelles créatives libérées par la métamorphose */
const SPARKS = (() => {
  const rand = seeded(42);
  return Array.from({ length: 26 }, (_, i) => ({
    angle: rand() * 360,
    dist: 180 + rand() * 260,
    delay: rand() * 0.8,
    r: 1.6 + rand() * 1.8,
    life: 1.0 + rand() * 0.8,
    violet: i % 3 !== 0,
  }));
})();

const Sparks: React.FC<{ t: number }> = ({ t }) => {
  const t0 = METAMORPH.start + 0.4;
  if (t < t0 || t > t0 + 2.6) return null;
  return (
    <Glow intensity={GLOW.on}>
      {SPARKS.map((s, i) => {
        const k = prog(t, t0 + s.delay, t0 + s.delay + s.life, EASE.out);
        if (k <= 0 || k >= 1) return null;
        const [x, y] = polar(CX, CY, lerp(70, s.dist, k), s.angle - 25 * k);
        return (
          <circle
            key={i}
            cx={x}
            cy={y - 40 * k}
            r={s.r}
            fill={s.violet ? COLORS.violet : COLORS.white}
            opacity={Math.sin(Math.PI * k) * 0.9}
          />
        );
      })}
    </Glow>
  );
};

/* ------------------------------------------------------------------ */
/* Acte 5 : enregistre la vidéo -> point de lumière                     */
/* ------------------------------------------------------------------ */

const SMALL = circlePts(CX, CY, 60, WING_SAMPLES);

const Outro: React.FC<{ t: number }> = ({ t }) => {
  if (t < BOOKMARK_UNFOLD.start) return null;
  const unfold = prog(t, BOOKMARK_UNFOLD.start, BOOKMARK_UNFOLD.end, EASE.overshoot);
  const toCircle = prog(t, CUE.aBientot, CUE.aBientot + 0.5, EASE.inOut);
  const shrink = prog(t, CUE.aBientot + 0.45, CUE.aBientot + 1.0, EASE.inOut);
  const mark = scalePts(BOOKMARK, lerp(0.05, 1, unfold), lerp(1.3, 1, unfold), CX, CY);
  const pts = morph(mark, SMALL, toCircle);
  const color = mixColor(t, CUE.video - 0.05, CUE.video + 0.35, COLORS.white, COLORS.blue);
  const stroke = toCircle > 0 ? mixColor(toCircle, 0, 1, color, COLORS.white) : color;
  const fillUp = prog(t, CUE.video, CUE.video + 0.7, EASE.out) * (1 - toCircle);
  const check =
    prog(t, CUE.oublier - 0.05, CUE.oublier + 0.4, EASE.out) * (1 - prog(t, CUE.aBientot, CUE.aBientot + 0.3));
  const intensity = GLOW.on + 0.45 * prog(t, CUE.oublier, CUE.oublier + 0.3) * (1 - toCircle);
  const shapeOpacity = (1 - shrink) * prog(t, BOOKMARK_UNFOLD.start, BOOKMARK_UNFOLD.start + 0.1);
  const markTop = CY - 100;
  const markBottom = CY + 100;
  // Point final (boucle avec l'ouverture)
  const dotR = lerp(14, 8, prog(t, CUE.aBientot + 0.9, CUE.aBientot + 1.4, EASE.out));
  return (
    <g>
      <defs>
        <clipPath id="mark-clip">
          <path d={toPath(pts, true)} />
        </clipPath>
        <linearGradient id="mark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={COLORS.blue} stopOpacity={0.45} />
          <stop offset="1" stopColor={COLORS.blue} stopOpacity={0.12} />
        </linearGradient>
      </defs>
      {fillUp > 0.01 && (
        <g clipPath="url(#mark-clip)">
          <rect x={CX - 80} y={lerp(markBottom, markTop, fillUp)} width={160} height={markBottom - markTop} fill="url(#mark-fill)" />
        </g>
      )}
      {shapeOpacity > 0.01 && (
        <g opacity={shapeOpacity}>
          <Glow intensity={intensity * breathe(t)}>
            <path d={toPath(pts, true)} fill="none" stroke={stroke} strokeWidth={STROKE.main} strokeLinejoin="round" />
          </Glow>
        </g>
      )}
      {check > 0.01 && (
        <Glow intensity={GLOW.active}>
          <TracedPath
            d={CHECK_PATH}
            progress={check}
            stroke={COLORS.white}
            strokeWidth={STROKE.bold}
            transform={`translate(${CX} ${CY - 16})`}
          />
        </Glow>
      )}
      {shrink > 0.01 && (
        <g opacity={shrink}>
          <Orb x={CX} y={CY} r={dotR} intensity={(GLOW.on + 0.3) * breathe(t, 1)} />
        </g>
      )}
      {[0, 0.42, 0.84].map((d) => (
        <Ripple key={d} t={t} start={CUE.nouvelles + d} from={12} to={RING_R * 1.1} dur={1.5} />
      ))}
    </g>
  );
};

/* ------------------------------------------------------------------ */

const cameraZoom = (t: number) => {
  // Accroche : on démarre serré sur le point de lumière et la caméra recule pendant que la comète trace l'ensō.
  const hook = lerp(1.2, 1, prog(t, 0, HOOK.land + 0.2, EASE.out));
  const drift = keyframes(t, [
    [0, CAMERA.zoomFrom],
    [CUE.quatre, CAMERA.zoomFrom + 0.06],
    [CUE.quatre + 0.9, CAMERA.zoomFrom],
    [CUE.pleinement, CAMERA.zoomFrom + 0.04],
    [METAMORPH.end, CAMERA.zoomFrom + 0.01],
    [IKIGAI_DURATION_SEC, CAMERA.zoomTo],
  ]);
  return hook * drift;
};

const ambientLights = (t: number): AmbientLight[] => {
  const violet = prog(t, CUE.epanouir - 0.05, CUE.epanouir + 0.5) * (1 - prog(t, CUE.hesite, CUE.hesite + 0.4));
  const yellowTitle = prog(t, CUE.ikigai, CUE.ikigai + 0.5) * (1 - prog(t, CUE.elle, CUE.elle + 0.4));
  const yellowCore = prog(t, CUE.equilibre, CUE.equilibre + 0.6) * (1 - prog(t, CUE.etDe, CUE.pleinement));
  const blue = prog(t, CUE.video, CUE.video + 0.5) * (1 - prog(t, CUE.aBientot, CUE.aBientot + 0.5));
  const base =
    0.6 +
    0.5 * (1 - prog(t, 0, 0.8)) +
    0.4 * prog(t, HOOK.travel, HOOK.arrive) +
    0.35 * prog(t, CUE.bonheur, CUE.bonheur + 0.5) * (1 - prog(t, CUE.si, CUE.volonte));
  const white = base * (1 - Math.max(yellowTitle, yellowCore, blue, violet) * 0.6);
  return [
    { color: COLORS.white, level: white },
    { color: COLORS.yellow, level: Math.max(yellowTitle, yellowCore) * 0.9 },
    { color: COLORS.blue, level: blue * 0.9 },
    { color: COLORS.violet, level: violet * 1.1 },
  ];
};

export const Ikigai: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bgEdge }}>
      <Audio src={staticFile('audio/ikigai-voix-off-edit.wav')} volume={AUDIO.voice} />
      <SoundDesign durationSec={IKIGAI_DURATION_SEC} />
      <Stage zoom={cameraZoom(t)} ambient={ambientLights(t)} overlay={<Subtitles t={t} screens={CAPTIONS} />}>
        <svg width={VIDEO.width} height={VIDEO.height} viewBox={`0 0 ${VIDEO.width} ${VIDEO.height}`}>
          <GlowDefs />
          <ActOne t={t} frame={frame} fps={fps} />
          <Petals t={t} frame={frame} fps={fps} />
          <Compass t={t} frame={frame} fps={fps} />
          <Butterfly t={t} frame={frame} fps={fps} />
          <Sparks t={t} />
          <Outro t={t} />
        </svg>
        <Title t={t} />
      </Stage>
    </AbsoluteFill>
  );
};

export const ikigaiDurationInFrames = Math.round(IKIGAI_DURATION_SEC * VIDEO.fps);
