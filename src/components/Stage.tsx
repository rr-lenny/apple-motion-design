import React, { useLayoutEffect, useRef } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { seeded } from '../lib/motion';
import { AMBIENT, CAMERA, COLORS, GRAIN, LAYOUT, VIDEO, VIGNETTE } from '../theme';

/** Grain de film fin, régénéré à chaque image (déterministe). */
export const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  const w = Math.ceil(VIDEO.width / GRAIN.size);
  const h = Math.ceil(VIDEO.height / GRAIN.size);

  useLayoutEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(w, h);
    const rand = seeded(frame * 7919 + 17);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      // distribution asymétrique : surtout des grains sombres, quelques grains clairs
      const r = rand();
      const v = r * r * 255;
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
      d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, [frame, w, h]);

  return (
    <canvas
      ref={ref}
      width={w}
      height={h}
      style={{
        position: 'absolute',
        inset: 0,
        width: VIDEO.width,
        height: VIDEO.height,
        opacity: GRAIN.opacity,
        pointerEvents: 'none',
      }}
    />
  );
};

const hexToRgb = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
};

export type AmbientLight = {
  color: string;
  /** 0-1, multiplié par AMBIENT.opacity (~15 %). */
  level: number;
  x?: number;
  y?: number;
  radius?: number;
};

/**
 * Plateau : fond noir profond, halo ambiant derrière le sujet, caméra (dérive + parallax),
 * vignettage léger et grain.
 */
export const Stage: React.FC<{
  zoom: number;
  ambient: AmbientLight[];
  overlay?: React.ReactNode;
  children: React.ReactNode;
}> = ({ zoom, ambient, overlay, children }) => {
  const bgZoom = 1 + (zoom - 1) * CAMERA.parallax;
  const origin = `${LAYOUT.focusX}px ${LAYOUT.focusY}px`;
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <AbsoluteFill style={{ transform: `scale(${bgZoom})`, transformOrigin: origin }}>
        {ambient
          .filter((a) => a.level > 0.002)
          .map((a, i) => {
            const r = a.radius ?? AMBIENT.radius;
            const x = a.x ?? LAYOUT.focusX;
            const y = a.y ?? LAYOUT.focusY;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: x - r,
                  top: y - r,
                  width: 2 * r,
                  height: 2 * r,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, rgba(${hexToRgb(a.color)}, ${
                    AMBIENT.opacity * a.level
                  }) 0%, rgba(${hexToRgb(a.color)}, ${AMBIENT.opacity * a.level * 0.3}) 30%, rgba(${hexToRgb(
                    a.color,
                  )}, 0) 66%)`,
                }}
              />
            );
          })}
      </AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: origin }}>{children}</AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 75% 60% at 50% ${(LAYOUT.focusY / VIDEO.height) * 100}%, rgba(0,0,0,0) ${
            VIGNETTE.inner * 100
          }%, rgba(0,0,0,${VIGNETTE.strength}) 100%)`,
        }}
      />
      {overlay}
      <Grain />
    </AbsoluteFill>
  );
};
