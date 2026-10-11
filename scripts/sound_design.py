"""Sound design synthétisé (aucune banque de sons) pour les vidéos néon.

Usage :
    python scripts/sound_design.py public/sfx

Chaque son est généré de façon déterministe (graines fixes) en WAV stéréo 48 kHz,
normalisé à -1 dBFS : les niveaux de mixage se règlent dans le code de la vidéo.
Palette : sons doux, aérés, cristallins, en ré majeur pentatonique (D E F# A B),
pour accompagner la lumière sans couvrir la voix.

Dépendances : `pip install numpy scipy soundfile`.
"""

import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000
RNG = np.random.default_rng(7)

# Notes (Hz)
D3, A3, D4, E4, FS4, A4, B4 = 146.83, 220.0, 293.66, 329.63, 369.99, 440.0, 493.88
D5, E5, FS5, A5, B5, D6, E6, FS6, A6 = 587.33, 659.26, 739.99, 880.0, 987.77, 1174.66, 1318.51, 1479.98, 1760.0
CS5 = 554.37

# Repères partagés avec src/videos/ikigai/timeline.ts (HOOK, FLAP_PERIOD)
HOOK_LAUNCH, HOOK_TRAVEL, HOOK_ARRIVE, HOOK_LAND = 0.15, 0.40, 1.50, 1.85
FLAP_PERIOD = 0.5


# ---------------------------------------------------------------- outils


def tt(dur: float) -> np.ndarray:
    return np.arange(int(dur * SR)) / SR


def exp_env(dur: float, attack: float, tau: float) -> np.ndarray:
    """Attaque douce, décroissance exponentielle, et relâche sur les 25 % finaux (aucune coupure)."""
    t = tt(dur)
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    release = np.clip((dur - t) / (0.25 * dur), 0, 1)
    return np.sin(a * np.pi / 2) ** 2 * np.exp(-np.maximum(t - attack, 0) / tau) * np.sin(release * np.pi / 2) ** 2


def bell_env(dur: float, peak: float, sharp: float = 2.0) -> np.ndarray:
    """Montée puis descente douce, maximum à `peak` (fraction de la durée)."""
    u = np.linspace(0, 1, int(dur * SR))
    up = np.clip(u / peak, 0, 1)
    down = np.clip((1 - u) / (1 - peak), 0, 1)
    return (np.sin(np.minimum(up, down) * np.pi / 2)) ** sharp


def noise(dur: float) -> np.ndarray:
    return RNG.standard_normal(int(dur * SR))


def svf(x: np.ndarray, cutoff, q: float = 0.7, mode: str = "bp") -> np.ndarray:
    """Filtre à variables d'état (TPT) à fréquence de coupure variable."""
    n = len(x)
    fc = np.broadcast_to(np.asarray(cutoff, float), (n,))
    g = np.tan(np.pi * np.clip(fc, 20, SR * 0.45) / SR)
    k = 1 / q
    ic1 = ic2 = 0.0
    out = np.empty(n)
    for i in range(n):
        gi = g[i]
        v3 = x[i] - ic2
        v1 = (gi * v3 + ic1) / (1 + gi * (gi + k))
        v2 = ic2 + gi * v1
        ic1 = 2 * v1 - ic1
        ic2 = 2 * v2 - ic2
        out[i] = v1 if mode == "bp" else v2 if mode == "lp" else x[i] - k * v1 - v2
    return out


def lp(x: np.ndarray, fc: float, order: int = 2) -> np.ndarray:
    return signal.sosfilt(signal.butter(order, fc, "low", fs=SR, output="sos"), x)


def hp(x: np.ndarray, fc: float, order: int = 2) -> np.ndarray:
    return signal.sosfilt(signal.butter(order, fc, "high", fs=SR, output="sos"), x)


def tone(freq, dur: float, partials=((1, 1.0),), phase_seed: int = 0) -> np.ndarray:
    """Somme de partiels sinusoïdaux ; `freq` peut varier dans le temps (glissando)."""
    n = int(dur * SR)
    f = np.broadcast_to(np.asarray(freq, float), (n,))
    ph = 2 * np.pi * np.cumsum(f) / SR
    rng = np.random.default_rng(phase_seed)
    return sum(a * np.sin(r * ph + rng.uniform(0, 2 * np.pi)) for r, a in partials)


