# apple-motion-design
Animation motion design style Apple avec React, HTML et CSS

## `slow:` — étude de typographie cinétique

Vidéo de 21 s (1920×1080, 30 fps) inspirée du style « kinetic typography » Apple :
fond blanc cassé, typo grotesque très serrée, coupes rapides, lettres qui rebondissent
et changent de police, touches de clavier, dossiers Finder, sélection de texte bleue,
spirale de texte, étiquettes, carton titre final.

- `index.html` — toute l'animation (canvas 2D, déterministe : `render(t)`). Ouvrir dans un navigateur pour la prévisualiser en boucle.
- `render.mjs` — rend chaque frame avec Playwright, synthétise le sound design et encode en MP4 avec ffmpeg.
- `output/slow.mp4` — la vidéo rendue.

```bash
node render.mjs output/slow.mp4               # vidéo complète
node render.mjs out/p.mp4 --preview "1,5.5,9"  # captures PNG à des instants donnés
```

Pour modifier une scène : chaque scène est une fonction `sXxx(t)` listée dans `SCENES`
(durée `d`, effets sonores `sfx`).
