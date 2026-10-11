import { continueRender, delayRender, staticFile } from 'remotion';

/** Polices embarquées (public/fonts) : aucun appel réseau au rendu. */
const FACES: Array<{ family: string; file: string; weight: string }> = [
  { family: 'Montserrat', file: 'montserrat-latin-500-normal.woff2', weight: '500' },
  { family: 'Montserrat', file: 'montserrat-latin-600-normal.woff2', weight: '600' },
  { family: 'Montserrat', file: 'montserrat-latin-700-normal.woff2', weight: '700' },
  // Noto Sans JP, sous-ensembles contenant 生 き 甲 斐.
  { family: 'NotoJP117', file: 'noto-sans-jp-117-500-normal.woff2', weight: '500' },
  { family: 'NotoJP119', file: 'noto-sans-jp-119-500-normal.woff2', weight: '500' },
  { family: 'NotoJP98', file: 'noto-sans-jp-98-500-normal.woff2', weight: '500' },
  { family: 'NotoJP75', file: 'noto-sans-jp-75-500-normal.woff2', weight: '500' },
];

let loaded = false;

export const loadFonts = () => {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;
  const handle = delayRender('Chargement des polices');
  Promise.all(
    FACES.map(({ family, file, weight }) => {
      const face = new FontFace(family, `url('${staticFile(`fonts/${file}`)}') format('woff2')`, { weight });
      return face.load().then((f) => document.fonts.add(f));
    }),
  )
    .then(() => continueRender(handle))
    .catch((err) => {
      console.error(err);
      continueRender(handle);
    });
};
