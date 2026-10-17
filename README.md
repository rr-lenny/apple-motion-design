# apple-motion-design
Animation motion design style Apple avec React, HTML et CSS

## Short vertical (TikTok / Reels / Shorts)

Vidéo 9:16, 1080×1920, 60 fps, 24 s, style keynote Apple : fond #F5F5F7, un seul accent,
captions mot par mot au centre, démo « dossier qui s'ouvre en éventail » avec panneau en verre dépoli.

Résultat : [`out/short.mp4`](out/short.mp4)

| Fichier | Rôle |
| --- | --- |
| `short/config.js` | Tout ce qui se personnalise : couleurs, marque, CTA, script (phrases + temps), moments des visuels |
| `short/index.html` | Scène, styles, maquettes des cartes |
| `short/timeline.js` | Moteur déterministe `renderAt(t)` : easings, ressort, captions, démo, fin |
| `scripts/music.py` | Musique électro minimaliste 120 BPM générée (numpy), calée sur le script |
| `scripts/render.mjs` | Capture image par image avec Playwright, puis encodage H.264 + AAC via ffmpeg |

### Aperçu

Ouvrir `short/index.html` dans un navigateur. `Espace` : pause, `S` : afficher la zone sûre,
`?t=12` : démarrer à 12 s.

### Rendu

```sh
python3 scripts/music.py out/music.wav   # musique
node scripts/render.mjs                  # → out/short.mp4 (~2 min)
node scripts/render.mjs --stills 1,11,22 # images fixes pour vérifier un moment
```

### Script par défaut

1. Hook : « Vos projets méritent **mieux.** »
2. Problème : « Des liens **partout.** / Des PDF **trop lourds.** / Des clients **perdus.** »
3. Démo : « Et si tout tenait dans un **seul dossier** ? / **Pages web,** photos, / **tarifs,** études de cas. / Partagez-les en **un clic.** / Vos clients voient **tout.** » → dossier, cartes en éventail, clic sur ↗, « Lien copié »
4. CTA : « **Folio.** / Essayez **gratuitement.** » + bouton « Lien en bio »

« Folio » est une marque fictive de démonstration : remplacez le script, la marque et le CTA dans `short/config.js`.
Les phrases démarrent sur des multiples de 0,5 s (un temps à 120 BPM) ; gardez cette règle pour rester calé sur le beat.
