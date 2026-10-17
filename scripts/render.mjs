// Rendu image par image du short : node scripts/render.mjs [--stills 0.5,10,15] [--out out]
// Capture chaque image avec Chromium (Playwright), puis assemble la vidéo avec ffmpeg.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  const globalRoot = execFileSync("npm", ["root", "-g"]).toString().trim();
  ({ chromium } = require(path.join(globalRoot, "playwright")));
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith("--") ? [...acc, [a.slice(2), all[i + 1]]] : acc), [])
);
const OUT = path.resolve(args.out || path.join(ROOT, "out"));
const WORKERS = Number(args.workers || 4);
const W = 1080, H = 1920, FPS = 60, DURATION = 24;
const url = pathToFileURL(path.join(ROOT, "short/index.html")).href + "?render=1";

const browser = await chromium.launch({ args: ["--force-color-profile=srgb", "--font-render-hinting=none"] });
async function newPage() {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  return page;
}
async function shoot(page, t, file) {
  await page.evaluate((t) => window.renderAt(t), t);
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: W, height: H } });
}

fs.mkdirSync(OUT, { recursive: true });

if (args.stills) {
  const page = await newPage();
  for (const t of args.stills.split(",").map(Number)) {
    const file = path.join(OUT, `still-${t.toFixed(2)}.png`);
    await shoot(page, t, file);
    console.log(file);
  }
  await browser.close();
  process.exit(0);
}

const framesDir = path.join(OUT, "frames");
fs.rmSync(framesDir, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });

const total = FPS * DURATION;
let next = 0, done = 0;
const started = Date.now();
await Promise.all(
  Array.from({ length: WORKERS }, async () => {
    const page = await newPage();
    while (next < total) {
      const i = next++;
      await shoot(page, i / FPS, path.join(framesDir, `${String(i).padStart(5, "0")}.png`));
      if (++done % 120 === 0) console.log(`${done}/${total} images (${((Date.now() - started) / 1000).toFixed(0)} s)`);
    }
    await page.close();
  })
);
await browser.close();

const music = path.join(OUT, "music.wav");
const video = path.join(OUT, "short.mp4");
execFileSync(
  "ffmpeg",
  [
    "-y", "-loglevel", "error",
    "-framerate", String(FPS), "-i", path.join(framesDir, "%05d.png"),
    ...(fs.existsSync(music) ? ["-i", music] : []),
    "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p",
    "-profile:v", "high", "-r", String(FPS),
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
    ...(fs.existsSync(music) ? ["-c:a", "aac", "-b:a", "192k", "-shortest"] : []),
    "-movflags", "+faststart",
    video,
  ],
  { stdio: "inherit" }
);
fs.rmSync(framesDir, { recursive: true, force: true });
console.log(video);
