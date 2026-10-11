#!/usr/bin/env node
/*
 * v2 soundtrack — 120 BPM, every edit in v2/timeline.js lands on the grid.
 * Clock tick-tock intro → beat drops at 4.5 s → lo-fi crush in the retro
 * scene with a "Not Responding" dropout → clean outro on the star.
 * Writes out/soundtrack-v2.wav (48 kHz, 16-bit stereo).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SR = 48000, DUR = 25, N = SR * DUR;
const mus = [new Float32Array(N), new Float32Array(N)]; // drums/bass/pad (gets crushed in S4)
const fx = [new Float32Array(N), new Float32Array(N)];
const rev = new Float32Array(N);

let seed = 11;
const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
const BEAT = 0.5;

function put(bus, i, v, pan = 0, r = 0) {
  if (i < 0 || i >= N) return;
  bus[0][i] += v * Math.SQRT1_2 * (1 - pan);
  bus[1][i] += v * Math.SQRT1_2 * (1 + pan);
  rev[i] += v * r;
}

/* ── Instruments ─────────────────────────────────────────────── */
function kick(t, g = 0.9) {
  const a = Math.floor(t * SR); let ph = 0;
  for (let k = 0; k < SR * 0.45; k++) {
    const s = k / SR;
    ph += (2 * Math.PI * (45 + 120 * Math.exp(-s * 30))) / SR;
    put(mus, a + k, (Math.tanh(Math.sin(ph) * 1.6) * Math.exp(-s * 7) + noise() * Math.exp(-s * 300) * 0.3) * g);
  }
}
function clap(t, g = 0.45) {
  const a = Math.floor(t * SR); let lp = 0, bp = 0;
  const f = 2 * Math.sin((Math.PI * 1400) / SR);
  for (let k = 0; k < SR * 0.3; k++) {
    const s = k / SR;
    const env = (s < 0.03 ? Math.exp(-((s % 0.01) * 400)) : 0) + Math.exp(-s * 18) * 0.8;
    const hp = noise() - lp - 0.5 * bp; bp += f * hp; lp += f * bp;
    put(mus, a + k, bp * env * g, 0, 0.3);
  }
}
function hat(t, g = 0.12, open = false, pan = 0.2) {
  const a = Math.floor(t * SR); let lp = 0;
  for (let k = 0; k < SR * (open ? 0.25 : 0.06); k++) {
    const s = k / SR, n = noise();
    lp += 0.35 * (n - lp);
    put(mus, a + k, (n - lp) * Math.exp(-s * (open ? 14 : 70)) * g, pan);
  }
}
function bass(t, m, len, g = 0.32) {
  const a = Math.floor(t * SR), f = midi(m); let ph = 0;
  for (let k = 0; k < SR * len; k++) {
    const s = k / SR;
    ph += (2 * Math.PI * f) / SR;
    const env = Math.min(1, k / 200) * Math.min(1, (len - s) / 0.04) * (0.7 + 0.3 * Math.exp(-s * 6));
    put(mus, a + k, Math.tanh((Math.sin(ph) + 0.3 * Math.sin(2 * ph)) * 1.4) * env * g);
  }
}
function pad(t0, t1, notes, g = 0.016) {
  const a = Math.floor(t0 * SR), b = Math.min(N, Math.floor(t1 * SR));
  notes.forEach((m, ni) => {
    const f = midi(m), pan = (ni / Math.max(1, notes.length - 1)) * 1.2 - 0.6, p0 = ni * 1.7;
    for (let i = a; i < b; i++) {
      const s = (i - a) / SR;
      const env = Math.min(1, s / 0.25) * Math.min(1, (t1 - i / SR) / 0.25);
      const p = 2 * Math.PI * f * s + p0;
      const v = Math.sin(p) * 0.6 + Math.sin(p * 1.004) * 0.6 + 0.2 * Math.sin(2 * p);
      put(mus, i, v * env * g, pan, 0.6);
    }
  });
}
function blip(t, f, g = 0.1, decay = 40, pan = 0, square = false, bus = fx) {
  const a = Math.floor(t * SR);
  for (let k = 0; k < SR * 0.3; k++) {
    const s = k / SR, ph = 2 * Math.PI * f * s;
    const v = square ? Math.sign(Math.sin(ph)) * 0.5 : Math.sin(ph) * 0.8 + Math.sin(ph * 2.01) * 0.2;
    put(bus, a + k, v * Math.exp(-s * decay) * Math.min(1, k / 30) * g, pan, 0.35);
  }
}
function click(t, g = 0.25, f = 1800, pan = 0) { // woody / mouse click
  const a = Math.floor(t * SR); let lp = 0, bp = 0;
  const fq = 2 * Math.sin((Math.PI * f) / SR);
  for (let k = 0; k < SR * 0.08; k++) {
    const s = k / SR;
    const hp = noise() - lp - 0.12 * bp; bp += fq * hp; lp += fq * bp;
    put(fx, a + k, bp * Math.exp(-s * 90) * g, pan, 0.2);
  }
}
function thud(t, g = 0.35) {
  const a = Math.floor(t * SR); let ph = 0;
  for (let k = 0; k < SR * 0.2; k++) {
    const s = k / SR; ph += (2 * Math.PI * (90 + 80 * Math.exp(-s * 40))) / SR;
    put(fx, a + k, (Math.sin(ph) * Math.exp(-s * 22) + noise() * Math.exp(-s * 120) * 0.4) * g, 0, 0.1);
  }
}
function whoosh(tEnd, len, { f0 = 300, f1 = 5000, g = 0.25, reverse = true, pan0 = -0.4, pan1 = 0.4 } = {}) {
  const a = Math.floor((tEnd - len) * SR), n = Math.floor((len + 0.2) * SR); let lp = 0, bp = 0;
  for (let k = 0; k < n; k++) {
    const x = Math.min(1, k / (len * SR));
    const env = reverse ? (x < 1 ? Math.pow(x, 2.4) : Math.exp(-((k - len * SR) / SR) * 25)) : Math.exp(-x * 3.5) * Math.min(1, k / 300);
    const fc = f0 * Math.pow(f1 / f0, reverse ? x : 1 - x);
    const fq = 2 * Math.sin((Math.PI * Math.min(fc, 12000)) / SR);
    const hp = noise() - lp - 0.4 * bp; bp += fq * hp; lp += fq * bp;
    put(fx, a + k, bp * env * g, pan0 + (pan1 - pan0) * x, 0.3);
  }
}
function impact(t, g = 0.5) {
  const a = Math.floor(t * SR); let ph = 0;
  for (let k = 0; k < SR * 1.5; k++) {
    const s = k / SR; ph += (2 * Math.PI * (36 + 60 * Math.exp(-s * 16))) / SR;
    put(fx, a + k, (Math.sin(ph) * Math.exp(-s * 2.8) + noise() * Math.exp(-s * 60) * 0.35) * g, 0, 0.25);
  }
}
function scribble(t0, t1, g = 0.06) { // marker on paper
  const a = Math.floor(t0 * SR), b = Math.floor(t1 * SR); let lp = 0, hpS = 0;
  for (let i = a; i < b; i++) {
    const s = (i - a) / SR, n = noise();
    lp += 0.2 * (n - lp); hpS = n - lp;
    const am = 0.5 + 0.5 * Math.sin(s * 2 * Math.PI * (9 + 4 * Math.sin(s * 7)));
    const env = Math.min(1, s / 0.03) * Math.min(1, (t1 - i / SR) / 0.05);
    put(fx, i, hpS * am * env * g, -0.2);
  }
}
const chime = (t, notes, g = 0.06, gap = 0.06) => notes.forEach((m, i) => blip(t + i * gap, midi(m), g, 6, (i - 1) * 0.3));

