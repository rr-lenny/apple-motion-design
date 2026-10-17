# apple-motion-design

Explainer vertical minimaliste façon keynote (1080×1920, 30 fps, 33,7 s) sur l'Ikigai, réalisé avec Remotion (React + TypeScript).

- **Rendu** : `renders/ikigai.mp4`
- **Storyboard** : `STORYBOARD.md`
- **Timings** : `src/timeline.ts`. C'est le seul tableau à modifier pour recaler la vidéo sur la voix.

## Commandes

```bash
npm install
npm run studio   # prévisualisation interactive
npm run check    # typecheck + vérification du tableau de beats
npm run render   # rendu MP4 dans renders/ikigai.mp4
```

Pour utiliser un Chromium déjà installé, définir `REMOTION_BROWSER=/chemin/vers/chrome`.

Pour obtenir une planche de contrôle (une image par instant donné, en secondes) :
`node scripts/contact-sheet.mjs 1.2 3.4 …` → `out/contact-sheet.png`

## Structure

| Fichier | Rôle |
|---|---|
| `src/timeline.ts` | beats : début, fin, scène, sous-titre, mot-clé, animation |
| `src/motion.tsx` | bibliothèque de mouvements : glissé, mise au point, pop, tracé, compteur machine à sous, calendrier en points, bouton qui change, faisceau, ombre de contact, tap |
| `src/scenes.tsx` | scènes (un seul visuel centré à 40 % de la hauteur) |
| `src/Caption.tsx` | sous-titres sur une ligne, réduits automatiquement s'ils dépassent, mot-clé en rouge en 0,15 s |
| `src/theme.ts` | couleurs, police, mise en page, easing |
