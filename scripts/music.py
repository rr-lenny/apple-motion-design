"""Musique électro minimaliste à 120 BPM, calée sur la timeline du short.

python3 scripts/music.py out/music.wav

Un temps = 0,5 s : chaque phrase du script démarre sur un temps.
Structure (mesures de 4 temps = 2 s) :
  0-1    hook       : kick + nappe
  1-3    problème   : + charleston, basse
  4-8    démo       : + arpège, souffle à l'entrée du dossier (8,5 s)
  9-11   CTA        : souffle (18,5 s), nappe + kick léger, résolution
"""
import sys
import wave

import numpy as np

SR = 48000
BPM = 120
BEAT = 60 / BPM
DUR = 24.0
N = int(SR * DUR)
rng = np.random.default_rng(7)

def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)

def onepole_lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y

def place(buf, sig, t):
    i = int(t * SR)
    j = min(len(buf), i + len(sig))
    if i < len(buf):
        buf[i:j] += sig[: j - i]

def env(n, attack, decay):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(attack, 1e-4)) * np.exp(-t / decay)

# Accords : Am9 – Fmaj7 – Cmaj7 – G6 (une mesure chacun)
CHORDS = [
    (45, [57, 60, 64, 67, 71]),
    (41, [57, 60, 64, 65, 69]),
    (48, [55, 59, 60, 64, 67]),
    (43, [55, 59, 62, 64, 67]),
]

kick = np.zeros(N); hat = np.zeros(N); bass = np.zeros(N)
pad = np.zeros(N); arp = np.zeros(N); fx = np.zeros(N)

# Kick
kn = int(0.45 * SR)
kt = np.arange(kn) / SR
kphase = 2 * np.pi * np.cumsum(45 + 95 * np.exp(-kt / 0.035)) / SR
kick_s = np.sin(kphase) * np.exp(-kt / 0.16) + 0.25 * rng.standard_normal(kn) * np.exp(-kt / 0.004)

beats = int(DUR / BEAT)
side = np.ones(N)
for b in range(beats):
    t = b * BEAT
    bar = b // 4
    if bar <= 8 or (bar >= 9 and b % 2 == 0):
        gain = 0.55 if bar >= 9 else 0.9
        if b == beats - 1:
            gain = 0
        place(kick, kick_s * gain, t)
        # Sidechain : la nappe « respire » avec le kick
        sn = int(0.4 * SR)
        st = np.arange(sn) / SR
        place(side, -(0.55 * np.exp(-st / 0.12)) * (gain > 0), t)

# Charleston sur les contretemps
hn = int(0.06 * SR)
hat_s = rng.standard_normal(hn) * env(hn, 0.0005, 0.012)
hat_s = hat_s - onepole_lowpass(hat_s, 6000)
for b in range(beats):
    if 2 <= b // 4 <= 9:
        place(hat, hat_s * (0.35 if b % 2 else 0.25), b * BEAT + BEAT / 2)

# Basse, nappe, arpège
for bar in range(int(DUR / (4 * BEAT))):
    root, notes = CHORDS[bar % 4]
    t0 = bar * 4 * BEAT
    if bar == 11:
        root, notes = 45, [57, 60, 64, 69, 71]
    # Nappe : dents de scie désaccordées, attaque lente
    n = int(4 * BEAT * SR) + int(0.5 * SR)
    tt = np.arange(n) / SR
    chord = np.zeros(n)
    for m in notes:
        for det in (-0.12, 0.12):
            f = hz(m + det)
            chord += 2 * ((tt * f) % 1) - 1
    chord /= len(notes) * 2
    a = np.minimum(1, tt / 0.5) * np.minimum(1, np.maximum(0, (n / SR - tt) / 0.5))
    place(pad, chord * a * 0.5, t0)
    # Basse : sinus + harmonique, croches syncopées
    if 1 <= bar <= 10:
        for k, off in enumerate((0, 1.5, 2, 3.5)):
            bn = int(0.42 * SR)
            bt = np.arange(bn) / SR
            f = hz(root - 12 + 12)
            s = np.sin(2 * np.pi * f * bt) + 0.3 * np.sin(4 * np.pi * f * bt)
            place(bass, s * env(bn, 0.004, 0.18) * 0.55, t0 + off * BEAT)
    # Arpège en doubles croches pendant la démo
    if 4 <= bar <= 9:
        seq = [notes[i] + 12 for i in (0, 2, 1, 3, 2, 4, 3, 1)]
        for k in range(16):
            an = int(0.25 * SR)
            at = np.arange(an) / SR
            f = hz(seq[k % len(seq)])
            s = np.sin(2 * np.pi * f * at) * 0.7 + np.sin(2 * np.pi * 2 * f * at) * 0.15
            place(arp, s * env(an, 0.002, 0.07) * (0.22 if k % 4 == 0 else 0.15), t0 + k * BEAT / 4)

# Souffles (transitions) : bruit filtré qui monte jusqu'au moment clé
def swell(t_hit, length=1.2):
    n = int(length * SR)
    tt = np.arange(n) / SR
    s = onepole_lowpass(rng.standard_normal(n), 2500)
    s = s - onepole_lowpass(s, 300)
    e = (tt / length) ** 2.5
    place(fx, s * e * 0.5, t_hit - length)

swell(8.5)
swell(18.5, 1.6)

pad = onepole_lowpass(pad, 1600) * side
mix = 0.9 * kick + 0.5 * hat + 0.7 * bass + 0.55 * pad + 0.6 * arp + 0.5 * fx

# Écho stéréo léger sur l'arpège et la nappe
left = mix.copy(); right = mix.copy()
delay = int(BEAT * 0.75 * SR)
wet = 0.6 * arp + 0.2 * pad
right[delay:] += 0.35 * wet[:-delay]
left[2 * delay:] += 0.2 * wet[: -2 * delay]

stereo = np.stack([left, right], axis=1)
fade = np.ones(N)
fn = int(0.8 * SR)
fade[-fn:] = np.linspace(1, 0, fn) ** 2
stereo *= fade[:, None]
stereo = np.tanh(stereo * 1.2)
stereo *= 10 ** (-1 / 20) / np.max(np.abs(stereo))

out = sys.argv[1] if len(sys.argv) > 1 else "out/music.wav"
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((stereo * 32767).astype("<i2").tobytes())
print(out)
