# apple-motion-design

Motion design « neon glow » minimaliste (fond noir, line art lumineux, bloom 3 couches)
en React + TypeScript avec [Remotion](https://www.remotion.dev). Format short vertical
1080×1920, 30 fps.

## Vidéos

| Composition | Sujet | Durée | Rendu |
| --- | --- | --- | --- |
| `Ikigai` | L'IKIGAI, la philosophie japonaise des 4 piliers | ~30 s | [`out/ikigai.mp4`](out/ikigai.mp4) |

## Démarrer

```bash
npm install
npm run studio          # prévisualisation interactive
npm run render:ikigai   # -> out/ikigai.mp4
```

Pour utiliser un Chrome/Chromium déjà installé plutôt que celui que Remotion télécharge :
`REMOTION_BROWSER=/chemin/vers/chrome npm run render:ikigai`.

## Organisation

```
src/
  theme.ts                 # TOUT le style : couleurs, glow, easings, typo, marges, caméra
  lib/                     # easings & interpolations, géométrie (arcs, morphing), polices
  components/
    Glow.tsx               # bloom 3 couches (trait net + halo proche + halo large)
    Stage.tsx              # fond noir, halo ambiant, caméra + parallax, vignettage, grain
    Subtitles.tsx          # sous-titres synchronisés mot à mot sur la voix off
  videos/ikigai/
    voiceover.txt          # texte de la voix off, une ligne = un segment entre deux pauses
    timings.json           # temps de chaque mot (généré, voir ci-dessous)
    cues.ts                # repères nommés (ex. CUE.ikigai) lus depuis timings.json
    timeline.ts            # repères hors voix (accroche, métamorphose), partagés avec le sound design
    captions.ts            # découpage des sous-titres (≤ 8 mots, 1-2 lignes, mots-clés colorés)
    icons.tsx              # pictogrammes animés des 4 piliers (flamme, plume, orbite, pièces)
    butterfly.ts           # géométrie du papillon (métamorphose des 4 cercles)
    SoundDesign.tsx        # placement des effets sonores sur les repères
    Ikigai.tsx             # la chorégraphie
public/
  audio/                   # voix off d'origine + version montée (-edit.wav)
  sfx/                     # effets sonores synthétisés (générés)
  fonts/                   # Montserrat + Noto Sans JP (embarquées, pas de réseau au rendu)
scripts/
  edit_voiceover.py        # montage de la voix (coupes invisibles, silence de tête)
  align_voiceover.py       # alignement automatique voix off -> timings.json
  sound_design.py          # synthèse de tous les effets sonores -> public/sfx
```

## Montage de la voix off

La voix est montée sans logiciel externe, à l'échantillon près :

```bash
pip install soundfile numpy
python scripts/edit_voiceover.py public/audio/ikigai-voix-off.mp3 public/audio/ikigai-voix-off-edit.wav \
  --trim-start 0.49 --cut 10.222 11.10 0.12 --extend 0.08 --pitch-drop 0.07 --fade-out 0.09
```

- `--trim-start` : retire le silence de tête (la voix démarre à 0,3 s, accroche plus nerveuse) ;
- `--cut DE A PAUSE` : retire « fondamentales » ; la voyelle finale de « piliers » est légèrement
  prolongée (`--extend`, `--pitch-drop`) puis s'éteint en fondu, et la phrase suivante reprend
  dans le bruit de fond réel : la coupe ne s'entend pas.

## Synchronisation avec la voix off

Aucun temps n'est écrit « en dur » : chaque mouvement est accroché à un mot prononcé
(`CUE.aimes`, `CUE.direction`…). Les temps viennent de `timings.json`, produit par :

```bash
pip install sherpa-onnx soundfile numpy
# modèle : sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8 (releases GitHub k2-fsa/sherpa-onnx, tag asr-models)
python scripts/align_voiceover.py public/audio/ikigai-voix-off.mp3 \
  src/videos/ikigai/voiceover.txt src/videos/ikigai/timings.json --model <dossier_du_modele>
```

1. les pauses sont détectées avec ffmpeg (bornes précises de chaque phrase) ;
2. chaque phrase est transcrite par Parakeet, qui donne l'instant de chaque mot.

Si tu réenregistres la voix, relance la commande : toute l'animation se recale seule.

## Sound design

Tous les sons sont synthétisés (aucune banque de sons, aucun droit à gérer) par
`python scripts/sound_design.py public/sfx` (`pip install numpy scipy soundfile`) :
allumage, comète, cloches cristallines en ré majeur pentatonique, une note montante par pilier,
cliquetis de boussole calés sur le ressort de l'aiguille, montée + métamorphose, battements
d'ailes, validation… et une nappe d'ambiance très basse. Chaque son est accroché au même
repère que le mouvement qu'il accompagne (`SoundDesign.tsx`) ; les niveaux se règlent dans
`AUDIO` (`theme.ts`). Le mix sort à ~-13 LUFS, crête -1,5 dBFS, effets 8-15 dB sous la voix.

## Nouvelle vidéo dans le même style

1. Copier `src/videos/ikigai/` vers `src/videos/<sujet>/`, remplacer la voix off et `voiceover.txt`.
2. Générer `timings.json` avec le script ci-dessus, définir les repères dans `cues.ts`.
3. Écrire la chorégraphie avec `Glow`, `Stage`, `Subtitles` et les helpers de `lib/`.
4. Déclarer la composition dans `src/Root.tsx`.

Ne jamais modifier les réglages visuels dans une scène : tout passe par `theme.ts`.
