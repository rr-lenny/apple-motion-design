import React from 'react';
import {Composition, continueRender, delayRender} from 'remotion';
import '@fontsource/inter-tight/500.css';
import '@fontsource/inter-tight/600.css';
import '@fontsource/inter-tight/700.css';
import '@fontsource/noto-sans-jp/japanese-500.css';
import {DURATION_FRAMES, FPS, HEIGHT, WIDTH} from './timeline';
import {Video} from './Video';

// Attend le chargement des polices avant le premier rendu (mesure des sous-titres).
const fontHandle = delayRender('Chargement des polices');
Promise.all([
	document.fonts.load('500 52px "Inter Tight"'),
	document.fonts.load('600 52px "Inter Tight"'),
	document.fonts.load('700 90px "Inter Tight"'),
	document.fonts.load('500 210px "Noto Sans JP"', '生き甲斐'),
]).then(() => continueRender(fontHandle));

export const Root: React.FC = () => (
	<Composition id="Ikigai" component={Video} durationInFrames={DURATION_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
);
