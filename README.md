# apple-motion-design

Démo de motion design « style Apple » en HTML, CSS et JS : un short vertical de 24 s (1080×1920, 60 fps) pour un SaaS fictif, **Lumen**.

▶ **Vidéo :** [`out/lumen-short.mp4`](out/lumen-short.mp4)

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
