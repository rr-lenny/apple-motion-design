/**
 * Découpage éditorial des sous-titres : 1-2 lignes, jamais plus de 8 mots par écran.
 * " / " = retour à la ligne ; {y:mot} = mot-clé coloré (y jaune, b bleu, g vert, r rouge, v violet).
 * Les mots doivent suivre exactement voiceover.txt (vérifié au rendu).
 */
export const SCREENS: string[] = [
  "J'ai découvert une / philosophie japonaise",
  'qui va changer ta / perception du bonheur',
  'si tu as la volonté',
  'de vivre de ta création.',
  "Ce principe, / c'est l'{y:IKIGAI}.",
  'Elle repose sur / 4 piliers fondamentaux.',
  'Ce que tu aimes faire.',
  'Ce en quoi tu es doué.',
  'Ce dont le monde a besoin.',
  'Et enfin, / ce pourquoi tu es payé.',
  'Cet équilibre permet / de trouver ta {y:direction},',
  'remettre du {y:sens} à ta vie,',
  'et de pouvoir pleinement',
  "{v:t'épanouir} dans tes / projets créatifs.",
  "N'hésite pas à {b:enregistrer} / cette vidéo",
  "pour ne pas l'oublier.",
  'et je te dis à très vite',
  'pour de nouvelles {y:inspirations}.',
];
