// Renders index.html frame by frame into an MP4 with synthesized sound design.
// Usage: node render.mjs [out.mp4] [--preview "t1,t2,..."]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const previewIdx = args.indexOf('--preview');
const out = resolve(args.find((a, i) => !a.startsWith('--') && i !== previewIdx + 1) ?? 'output/slow.mp4');
mkdirSync(dirname(out), { recursive: true });

const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(pathToFileURL(resolve(here, 'index.html')).href + '?render');
await page.evaluate(() => window.ready);
const { duration, fps, sfx } = await page.evaluate(() => ({ duration: window.DURATION, fps: window.FPS, sfx: window.SFX }));

const grab = t => page.evaluate(t => { window.render(t); return document.getElementById('c').toDataURL('image/png').slice(22); }, t);

if (previewIdx >= 0) {
  for (const t of args[previewIdx + 1].split(',').map(Number)) {
    writeFileSync(out.replace(/\.mp4$/, '') + `_${t.toFixed(2)}.png`, Buffer.from(await grab(t), 'base64'));
  }
  await browser.close();
  process.exit(0);
}

// ── Sound design ──────────────────────────────────────────────────────────
const SR = 48000, N = Math.ceil((duration + .5) * SR);
const L = new Float32Array(N);
let seed = 1; const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
function add(t0, len, fn, gain = 1) {
  const s0 = Math.floor(t0 * SR);
  for (let i = 0; i < len * SR && s0 + i < N; i++) L[s0 + i] += fn(i / SR) * gain;
}
const sweep = (f0, f1, dur, decay) => { let ph = 0; return t => { ph += 2 * Math.PI * (f1 + (f0 - f1) * Math.exp(-t / dur)) / SR; return Math.sin(ph) * Math.exp(-t / decay); }; };
const SOUNDS = {
  pop: t0 => add(t0, .12, sweep(1400, 420, .015, .035), .35),
  tick: t0 => { let prev = 0; add(t0, .03, t => { const n = noise(); const hp = n - prev; prev = n; return hp * Math.exp(-t / .006); }, .22); },
  thud: t0 => add(t0, .45, sweep(160, 42, .04, .16), .8),
  slam: t0 => { add(t0, .5, sweep(200, 38, .03, .2), 1); let lp = 0; add(t0, .25, t => (lp += (noise() - lp) * .25) * Math.exp(-t / .06), .5); },
  whoosh: t0 => { let lp = 0; add(t0, .4, t => { lp += (noise() - lp) * (.03 + .25 * Math.sin(Math.PI * t / .4)); return lp * Math.sin(Math.PI * t / .4) ** 2; }, .9); },
  glitch: t0 => add(t0, .28, t => (Math.sign(Math.sin(2 * Math.PI * (220 + 900 * Math.floor(t * 40 % 3)) * t)) * .5 + noise() * .3) * Math.exp(-t / .1), .18),
  bubble: t0 => add(t0, .15, sweep(500, 900, .02, .05), .3),
  select: t0 => add(t0, .1, t => Math.sin(2 * Math.PI * 2200 * t) * Math.exp(-t / .02), .12),
};
for (const { t, type } of sfx) SOUNDS[type]?.(t);
// soft pad underneath
const pad = [55, 82.4, 110, 164.8];
for (let i = 0; i < N; i++) {
  const t = i / SR, env = Math.min(1, t / 1.5) * Math.min(1, Math.max(0, (duration - t) / 1.5));
  L[i] += pad.reduce((a, f, k) => a + Math.sin(2 * Math.PI * f * t + k) * (k ? .012 : .03), 0) * env;
}
let peak = 0; for (const v of L) peak = Math.max(peak, Math.abs(v));
const wav = Buffer.alloc(44 + N * 2);
wav.write('RIFF', 0); wav.writeUInt32LE(36 + N * 2, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(SR, 24); wav.writeUInt32LE(SR * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) wav.writeInt16LE(Math.round(Math.tanh(L[i] / peak * 1.2) * .85 * 32767), 44 + i * 2);
const wavPath = out.replace(/\.mp4$/, '.wav');
writeFileSync(wavPath, wav);

// ── Video ─────────────────────────────────────────────────────────────────
const frames = Math.round(duration * fps);
const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-i', wavPath,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k',
  '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
for (let f = 0; f < frames; f++) {
  const buf = Buffer.from(await grab(f / fps), 'base64');
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % 60 === 0) process.stdout.write(`frame ${f}/${frames}\n`);
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close();
console.log('wrote', out);
