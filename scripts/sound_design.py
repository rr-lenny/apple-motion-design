"""Sound design synthétisé, minimaliste, pour les vidéos néon.

Usage :
    python scripts/sound_design.py public/sfx

Principe : sobriété et utilité. Peu de sons, courts, doux, d'une même famille de timbres
(touches de verre, souffle d'air, une pulsation grave), placés uniquement sur les
événements qui ont une fonction (apparition, validation, révélation). Pas de nappe,
pas de montées, pas de réverbération spectaculaire : une petite pièce, sèche et propre.

Chaque fichier est déterministe (graines fixes), en WAV stéréo 48 kHz normalisé à -1 dBFS :
les niveaux de mixage se règlent dans src/theme.ts (AUDIO) et SoundDesign.tsx.

Dépendances : `pip install numpy scipy soundfile`.
"""

import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000

# Ré majeur pentatonique (Hz)
D5, E5, FS5, A5, D6 = 587.33, 659.26, 739.99, 880.0, 1174.66

# Repères partagés avec src/videos/ikigai/timeline.ts (HOOK)
HOOK_LAUNCH, HOOK_TRAVEL, HOOK_ARRIVE, HOOK_LAND = 0.15, 0.40, 1.50, 1.85


def tt(dur: float) -> np.ndarray:
    return np.arange(int(dur * SR)) / SR


def env(dur: float, attack: float, tau: float) -> np.ndarray:
    """Attaque douce, décroissance exponentielle, relâche finale (aucune coupure)."""
    t = tt(dur)
    a = np.sin(np.clip(t / attack, 0, 1) * np.pi / 2) ** 2
    release = np.sin(np.clip((dur - t) / (0.3 * dur), 0, 1) * np.pi / 2) ** 2
    return a * np.exp(-np.maximum(t - attack, 0) / tau) * release


def sine(freq, dur: float, phase: float = 0.0) -> np.ndarray:
    f = np.broadcast_to(np.asarray(freq, float), (int(dur * SR),))
    return np.sin(2 * np.pi * np.cumsum(f) / SR + phase)


def lp(x: np.ndarray, fc: float) -> np.ndarray:
    return signal.sosfilt(signal.butter(2, fc, "low", fs=SR, output="sos"), x)


def bp(x: np.ndarray, lo: float, hi: float) -> np.ndarray:
    return signal.sosfilt(signal.butter(2, [lo, hi], "band", fs=SR, output="sos"), x)


def stereo(x: np.ndarray, pan=0.0) -> np.ndarray:
    p = np.broadcast_to(np.asarray(pan, float), x.shape)
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], axis=1)


_IR = None


def room(st: np.ndarray, mix: float = 0.16, tail: float = 0.9) -> np.ndarray:
    """Petite pièce discrète (RT60 ~0,8 s, assourdie)."""
    global _IR
    if _IR is None:
        rng = np.random.default_rng(3)
        n = int(0.9 * SR)
        decay = np.exp(-6.91 * np.arange(n) / SR / 0.8)
        ir = rng.standard_normal((n, 2)) * decay[:, None]
        ir = np.stack([lp(ir[:, c], 4500) for c in range(2)], axis=1)
        ir[: int(0.008 * SR)] = 0
        _IR = ir / np.sqrt(np.sum(ir**2))
    dry = np.concatenate([st, np.zeros((int(tail * SR), 2))])
    wet = np.stack([signal.fftconvolve(dry[:, c], _IR[:, c])[: len(dry)] for c in range(2)], axis=1)
    return (1 - mix) * dry + mix * wet * 1.4


def save(out_dir: Path, name: str, st: np.ndarray) -> None:
    if st.ndim == 1:
        st = stereo(st)
    n = int(0.02 * SR)
    st[-n:] *= np.linspace(1, 0, n)[:, None]
    st = st / (np.max(np.abs(st)) + 1e-9) * 10 ** (-1 / 20)
    sf.write(out_dir / f"{name}.wav", st.astype(np.float32), SR, subtype="PCM_16")
    print(f"{name:12s} {len(st) / SR:4.2f} s")


