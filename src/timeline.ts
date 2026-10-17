// ─────────────────────────────────────────────────────────────────────────────
//  TABLEAU UNIQUE DES TIMINGS
//  Tout est piloté d'ici : sous-titres, coupes, fonds et déclenchement des
//  animations. Pour recaler la vidéo sur la voix, modifie uniquement `start`
//  et `end` (en secondes). Chaque beat doit commencer là où finit le précédent.
//
//  - id    : identifiant utilisé par les scènes pour déclencher leurs animations
//  - scene : scène affichée pendant ce beat (le fond est défini par la scène)
//  - text  : sous-titre affiché (vide = aucun sous-titre)
//  - key   : mot-clé qui passe au rouge (un seul par phrase)
//  - anim  : animation déclenchée au début du beat (documentation / storyboard)
// ─────────────────────────────────────────────────────────────────────────────

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const BRAND = 'Ikigai';

export type SceneId =
	| 'accroche'
	| 'volonte'
	| 'revelation'
	| 'piliers'
	| 'equilibre'
	| 'sens'
	| 'epanouir'
	| 'cta'
	| 'suite'
	| 'fin'
	| 'noir';

export type Beat = {
	id: string;
	start: number;
	end: number;
	scene: SceneId;
	text: string;
	key?: string;
	anim: string;
};