def pluck(freq: float, dur: float = 1.6, bright: float = 0.35) -> np.ndarray:
    """Pincement doux type marimba de verre."""
    body = tone(freq, dur, ((1, 1.0), (2, 0.18 * bright), (3, 0.08 * bright), (4.0, 0.12 * bright)))
    env = exp_env(dur, 0.004, 0.32)
    click = lp(noise(0.012), 5000) * exp_env(0.012, 0.0005, 0.003) * 0.25
    out = body * env
    out[: len(click)] += click
    return out


def bell(freq: float, dur: float = 2.5, tau: float = 0.9) -> np.ndarray:
    """Cloche cristalline (partiels légèrement inharmoniques)."""
    parts = ((1, 1.0), (2.0, 0.35), (3.01, 0.16), (4.17, 0.08), (5.43, 0.04))
    out = np.zeros(int(dur * SR))
    for r, a in parts:
        out += a * tone(freq * r, dur) * exp_env(dur, 0.003, tau / (0.6 + 0.4 * r))
    return out


def pad(freqs, dur: float, attack: float, release: float) -> np.ndarray:
    """Nappe douce : sinus désaccordés, filtrés."""
    out = np.zeros(int(dur * SR))
    for i, f in enumerate(freqs):
        for det in (-0.12, 0.0, 0.12):
            out += tone(f * 2 ** (det / 12), dur, ((1, 1.0), (2, 0.12)), phase_seed=i * 7 + int(det * 100) + 50)
    t = tt(dur)
    env = np.clip(t / attack, 0, 1) ** 1.5 * np.clip((dur - t) / release, 0, 1) ** 1.5
    return lp(out * env, 2500)


def stereo(x: np.ndarray, pan=0.0) -> np.ndarray:
    p = np.broadcast_to(np.asarray(pan, float), x.shape)
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], axis=1)


def widen(x: np.ndarray, ms: float = 9.0) -> np.ndarray:
    """Mono -> stéréo large (léger décalage Haas atténué)."""
    d = int(ms * SR / 1000)
    r = np.concatenate([np.zeros(d), x[:-d]]) if d else x
    return np.stack([x, 0.7 * x + 0.3 * r], axis=1)


_IR = {}


def reverb(st: np.ndarray, rt60: float = 1.8, mix: float = 0.3, tail: float = 2.0) -> np.ndarray:
    """Réverbération par convolution avec une réponse impulsionnelle synthétique stéréo."""
    key = (rt60,)
    if key not in _IR:
        rng = np.random.default_rng(11)
        n = int(rt60 * 1.2 * SR)
        t = np.arange(n) / SR
        decay = np.exp(-6.91 * t / rt60)
        ir = rng.standard_normal((n, 2)) * decay[:, None]
        ir = np.stack([lp(ir[:, c], 6000) for c in range(2)], axis=1)
        ir[: int(0.012 * SR)] = 0  # pré-délai
        _IR[key] = ir / np.sqrt(np.sum(ir**2))
    ir = _IR[key]
    pad_n = int(tail * SR)
    dry = np.concatenate([st, np.zeros((pad_n, 2))])
    wet = np.stack([signal.fftconvolve(dry[:, c], ir[:, c])[: len(dry)] for c in range(2)], axis=1)
    return (1 - mix) * dry + mix * wet * 1.5


def place(dst: np.ndarray, src: np.ndarray, at: float) -> None:
    i = int(at * SR)
    n = min(len(src), len(dst) - i)
    if n > 0:
        dst[i : i + n] += src[:n]


def fade_tail(st: np.ndarray, sec: float = 0.05) -> np.ndarray:
    n = int(sec * SR)
    st[-n:] *= np.linspace(1, 0, n)[:, None]
    return st


