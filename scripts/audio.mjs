#!/usr/bin/env node
/*
 * Procedural soundtrack, synced to the cue times in src/timeline.js.
 * Soft pad + whooshes on transitions + sub impacts on reveals + UI ticks.
 * Writes out/soundtrack.wav (48 kHz, 16-bit stereo). No samples, no deps.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SR = 48000;
const DUR = 24;
const N = SR * DUR;
const L = new Float32Array(N);
const R = new Float32Array(N);
const busRev = new Float32Array(N); // mono send to reverb

let seed = 7;
const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

function add(i, v, pan = 0, rev = 0) {
  if (i < 0 || i >= N) return;
  L[i] += v * (1 - pan) * 0.5 * 2 ** 0.5;
  R[i] += v * (1 + pan) * 0.5 * 2 ** 0.5;
  busRev[i] += v * rev;
}

/* ── Pad: warm chords, slow swells ─────────────────────────────── */
const CHORDS = [
  { t: 0.0, notes: [41, 48, 55, 60], dark: true }, // tension under "noisy"
  { t: 3.25, notes: [53, 57, 60, 64, 69] }, // Fmaj7 — Meet Lumen
  { t: 6.1, notes: [50, 57, 60, 64, 65] }, // Dm9
  { t: 9.0, notes: [46, 53, 57, 62, 65] }, // Bbmaj7
  { t: 14.0, notes: [48, 55, 60, 64, 67] }, // C — the stat
  { t: 17.0, notes: [45, 52, 57, 60, 64] }, // Am7
  { t: 20.65, notes: [41, 53, 57, 60, 64, 67] }, // Fmaj9 — end card
];
CHORDS.forEach((c, ci) => {
  const start = c.t;
  const end = CHORDS[ci + 1]?.t ?? DUR;
  const a = Math.floor((start - 0.05) * SR);
  const b = Math.min(N, Math.floor((end + 0.6) * SR));
  c.notes.forEach((m, ni) => {
    const f = midi(m);
    const detune = [0.997, 1.003];
    const pan = (ni / (c.notes.length - 1 || 1)) * 1.2 - 0.6;
    const ph = [noise() * 3, noise() * 3];
    for (let i = a; i < b; i++) {
      const t = (i - a) / SR;
      const atk = Math.min(1, t / (c.dark ? 1.4 : 0.5));
      const rel = Math.min(1, Math.max(0, (end + 0.6 - i / SR) / 0.6));
      const env = atk * atk * rel;
      let v = 0;
      for (let d = 0; d < 2; d++) {
        const p = 2 * Math.PI * f * detune[d] * t + ph[d];
        v += Math.sin(p) + 0.25 * Math.sin(2 * p) + 0.08 * Math.sin(3 * p);
      }
      const trem = 1 + 0.12 * Math.sin(2 * Math.PI * 0.3 * t + ni);
      add(i, v * env * trem * 0.017 * (m < 48 ? 1.4 : 1), pan, 0.5);
    }
  });
});

/* ── Whoosh: band-passed noise with a swept centre frequency ──── */
function whoosh(tEnd, len = 0.6, { f0 = 300, f1 = 4000, gain = 0.22, pan0 = -0.5, pan1 = 0.5, reverse = true } = {}) {
  const a = Math.floor((tEnd - len) * SR);
  const n = Math.floor((len + 0.25) * SR);
  let lp = 0, bp = 0;
  for (let k = 0; k < n; k++) {
    const x = Math.min(1, k / (len * SR));
    const env = reverse ? (x < 1 ? Math.pow(x, 2.2) : Math.exp(-((k - len * SR) / SR) * 22)) : Math.exp(-x * 3) * Math.min(1, k / 400);
    const fc = f0 * Math.pow(f1 / f0, reverse ? x : 1 - x);
    const fq = 2 * Math.sin((Math.PI * Math.min(fc, 12000)) / SR);
    const q = 0.35;
    const hp = noise() - lp - q * bp;
    bp += fq * hp;
    lp += fq * bp;
    add(a + k, bp * env * gain, pan0 + (pan1 - pan0) * x, 0.35);
  }
}

/* ── Impact: sub drop + soft transient ────────────────────────── */
function impact(t, gain = 0.5) {
  gain *= 0.4;
  const a = Math.floor(t * SR);
  let ph = 0;
  for (let k = 0; k < SR * 1.6; k++) {
    const s = k / SR;
    const f = 38 + 70 * Math.exp(-s * 18);
    ph += (2 * Math.PI * f) / SR;
    const env = Math.exp(-s * 2.6) * Math.min(1, k / 60);
    const click = noise() * Math.exp(-s * 160) * 0.25;
    add(a + k, (Math.sin(ph) * env + click) * gain, 0, 0.15);
  }
}

/* ── UI tick / pop ────────────────────────────────────────────── */
function tick(t, f = 1800, gain = 0.09, pan = 0, decay = 55) {
  const a = Math.floor(t * SR);
  for (let k = 0; k < SR * 0.25; k++) {
    const s = k / SR;
    const env = Math.exp(-s * decay) * Math.min(1, k / 30);
    const v = Math.sin(2 * Math.PI * f * s) * 0.8 + Math.sin(2 * Math.PI * f * 2.01 * s) * 0.2;
    add(a + k, v * env * gain * 1.5, pan, 0.4);
  }
}
function chime(t, notes, gain = 0.07) {
  notes.forEach((m, i) => tick(t + i * 0.07, midi(m), gain, (i - 1) * 0.3, 7));
}

