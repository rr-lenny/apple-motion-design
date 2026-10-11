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
  audio/                   # voix off d'origine (utilisée telle quelle)
  sfx/                     # effets sonores synthétisés (générés : 15 sons + nappe sub)
  fonts/                   # Montserrat + Noto Sans JP (embarquées, pas de réseau au rendu)
scripts/
  edit_voiceover.py        # outil de montage de voix (coupes invisibles), non utilisé ici
  align_voiceover.py       # alignement automatique voix off -> timings.json
  sound_design.py          # synthèse de tous les effets sonores -> public/sfx
```

## Voix off

La vidéo utilise la voix off d'origine, sans retouche (`public/audio/ikigai-voix-off.mp3`).
Les sous-titres affichent « 4 piliers fondamentaux ».

`scripts/edit_voiceover.py` reste disponible pour une prochaine vidéo : il retire un mot ou un
silence sans que la coupe s'entende (voyelle tenue, greffe d'une vraie fin de phrase prise
ailleurs dans la prise, fondu enchaîné aligné sur les périodes de la voix). Voir son en-tête.

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

Sobre, utile, ancré dans les basses. Synthétisé par `python scripts/sound_design.py public/sfx`
(`pip install numpy scipy soundfile`) — aucune banque de sons :

- un son n'existe que s'il sert un événement visuel : allumage, comète, atterrissage, cercle
  refermé, révélation du nom, séparation en 4, une note de basse par pilier (ré, mi, fa#, la),
  aiguille verrouillée, transition violette, fusion en marque-page, coche, fin ;
- le caractère vient du grave : sub-basses de 30 à 80 Hz (le poids, ressenti au casque),
  doublées d'une octave et d'une saturation douce (le grave reste audible sur téléphone),
  un fin transitoire aigu pour la précision, et un espace sombre et profond ;
- une nappe sub très basse (ré grave qui respire lentement) donne la profondeur continue.

Placement dans `SoundDesign.tsx`, niveaux dans `AUDIO` (`theme.ts`). Le mix sort à ~-13 LUFS,
crête -1,1 dBFS ; les effets sont ~12 LU sous la voix.

## Nouvelle vidéo dans le même style

1. Copier `src/videos/ikigai/` vers `src/videos/<sujet>/`, remplacer la voix off et `voiceover.txt`.
2. Générer `timings.json` avec le script ci-dessus, définir les repères dans `cues.ts`.
3. Écrire la chorégraphie avec `Glow`, `Stage`, `Subtitles` et les helpers de `lib/`.
4. Déclarer la composition dans `src/Root.tsx`.

Ne jamais modifier les réglages visuels dans une scène : tout passe par `theme.ts`.
