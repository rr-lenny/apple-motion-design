import {Easing} from 'remotion';

export const C = {
	paper: '#FCFCFC',
	black: '#000000',
	ink: '#111111',
	ghost: '#C7C7CC',
	fill: '#EFEFF2',
	accent: '#D7141A',
	orange: '#FF9500',
	white: '#FFFFFF',
};

export const FONT = '"Inter Tight", "Helvetica Neue", Helvetica, Arial, sans-serif';
export const FONT_JP = '"Noto Sans JP", sans-serif';

/** Visuel centré à 40 % de la hauteur, légende juste en dessous. */
export const LAYOUT = {
	visualY: 768,
	visualMaxHalfHeight: 330,
	captionY: 1180,
	captionMaxWidth: 920,
	captionSize: 52,
};

export const EASE_ENTRY = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_EXIT = Easing.bezier(0.4, 0, 1, 1);

export const SHADOW_SOFT = '0 18px 40px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.06)';