/* ── Cue sheet (mirrors src/timeline.js) ──────────────────────── */
// A · words + notification chips
[0.15, 0.37, 0.59].forEach((t, i) => tick(t + 0.05, 900 + i * 120, 0.05, 0, 40));
for (let i = 0; i < 9; i++) tick(0.95 + i * 0.13, 1500 + ((i * 7) % 5) * 180, 0.055, i % 2 ? 0.5 : -0.5, 60);
whoosh(3.25, 0.75, { f0: 6000, f1: 300, gain: 0.3, pan0: 0, pan1: 0 }); // implosion
impact(3.28, 0.55);
chime(3.4, [77, 81, 84], 0.05);
// B
tick(3.95, 1200, 0.04); tick(4.15, 1350, 0.04);
whoosh(6.05, 0.5, { gain: 0.16, f0: 500, f1: 5000, pan0: 0.4, pan1: -0.4 });
// C · lines + slot swaps
tick(6.12, 1100, 0.04, -0.3); tick(6.32, 1250, 0.04, 0.3);
[6.5, 7.15, 7.6, 8.05].forEach((t, i) => tick(t, 1400 + i * 160, 0.06, 0, 50));
whoosh(9.0, 0.45, { gain: 0.2, f0: 800, f1: 6000 });
// D · card + captions + taps
whoosh(9.45, 0.4, { gain: 0.14, f0: 200, f1: 2500, reverse: false, pan0: 0, pan1: 0 });
[9.35, 10.65, 11.8].forEach((t) => tick(t + 0.02, 1000, 0.045, 0, 35));
for (let i = 0; i < 7; i++) tick(10.75 + i * 0.07, 900 + i * 110, 0.035, -0.6 + i * 0.2, 70);
[11.85, 12.25, 12.65].forEach((t, i) => tick(t, midi(84 + i * 3), 0.08, -0.2, 28));
chime(12.95, [84, 88, 91], 0.06);
whoosh(13.85, 0.6, { gain: 0.28, f0: 400, f1: 7000, pan0: 0, pan1: 0 });
// E · stat
impact(14.25, 0.6);
tick(14.85, 1000, 0.04);
whoosh(17.0, 0.45, { gain: 0.18 });
// F · cards
for (let i = 0; i < 4; i++) tick(17.45 + i * 0.11, 1300 + i * 140, 0.05, i % 2 ? 0.4 : -0.4, 45);
whoosh(20.6, 0.5, { gain: 0.22, f0: 6000, f1: 400, pan0: 0, pan1: 0 });
// G · end card
impact(20.7, 0.5);
chime(20.85, [77, 81, 84, 89], 0.05);
tick(21.85, 1600, 0.06, 0, 40);

/* ── Reverb: Schroeder (4 combs + 2 allpasses) ────────────────── */
function reverb(input, combs, aps, fb = 0.82, damp = 0.35) {
  const out = new Float32Array(N);
  for (const d of combs) {
    const buf = new Float32Array(d);
    let idx = 0, filt = 0;
    for (let i = 0; i < N; i++) {
      const y = buf[idx];
      filt = y * (1 - damp) + filt * damp;
      buf[idx] = input[i] + filt * fb;
      out[i] += y * 0.25;
      idx = (idx + 1) % d;
    }
  }
  for (const d of aps) {
    const buf = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < N; i++) {
      const b = buf[idx];
      const y = -out[i] + b;
      buf[idx] = out[i] + b * 0.5;
      out[i] = y;
      idx = (idx + 1) % d;
    }
  }
  return out;
}
const revL = reverb(busRev, [1557, 1617, 1491, 1422].map((d) => d * 2), [225, 556]);
const revR = reverb(busRev, [1580, 1640, 1514, 1445].map((d) => d * 2), [248, 579]);

/* ── Master: mix, gentle saturation, fade, normalise ──────────── */
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fade = Math.min(1, t / 0.05) * Math.min(1, Math.max(0, (DUR - t) / 0.9));
  L[i] = Math.tanh((L[i] + revL[i] * 0.45) * 1.4) * fade;
  R[i] = Math.tanh((R[i] + revR[i] * 0.45) * 1.4) * fade;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const norm = 0.89 / peak; // ≈ -1 dBFS

const data = Buffer.alloc(44 + N * 4);
data.write('RIFF', 0); data.writeUInt32LE(36 + N * 4, 4); data.write('WAVE', 8);
data.write('fmt ', 12); data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(2, 22);
data.writeUInt32LE(SR, 24); data.writeUInt32LE(SR * 4, 28); data.writeUInt16LE(4, 32); data.writeUInt16LE(16, 34);
data.write('data', 36); data.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * norm)) * 32767), 44 + i * 4);
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * norm)) * 32767), 46 + i * 4);
}
const out = resolve(root, 'out/soundtrack.wav');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, data);
console.log('  →', out);
