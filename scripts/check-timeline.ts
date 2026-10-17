// Vérifie le tableau de beats : continuité, durées, mots par beat, mots-clés, temps sans mouvement.
import {BEATS, DURATION_SECONDS} from '../src/timeline.ts';

const errors: string[] = [];
const warnings: string[] = [];
const MAX_STILL = 1.5;

BEATS.forEach((b, i) => {
	if (b.end <= b.start) errors.push(`${b.id} : fin ≤ début`);
	const prev = BEATS[i - 1];
	if (prev && Math.abs(prev.end - b.start) > 1e-6) errors.push(`${prev.id} → ${b.id} : trou ou chevauchement`);
	if (b.key && !b.text.includes(b.key)) errors.push(`${b.id} : mot-clé « ${b.key} » absent du texte`);
	if (!b.text) return;
	const d = b.end - b.start;
	const words = b.text.split(' ').length;
	if (d < 0.5 || d > 1.5) warnings.push(`${b.id} : durée ${d.toFixed(2)} s (cible 0,6–1,5 s)`);
	if (words > 4) warnings.push(`${b.id} : ${words} mots « ${b.text} » (cible 1–4, gardé pour suivre la voix)`);
});

// Un mot-clé maximum par phrase (une phrase se termine par un point).
let keys = 0;
for (const b of BEATS) {
	if (b.key) keys++;
	if (/\.$/.test(b.text)) {
		if (keys > 1) errors.push(`plus d'un mot-clé dans la phrase finissant à ${b.id}`);
		keys = 0;
	}
}

// Chaque début de beat déclenche une animation ; la carte de fin a un zoom continu.
for (const b of BEATS) {
	const d = b.end - b.start;
	if (d > MAX_STILL && b.scene !== 'fin' && b.scene !== 'noir') {
		warnings.push(`${b.id} : ${d.toFixed(2)} s sur un seul beat — vérifier qu'une animation interne couvre la durée`);
	}
}

console.log(`${BEATS.length} beats, durée ${DURATION_SECONDS.toFixed(2)} s`);
warnings.forEach((w) => console.log('  ⚠ ' + w));
errors.forEach((e) => console.log('  ✗ ' + e));
if (errors.length) process.exit(1);
console.log('OK');
