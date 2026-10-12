"""Génère une voix off française à partir de script.txt avec Kokoro (voix ff_siwis).

Usage : python3 generate.py <dossier_modeles> [vitesse]
Le dossier doit contenir kokoro-v1.0.onnx et voices-v1.0.bin
(https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0).
"""
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = Path(__file__).parent
models = Path(sys.argv[1])
speed = float(sys.argv[2]) if len(sys.argv) > 2 else 0.92

kokoro = Kokoro(str(models / "kokoro-v1.0.onnx"), str(models / "voices-v1.0.bin"))
lines = [l.strip() for l in (HERE / "script.txt").read_text(encoding="utf-8").splitlines() if l.strip()]

chunks, sr = [], 24000
for line in lines:
    audio, sr = kokoro.create(line, voice="ff_siwis", speed=speed, lang="fr-fr")
    chunks.append(audio)
    # Pause plus longue après un point ou des points de suspension, courte après une virgule.
    pause = 0.35 if line.endswith(",") else 0.75
    chunks.append(np.zeros(int(sr * pause), dtype=audio.dtype))

raw = HERE / "voix-off-raw.wav"
sf.write(raw, np.concatenate(chunks), sr)

# Post-production : coupe des basses, chaleur + présence, compression douce,
# légère ambiance, puis normalisation à -16 LUFS (standard web).
FILTERS = (
    "highpass=f=80,equalizer=f=200:t=q:w=1:g=2,equalizer=f=3500:t=q:w=1.5:g=1.5,"
    "acompressor=threshold=-20dB:ratio=3:attack=5:release=120,"
    "aecho=0.8:0.85:35:0.12,loudnorm=I=-16:TP=-1.5:LRA=9"
)
ff = ["ffmpeg", "-y", "-loglevel", "error"]
subprocess.run([*ff, "-i", str(raw), "-af", FILTERS, "-ar", "48000", str(HERE / "voix-off.wav")], check=True)
subprocess.run([*ff, "-i", str(HERE / "voix-off.wav"), "-codec:a", "libmp3lame", "-b:a", "192k", str(HERE / "voix-off.mp3")], check=True)
raw.unlink()
print("voix-off.wav / voix-off.mp3 générés")