def save(out_dir: Path, name: str, st: np.ndarray) -> None:
    if st.ndim == 1:
        st = widen(st)
    st = fade_tail(st)
    st = st / (np.max(np.abs(st)) + 1e-9) * 10 ** (-1 / 20)
    sf.write(out_dir / f"{name}.wav", st.astype(np.float32), SR, subtype="PCM_16")
    print(f"{name:16s} {len(st) / SR:5.2f} s")


def whoosh(dur: float, f0: float, f1: float, f2: float, q: float = 1.4, peak: float = 0.55) -> np.ndarray:
    """Souffle filtré dont la fréquence suit f0 -> f1 (au pic) -> f2."""
    u = np.linspace(0, 1, int(dur * SR))
    fc = np.where(u < peak, f0 + (f1 - f0) * np.sin(u / peak * np.pi / 2), f2 + (f1 - f2) * np.cos((u - peak) / (1 - peak) * np.pi / 2))
    return svf(noise(dur), fc, q) * bell_env(dur, peak, 1.6)


def riser(dur: float, f0: float, f1: float) -> np.ndarray:
    """Montée de tension : souffle + glissando, coupé net à la fin (pour tomber sur l'impact)."""
    u = np.linspace(0, 1, int(dur * SR))
    air = svf(noise(dur), 400 + 5000 * u**2, 1.2) * u**2.2
    gliss = tone(f0 * (f1 / f0) ** (u**1.5), dur, ((1, 0.5), (2, 0.15))) * u**2.5 * 0.35
    out = air + gliss
    out[-int(0.01 * SR) :] *= np.linspace(1, 0, int(0.01 * SR))
    return out


def sub_boom(dur: float = 1.6, f0: float = 90, f1: float = 40, tau: float = 0.4) -> np.ndarray:
    t = tt(dur)
    f = f1 + (f0 - f1) * np.exp(-t / 0.08)
    return tone(f, dur) * exp_env(dur, 0.006, tau)


