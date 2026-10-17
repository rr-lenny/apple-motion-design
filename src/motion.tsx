// ─────────────────────────────────────────────────────────────────────────────
//  Bibliothèque de mouvements réutilisables.
//  Chaque composant reçoit des temps absolus (secondes), issus de timeline.ts
//  via at('id') / until('id'). Aucun timing n'est codé en dur ici.
// ─────────────────────────────────────────────────────────────────────────────
import React, {useId} from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, EASE_EXIT, EASE_ENTRY} from './theme';

/** Temps courant en secondes. */
export const useT = (): number => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	return frame / fps;
};

/** Progression 0 → 1 entre `start` et `start + dur`. */
export const progress = (t: number, start: number, dur: number, easing = EASE_ENTRY): number =>
	interpolate(t, [start, start + dur], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing,
	});

const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

const useFilterId = () => `f${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

/** Flou directionnel (motion blur) appliqué à un élément HTML. */
const DirectionalBlur: React.FC<{x: number; y: number; children: React.ReactNode; style?: React.CSSProperties}> = ({
	x,
	y,
	children,
	style,
}) => {
	const id = useFilterId();
	const active = x > 0.2 || y > 0.2;
	return (
		<>
			<svg width={0} height={0} style={{position: 'absolute'}}>
				<filter id={id} x="-60%" y="-60%" width="220%" height="220%">
					<feGaussianBlur stdDeviation={`${x} ${y}`} />
				</filter>
			</svg>
			<div style={{...style, filter: active ? `url(#${id})` : undefined}}>{children}</div>
		</>
	);
};

/** Glissé : arrive par la droite avec un fort flou horizontal, expo-out en 0,4 s. */
export const Glide: React.FC<{at: number; distance?: number; children: React.ReactNode}> = ({
	at,
	distance = 900,
	children,
}) => {
	const t = useT();
	const p = progress(t, at, 0.4);
	const blur = 70 * Math.pow(1 - p, 1.6);
	return (
		<DirectionalBlur
			x={blur}
			y={0}
			style={{
				transform: `translateX(${(1 - p) * distance}px)`,
				opacity: interpolate(p, [0, 0.15], [0, 1], {extrapolateRight: 'clamp'}),
			}}
		>
			{children}
		</DirectionalBlur>
	);
};

/** Mise au point : flou 20 px → 0 et opacité 0 → 1 en 0,3 s. Sortie inverse (ease-in). */
export const Focus: React.FC<{at: number; out?: number; dur?: number; children: React.ReactNode}> = ({
	at,
	out,
	dur = 0.3,
	children,
}) => {
	const t = useT();
	const pin = progress(t, at, dur);
	const pout = out === undefined ? 0 : progress(t, out, 0.2, EASE_EXIT);
	const v = pin * (1 - pout);
	return <div style={{filter: `blur(${(1 - v) * 20}px)`, opacity: v}}>{children}</div>;
};

/** Pop : échelle 0,85 → 1 avec un léger rebond. */
export const Pop: React.FC<{at: number; children: React.ReactNode; style?: React.CSSProperties}> = ({
	at,
	children,
	style,
}) => {
	const t = useT();
	const p = interpolate(t, [at, at + 0.35], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	// Rebond : dépasse légèrement 1 puis revient.
	const scale = p >= 1 ? 1 : 0.85 + 0.15 * (1 - Math.pow(1 - p, 3)) + 0.06 * Math.sin(Math.PI * p) * (1 - p);
	return (
		<div
			style={{
				...style,
				transform: `${style?.transform ?? ''} scale(${scale})`,
				opacity: interpolate(p, [0, 0.3], [0, 1], {extrapolateRight: 'clamp'}),
			}}
		>
			{children}
		</div>
	);
};

/** Tracé : renvoie le stroke-dashoffset d'un chemin `pathLength={1}` dessiné en `dur` secondes. */
export const traceOffset = (t: number, at: number, dur = 1): number =>
	1 - progress(t, at, dur, EASE_ENTRY);

/** Compteur machine à sous : défilement des chiffres avec flou vertical. */
export const SlotCounter: React.FC<{
	from: number;
	to: number;
	at: number;
	dur?: number;
	size?: number;
	suffix?: string;
	color?: string;
	/** Au-delà de cette valeur, les chiffres passent en rouge avec un léger glitch. */
	limit?: number;
	thousands?: boolean;
}> = ({from, to, at, dur = 0.6, size = 140, suffix = '', color = C.ink, limit, thousands = false}) => {
	const t = useT();
	const p = progress(t, at, dur);
	const v = lerp(from, to, p);
	const speed = t >= at ? Math.abs(to - from) * (1 - p) * (1 - p) : 0;
	const digits = Math.max(String(Math.round(Math.max(from, to))).length, 1);
	const over = limit !== undefined && v > limit;
	const glitch = over ? Math.sin(t * 90) * 4 : 0;
	const h = size * 1.1;

	const columns = [];
	for (let k = digits - 1; k >= 0; k--) {
		const pow = Math.pow(10, k);
		let pos: number;
		if (k === 0) {
			pos = ((v % 10) + 10) % 10;
		} else {
			const lower = v % pow;
			const carry = Math.min(Math.max(lower - (pow - 1), 0), 1);
			pos = (Math.floor(v / pow) % 10) + carry;
		}
		const visible = k === 0 ? 1 : interpolate(v, [pow - 1, pow], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
		const blurY = Math.min(18, (speed / Math.max(pow, 1)) * 0.6);
		columns.push(
			<React.Fragment key={k}>
				<div style={{height: h, overflow: 'hidden', width: visible * size * 0.62, opacity: visible}}>
					<DirectionalBlur x={0} y={blurY} style={{transform: `translateY(${-pos * h}px)`}}>
						{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d, i) => (
							<div key={i} style={{height: h, lineHeight: `${h}px`, textAlign: 'center'}}>
								{d}
							</div>
						))}
					</DirectionalBlur>
				</div>
				{thousands && k === 3 ? <div style={{width: size * 0.25}} /> : null}
			</React.Fragment>,
		);
	}

	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				fontSize: size,
				fontWeight: 500,
				letterSpacing: '-0.02em',
				fontVariantNumeric: 'tabular-nums',
				color: over ? C.accent : color,
				transform: `translateX(${glitch}px)`,
			}}
		>
			{columns}
			{suffix ? <div style={{marginLeft: size * 0.08, lineHeight: `${h}px`}}>{suffix}</div> : null}
		</div>
	);
};

