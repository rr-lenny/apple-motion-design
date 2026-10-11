"""Montage de la voix off : coupe le silence de tête et retire des passages, sans clic.

Usage :
    python scripts/edit_voiceover.py <entrée> <sortie.wav> [--trim-start S] [--cut DE A PAUSE ...]

--cut DE A PAUSE : supprime l'audio entre DE et A (secondes, temps du fichier d'origine).
    - la dernière voyelle avant DE peut être tenue un peu plus longtemps (--extend, TD-PSOLA,
      avec --pitch-drop optionnel) ;
    - --tail SRC_DE SRC_A (une par coupe, dans l'ordre) : greffe ensuite une vraie fin de phrase
      prise ailleurs dans la même prise (même voyelle, même hauteur), en fondu enchaîné aligné
      sur les périodes de la voix : la voix retombe naturellement au lieu d'être coupée ;
    - fondu de sortie (cosinus) en fin de voyelle : le dernier son s'éteint naturellement ;
    - PAUSE secondes de « silence de pièce » (bruit de fond réel, pris dans un passage calme) ;
    - fondu d'entrée qui démarre à A (à placer dans une pause, pas sur un mot).

Dépendances : ffmpeg, `pip install soundfile numpy`.
"""

import argparse
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

SR = 48000


def load(path: Path) -> np.ndarray:
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "in.wav"
        subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-i", str(path), "-ac", "1", "-ar", str(SR), "-c:a", "pcm_f32le", str(wav)],
            check=True,
        )
        audio, _ = sf.read(wav, dtype="float64")
    return audio


def fade(n: int, rising: bool) -> np.ndarray:
    """Demi-cosinus élevé au carré : départ et arrivée en douceur, pas de « marche »."""
    x = np.linspace(0, 1, n, endpoint=False) if rising else np.linspace(1, 0, n, endpoint=False)
    return np.sin(x * np.pi / 2) ** 2


def extend_vowel(x: np.ndarray, seconds: float, pitch_drop: float) -> np.ndarray:
    """Prolonge la voyelle finale de x par recouvrement-addition de périodes (TD-PSOLA).

    Les grains (2 périodes, fenêtre de Hann) sont recopiés avec un pas qui s'allonge
    progressivement : la hauteur descend de `pitch_drop` (ex. 0.06 = -6 %).
    """
    if seconds <= 0:
        return x
    tail = x[-int(0.06 * SR) :]
    ac = np.correlate(tail, tail, "full")[len(tail) - 1 :]
    lo, hi = int(SR / 400), int(SR / 75)
    period = lo + int(np.argmax(ac[lo:hi]))
    # fenêtre de Hann périodique : deux fenêtres décalées d'une période somment à 1
    win = 0.5 - 0.5 * np.cos(2 * np.pi * np.arange(2 * period) / (2 * period))
    grain = x[-2 * period :] * win
    start = len(x) - 2 * period
    total = int(seconds * SR) + 2 * period
    out = np.zeros(start + total + 4 * period)
    norm = np.zeros_like(out)
    # partie d'origine, puis fondu enchaîné vers le premier grain (identique au signal d'origine)
    out[:start] = x[:start]
    norm[:start] = 1.0
    out[start : start + period] += x[start : start + period] * (1 - win[:period])
    norm[start : start + period] += 1 - win[:period]
    pos = float(start)
    while pos < start + total:
        k = (pos - start) / total
        p = int(pos)
        out[p : p + 2 * period] += grain
        norm[p : p + 2 * period] += win
        pos += period * (1 + pitch_drop * k)
    end = int(pos) + period  # milieu du dernier grain
    return (out[:end] / np.maximum(norm[:end], 1e-6))