def sparkle(dur: float, count: int, lo: float, hi: float, spread: float, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    out = np.zeros((int(dur * SR), 2))
    for _ in range(count):
        f = rng.uniform(lo, hi)
        d = rng.uniform(0.25, 0.7)
        s = tone(f, d, ((1, 1), (2.01, 0.2))) * exp_env(d, 0.002, d / 4)
        place(out, stereo(s, rng.uniform(-0.6, 0.6)), rng.uniform(0, spread))
    return out


# ---------------------------------------------------------------- sons


def build(out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)

    # Ouverture : allumage du point de lumière (sub doux + étincelles)
    st = widen(sub_boom(1.8, 110, 42, 0.45) * 0.9 + lp(noise(1.8), 900) * exp_env(1.8, 0.002, 0.05) * 0.3)
    st += sparkle(1.8, 9, 2600, 6200, 0.12, 1) * 0.25
    save(out_dir, "ignite", reverb(st, 1.6, 0.25, 1.2))

    # Comète qui trace l'ensō : souffle panoramique qui suit sa position
    dur = HOOK_LAND - HOOK_LAUNCH + 0.25
    t = tt(dur) + HOOK_LAUNCH
    u = np.clip((t - HOOK_TRAVEL) / (HOOK_ARRIVE - HOOK_TRAVEL), 0, 1)
    u = 1 - (1 - u) ** 2  # même easing que EASE.glide
    ang = np.deg2rad(-105 + 330 * u)
    x = np.where(t < HOOK_TRAVEL, np.cos(np.deg2rad(-105)) * (t - HOOK_LAUNCH) / (HOOK_TRAVEL - HOOK_LAUNCH), np.cos(ang))
    x = np.where(t > HOOK_ARRIVE, np.cos(np.deg2rad(225)) * (1 - np.clip((t - HOOK_ARRIVE) / (HOOK_LAND - HOOK_ARRIVE), 0, 1)), x)
    # vitesse de la comète : accélère au lancer, puis ralentit sur le cercle
    launch = np.clip((t - HOOK_LAUNCH) / (HOOK_TRAVEL - HOOK_LAUNCH), 0, 1)
    speed = np.where(t < HOOK_TRAVEL, launch**2, np.abs(np.gradient(u)) * SR / (2 / (HOOK_ARRIVE - HOOK_TRAVEL)))
    speed = np.clip(speed, 0, 1)
    air = svf(noise(dur), 700 + 2600 * speed, 1.6) * (0.25 + speed) * bell_env(dur, 0.45, 1.0)
    shimmer = tone(1400 + 900 * speed, dur, ((1, 0.06), (2, 0.03))) * speed
    save(out_dir, "comet", reverb(stereo(air + shimmer, 0.75 * x), 1.4, 0.2, 0.8))

    # Ensō refermé / point posé : carillon cristallin
    st = widen(bell(D6, 2.4, 1.2) * 0.8 + bell(A5, 2.4, 1.2) * 0.5)
    save(out_dir, "chime_soft", reverb(st, 2.2, 0.35, 1.5))

    # Bascule de perspective
    st = widen(whoosh(1.0, 250, 1400, 300, 1.1, 0.5) + tone(np.linspace(130, 60, int(1.0 * SR)), 1.0) * bell_env(1.0, 0.4) * 0.35)
    save(out_dir, "tilt", reverb(st, 1.4, 0.2, 0.8))

    # Faisceau de lumière (« bonheur ») : nappe chaude qui s'ouvre
    dur = 2.2
    p = pad((D4, A4, FS5), dur, 0.25, 1.4)
    p = svf(p, np.linspace(500, 3500, int(dur * SR)) ** 1.0, 0.8, "lp")
    st = widen(p * 0.8 + whoosh(dur, 200, 900, 200, 0.9, 0.2) * 0.25)
    save(out_dir, "light_on", reverb(st, 2.0, 0.3, 1.2))

    # Déplacement du point (« volonté »)
    st = stereo(whoosh(0.8, 500, 2400, 800, 1.6, 0.5), np.linspace(0.0, -0.5, int(0.8 * SR)))
    save(out_dir, "orb_move", reverb(st, 1.2, 0.2, 0.6))

    # Cercle refermé (« création ») : accord scintillant
    st = widen(bell(D6, 2.6, 1.0) * 0.7 + bell(FS6, 2.6, 0.9) * 0.45 + bell(A6, 2.6, 0.8) * 0.3)
    st += sparkle(2.6, 8, 3000, 7000, 0.35, 2) * 0.2
    save(out_dir, "ring_close", reverb(st, 2.4, 0.35, 1.5))

    # Avant la révélation : petite montée
    save(out_dir, "pre_reveal", reverb(widen(riser(0.8, 300, 1200)), 1.2, 0.15, 0.3))

    # Révélation IKIGAI : impact grave + accord lumineux
    st = widen(sub_boom(2.0, 95, 38, 0.6) + lp(noise(2.0), 1200) * exp_env(2.0, 0.003, 0.06) * 0.35)
    chord = sum(bell(f, 3.2, 1.8) * a for f, a in ((D5, 0.5), (A5, 0.45), (D6, 0.4), (FS6, 0.25)))
    st = np.concatenate([st, np.zeros((int(1.2 * SR), 2))]) + widen(chord)
    save(out_dir, "reveal", reverb(st, 2.8, 0.35, 2.0))

    # Séparation en 4 cercles : souffle qui s'ouvre + 4 petits « pop »
    st = widen(whoosh(1.0, 300, 1800, 500, 1.2, 0.35) * 0.6)
    for i, pan in enumerate((0.0, 0.6, 0.0, -0.6)):
        f = 520 * (0.97 ** i)
        pop = tone(np.linspace(f * 1.6, f, int(0.09 * SR)), 0.09) * exp_env(0.09, 0.002, 0.025)
        place(st, stereo(pop * 0.6, pan), 0.5 + 0.05 * i)
    save(out_dir, "split", reverb(st, 1.4, 0.25, 0.8))

    # Les 4 piliers : un pincement par pilier, en montant (D E F# A)
    for i, f in enumerate((D5, E5, FS5, A5)):
        st = widen(pluck(f) + pluck(f * 2, 1.6, 0.2) * 0.18)
        save(out_dir, f"pillar_{i + 1}", reverb(st, 1.8, 0.28, 1.2))

    # Signature de chaque pictogramme
    # flamme : souffle chaud qui s'embrase
    st = widen(svf(noise(0.9), np.linspace(300, 1600, int(0.9 * SR)), 0.9, "lp") * bell_env(0.9, 0.3, 1.2))
    save(out_dir, "icon_flame", reverb(st, 1.0, 0.2, 0.5))
    # plume : deux clics « outil plume » (points d'ancrage)
    st = np.zeros((int(0.6 * SR), 2))
    for k, (at, f) in enumerate(((0.0, 2400), (0.4, 3000))):
        c = (tone(f, 0.05, ((1, 1), (1.5, 0.4))) * exp_env(0.05, 0.0005, 0.008)) + hp(noise(0.05), 3000) * exp_env(0.05, 0.0003, 0.004) * 0.4
        place(st, stereo(c, -0.2 + 0.4 * k), at)
    save(out_dir, "icon_pen", reverb(st, 0.8, 0.15, 0.4))
    # orbite : glissement circulaire
    dur = 0.9
    lfo = np.sin(2 * np.pi * 2.2 * tt(dur))
    st = stereo(tone(900 + 160 * lfo, dur, ((1, 0.5), (2, 0.12))) * bell_env(dur, 0.25, 1.2) * 0.6, 0.6 * lfo)
    save(out_dir, "icon_orbit", reverb(st, 1.4, 0.3, 0.8))
    # pièces : trois tintements métalliques
    st = np.zeros((int(0.8 * SR), 2))
    for k, at in enumerate((0.0, 0.12, 0.24)):
        f = 3150 * (1.06**k)
        c = tone(f, 0.35, ((1, 1), (1.47, 0.6), (2.09, 0.35), (2.76, 0.2))) * exp_env(0.35, 0.0008, 0.06)
        place(st, stereo(c * (0.8 + 0.1 * k), 0.3 * (k - 1)), at)
    save(out_dir, "icon_coins", reverb(st, 1.0, 0.18, 0.5))

    # « Et enfin » : anticipation avant le dernier pilier
    save(out_dir, "enfin_riser", reverb(widen(riser(0.75, 220, 880) * 0.9), 1.0, 0.15, 0.2))

    # Équilibre : nappe ronde + cloche
    st = widen(pad((D3, A3, FS4), 2.4, 0.35, 1.6) * 0.6 + bell(A4, 2.4, 1.4) * 0.35)
    save(out_dir, "balance", reverb(st, 2.2, 0.3, 1.2))

    # Boussole : cliquetis qui suivent l'aiguille (ressort amorti), puis verrouillage + ding
    k_, c_, m_ = 100.0, 14.0, 1.0
    dt = 1 / 1000
    x_, v_ = 0.0, 0.0
    angles = []
    for _ in range(int(1.4 / dt)):
        a_ = (-k_ * (x_ - 1) - c_ * v_) / m_
        v_ += a_ * dt
        x_ += v_ * dt
        angles.append(-150 * (1 - x_))
    angles = np.array(angles)
    st = np.zeros((int(2.2 * SR), 2))
    step = 15
    last = np.floor(angles[0] / step)
    for i, a in enumerate(angles):
        cur = np.floor(a / step)
        if cur != last:
            tick = lp(hp(noise(0.014), 2500), 7000) * exp_env(0.014, 0.0008, 0.002) + tone(4200, 0.014) * exp_env(0.014, 0.0008, 0.003) * 0.5
            place(st, stereo(tick * 0.18, 0.0), i * dt)
            last = cur
    settle = 0.75
    lock = tone(1800, 0.05) * exp_env(0.05, 0.0005, 0.01) + lp(noise(0.05), 3000) * exp_env(0.05, 0.0005, 0.005) * 0.5
    place(st, stereo(lock * 0.8), settle)
    place(st, widen(bell(FS6, 1.4, 0.8) * 0.45), settle + 0.01)
    save(out_dir, "compass", reverb(st, 1.6, 0.25, 0.8))

    # Sens : ligne pointillée qui monte (petites notes ascendantes)
    st = np.zeros((int(1.2 * SR), 2))
    for i, f in enumerate((D6, E6, FS6, A6, B5 * 2, D6 * 2)):
        b = tone(f, 0.18, ((1, 1), (2, 0.1))) * exp_env(0.18, 0.002, 0.04)
        place(st, stereo(b * (0.55 + 0.06 * i), 0.0), i * 0.085)
    save(out_dir, "dots_rise", reverb(st, 1.6, 0.3, 0.8))

    # Éclosion : montée -> métamorphose (arpège scintillant + nappe + sub) -> battements d'ailes
    save(out_dir, "bloom_riser", reverb(widen(riser(0.7, 260, 1040)), 1.2, 0.2, 0.3))
    dur = 2.6
    st = widen(pad((D4, A4, CS5, E5), dur, 0.08, 1.8) * 0.5 + sub_boom(dur, 80, 45, 0.7) * 0.5)
    for i, f in enumerate((D5, FS5, A5, D6, FS6, A6, D6 * 2)):
        b = bell(f, 1.6, 0.7) * 0.32
        place(st, stereo(b, -0.6 + 0.2 * i), 0.06 * i)
    st += sparkle(dur, 14, 3500, 8000, 1.2, 3) * 0.15
    save(out_dir, "metamorph", reverb(st, 2.6, 0.35, 1.5))
    st = np.zeros((int(1.2 * SR), 2))
    # un « fwip » à chaque battement (aile au plus bas)
    for i, at in enumerate((0.5 * FLAP_PERIOD, 1.5 * FLAP_PERIOD)):
        fwip = svf(noise(0.22), np.linspace(1800, 500, int(0.22 * SR)), 1.0) * bell_env(0.22, 0.3, 1.5)
        place(st, stereo(fwip * 0.7, -0.15 + 0.3 * i), at - 0.08)
    save(out_dir, "flutter", reverb(st, 1.0, 0.2, 0.5))

    # Repli des ailes -> marque-page
    save(out_dir, "fold", reverb(widen(whoosh(0.7, 2200, 900, 300, 1.3, 0.35)), 1.2, 0.2, 0.6))
    # Enregistrer : « pop » de validation + remplissage
    st = widen(tone(np.linspace(900, 600, int(0.12 * SR)), 0.12, ((1, 1), (2, 0.2))) * exp_env(0.12, 0.002, 0.035))
    st = np.concatenate([st, np.zeros((int(0.6 * SR), 2))])
    place(st, widen(whoosh(0.6, 300, 1100, 500, 1.0, 0.6) * 0.35), 0.0)
    save(out_dir, "save", reverb(st, 1.2, 0.2, 0.6))
    # Coche : notification de réussite (A5 -> D6)
    st = np.zeros((int(1.8 * SR), 2))
    place(st, widen(bell(A5, 1.4, 0.6) * 0.7), 0.0)
    place(st, widen(bell(D6, 1.6, 0.8) * 0.8), 0.11)
    save(out_dir, "check", reverb(st, 1.8, 0.3, 1.0))

    # Retour au point de lumière : implosion douce
    st = widen(whoosh(0.9, 300, 1500, 2600, 1.4, 0.8)[::-1] * 0.7)
    save(out_dir, "implode", reverb(st, 1.2, 0.2, 0.6))
    # Ondes finales : notes cristallines qui s'éloignent
    for i, f in enumerate((A5, FS5, D5)):
        save(out_dir, f"ripple_{i + 1}", reverb(widen(bell(f, 2.2, 1.0) * 0.8), 3.0, 0.45, 2.0))

    # Nappe d'ambiance (très basse) sur toute la vidéo
    dur = 31.0
    t = tt(dur)
    base = pad((D3, A3, E4, FS4), dur, 2.0, 2.5)
    shimmer = pad((A4, CS5), dur, 6.0, 3.0) * (0.5 + 0.5 * np.sin(2 * np.pi * t / 9.0)) * 0.35
    air = lp(hp(noise(dur), 2500), 7000) * 0.015
    st = widen(base + shimmer + air, 14)
    save(out_dir, "bed", reverb(st, 3.0, 0.4, 0.5)[: int(dur * SR)])


if __name__ == "__main__":
    build(Path(sys.argv[1] if len(sys.argv) > 1 else "public/sfx"))
