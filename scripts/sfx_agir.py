"""Sound design de « Celui qui agit vs celui qui hésite » (sans voix off).

Usage :
    python scripts/sfx_agir.py public/sfx/agir

Discret et fonctionnel : une nappe sombre continue, un tick cristallin par publication
(chaque pièce un peu plus aiguë), une gomme feutrée et un battement sourd pour le
Perfectionniste, un scintillement pour la vague de lumière et un coup de basse doux
pour la phrase finale. Réutilise les outils de scripts/sound_design.py.
"""

import sys
from pathlib import Path

import numpy as np

from sound_design import (
    SR,
    bass_note,
    bp,
    env,
    lp,
    noise,
    place,
    save,
    sine,
    space,
    stereo,
    sub_drop,
    tt,
    warm,
)

D1, A1, D2, F2, A2 = 36.71, 55.0, 73.42, 87.31, 110.0


def glass(freq: float, dur: float = 0.45, tau: float = 0.07) -> np.ndarray:
    """Tick cristallin : sinus + octave courte, attaque de 1,5 ms."""
    body = sine(freq, dur) * env(dur, 0.0015, tau) + 0.3 * sine(2 * freq, dur, 0.5) * env(dur, 0.0015, tau * 0.4)
    return lp(body, 9000)


def build(out_dir: Path, pieces: int = 30) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob("*.wav"):
        old.unlink()

    # Nappe sombre continue : sub (ré) + quinte + tierce mineure très filtrées, respiration lente
    dur = 19.0
    t = tt(dur)
    breath = 0.8 + 0.2 * np.sin(2 * np.pi * t / 6.0)
    low = (sine(D1, dur) + 0.5 * sine(D2, dur, 0.4) + 0.25 * sine(A2, dur, 1.1)) * breath
    shade = (sine(F2 * 2, dur, 0.2) + 0.6 * sine(A2 * 2, dur, 0.9)) * (0.5 + 0.5 * np.sin(2 * np.pi * t / 9.0 + 1))
    pad = lp(warm(low * 0.45, 1.3), 300) + lp(shade * 0.06, 900)
    fade_in = np.clip(t / 1.5, 0, 1) ** 1.5
    save(out_dir, "pad", stereo(pad * fade_in))

    # Ticks des pièces tracées : gamme pentatonique montante (la, si, ré, mi, fa#, la)
    drawn = 6
    scale = [880.0, 987.77, 1174.66, 1318.51, 1479.98, 1760.0]
    for k in range(drawn):
        st = stereo(glass(scale[k % len(scale)]), 0.12 * np.sin(k))
        save(out_dir, f"tick_{k + 1:02d}", space(st, 0.14, 0.5))

    # Accéléré (10 -> 12 s) : les cases se remplissent ; ticks doux qui suivent la même
    # courbe in-out que le compteur et montent de 5 demi-tons au total, jusqu'au sommet.
    m = pieces - drawn
    span = 2.0

    def inv_in_out(y: float) -> float:
        return np.cbrt(y / 4) if y < 0.5 else 1 - np.cbrt(2 * (1 - y)) / 2

    st = np.zeros((int((span + 1.0) * SR), 2))
    for j in range(1, m + 1):
        at = span * inv_in_out(j / m)
        f = 1760.0 * 2 ** ((5 * j / m) / 12)
        g = 0.35 + 0.45 * j / m
        place(st, stereo(glass(f, 0.3, 0.04) * g, 0.3 * np.sin(j * 1.7)), at)
    save(out_dir, "rise", space(st, 0.18, 0.6))

    # Grille pleine (12 s) : la montée se pose sur un accord grave et chaud, sans aigus
    dur = 2.6
    t = tt(dur)
    swell = np.sin(np.clip(t / 0.35, 0, 1) * np.pi / 2) ** 2 * np.exp(-np.maximum(t - 0.35, 0) / 0.9)
    chord = (sine(D2, dur) + 0.7 * sine(A2, dur, 0.4) + 0.45 * sine(D2 * 2 * 1.26, dur, 0.9)) * swell
    st = stereo(lp(warm(chord * 0.7, 1.4), 1100)) + stereo(sub_drop(dur, 70, 40, 0.06, 0.4) * 0.6)
    save(out_dir, "peak", space(st, 0.25, 1.2))

    # Gomme : trois frottements feutrés
    st = np.zeros((int(0.6 * SR), 2))
    for i, at in enumerate((0.0, 0.13, 0.26)):
        rub = bp(noise(0.14, 40 + i), 900, 3200) * env(0.14, 0.02, 0.05) * (0.9 - 0.15 * i)
        place(st, stereo(rub, -0.1 + 0.1 * i), at)
    save(out_dir, "erase", space(st, 0.12, 0.4))

    # Battement sourd et lent (deux coups : « lub-dub »)
    st = np.zeros((int(0.9 * SR), 2))
    place(st, stereo(sub_drop(0.5, 70, 46, 0.03, 0.09)), 0.0)
    place(st, stereo(sub_drop(0.5, 62, 42, 0.03, 0.08) * 0.7), 0.22)
    save(out_dir, "heartbeat", space(st, 0.15, 0.6))

    # Phrase finale : un coup de basse doux + shimmer court
    dur = 2.6
    st = stereo(sub_drop(dur, 90, 38, 0.08, 0.7) * 0.9 + bass_note(D2, dur, 0.9) * 0.4)
    for i, f in enumerate((1174.66, 1760.0, 2349.3)):
        place(st, stereo(glass(f, 1.0, 0.25) * 0.25, -0.3 + 0.3 * i), 0.02 + 0.05 * i)
    save(out_dir, "final", space(st, 0.3, 1.5))


if __name__ == "__main__":
    build(Path(sys.argv[1] if len(sys.argv) > 1 else "public/sfx/agir"))
