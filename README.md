# apple-motion-design

Démo de motion design « style Apple » en HTML, CSS et JS : un short vertical de 24 s (1080×1920, 60 fps) pour un SaaS fictif, **Lumen**.

▶ **v1 — Apple / SaaS :** [`out/lumen-short.mp4`](out/lumen-short.mp4)
▶ **v2 — Collage éditorial « Premiere » :** [`out/lumen-v2.mp4`](out/lumen-v2.mp4) (voir [plus bas](#v2--da-éditoriale-premiere-like))

## Le style

- **Blur-in / blur-out** : chaque mot arrive flou, décalé et légèrement agrandi, puis devient net avec un easing expo-out.
- **Springs** : le logo, l'UI, les cartes et le CTA rebondissent légèrement, via un ressort amorti (pas de keyframes CSS).
- **Vrai motion blur** : chaque image de la vidéo est la moyenne de 4 sous-images, prises sur un obturateur à 180°. Les mouvements rapides laissent donc une traînée naturelle.
- **Typo sobre** : Inter Display (fallback SF Pro), graisse 700, interlettrage serré (−0.045em). Gris Apple `#86868b`, fond `#f5f5f7`, accents en dégradé.
- **Transitions** : implosion vers un point lumineux puis révélation circulaire vers le clair, zoom flouté de l'UI vers le noir, dispersion des cartes.

## Storyboard

| Temps | Scène |
|---|---|
| 0–3.3 s | « Work is noisy. » : des notifications s'empilent en profondeur, puis tout implose |
| 3.3–6 s | Révélation circulaire, puis l'icône arrive en spring : « Meet Lumen. » |
| 6–9 s | Typo cinétique : « One place for all your *tasks / docs / chats / work.* » |
| 9–14 s | Carte produit : **Plan.** (tâches), **Track.** (graphique, anneau, compteurs), **Ship.** (taps, cases cochées, toast) |
| 14–17 s | Stat : « Teams ship up to **3×** faster. » |
| 17–20.6 s | « Built for flow. » : grille de 4 features en verre dépoli |
| 20.6–24 s | End card : logo, « Lumen », « Work, in flow. », CTA |

## Utilisation

```bash
npm install
npm run preview        # http://localhost:5173 : lecture temps réel + scrubber (espace = pause)
npm run stills         # images fixes PNG dans out/stills
npm run render         # bande-son + vidéo finale → out/lumen-short.mp4
npm run render:draft   # brouillon rapide en 30 fps, sans motion blur
```

Il faut Node 18+, ffmpeg et Chromium (via Playwright). `?t=12.5` dans l'URL de preview ouvre la timeline à 12,5 s.

## Structure

- `index.html` : la scène 1080×1920 et toutes ses couches.
- `src/styles.css` : la mise en page et le design system (couleurs, typo, cartes).
- `src/timeline.js` : `renderAt(t)` ; chaque image est une fonction pure du temps (easings, springs, helpers `blurIn` / `blurOut`).
- `scripts/render.mjs` : capture image par image dans Chromium headless (4 workers), sous-images fusionnées par ffmpeg, puis encodage H.264.
- `scripts/audio.mjs` : bande-son procédurale (nappe d'accords, whooshs, impacts sub, ticks d'UI) calée sur les mêmes timings.

---

## v2 — D/A éditoriale « Premiere-like »

Short vertical de 25 s (1080×1920, 30 fps avec motion blur), monté sur une grille à 120 BPM. C'est un collage d'objets et de typographies mélangées, avec un traitement « film ». Toutes les sources sont dans `v2/`.

**Script :** « You're not out of time. You're out of focus. »

| Temps | Scène | D/A |
|---|---|---|
| 0–4.5 s | « You're not out of TIME. » | Cadran d'horloge émaillé en couches qui tournent, écho de texte, puis zoom à travers le cadran |
| 4.5–8 s | « you're out of FOCUS » | Pièces de puzzle lumineuses qui s'emboîtent sur le beat, puis explosion et flash |
| 8–13 s | « are you working? » | Bureau vu de dessus sur tapis de découpe vert, objets en stop-motion à 12 fps, gros titre jaune + script manuscrite + sticker, notif « Meeting moved. (again) », puis whip pan |
| 13–17 s | « BUSY ISN'T PRODUCTIVE. » | Plaque de briques, fenêtre Windows 95 `focus.exe (Not Responding)`, cascade d'erreurs, titres pixel en tampon, glitch RGB |
| 17–21.5 s | « Meet Lumen. » | Fond orange, toggle Busy → Focused, dossiers macOS glissés dans une pochette « Lumen workspace » |
| 21.5–25 s | « Am I busy or building? » | Étoile lumineuse, poussière d'étoiles, logo et tagline en serif éditoriale |

**Le langage de montage :**
- **Deux horloges** : les objets du collage bougent en stop-motion à 12 fps, tandis que la typo et la caméra restent fluides (motion blur réel).
- **Caméra** : bougé façon caméra à l'épaule, secousses sur les impacts, zooms punch, whip pans, zoom à travers le cadran.
- **Post-FX** : grain argentique renouvelé à chaque image, vignettage, aberration chromatique sur les coupes, flashs, light leaks, HUD de montage (timecode, repères de cadrage, FIG.0X).
- **Typos (OFL, embarquées dans `v2/fonts`)** : Instrument Serif (éditorial), Archivo Black (impact), Mr Dafoe (manuscrite), Silkscreen et VT323 (rétro), Space Mono (annotations), Inter.
- **Son** (`scripts/audio-v2.mjs`) : tic-tac d'horloge en intro, beat à 120 BPM qui tombe à 4,5 s, clics de puzzle, griffonnage au feutre, sons d'erreur rétro, bus musique bitcrushé pendant la scène Windows, avec un vrai blanc sur le « Not Responding ».

```bash
npm run stills:v2   # images fixes → out/stills-v2
npm run render:v2   # bande-son + vidéo → out/lumen-v2.mp4
# preview : npx serve . puis http://localhost:3000/v2/
```
