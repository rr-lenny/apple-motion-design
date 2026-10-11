"""Aligne une voix off sur son script, mot par mot.

Usage :
    python scripts/align_voiceover.py <audio> <script.txt> <timings.json> --model <dossier_parakeet>

- <script.txt> : une ligne = un segment de parole (entre deux pauses).
- Les pauses sont détectées avec ffmpeg (silencedetect) -> bornes précises des segments.
- Chaque segment est transcrit par Parakeet TDT v3 (sherpa-onnx), qui donne l'instant de
  chaque mot. Si le nombre de mots reconnu diffère du script, les mots sont répartis au
  prorata du nombre de lettres sur la durée du segment.

Dépendances : ffmpeg, `pip install sherpa-onnx soundfile numpy`, et le modèle
sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8 (release GitHub k2-fsa/sherpa-onnx, tag asr-models).
"""

import argparse
import json
import re
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import sherpa_onnx
import soundfile as sf

SR = 16000


def to_wav(audio: Path, out: Path) -> None:
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", str(audio), "-ar", str(SR), "-ac", "1", str(out)],
        check=True,
    )


def speech_segments(wav: Path, noise_db: float, min_silence: float, duration: float):
    log = subprocess.run(
        ["ffmpeg", "-i", str(wav), "-af", f"silencedetect=noise={noise_db}dB:d={min_silence}", "-f", "null", "-"],
        capture_output=True,
        text=True,
    ).stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
    segs, cursor = [], 0.0
    for s, e in zip(starts, ends + [duration]):
        if s - cursor > 0.05:
            segs.append((cursor, s))
        cursor = e
    if duration - cursor > 0.05:
        segs.append((cursor, duration))
    return segs


def asr_words(rec, audio: np.ndarray, start: float, end: float, pre: float = 0.0):
    """Retourne [(mot, t)] en secondes absolues pour la tranche [start - pre, end]."""
    # Découpe calée sur le début de la parole (pre = 0) : avec du silence avant, le modèle
    # émet les premiers jetons trop tôt. Un peu de marge en fin pour la dernière syllabe.
    start = max(0.0, start - pre)
    chunk = audio[int(start * SR) : int((end + 0.25) * SR)]
    stream = rec.create_stream()
    stream.accept_waveform(SR, chunk)
    rec.decode_stream(stream)
    r = stream.result
    words = []
    for tok, ts in zip(r.tokens, r.timestamps):
        t = ts + start
        if tok.startswith(" ") or not words:
            words.append([tok.strip(), t])
        else:
            words[-1][0] += tok
    return [(w, t) for w, t in words if re.search(r"\w", w)]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("audio", type=Path)
    ap.add_argument("script", type=Path)
    ap.add_argument("out", type=Path)
    ap.add_argument("--model", type=Path, required=True)
    ap.add_argument("--noise-db", type=float, default=-35)
    ap.add_argument("--min-silence", type=float, default=0.18)
    args = ap.parse_args()

    lines = [l.strip() for l in args.script.read_text(encoding="utf-8").splitlines() if l.strip()]
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "vo.wav"
        to_wav(args.audio, wav)
        audio, _ = sf.read(wav, dtype="float32")
        duration = len(audio) / SR
        segs = speech_segments(wav, args.noise_db, args.min_silence, duration)

    if len(segs) != len(lines):
        raise SystemExit(
            f"{len(segs)} segments de parole détectés pour {len(lines)} lignes de script. "
            "Ajuste --noise-db / --min-silence ou le découpage du script."
        )

    m = args.model
    rec = sherpa_onnx.OfflineRecognizer.from_transducer(
        encoder=str(m / "encoder.int8.onnx"),
        decoder=str(m / "decoder.int8.onnx"),
        joiner=str(m / "joiner.int8.onnx"),
        tokens=str(m / "tokens.txt"),
        model_type="nemo_transducer",
        num_threads=4,
    )

    out = []
    for (start, end), line in zip(segs, lines):
        words = line.split()
        # Découpe serrée d'abord ; si le nombre de mots ne colle pas, on réessaie avec
        # un peu de marge avant (le premier mot est alors recalé sur le début du segment).
        for pre in (0.0, 0.1, 0.25):
            heard = asr_words(rec, audio, start, end, pre)
            if len(heard) == len(words):
                break
        if len(heard) == len(words):
            times = [t for _, t in heard]
            if pre:
                times[0] = start
        else:
            lens = np.array([len(w) for w in words], float)
            times = list(start + (end - start) * np.concatenate([[0], np.cumsum(lens)[:-1]]) / lens.sum())
        times = [min(max(t, start), end - 0.05) for t in times]
        for i in range(1, len(times)):
            times[i] = max(times[i], times[i - 1] + 0.04)
        ends = times[1:] + [end]
        out.append(
            {
                "text": line,
                "start": round(start, 3),
                "end": round(end, 3),
                "heard": " ".join(w for w, _ in heard),
                "words": [{"w": w, "t": round(t, 3), "e": round(e, 3)} for w, t, e in zip(words, times, ends)],
            }
        )
        print(f"{start:6.2f}-{end:6.2f}  {line}")

    args.out.write_text(
        json.dumps({"duration": round(duration, 3), "segments": out}, ensure_ascii=False, indent=1),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
