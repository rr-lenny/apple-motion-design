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
    timeline.ts            # repères hors voix (accroche, aiguille, marque-page), partagés avec le sound design
    captions.ts            # découpage des sous-titres (≤ 8 mots, 1-2 lignes, mots-clés colorés)
    icons.tsx              # pictogrammes animés des 4 piliers (flamme, plume, orbite, pièces)
    SoundDesign.tsx        # placement des effets sonores sur les repères
    Ikigai.tsx             # la chorégraphie
public/
  audio/                   # voix off d'origine + version montée (-edit.wav)
  sfx/                     # effets sonores synthétisés (générés, 13 sons)
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
  --trim-start 0.49 --cut 10.195 11.10 0.08 --extend 0.08 --pitch-drop 0.10 \
  --tail 13.755 13.96 --fade-out 0.12
```

- `--trim-start` : retire le silence de tête (la voix démarre à 0,3 s, accroche plus nerveuse) ;
- `--cut` : retire « fondamentales ». Au lieu d'un simple fondu, la fin de « piliers » est
  rendue naturelle : la voyelle est tenue un instant avec une légère descente (`--extend`,
  `--pitch-drop`), puis on greffe la vraie chute de fin de phrase de « doué. » (`--tail`,
  même voyelle « é », même hauteur ~120 Hz), en fondu enchaîné aligné sur les périodes de la voix.
  La phrase suivante reprend dans le bruit de fond réel.

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

Minimaliste et utile : 13 sons courts et doux d'une même famille (touches de verre, souffle
d'air, une pulsation grave), synthétisés par `python scripts/sound_design.py public/sfx`
(`pip install numpy scipy soundfile`), uniquement sur les événements qui ont une fonction :
allumage et comète de l'accroche, cercle refermé, révélation du nom, une touche par pilier
(en montant), verrouillage de l'aiguille, transition violette, marque-page, coche, fin.
Pas de nappe ni de montées. Placement dans `SoundDesign.tsx`, niveaux dans `AUDIO`
(`theme.ts`). Le mix sort à ~-13 LUFS ; les effets restent ~23 dB sous la voix.

## Nouvelle vidéo dans le même style

1. Copier `src/videos/ikigai/` vers `src/videos/<sujet>/`, remplacer la voix off et `voiceover.txt`.
2. Générer `timings.json` avec le script ci-dessus, définir les repères dans `cues.ts`.
3. Écrire la chorégraphie avec `Glow`, `Stage`, `Subtitles` et les helpers de `lib/`.
4. Déclarer la composition dans `src/Root.tsx`.

Ne jamais modifier les réglages visuels dans une scène : tout passe par `theme.ts`.