def graft_tail(x: np.ndarray, tail: np.ndarray, xfade: float = 0.03) -> np.ndarray:
    """Enchaîne x sur `tail` (fin de phrase empruntée) par un fondu aligné en phase.

    On cherche, dans les premières millisecondes de `tail`, le décalage dont la forme d'onde
    ressemble le plus à la fin de x (corrélation normalisée), puis on égalise le niveau.
    """
    n = int(xfade * SR)
    ref = x[-n:]
    best, best_k = -2.0, 0
    for k in range(0, int(0.012 * SR)):
        cand = tail[k : k + n]
        c = float(np.dot(ref, cand) / (np.linalg.norm(ref) * np.linalg.norm(cand) + 1e-9))
        if c > best:
            best, best_k = c, k
    tail = tail[best_k:].copy()
    gain = np.sqrt(np.mean(ref**2)) / (np.sqrt(np.mean(tail[:n] ** 2)) + 1e-9)
    tail *= np.clip(gain, 10 ** (-4 / 20), 10 ** (4 / 20))
    w = fade(n, rising=True)
    joined = x[-n:] * (1 - w) + tail[:n] * w
    print(f"  greffe : corrélation {best:.2f}, décalage {best_k / SR * 1000:.1f} ms, gain {20 * np.log10(gain):+.1f} dB")
    return np.concatenate([x[:-n], joined, tail[n:]])


def room_tone(audio: np.ndarray, seconds: float, window: float = 0.25) -> np.ndarray:
    """Échantillon du passage le plus calme du fichier (hors tête), bouclé en fondu si besoin."""
    n = int(window * SR)
    hop = n // 4
    starts = range(int(0.1 * SR), len(audio) - n, hop)
    best = min(starts, key=lambda s: float(np.mean(audio[s : s + n] ** 2)))
    tone = audio[best : best + n].copy()
    need = int(seconds * SR)
    out = np.zeros(need)
    pos = 0
    while pos < need:
        k = min(n, need - pos)
        out[pos : pos + k] += tone[:k]
        pos += k
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("src", type=Path)
    ap.add_argument("out", type=Path)
    ap.add_argument("--trim-start", type=float, default=0.0, help="secondes de silence de tête à retirer")
    ap.add_argument("--cut", type=float, nargs=3, action="append", default=[], metavar=("DE", "A", "PAUSE"))
    ap.add_argument("--fade-out", type=float, default=0.06)
    ap.add_argument("--tail", type=float, nargs=2, action="append", default=[], metavar=("SRC_DE", "SRC_A"))
    ap.add_argument("--extend", type=float, default=0.0, help="prolongation de la voyelle avant chaque coupe (s)")
    ap.add_argument("--pitch-drop", type=float, default=0.0, help="descente de hauteur sur la prolongation")
    ap.add_argument("--fade-in", type=float, default=0.025)
    args = ap.parse_args()

    audio = load(args.src)
    tone_src = audio.copy()
    pieces = []
    cursor = int(args.trim_start * SR)
    for idx, (frm, to, pause) in enumerate(sorted(args.cut)):
        a, b = int(frm * SR), int(to * SR)
        part = extend_vowel(audio[cursor:a].copy(), args.extend, args.pitch_drop)
        if idx < len(args.tail):
            s0, s1 = args.tail[idx]
            part = graft_tail(part, tone_src[int(s0 * SR) : int(s1 * SR)].copy())
        n = int(args.fade_out * SR)
        part[-n:] *= fade(n, rising=False)
        pieces.append(part)
        pieces.append(room_tone(tone_src, pause))
        cursor = b
        nxt = int(args.fade_in * SR)
        audio[b : b + nxt] *= fade(nxt, rising=True)
    pieces.append(audio[cursor:])
    out = np.concatenate(pieces)
    n = int(0.02 * SR)
    out[:n] *= fade(n, rising=True)
    sf.write(args.out, out.astype(np.float32), SR, subtype="PCM_24")
    print(f"{len(tone_src) / SR:.3f} s -> {len(out) / SR:.3f} s : {args.out}")


if __name__ == "__main__":
    main()