/** Calendrier en points : grille mois × années, les points noircissent un à un. */
export const DotCalendar: React.FC<{
	rows: number;
	cols: number;
	fillStart: number;
	fillEnd: number;
	dot?: number;
	gap?: number;
	filled?: number;
	color?: string;
}> = ({rows, cols, fillStart, fillEnd, dot = 26, gap = 22, filled, color = C.ink}) => {
	const t = useT();
	const total = filled ?? rows * cols;
	const step = (fillEnd - fillStart) / total;
	return (
		<div style={{display: 'grid', gridTemplateColumns: `repeat(${cols}, ${dot}px)`, gap}}>
			{Array.from({length: rows * cols}).map((_, i) => {
				const p = i < total ? progress(t, fillStart + i * step, 0.08) : 0;
				return (
					<div
						key={i}
						style={{
							width: dot,
							height: dot,
							borderRadius: dot / 2,
							background: p > 0.5 ? color : C.ghost,
							transform: `scale(${1 + 0.25 * Math.sin(Math.PI * p)})`,
						}}
					/>
				);
			})}
		</div>
	);
};

/** Bouton qui change : la pastille passe d'un état à l'autre en 0,25 s. */
export const PillSwitch: React.FC<{
	at: number;
	from: {label: string; bg: string; color: string};
	to: {label: string; bg: string; color: string};
	width?: number;
}> = ({at, from, to, width = 560}) => {
	const t = useT();
	const p = progress(t, at, 0.25);
	const press = 1 - 0.06 * Math.sin(Math.PI * progress(t, at - 0.08, 0.3));
	return (
		<div
			style={{
				position: 'relative',
				width,
				height: 132,
				borderRadius: 66,
				background: from.bg,
				overflow: 'hidden',
				transform: `scale(${press})`,
				boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
			}}
		>
			<div style={{position: 'absolute', inset: 0, background: to.bg, opacity: p}} />
			{[from, to].map((s, i) => (
				<div
					key={i}
					style={{
						position: 'absolute',
						inset: 0,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						fontSize: 50,
						fontWeight: 500,
						letterSpacing: '-0.02em',
						color: s.color,
						opacity: i === 0 ? 1 - p : p,
						transform: `translateY(${(i === 0 ? -p : 1 - p) * 30}px)`,
					}}
				>
					{s.label}
				</div>
			))}
		</div>
	);
};

/** Faisceau de lumière conique tombant d'en haut, avec halo au sol (scènes noires). */
export const Beam: React.FC<{on: number; floorY: number; width?: number}> = ({on, floorY, width = 760}) => {
	const t = useT();
	// Allumage en deux temps, comme un projecteur.
	const flick = interpolate(t, [on, on + 0.05, on + 0.09, on + 0.14, on + 0.45], [0, 0.7, 0.25, 0.85, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const cx = 540;
	const top = 150;
	return (
		<div style={{position: 'absolute', inset: 0, opacity: flick}}>
			<div
				style={{
					position: 'absolute',
					inset: 0,
					background: 'linear-gradient(180deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.10) 70%, rgba(255,255,255,0.04) 100%)',
					clipPath: `polygon(${cx - top / 2}px 0px, ${cx + top / 2}px 0px, ${cx + width / 2}px ${floorY}px, ${cx - width / 2}px ${floorY}px)`,
					filter: 'blur(28px)',
				}}
			/>
			<div
				style={{
					position: 'absolute',
					left: cx - width * 0.55,
					top: floorY - 70,
					width: width * 1.1,
					height: 140,
					borderRadius: '50%',
					background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.12) 45%, rgba(255,255,255,0) 72%)',
				}}
			/>
		</div>
	);
};

/** Ombre de contact douce sous un objet. */
export const ContactShadow: React.FC<{width: number; opacity?: number}> = ({width, opacity = 1}) => (
	<div
		style={{
			width,
			height: width * 0.12,
			borderRadius: '50%',
			background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.06) 50%, rgba(0,0,0,0) 72%)',
			opacity,
		}}
	/>
);

/** Ondulation de tap (retour tactile iOS). */
export const TapRipple: React.FC<{at: number; size?: number; color?: string}> = ({at, size = 160, color = C.ink}) => {
	const t = useT();
	const p = progress(t, at, 0.5);
	if (t < at || p >= 1) return null;
	return (
		<div
			style={{
				position: 'absolute',
				left: '50%',
				top: '50%',
				width: size,
				height: size,
				marginLeft: -size / 2,
				marginTop: -size / 2,
				borderRadius: '50%',
				border: `4px solid ${color}`,
				transform: `scale(${0.6 + p * 1.2})`,
				opacity: 0.35 * (1 - p),
			}}
		/>
	);
};
