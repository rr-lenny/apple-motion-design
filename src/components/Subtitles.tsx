import React from 'react';
import { AbsoluteFill } from 'remotion';
import { prog } from '../lib/motion';
import { COLORS, ColorName, EASE, FONT, LAYOUT, VIDEO } from '../theme';

export type TimedWord = { w: string; t: number; e: number };

type CaptionChar = { ch: string; t: number; color: ColorName };
type CaptionWord = { t: number; chars: CaptionChar[] };
export type CaptionScreen = { start: number; end: number; lines: CaptionWord[][] };

const MARK: Record<string, ColorName> = { y: 'yellow', b: 'blue', g: 'green', r: 'red' };

const normalize = (s: string) =>
  s
    .replace(/\{\w:([^}]*)\}/g, '$1')
    .toLowerCase()
    .normalize('NFC')
    .replace(/[.,;:!?…«»"]/g, '')
    .replace(/[’]/g, "'");

/** "l'{y:IKIGAI}." -> [{text:"l'", color:white}, {text:"IKIGAI", color:yellow}, {text:".", color:white}] */
const parseWord = (raw: string): Array<{ text: string; color: ColorName }> => {
  const out: Array<{ text: string; color: ColorName }> = [];
  const re = /\{(\w):([^}]*)\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    if (m.index > last) out.push({ text: raw.slice(last, m.index), color: 'white' });
    out.push({ text: m[2], color: MARK[m[1]] ?? 'white' });
    last = m.index + m[0].length;
  }
  if (last < raw.length) out.push({ text: raw.slice(last), color: 'white' });
  return out;
};

/**
 * Construit les écrans de sous-titres à partir du découpage éditorial (`screens`)
 * et des temps de chaque mot de la voix off.
 * Syntaxe : " / " = retour à la ligne, "{y:mot}" = mot coloré (y, b, g, r).
 */
export const buildCaptions = (screens: string[], words: TimedWord[], endTime: number): CaptionScreen[] => {
  let cursor = 0;
  const built = screens.map((screen) => {
    const lines: CaptionWord[][] = [[]];
    const tokens = screen.split(/\s+/).filter(Boolean);
    for (const token of tokens) {
      if (token === '/') {
        lines.push([]);
        continue;
      }
      const word = words[cursor];
      if (!word || normalize(word.w) !== normalize(token)) {
        throw new Error(`Sous-titres : « ${token} » ne correspond pas au mot ${cursor} de la voix off (« ${word?.w} »).`);
      }
      const next = words[cursor + 1];
      const plain = parseWord(token).flatMap((p) => [...p.text].map((ch) => ({ ch, color: p.color })));
      const room = (next ? next.t : word.e) - word.t;
      const perChar = Math.min(FONT.typeCharSec, room / Math.max(1, plain.length));
      lines[lines.length - 1].push({ t: word.t, chars: plain.map((c, i) => ({ ...c, t: word.t + i * perChar })) });
      cursor++;
    }
    return { start: lines[0][0]?.t ?? 0, end: 0, lines };
  });
  if (cursor !== words.length) {
    throw new Error(`Sous-titres : ${words.length - cursor} mot(s) de la voix off non placés.`);
  }
  built.forEach((s, i) => {
    s.end = i < built.length - 1 ? built[i + 1].start : endTime;
  });
  return built;
};

const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

const charStyle = (c: CaptionChar, k: number): React.CSSProperties => {
  const color = COLORS[c.color];
  const accent = c.color !== 'white';
  return {
    color,
    opacity: k,
    textShadow: `0 0 ${FONT.glowBlur}px ${rgba(color, accent ? 0.75 : 0.5)}, 0 0 ${FONT.glowBlur * 3}px ${rgba(
      color,
      accent ? 0.35 : 0.18,
    )}`,
  };
};

/**
 * Sous-titres synchronisés mot à mot sur la voix off, sortie en fondu rapide.
 * Mode 'word' : chaque mot apparaît en fondu + flou + légère montée quand il est prononcé.
 * Mode 'type' : machine à écrire, lettre par lettre.
 */
export const Subtitles: React.FC<{ t: number; screens: CaptionScreen[] }> = ({ t, screens }) => {
  const screen = screens.find((s) => t >= s.start && t < s.end);
  if (!screen) return null;
  const out = 1 - prog(t, screen.end - FONT.exitSec, screen.end, EASE.in);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          left: LAYOUT.safeX,
          width: VIDEO.width - 2 * LAYOUT.safeX,
          top: LAYOUT.subtitleY,
          transform: 'translateY(-50%)',
          textAlign: 'center',
          fontFamily: FONT.family,
          fontWeight: FONT.weight,
          fontSize: FONT.size,
          lineHeight: FONT.lineHeight,
          letterSpacing: FONT.tracking,
          whiteSpace: 'pre',
          opacity: out,
        }}
      >
        {screen.lines.map((line, li) => (
          <div key={li}>
            {line.map((w, wi) => {
              const space = wi < line.length - 1 ? ' ' : '';
              if (FONT.captionMode === 'type') {
                return (
                  <React.Fragment key={wi}>
                    {w.chars.map((c, ci) => (
                      <span key={ci} style={charStyle(c, prog(t, c.t, c.t + FONT.typeFadeSec, EASE.out))}>
                        {c.ch}
                      </span>
                    ))}
                    {space}
                  </React.Fragment>
                );
              }
              const k = prog(t, w.t, w.t + FONT.wordEnterSec, EASE.out);
              return (
                <React.Fragment key={wi}>
                  <span
                    style={{
                      display: 'inline-block',
                      opacity: k,
                      filter: k < 1 ? `blur(${FONT.enterBlur * (1 - k)}px)` : undefined,
                      transform: `translateY(${FONT.enterRise * (1 - k)}px)`,
                    }}
                  >
                    {w.chars.map((c, ci) => (
                      <span key={ci} style={charStyle(c, 1)}>
                        {c.ch}
                      </span>
                    ))}
                  </span>
                  {space}
                </React.Fragment>
              );
            })}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