/* ── Arrangement ─────────────────────────────────────────────── */
// Intro — clock
for (let b = 0; b < 9; b++) click(b * BEAT, b % 2 ? 0.6 : 0.8, b % 2 ? 1300 : 2400, b % 2 ? 0.3 : -0.3);
pad(0, 4.5, [45, 52, 57], 0.012);
whoosh(4.5, 0.85, { f0: 200, f1: 7000, g: 0.3, pan0: 0, pan1: 0 });
impact(4.5, 0.55);

// Groove 4.5 → 21.5 (bars of 2 s)
const PROG = [[57, [57, 60, 64, 67]], [53, [53, 57, 60, 64]], [48, [55, 60, 64, 67]], [55, [55, 59, 62, 66]]]; // Am7 Fmaj7 C G
const crushed = (t) => t >= 13.0 && t < 17.0;
const muted = (t) => t >= 14.5 && t < 15.0;
for (let t = 4.5, bar = 0; t < 21.5 - 1e-6; t += 2, bar++) {
  const [root, chord] = PROG[bar % 4];
  pad(t, t + 2, chord, crushed(t) ? 0.012 : 0.016);
  for (let e = 0; e < 8; e++) { // eighths
    const tt = t + e * 0.25;
    if (tt >= 21.5 || muted(tt)) continue;
    if (e === 0 || e === 3 || (e === 5 && bar % 2)) kick(tt, e ? 0.7 : 0.9);
    if (e === 2 || e === 6) clap(tt);
    hat(tt + (e % 2 ? 0.012 : 0), e % 2 ? 0.1 : 0.06, e === 7 && bar % 2 === 1, e % 2 ? 0.25 : -0.15);
    if ([0, 3, 4, 6].includes(e)) bass(tt, root - 12 + (e === 6 && bar % 2 ? 7 : 0), 0.22);
  }
}

// S2 — puzzle locks
[5.0, 5.25, 5.5, 5.75, 6.0].forEach((t, i) => { click(t, 0.4, 900 + i * 60); blip(t, midi(76 + [0, 2, 4, 7, 12][i]), 0.05, 18); });
whoosh(8.0, 0.45, { g: 0.32, f0: 400, f1: 8000, pan0: 0, pan1: 0 });
impact(8.0, 0.45);

