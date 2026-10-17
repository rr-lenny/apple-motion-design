import React from 'react';
import {AbsoluteFill, Audio, staticFile} from 'remotion';
import {beatAt, DARK_SCENES, SceneId} from './timeline';
import {Caption} from './Caption';
import {useT} from './motion';
import {Accroche, Cta, Epanouir, Equilibre, Fin, Piliers, Revelation, Sens, Suite, Volonte} from './scenes';
import {C, FONT} from './theme';

const SCENES: Record<SceneId, React.FC> = {
	accroche: Accroche,
	volonte: Volonte,
	revelation: Revelation,
	piliers: Piliers,
	equilibre: Equilibre,
	sens: Sens,
	epanouir: Epanouir,
	cta: Cta,
	suite: Suite,
	fin: Fin,
	noir: () => null,
};

/** Caméra fixe, coupe sèche entre les scènes (y compris blanc ↔ noir). */
export const Video: React.FC = () => {
	const t = useT();
	const {scene} = beatAt(t);
	const Scene = SCENES[scene];
	return (
		<AbsoluteFill style={{background: DARK_SCENES.includes(scene) ? C.black : C.paper, fontFamily: FONT}}>
			<Scene />
			<Caption />
			<Audio src={staticFile('voice.mp3')} />
		</AbsoluteFill>
	);
};
