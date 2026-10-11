#!/usr/bin/env node
/*
 * Frame-accurate renderer: drives renderAt(t) in headless Chromium and pipes
 * screenshots to ffmpeg.
 *
 * Real motion blur: each output frame is the average of SUB sub-frames spread
 * across a 180° shutter (like a film camera), so fast moves smear naturally.
 *
 *   node scripts/render.mjs                       # full quality → out/lumen-short.mp4
 *   node scripts/render.mjs --fps 30 --sub 1      # fast draft
 *   node scripts/render.mjs --stills 1,4.2,10     # PNG stills to out/stills
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import os from 'node:os';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
    return acc;
  }, [])
);

const FPS = Number(args.fps || 60);
const SUB = Number(args.sub || 4); // sub-frames per output frame
const SHUTTER = 0.5; // fraction of the frame interval the "shutter" is open
const WORKERS = Number(args.workers || Math.max(1, Math.min(4, os.cpus().length)));
const OUT = resolve(root, args.out || 'out/lumen-short.mp4');
const AUDIO = args.audio === undefined ? resolve(root, 'out/soundtrack.wav') : args.audio === 'none' ? null : resolve(root, args.audio);
const pageUrl = pathToFileURL(join(root, 'index.html')).href + '?render';

const browserOpts = {
  args: ['--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none'],
};

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto(pageUrl);
  await page.evaluate(() => document.fonts.ready);
  const cdp = await page.context().newCDPSession(page);
  const shot = async (t) => {
    await page.evaluate((tt) => window.renderAt(tt), t);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
    return Buffer.from(data, 'base64');
  };
  return { page, shot };
}

function ffmpeg(argv) {
  const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...argv], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => p.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}`)))));
  return { stdin: p.stdin, done };
}

const write = (stream, buf) => new Promise((res) => (stream.write(buf) ? res() : stream.once('drain', res)));

async function stills(times) {
  const dir = resolve(root, 'out/stills');
  mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch(browserOpts);
  const { shot } = await openPage(browser);
  for (const t of times) {
    const file = join(dir, `t${t.toFixed(2).padStart(5, '0')}.png`);
    writeFileSync(file, await shot(t));
    console.log('still', file);
  }
  await browser.close();
}

async function video() {
  const duration = await (async () => {
    const b = await chromium.launch(browserOpts);
    const { page } = await openPage(b);
    const d = await page.evaluate(() => window.DURATION);
    await b.close();
    return d;
  })();

  const frames = Math.round(duration * FPS);
  const tmp = resolve(root, 'out/.segments');
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });

  const per = Math.ceil(frames / WORKERS);
  const t0 = Date.now();
  let doneFrames = 0;
  const browser = await chromium.launch(browserOpts);

  // Each worker renders a contiguous chunk of output frames into a
  // near-lossless intermediate; sub-frames are blended in ffmpeg (tmix).
  const segs = await Promise.all(
    Array.from({ length: WORKERS }, async (_, w) => {
      const a = w * per;
      const b = Math.min(frames, a + per);
      if (a >= b) return null;
      const file = join(tmp, `seg${w}.mkv`);
      const enc = ffmpeg([
        '-f', 'image2pipe', '-framerate', String(FPS * SUB), '-c:v', 'png', '-i', '-',
        '-vf', SUB > 1 ? `tmix=frames=${SUB},select='not(mod(n+1\\,${SUB}))',setpts=N/${FPS}/TB` : 'null',
        '-r', String(FPS),
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '8', '-pix_fmt', 'yuv444p',
        file,
      ]);
      const { shot } = await openPage(browser);
      for (let f = a; f < b; f++) {
        for (let s = 0; s < SUB; s++) {
          // sub-frames centred on the frame time, spanning the shutter
          const off = SUB > 1 ? (s / (SUB - 1) - 0.5) * SHUTTER : 0;
          await write(enc.stdin, await shot((f + off) / FPS));
        }
        doneFrames++;
        if (doneFrames % 30 === 0) {
          const el = (Date.now() - t0) / 1000;
          process.stdout.write(`\r  ${doneFrames}/${frames} frames · ${el.toFixed(0)}s elapsed · ~${((el / doneFrames) * (frames - doneFrames)).toFixed(0)}s left   `);
        }
      }
      enc.stdin.end();
      await enc.done;
      return file;
    })
  );
  await browser.close();
  console.log(`\n  rendered in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

  const list = join(tmp, 'list.txt');
  writeFileSync(list, segs.filter(Boolean).map((f) => `file '${f}'`).join('\n'));
  mkdirSync(dirname(OUT), { recursive: true });
  const hasAudio = AUDIO && existsSync(AUDIO);
  const fin = ffmpeg([
    '-f', 'concat', '-safe', '0', '-i', list,
    ...(hasAudio ? ['-i', AUDIO] : []),
    '-map', '0:v', ...(hasAudio ? ['-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p',
    '-profile:v', 'high', '-movflags', '+faststart',
    OUT,
  ]);
  fin.stdin.end();
  await fin.done;
  rmSync(tmp, { recursive: true, force: true });
  console.log(`  → ${OUT}${hasAudio ? ' (with soundtrack)' : ''}`);
}

if (args.stills) await stills(String(args.stills).split(',').map(Number));
else await video();