// S3 — desk
[8.0, 8.08, 8.16, 8.25, 8.33].forEach((t) => thud(t + 0.34, 0.3));
for (let i = 0; i < 8; i++) blip(8.5 + i * 0.05, 600 + i * 90, 0.05, 30, -0.4 + i * 0.1);
scribble(8.9, 9.45); scribble(9.75, 10.3);
blip(10.25, 1500, 0.1, 25); thud(10.25, 0.2);
scribble(10.5, 10.85, 0.04);
chime(11.0, [84, 91], 0.08, 0.09);
whoosh(13.0, 0.3, { g: 0.35, f0: 600, f1: 9000, pan0: 0.8, pan1: -0.8 });

// S4 — retro OS
chime(13.25, [72, 79, 84], 0.05, 0.05);
[13.6, 13.8, 14.0].forEach((t) => blip(t, 1200, 0.04, 60, 0, true));
for (let k = 0; k < 12; k++) blip(14.5 + k * 0.04, 110, 0.03, 4, 0, true); // hang buzz
click(15.0, 0.45, 2600);
for (let i = 0; i < 10; i++) blip(15.05 + i * 0.05, 880 - i * 30, 0.05, 35, 0.3, true);
[15.5, 15.75, 16.0].forEach((t, i) => { impact(t, 0.25); blip(t, midi(48 + i * 5), 0.09, 10, 0, true); });
for (let t = 16.72; t < 17.0; t += 1 / 24) blip(t, 200 + noise() * 2000, 0.05, 80, noise(), true);

// S5 — Lumen
impact(17.0, 0.5);
whoosh(17.0, 0.5, { g: 0.25, f0: 8000, f1: 300, pan0: 0, pan1: 0 });
click(17.95, 0.35, 2200); blip(18.0, 1700, 0.06, 40);
[18.25, 18.5, 18.75].forEach((t, i) => blip(t, midi(79 + i * 4), 0.08, 22, -0.4 + i * 0.4));
whoosh(19.2, 0.35, { g: 0.18, f0: 300, f1: 3000, reverse: false, pan0: 0, pan1: 0 });
[19.75, 19.95, 20.15].forEach((t, i) => { whoosh(t + 0.4, 0.4, { g: 0.12 }); thud(t + 0.42, 0.22); blip(t + 0.42, midi(84 + i * 3), 0.05, 20); });
whoosh(21.5, 0.5, { g: 0.3, f0: 300, f1: 9000, pan0: 0, pan1: 0 });

// S6 — end
impact(21.5, 0.5);
pad(21.5, 25, [45, 52, 57, 59, 64], 0.02);
chime(21.6, [88, 93, 96, 100], 0.04, 0.08);
chime(23.25, [76, 81, 84, 88], 0.05, 0.07);

/* ── S4 lo-fi crush on the music bus ─────────────────────────── */
for (let c = 0; c < 2; c++) {
  let hold = 0;
  for (let i = Math.floor(13.0 * SR); i < 17.0 * SR; i++) {
    if (i % 5 === 0) hold = Math.round(mus[c][i] * 24) / 24;
    mus[c][i] = hold * 0.9;
  }
}

/* ── Reverb (Schroeder) ──────────────────────────────────────── */
function reverb(input, combs, aps, fb = 0.8, damp = 0.4) {
  const out = new Float32Array(N);
  for (const d of combs) {
    const buf = new Float32Array(d); let idx = 0, f = 0;
    for (let i = 0; i < N; i++) { const y = buf[idx]; f = y * (1 - damp) + f * damp; buf[idx] = input[i] + f * fb; out[i] += y * 0.25; idx = (idx + 1) % d; }
  }
  for (const d of aps) {
    const buf = new Float32Array(d); let idx = 0;
    for (let i = 0; i < N; i++) { const b = buf[idx]; const y = -out[i] + b; buf[idx] = out[i] + b * 0.5; out[i] = y; idx = (idx + 1) % d; }
  }
  return out;
}
const rv = [reverb(rev, [3114, 3234, 2982, 2844], [225, 556]), reverb(rev, [3160, 3280, 3028, 2890], [248, 579])];

/* ── Master ──────────────────────────────────────────────────── */
const L = new Float32Array(N), R = new Float32Array(N);
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fade = Math.min(1, t / 0.02) * Math.min(1, Math.max(0, (DUR - t) / 0.8));
  L[i] = Math.tanh((mus[0][i] * 0.9 + fx[0][i] + rv[0][i] * 0.35) * 1.3) * fade;
  R[i] = Math.tanh((mus[1][i] * 0.9 + fx[1][i] + rv[1][i] * 0.35) * 1.3) * fade;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const norm = 0.89 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * norm)) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * norm)) * 32767), 46 + i * 4);
}
const out = resolve(root, 'out/soundtrack-v2.wav');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, buf);
console.log('  →', out);
