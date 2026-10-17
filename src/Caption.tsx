import React from 'react';
import {interpolateColors} from 'remotion';
import {fitText} from '@remotion/layout-utils';
import {beatAt, DARK_SCENES} from './timeline';
import {useT} from './motion';
import {C, FONT, LAYOUT} from './theme';

/**
 * Sous-titre : un groupe de mots à la fois, calé sur le tableau de beats.
 * Fondu d'entrée de 0,1 s, une seule ligne, mot-clé qui passe au rouge en 0,15 s.
 */
export const Caption: React.FC = () => {
	const t = useT();
	const beat = beatAt(t);
	if (!beat.text) return null;

	const dark = DARK_SCENES.includes(beat.scene);
	const base = dark ? C.paper : C.ink;
	const fadeIn = Math.min(1, (t - beat.start) / 0.1);
	const keyP = Math.min(1, Math.max(0, (t - beat.start - 0.1) / 0.15));

	// Une seule ligne garantie : on réduit la taille si le texte dépasse la largeur utile.
	const fitted = fitText({
		text: beat.text,
		withinWidth: LAYOUT.captionMaxWidth,
		fontFamily: 'Inter Tight',
		fontWeight: 500,
		letterSpacing: '-0.02em',
	}).fontSize;
	const fontSize = Math.min(LAYOUT.captionSize, fitted);

	const words = beat.text.split(' ');
	return (
		<div
			style={{
				position: 'absolute',
				left: 0,
				right: 0,
				top: LAYOUT.captionY - fontSize * 0.6,
				textAlign: 'center',
				whiteSpace: 'nowrap',
				fontFamily: FONT,
				fontWeight: 500,
				fontSize,
				lineHeight: 1.2,
				letterSpacing: '-0.02em',
				color: base,
				opacity: fadeIn,
			}}
		>
			{words.map((w, i) => {
				// Seul le mot-clé passe au rouge (« l'Ikigai » → « Ikigai »), pas l'élision ni la ponctuation.
				const k = beat.key ? w.indexOf(beat.key) : -1;
				const sep = i < words.length - 1 ? ' ' : '';
				if (k < 0 || !beat.key) return <React.Fragment key={i}>{w + sep}</React.Fragment>;
				return (
					<React.Fragment key={i}>
						{w.slice(0, k)}
						<span style={{color: interpolateColors(keyP, [0, 1], [base, C.accent])}}>{beat.key}</span>
						{w.slice(k + beat.key.length) + sep}
					</React.Fragment>
				);
			})}
		</div>
	);
};