def glass(freq: float, dur: float = 0.5, tau: float = 0.09, bright: float = 0.25) -> np.ndarray:
    """Touche de verre : sinus pur + octave qui s'éteint plus vite, attaque de 2 ms."""
    body = sine(freq, dur) * env(dur, 0.002, tau) + bright * sine(freq * 2.0, dur, 0.7) * env(dur, 0.002, tau * 0.45)
    return lp(body, 7000)


def air(dur: float, lo: float, hi: float, peak: float) -> np.ndarray:
    """Souffle d'air filtré, enveloppe en cloche."""
    rng = np.random.default_rng(int(lo + hi))
    u = np.linspace(0, 1, int(dur * SR))
    shape = np.where(u < peak, np.sin(u / peak * np.pi / 2), np.cos((u - peak) / (1 - peak) * np.pi / 2)) ** 2
    return bp(rng.standard_normal(len(u)), lo, hi) * shape


def build(out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob("*.wav"):
        old.unlink()

    # Ouverture : pulsation grave à peine perceptible (le point s'allume)
    t = tt(0.6)
    pulse = sine(52 + 30 * np.exp(-t / 0.05), 0.6) * env(0.6, 0.004, 0.12)
    save(out_dir, "ignite", room(stereo(pulse), 0.08, 0.3))

    # Comète : souffle léger qui suit sa trajectoire (panoramique sur la position x)
    dur = HOOK_LAND - HOOK_LAUNCH
    t = tt(dur) + HOOK_LAUNCH
    u = np.clip((t - HOOK_TRAVEL) / (HOOK_ARRIVE - HOOK_TRAVEL), 0, 1)
    u = 1 - (1 - u) ** 2  # même easing que EASE.glide
    x = np.where(t < HOOK_TRAVEL, 0.0, np.cos(np.deg2rad(-105 + 330 * u)))
    x = np.where(t > HOOK_ARRIVE, np.cos(np.deg2rad(225)) * (1 - np.clip((t - HOOK_ARRIVE) / 0.35, 0, 1)), x)
    save(out_dir, "comet", room(stereo(air(dur, 900, 3200, 0.35), 0.5 * x), 0.12, 0.4))

    # Touches de verre (une même famille, plusieurs hauteurs) : apparitions et validations
    for name, f in (("tap_d6", D6), ("tap_a5", A5)):
        save(out_dir, name, room(stereo(glass(f)), 0.16, 0.6))

    # Les 4 piliers : une touche par pilier, en montant (D E F# A)
    for i, f in enumerate((D5, E5, FS5, A5)):
        save(out_dir, f"pillar_{i + 1}", room(stereo(glass(f, 0.6, 0.11, 0.2)), 0.16, 0.6))

    # Révélation IKIGAI : pulsation grave + une seule note claire, sans fracas
    dur = 1.4
    t = tt(dur)
    low = sine(46 + 40 * np.exp(-t / 0.06), dur) * env(dur, 0.006, 0.25) * 0.9
    note = glass(D6, dur, 0.35, 0.15) * 0.35
    save(out_dir, "reveal", room(stereo(low + note), 0.18, 0.8))

    # Verrouillage de l'aiguille : clic sec et doux
    dur = 0.25
    click = lp(np.random.default_rng(5).standard_normal(int(dur * SR)), 3500) * env(dur, 0.0008, 0.006)
    click += sine(1900, dur) * env(dur, 0.001, 0.012) * 0.6
    save(out_dir, "lock", room(stereo(click), 0.1, 0.3))

    # Transition violette : souffle très doux qui s'ouvre
    save(out_dir, "swell", room(stereo(air(1.3, 300, 1800, 0.55) * 0.8), 0.2, 0.6))

    # Validation (coche) : deux notes courtes
    st = np.zeros((int(0.9 * SR), 2))
    for at, f in ((0.0, A5), (0.09, D6)):
        g = stereo(glass(f, 0.45, 0.08, 0.2))
        i = int(at * SR)
        st[i : i + len(g)] += g
    save(out_dir, "confirm", room(st, 0.16, 0.6))

    # Fin : une note qui s'éloigne
    save(out_dir, "end", room(stereo(glass(A5, 1.4, 0.45, 0.1)), 0.3, 1.2))


if __name__ == "__main__":
    build(Path(sys.argv[1] if len(sys.argv) > 1 else "public/sfx"))