export const BEATS: Beat[] = [
	// 1. Accroche
	{id: 'intro', start: 0.0, end: 0.79, scene: 'accroche', text: '', anim: 'glissé : barre de recherche'},
	{id: 'decouvert', start: 0.79, end: 1.45, scene: 'accroche', text: "j'ai découvert", anim: 'mise au point : requête dans la barre'},
	{id: 'philosophie', start: 1.45, end: 2.75, scene: 'accroche', text: 'une philosophie japonaise', anim: 'tracé : cercle ensō'},
	{id: 'changer', start: 2.75, end: 3.4, scene: 'accroche', text: 'qui va changer', anim: 'glissé : jauge + compteur'},
	{id: 'bonheur', start: 3.4, end: 4.57, scene: 'accroche', text: 'ta perception du bonheur', key: 'bonheur', anim: 'compteur machine à sous 12 → 100, jauge rouge'},
	{id: 'volonte', start: 4.57, end: 5.35, scene: 'volonte', text: 'si tu as la volonté', anim: 'pop : pastille grise « loisir »'},
	{id: 'creation', start: 5.35, end: 6.81, scene: 'volonte', text: 'de vivre de ta création.', anim: 'bouton qui change : « loisir » → « métier » orange'},
	// 2. Révélation (fond noir)
	{id: 'principe', start: 6.81, end: 7.76, scene: 'revelation', text: 'ce principe,', anim: 'faisceau qui s’allume, halo au sol'},
	{id: 'ikigai', start: 7.76, end: 9.28, scene: 'revelation', text: "c'est l'Ikigai.", key: 'Ikigai', anim: 'mise au point : 生き甲斐 sous le faisceau'},
	// 3. La donnée : grille des 4 piliers
	{id: 'repose', start: 9.28, end: 9.95, scene: 'piliers', text: 'elle repose sur', anim: 'grille 2×2 de silhouettes grises (décalage 100 ms)'},
	{id: 'quatre', start: 9.95, end: 11.44, scene: 'piliers', text: 'quatre piliers fondamentaux', key: 'quatre', anim: 'pop : badge « 4 »'},
	{id: 'aimer', start: 11.44, end: 12.89, scene: 'piliers', text: 'ce que tu aimes faire', anim: 'case 1 se colore (cœur)'},
	{id: 'doue', start: 12.89, end: 14.36, scene: 'piliers', text: 'ce en quoi tu es doué', anim: 'case 2 se colore (étoile)'},
	{id: 'monde', start: 14.36, end: 15.89, scene: 'piliers', text: 'ce dont le monde a besoin', anim: 'case 3 se colore (globe)'},
	{id: 'enfin', start: 15.89, end: 16.72, scene: 'piliers', text: 'et enfin', anim: 'case manquante : pointillé rouge'},
	{id: 'paye', start: 16.72, end: 18.22, scene: 'piliers', text: 'ce pour quoi tu es payé.', anim: 'case 4 se colore (pièce)'},
	// 4. Les bénéfices
	{id: 'equilibre', start: 18.22, end: 18.85, scene: 'equilibre', text: 'cet équilibre', anim: 'les 4 cases deviennent 4 cercles qui convergent'},
	{id: 'trouver', start: 18.85, end: 19.45, scene: 'equilibre', text: 'permet de trouver', anim: 'pop : point central'},
	{id: 'direction', start: 19.45, end: 20.27, scene: 'equilibre', text: 'ta direction', anim: 'tracé : flèche depuis le centre'},
	{id: 'sens', start: 20.27, end: 20.95, scene: 'sens', text: 'remettre du sens', key: 'sens', anim: 'calendrier en points (mise au point)'},
	{id: 'vie', start: 20.95, end: 21.88, scene: 'sens', text: 'à ta vie,', anim: 'les points noircissent un à un'},
	{id: 'pouvoir', start: 21.88, end: 23.04, scene: 'epanouir', text: 'et de pouvoir pleinement', anim: 'orbite : anneaux + avatars en décalé'},
	{id: 'epanouir', start: 23.04, end: 23.72, scene: 'epanouir', text: "t'épanouir", anim: 'les anneaux s’ouvrent'},
	{id: 'projets', start: 23.72, end: 24.89, scene: 'epanouir', text: 'dans tes projets créatifs.', anim: 'sélection : anneau rouge, autres à 30 %'},
	// 5. Appel à l'action
	{id: 'enregistrer', start: 24.89, end: 25.75, scene: 'cta', text: "n'hésite pas à enregistrer", key: 'enregistrer', anim: 'pop : bouton signet, tap'},
	{id: 'video', start: 25.75, end: 26.53, scene: 'cta', text: 'cette vidéo', anim: 'compteur machine à sous +1'},
	{id: 'oublier', start: 26.53, end: 27.72, scene: 'cta', text: "pour ne pas l'oublier,", anim: 'glissé : notification « enregistré »'},
	{id: 'dis', start: 27.72, end: 28.25, scene: 'suite', text: 'et je te dis', anim: 'glissé : carte « prochaine vidéo »'},
	{id: 'vite', start: 28.25, end: 28.85, scene: 'suite', text: 'à très vite', anim: 'barre de progression qui avance'},
	{id: 'nouvelles', start: 28.85, end: 29.62, scene: 'suite', text: 'pour de nouvelles', anim: 'pop : badge « nouveau »'},
	{id: 'inspirations', start: 29.62, end: 30.2, scene: 'suite', text: 'inspirations.', anim: 'pulsation du bouton lecture'},
	// 6. Carte de fin
	{id: 'marque', start: 30.2, end: 33.2, scene: 'fin', text: '', anim: 'mise au point : nom de marque, tenu 3 s'},
	{id: 'noir', start: 33.2, end: 33.7, scene: 'noir', text: '', anim: 'noir'},
];

export const DURATION_SECONDS = BEATS[BEATS.length - 1].end;
export const DURATION_FRAMES = Math.round(DURATION_SECONDS * FPS);

const byId = new Map(BEATS.map((b) => [b.id, b]));

/** Début (s) du beat `id`. */
export const at = (id: string): number => {
	const b = byId.get(id);
	if (!b) throw new Error(`Beat inconnu : ${id}`);
	return b.start;
};

/** Fin (s) du beat `id`. */
export const until = (id: string): number => {
	const b = byId.get(id);
	if (!b) throw new Error(`Beat inconnu : ${id}`);
	return b.end;
};

export const beatAt = (t: number): Beat =>
	BEATS.find((b) => t >= b.start && t < b.end) ?? BEATS[BEATS.length - 1];

export const DARK_SCENES: SceneId[] = ['revelation', 'noir'];
