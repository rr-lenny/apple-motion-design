"""Sound design synthétisé : sobre, utile, ancré dans les basses.

Usage :
    python scripts/sound_design.py public/sfx

Principe : peu de sons, chacun sert un événement visuel (apparition, révélation,
validation). Leur caractère vient du grave : sub-basses (30-80 Hz) qui donnent le poids,
harmoniques douces (saturation légère) pour que ce grave reste perceptible sur un
téléphone, et un espace sombre et profond (réverbération filtrée). Un fin transitoire
dans les aigus garde la précision. Une nappe sub très basse donne la profondeur.

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

# Ré : notes graves (Hz)
D1, D2, E2, FS2, A2, D3, A3 = 36.71, 73.42, 82.41, 92.50, 110.0, 146.83, 220.0

# Repères partagés avec src/videos/ikigai/timeline.ts (HOOK)
HOOK_LAUNCH, HOOK_TRAVEL, HOOK_ARRIVE, HOOK_LAND = 0.15, 0.40, 1.50, 1.85
MERGE_RISE = 0.55  # durée de la fusion des cercles avant le marque-page (BOOKMARK)


# ---------------------------------------------------------------- outils


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


def noise(dur: float, seed: int) -> np.ndarray:
    return np.random.default_rng(seed).standard_normal(int(dur * SR))


def lp(x: np.ndarray, fc, order: int = 2) -> np.ndarray:
    return signal.sosfilt(signal.butter(order, fc, "low", fs=SR, output="sos"), x)


def hp(x: np.ndarray, fc: float, order: int = 2) -> np.ndarray:
    return signal.sosfilt(signal.butter(order, fc, "high", fs=SR, output="sos"), x)


def bp(x: np.ndarray, lo: float, hi: float) -> np.ndarray:
    return signal.sosfilt(signal.butter(2, [lo, hi], "band", fs=SR, output="sos"), x)


def sweep_lp(x: np.ndarray, f0: float, f1: float, f2: float, peak: float) -> np.ndarray:
    """Passe-bas dont la coupure suit f0 -> f1 (au pic) -> f2 (traitement par blocs)."""
    n = len(x)
    out = np.zeros(n)
    block = 512
    zi = None
    for s in range(0, n, block):
        u = s / n
        fc = f0 + (f1 - f0) * (u / peak) if u < peak else f1 + (f2 - f1) * ((u - peak) / (1 - peak))
        sos = signal.butter(2, max(30.0, fc), "low", fs=SR, output="sos")
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        out[s : s + block], zi = signal.sosfilt(sos, x[s : s + block], zi=zi)
    return out


def warm(x: np.ndarray, drive: float = 2.0) -> np.ndarray:
    """Saturation douce : ajoute les harmoniques qui rendent le sub audible sur téléphone."""
    return np.tanh(drive * x) / np.tanh(drive)


def sub_drop(dur: float, f0: float, f1: float, glide: float, tau: float, drive: float = 1.8) -> np.ndarray:
    """Impact grave : sinus qui plonge de f0 à f1, légèrement saturé puis adouci.

    Une octave plus discrète (et plus courte) double la fondamentale : c'est elle qu'on
    entend sur un haut-parleur de téléphone, le sub se ressent au casque.
    """
    t = tt(dur)
    f = f1 + (f0 - f1) * np.exp(-t / glide)
    body = sine(f, dur) * env(dur, 0.004, tau) + 0.4 * sine(2 * f, dur, 0.6) * env(dur, 0.004, tau * 0.6)
    return lp(warm(body, drive), 700)


def bass_note(freq: float, dur: float, tau: float) -> np.ndarray:
    """Note de basse ronde (fondamentale + harmoniques douces)."""
    body = sine(freq, dur) + 0.35 * sine(2 * freq, dur, 0.4) + 0.12 * sine(3 * freq, dur, 1.1)
    return lp(warm(body * env(dur, 0.005, tau) * 0.8, 1.6), 900)


def tick(freq: float = 2400, dur: float = 0.08, seed: int = 1) -> np.ndarray:
    """Transitoire fin dans les aigus : la précision au-dessus du grave."""
    c = lp(noise(dur, seed), 6000) * env(dur, 0.0006, 0.004) * 0.5
    return c + sine(freq, dur) * env(dur, 0.001, 0.01) * 0.4


def stereo(x: np.ndarray, pan=0.0) -> np.ndarray:
    p = np.broadcast_to(np.asarray(pan, float), x.shape)
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], axis=1)


def place(dst: np.ndarray, src: np.ndarray, at: float) -> None:
    i = int(at * SR)
    n = min(len(src), len(dst) - i)
    if n > 0:
        dst[i : i + n] += src[:n]


_IR = None


def space(st: np.ndarray, mix: float = 0.22, tail: float = 1.6) -> np.ndarray:
    """Espace sombre et profond (RT60 ~1,8 s, filtré à 2,5 kHz) : donne la profondeur."""
    global _IR
    if _IR is None:
        rng = np.random.default_rng(3)
        n = int(2.0 * SR)
        decay = np.exp(-6.91 * np.arange(n) / SR / 1.8)
        ir = rng.standard_normal((n, 2)) * decay[:, None]
        ir = np.stack([lp(ir[:, c], 2500) for c in range(2)], axis=1)
        ir[: int(0.015 * SR)] = 0
        _IR = ir / np.sqrt(np.sum(ir**2))
    dry = np.concatenate([st, np.zeros((int(tail * SR), 2))])
    wet = np.stack([signal.fftconvolve(dry[:, c], _IR[:, c])[: len(dry)] for c in range(2)], axis=1)
    return (1 - mix) * dry + mix * wet * 1.6


def save(out_dir: Path, name: str, st: np.ndarray) -> None:
    if st.ndim == 1:
        st = stereo(st)
    st = hp(st.T, 22).T  # rien sous 22 Hz (énergie inutile)
    n = int(0.03 * SR)
    st[-n:] *= np.linspace(1, 0, n)[:, None]
    st = st / (np.max(np.abs(st)) + 1e-9) * 10 ** (-1 / 20)
    sf.write(out_dir / f"{name}.wav", st.astype(np.float32), SR, subtype="PCM_16")
    print(f"{name:10s} {len(st) / SR:5.2f} s")


# ---------------------------------------------------------------- sons


def build(out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob("*.wav"):
        old.unlink()

    # Ouverture : le point s'allume dans un « boom » grave et feutré
    dur = 1.6
    st = stereo(sub_drop(dur, 95, 38, 0.09, 0.45))
    place(st, stereo(tick(1800, 0.08, 2) * 0.25), 0.0)
    save(out_dir, "ignite", space(st, 0.18, 1.0))

    # Comète : souffle d'air qui suit sa trajectoire + grondement grave lié à sa vitesse
    dur = HOOK_LAND - HOOK_LAUNCH
    t = tt(dur) + HOOK_LAUNCH
    u = np.clip((t - HOOK_TRAVEL) / (HOOK_ARRIVE - HOOK_TRAVEL), 0, 1)
    eased = 1 - (1 - u) ** 2  # même easing que EASE.glide
    x = np.where(t < HOOK_TRAVEL, 0.0, np.cos(np.deg2rad(-105 + 330 * eased)))
    x = np.where(t > HOOK_ARRIVE, np.cos(np.deg2rad(225)) * (1 - np.clip((t - HOOK_ARRIVE) / 0.35, 0, 1)), x)
    launch = np.clip((t - HOOK_LAUNCH) / (HOOK_TRAVEL - HOOK_LAUNCH), 0, 1) ** 2
    speed = np.where(t < HOOK_TRAVEL, launch, (1 - u) * (t < HOOK_ARRIVE))
    speed = lp(speed, 8)
    air = bp(noise(dur, 4), 700, 2600) * speed * 0.35
    rumble = lp(warm(sine(44 + 16 * speed, dur) * speed, 1.5), 400)
    save(out_dir, "comet", space(stereo(air, 0.5 * x) + stereo(rumble), 0.15, 0.8))

    # Atterrissage : impact profond et mat
    st = stereo(sub_drop(1.0, 80, 40, 0.06, 0.28))
    place(st, stereo(lp(tick(900, 0.1, 3), 2500) * 0.4), 0.0)
    save(out_dir, "land", space(st, 0.2, 1.0))

    # Le cercle se referme : coup sourd + note grave
    st = stereo(sub_drop(1.2, 70, 42, 0.05, 0.3) * 0.8 + bass_note(D2, 1.2, 0.35) * 0.5)
    save(out_dir, "close", space(st, 0.22, 1.2))

    # Révélation IKIGAI : la chute grave principale, longue et profonde
    dur = 3.0
    t = tt(dur)
    drop = sub_drop(dur, 130, 31, 0.12, 0.9, 2.2)
    tone = (bass_note(D2, dur, 1.1) + bass_note(A2, dur, 0.9) * 0.6) * 0.45
    air = sweep_lp(noise(dur, 6), 200, 1200, 150, 0.03) * env(dur, 0.002, 0.18) * 0.25
    st = stereo(drop + tone) + stereo(air * 0.7, 0.0)
    save(out_dir, "reveal", space(st, 0.26, 2.0))

    # Séparation en 4 : souffle grave qui s'ouvre
    dur = 1.1
    whomp = sweep_lp(noise(dur, 7), 120, 900, 180, 0.3) * env(dur, 0.06, 0.25) * 0.6
    st = stereo(whomp) + stereo(sub_drop(dur, 65, 45, 0.1, 0.3) * 0.7)
    save(out_dir, "split", space(st, 0.22, 1.0))

    # Les 4 piliers : une note de basse par pilier, en montant (D E F# A), avec un fin transitoire
    for i, f in enumerate((D2, E2, FS2, A2)):
        st = stereo(bass_note(f, 1.3, 0.32))
        place(st, stereo(tick(2200 + 150 * i, 0.06, 10 + i) * 0.18), 0.0)
        save(out_dir, f"pillar_{i + 1}", space(st, 0.2, 1.0))

    # Aiguille verrouillée : clic + petite pulsation grave
    st = stereo(sub_drop(0.5, 70, 50, 0.03, 0.08) * 0.8)
    place(st, stereo(lp(tick(1600, 0.06, 20), 3500) * 0.6), 0.0)
    save(out_dir, "lock", space(st, 0.15, 0.6))

    # Transition violette : houle grave qui s'ouvre
    dur = 1.8
    t = tt(dur)
    rise = np.sin(np.clip(t / 0.7, 0, 1) * np.pi / 2) ** 2 * np.exp(-np.maximum(t - 0.7, 0) / 0.45)
    chord = (sine(D1, dur) + 0.6 * sine(D2, dur, 0.3) + 0.35 * sine(A2, dur, 0.9)) * rise
    st = stereo(sweep_lp(warm(chord * 0.8, 1.6), 150, 1100, 200, 0.4))
    save(out_dir, "swell", space(st, 0.28, 1.4))

    # Fusion des cercles -> marque-page : aspiration grave qui se pose d'un coup sourd
    dur = MERGE_RISE + 1.0
    t = tt(dur)
    pull = np.clip(t / MERGE_RISE, 0, 1) ** 2 * (t < MERGE_RISE)
    suck = sweep_lp(noise(dur, 8), 150, 700, 700, 0.99) * pull * 0.35
    st = stereo(suck + lp(sine(40 + 25 * pull, dur) * pull * 0.5, 300))
    place(st, stereo(sub_drop(1.0, 75, 40, 0.05, 0.25)), MERGE_RISE)
    save(out_dir, "merge", space(st, 0.2, 0.9))

    # Coche : deux notes graves et rondes, la seconde plus haute
    st = np.zeros((int(1.4 * SR), 2))
    place(st, stereo(bass_note(D3, 0.9, 0.22)), 0.0)
    place(st, stereo(bass_note(A3, 1.0, 0.3)), 0.11)
    place(st, stereo(tick(2600, 0.06, 30) * 0.15), 0.11)
    save(out_dir, "confirm", space(st, 0.2, 1.0))

    # Fin : résolution grave qui s'éloigne
    dur = 3.2
    st = stereo(
        bass_note(D2, dur, 1.2) * 0.6
        + lp(warm(sine(D1, dur) * env(dur, 0.15, 1.3), 1.4), 300) * 0.7
        + bass_note(A2, dur, 0.8) * 0.25
    )
    save(out_dir, "end", space(st, 0.32, 2.0))

    # Nappe sub très basse : profondeur continue, respiration lente
    dur = 31.5
    t = tt(dur)
    breath = 0.75 + 0.25 * np.sin(2 * np.pi * t / 7.0)
    drone = (sine(D1, dur) + 0.5 * sine(D2, dur, 0.5) + 0.12 * sine(A2, dur, 1.3)) * breath
    drone = lp(warm(drone * 0.5, 1.3), 260)
    fade_io = np.clip(t / 1.5, 0, 1) * np.clip((dur - t) / 2.0, 0, 1)
    save(out_dir, "bed", stereo(drone * fade_io))


if __name__ == "__main__":
    build(Path(sys.argv[1] if len(sys.argv) > 1 else "public/sfx"))
