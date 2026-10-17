// ─────────────────────────────────────────────────────────────────────────────
//  Scènes. Un seul visuel à l'écran à la fois, centré à 40 % de la hauteur.
//  Tous les déclenchements viennent de timeline.ts (at / until).
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import {interpolate, interpolateColors} from 'remotion';
import {at, BRAND, until} from './timeline';
import {
	Beam,
	ContactShadow,
	DotCalendar,
	Focus,
	Glide,
	PillSwitch,
	Pop,
	progress,
	SlotCounter,
	TapRipple,
	traceOffset,
	useT,
} from './motion';
import {Icon, IconName} from './icons';
import {C, EASE_EXIT, FONT, FONT_JP, LAYOUT, SHADOW_SOFT} from './theme';

/** Centre son contenu sur le point (540, y). */
const Center: React.FC<{children: React.ReactNode; y?: number}> = ({children, y = LAYOUT.visualY}) => (
	<div
		style={{
			position: 'absolute',
			left: 0,
			right: 0,
			top: y,
			height: 0,
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
		}}
	>
		{children}
	</div>
);

const text = (size: number, color: string = C.ink, weight = 500): React.CSSProperties => ({
	fontFamily: FONT,
	fontSize: size,
	fontWeight: weight,
	letterSpacing: '-0.02em',
	color,
	whiteSpace: 'nowrap',
});

// ── 1. Accroche ──────────────────────────────────────────────────────────────

const SearchBar: React.FC = () => {
	const t = useT();
	const q = progress(t, at('decouvert'), 0.1);
	return (
		<div
			style={{
				width: 800,
				height: 128,
				borderRadius: 64,
				background: C.fill,
				display: 'flex',
				alignItems: 'center',
				padding: '0 44px',
				gap: 24,
				position: 'relative',
			}}
		>
			<Icon name="search" size={52} color={interpolateColors(q, [0, 1], [C.ghost, C.ink])} stroke={2.2} />
			<div style={{position: 'relative', flex: 1, height: 60}}>
				<div style={{...text(46, C.ghost), position: 'absolute', top: 2, opacity: 1 - q}}>rechercher</div>
				<div style={{...text(46), position: 'absolute', top: 2, opacity: q}}>philosophie japonaise</div>
			</div>
		</div>
	);
};

const Enso: React.FC = () => {
	const t = useT();
	const start = at('philosophie');
	const off = traceOffset(t, start, 1);
	const drift = interpolate(t, [start, until('philosophie')], [-8, 4]);
	const cx = 260;
	const cy = 260;
	// Cercle ensō : un seul geste de pinceau, rayon légèrement irrégulier, ouvert en haut à droite.
	const pts = Array.from({length: 61}, (_, i) => {
		const deg = -55 - (i / 60) * 320;
		const r = 196 + 8 * Math.sin((i / 60) * Math.PI * 2.3);
		const a = (deg * Math.PI) / 180;
		return `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
	});
	const d = `M ${pts.join(' L ')}`;
	return (
		<div style={{transform: `rotate(${drift}deg)`}}>
			<svg width={520} height={520} viewBox="0 0 520 520">
				<path d={d} fill="none" stroke={C.ink} strokeWidth={30} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={off} />
				<path
					d={d}
					fill="none"
					stroke={C.ink}
					strokeWidth={12}
					strokeLinecap="round"
					pathLength={1}
					strokeDasharray={1}
					strokeDashoffset={off}
					transform="translate(6 -4)"
					opacity={0.5}
				/>
			</svg>
		</div>
	);
};

const HappinessMeter: React.FC = () => {
	const t = useT();
	const start = at('bonheur');
	const enter = progress(t, at('changer'), 0.6);
	const p = progress(t, start, 0.6);
	const ratio = 0.12 * enter + 0.88 * p;
	const fill = interpolateColors(progress(t, start + 0.1, 0.15), [0, 1], [C.ink, C.accent]);
	const track = 640;
	return (
		<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 56}}>
			<SlotCounter from={12} to={100} at={start} dur={0.6} size={150} suffix="%" />
			<div style={{position: 'relative', width: track, height: 18, borderRadius: 9, background: C.fill}}>
				<div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: track * ratio, borderRadius: 9, background: fill}} />
				<div
					style={{
						position: 'absolute',
						top: -22,
						left: track * ratio - 31,
						width: 62,
						height: 62,
						borderRadius: 31,
						background: C.white,
						boxShadow: '0 6px 18px rgba(0,0,0,0.14), 0 1px 3px rgba(0,0,0,0.10)',
					}}
				/>
			</div>
		</div>
	);
};

export const Accroche: React.FC = () => {
	const t = useT();
	if (t < at('philosophie'))
		return (
			<Center>
				<Glide at={at('intro')}>
					<SearchBar />
				</Glide>
			</Center>
		);
	if (t < at('changer'))
		return (
			<Center>
				<Enso />
			</Center>
		);
	return (
		<Center>
			<Glide at={at('changer')}>
				<HappinessMeter />
			</Glide>
		</Center>
	);
};

// ── Volonté : bouton qui change ──────────────────────────────────────────────

export const Volonte: React.FC = () => {
	// Bascule calée sur le mot « création » (fin du beat).
	const switchAt = at('creation') + 0.45;
	return (
		<Center>
			<Pop at={at('volonte')} style={{position: 'relative'}}>
				<PillSwitch
					at={switchAt}
					from={{label: 'loisir', bg: C.fill, color: C.ink}}
					to={{label: 'métier', bg: C.orange, color: C.white}}
				/>
				<TapRipple at={switchAt} size={200} />
			</Pop>
		</Center>
	);
};

// ── 2. Révélation (fond noir) ────────────────────────────────────────────────

export const Revelation: React.FC = () => {
	const t = useT();
	const breathe = interpolate(t, [at('ikigai'), until('ikigai')], [1, 1.04], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return (
		<>
			<Beam on={at('principe')} floorY={930} />
			<Center>
				<Focus at={at('ikigai')}>
					<div style={{fontFamily: FONT_JP, fontWeight: 500, fontSize: 210, color: C.paper, transform: `scale(${breathe})`, letterSpacing: '0.02em'}}>
						生き甲斐
					</div>
				</Focus>
			</Center>
		</>
	);
};

// ── 3. La donnée : grille des quatre piliers ─────────────────────────────────

const PILLARS: {icon: IconName; label: string; beat: string}[] = [
	{icon: 'heart', label: 'aimer', beat: 'aimer'},
	{icon: 'star', label: 'doué', beat: 'doue'},
	{icon: 'globe', label: 'besoin', beat: 'monde'},
	{icon: 'coin', label: 'payé', beat: 'paye'},
];

const TILE = 290;
const GAP = 36;
const OFFSET = (TILE + GAP) / 2;
const tileCenter = (i: number) => ({x: (i % 2 === 0 ? -1 : 1) * OFFSET, y: (i < 2 ? -1 : 1) * OFFSET});

const PillarTile: React.FC<{i: number}> = ({i}) => {
	const t = useT();
	const {icon, label, beat} = PILLARS[i];
	const on = at(beat);
	const pIcon = progress(t, on, 0.35);
	const pLabel = progress(t, on + 0.1, 0.35);
	const bump = 1 + 0.05 * Math.sin(Math.PI * progress(t, on, 0.4));
	const missing = i === 3 ? progress(t, at('enfin'), 0.2) * (1 - progress(t, on, 0.3, EASE_EXIT)) : 0;
	const {x, y} = tileCenter(i);
	return (
		<Pop at={at('repose') + i * 0.1} style={{position: 'absolute', left: x - TILE / 2, top: y - TILE / 2}}>
			<div
				style={{
					position: 'relative',
					width: TILE,
					height: TILE,
					borderRadius: 64,
					background: interpolateColors(pIcon, [0, 1], [C.fill, C.white]),
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					gap: 18,
					transform: `scale(${bump})`,
				}}
			>
				<div style={{position: 'absolute', inset: 0, borderRadius: 64, boxShadow: SHADOW_SOFT, opacity: pIcon}} />
				<Icon name={icon} size={120} color={interpolateColors(pIcon, [0, 1], [C.ghost, C.ink])} stroke={1.6} />
				<div style={{...text(40, interpolateColors(pLabel, [0, 1], [C.ghost, C.ink]))}}>{label}</div>
				{missing > 0 ? (
					<div
						style={{
							position: 'absolute',
							inset: -16,
							borderRadius: 78,
							border: `4px dashed ${C.accent}`,
							opacity: missing,
							transform: `scale(${1 + 0.02 * Math.sin(t * 12)})`,
						}}
					/>
				) : null}
			</div>
		</Pop>
	);
};

export const Piliers: React.FC = () => {
	const t = useT();
	const badgeOut = progress(t, at('aimer'), 0.2, EASE_EXIT);
	return (
		<Center>
			<div style={{position: 'relative', width: 0, height: 0}}>
				{PILLARS.map((_, i) => (
					<PillarTile key={i} i={i} />
				))}
				<Pop at={at('quatre') + 0.15} style={{position: 'absolute', left: OFFSET + TILE / 2 - 56, top: -OFFSET - TILE / 2 - 30}}>
					<div
						style={{
							width: 88,
							height: 88,
							borderRadius: 44,
							background: C.accent,
							color: C.white,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							...text(50, C.white, 600),
							opacity: 1 - badgeOut,
							boxShadow: '0 8px 20px rgba(215,20,26,0.25)',
						}}
					>
						4
					</div>
				</Pop>
			</div>
		</Center>
	);
};

// ── 4a. Équilibre : les quatre cercles convergent ────────────────────────────

export const Equilibre: React.FC = () => {
	const t = useT();
	const p = progress(t, at('equilibre'), 0.6);
	const r = interpolate(p, [0, 1], [TILE / 2, 150]);
	const dist = interpolate(p, [0, 1], [OFFSET, 84]);
	const dot = progress(t, at('trouver'), 0.3);
	const arrowOff = traceOffset(t, at('direction'), 0.8);
	const headP = progress(t, at('direction') + 0.6, 0.2);
	const size = 760;
	const c = size / 2;
	return (
		<Center>
			<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{overflow: 'visible'}}>
				{PILLARS.map((pl, i) => {
					const {x, y} = tileCenter(i);
					const cx = c + Math.sign(x) * dist;
					const cy = c + Math.sign(y) * dist;
					return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={C.ink} strokeWidth={4} />;
				})}
				<path
					d={`M ${c} ${c} C ${c + 30} ${c - 110}, ${c - 30} ${c - 220}, ${c} ${c - 320}`}
					fill="none"
					stroke={C.ink}
					strokeWidth={6}
					strokeLinecap="round"
					pathLength={1}
					strokeDasharray={1}
					strokeDashoffset={arrowOff}
				/>
				<path
					d={`M ${c - 30} ${c - 290} L ${c} ${c - 320} L ${c + 30} ${c - 290}`}
					fill="none"
					stroke={C.ink}
					strokeWidth={6}
					strokeLinecap="round"
					strokeLinejoin="round"
					opacity={headP}
				/>
				<circle cx={c} cy={c} r={20 * (dot + 0.15 * Math.sin(Math.PI * dot))} fill={C.accent} />
			</svg>
			<div style={{position: 'absolute', width: 0, height: 0}}>
				{PILLARS.map((pl, i) => {
					const {x, y} = tileCenter(i);
					const k = dist + r * 0.42;
					return (
						<div key={i} style={{position: 'absolute', left: Math.sign(x) * k - 32, top: Math.sign(y) * k - 32}}>
							<Icon name={pl.icon} size={64} color={C.ink} stroke={1.7} />
						</div>
					);
				})}
			</div>
		</Center>
	);
};

// ── 4b. Sens : calendrier en points ──────────────────────────────────────────

export const Sens: React.FC = () => (
	<Center>
		<Focus at={at('sens')}>
			<DotCalendar rows={8} cols={12} dot={30} gap={26} fillStart={at('sens') + 0.2} fillEnd={until('vie') - 0.05} />
		</Focus>
	</Center>
);

// ── 4c. S'épanouir : orbite ──────────────────────────────────────────────────

const ORBIT: {icon: IconName; r: number; a: number}[] = [
	{icon: 'pencil', r: 230, a: -90},
	{icon: 'camera', r: 300, a: -35},
	{icon: 'music', r: 230, a: 25},
	{icon: 'palette', r: 300, a: 85},
	{icon: 'book', r: 230, a: 150},
	{icon: 'bulb', r: 300, a: 210},
];
const SELECTED = 3;

export const Epanouir: React.FC = () => {
	const t = useT();
	const start = at('pouvoir');
	const rings = progress(t, start, 0.5);
	const open = Math.sin(Math.PI * progress(t, at('epanouir'), 0.5));
	const sel = progress(t, at('projets') + 0.3, 0.25);
	const spin = (t - start) * 8;
	return (
		<Center>
			<div style={{position: 'relative', width: 0, height: 0}}>
				{[150, 230, 300].map((r, i) => {
					const s = (0.9 + 0.1 * rings) * (1 + 0.06 * open * (i + 1) / 3);
					return (
						<div
							key={r}
							style={{
								position: 'absolute',
								left: -r,
								top: -r,
								width: r * 2,
								height: r * 2,
								borderRadius: r,
								border: `2px solid ${C.fill}`,
								opacity: rings,
								transform: `scale(${s})`,
							}}
						/>
					);
				})}
				<Pop at={start} style={{position: 'absolute', left: -75, top: -75}}>
					<div
						style={{
							width: 150,
							height: 150,
							borderRadius: 75,
							background: C.ink,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							boxShadow: SHADOW_SOFT,
						}}
					>
						<svg width={84} height={84} viewBox="0 0 84 84">
							{[
								[30, 30],
								[54, 30],
								[30, 54],
								[54, 54],
							].map(([x, y], i) => (
								<circle key={i} cx={x} cy={y} r={20} fill="none" stroke={C.paper} strokeWidth={3} />
							))}
						</svg>
					</div>
				</Pop>
				{ORBIT.map((o, i) => {
					const a = ((o.a + spin) * Math.PI) / 180;
					const r = o.r * (1 + 0.06 * open * (o.r / 300));
					const x = Math.cos(a) * r;
					const y = Math.sin(a) * r;
					const isSel = i === SELECTED;
					return (
						<Pop key={i} at={start + 0.15 + i * 0.12} style={{position: 'absolute', left: x - 50, top: y - 50}}>
							<div
								style={{
									position: 'relative',
									width: 100,
									height: 100,
									borderRadius: 50,
									background: C.white,
									boxShadow: SHADOW_SOFT,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									opacity: isSel ? 1 : 1 - 0.7 * sel,
								}}
							>
								<Icon name={o.icon} size={50} color={C.ink} stroke={1.7} />
								{isSel ? (
									<div
										style={{
											position: 'absolute',
											inset: -12,
											borderRadius: 62,
											border: `6px solid ${C.accent}`,
											opacity: sel,
											transform: `scale(${1.25 - 0.25 * sel})`,
										}}
									/>
								) : null}
							</div>
						</Pop>
					);
				})}
			</div>
		</Center>
	);
};

// ── 5. Appel à l'action ──────────────────────────────────────────────────────

const SaveButton: React.FC = () => {
	const t = useT();
	// Tap calé sur le mot « enregistrer ».
	const tap = at('enregistrer') + 0.45;
	const filled = t >= tap;
	const press = 1 - 0.08 * Math.sin(Math.PI * progress(t, tap - 0.05, 0.3));
	return (
		<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 48}}>
			<Pop at={at('enregistrer')} style={{position: 'relative'}}>
				<div
					style={{
						width: 220,
						height: 220,
						borderRadius: 110,
						background: C.fill,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						transform: `scale(${press})`,
					}}
				>
					<Icon name={filled ? 'bookmarkFill' : 'bookmark'} size={110} color={C.ink} stroke={1.6} />
				</div>
				<TapRipple at={tap} size={240} />
			</Pop>
			<Focus at={at('enregistrer') + 0.1}>
				<SlotCounter from={12471} to={12488} at={at('video')} dur={0.6} size={72} thousands />
			</Focus>
		</div>
	);
};

const Notification: React.FC = () => (
	<div
		style={{
			width: 880,
			height: 176,
			borderRadius: 44,
			background: C.white,
			boxShadow: '0 24px 60px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
			display: 'flex',
			alignItems: 'center',
			padding: '0 36px',
			gap: 30,
		}}
	>
		<div
			style={{
				width: 104,
				height: 104,
				borderRadius: 26,
				background: C.ink,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
			}}
		>
			<Icon name="bookmarkFill" size={56} color={C.white} stroke={1.6} />
		</div>
		<div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 6}}>
			<div style={text(40, C.ink, 600)}>enregistré</div>
			<div style={text(34, C.ghost)}>à revoir plus tard</div>
		</div>
		<div style={{...text(30, C.ghost), alignSelf: 'flex-start', marginTop: 40}}>maintenant</div>
	</div>
);

export const Cta: React.FC = () => {
	const t = useT();
	if (t < at('oublier'))
		return (
			<Center>
				<SaveButton />
			</Center>
		);
	return (
		<Center>
			<Glide at={at('oublier')}>
				<Notification />
			</Glide>
		</Center>
	);
};

// ── Suite : prochaine vidéo ──────────────────────────────────────────────────

export const Suite: React.FC = () => {
	const t = useT();
	const prog = interpolate(t, [at('vite'), until('inspirations')], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	const pulse = 1 + 0.12 * Math.sin(Math.PI * progress(t, at('inspirations'), 0.45));
	return (
		<Center>
			<Glide at={at('dis')}>
				<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28}}>
					<div style={{position: 'relative', width: 660, height: 380, borderRadius: 48, background: C.fill, overflow: 'visible'}}>
						<div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
							<div
								style={{
									width: 132,
									height: 132,
									borderRadius: 66,
									background: C.white,
									boxShadow: SHADOW_SOFT,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									transform: `scale(${pulse})`,
								}}
							>
								<div style={{marginLeft: 8}}>
									<Icon name="play" size={64} color={C.ink} stroke={1.4} />
								</div>
							</div>
						</div>
						<div style={{position: 'absolute', left: 48, right: 48, bottom: 40, height: 10, borderRadius: 5, background: C.ghost}}>
							<div style={{width: `${prog * 100}%`, height: '100%', borderRadius: 5, background: C.ink}} />
						</div>
						<Pop at={at('nouvelles')} style={{position: 'absolute', left: 36, top: 36}}>
							<div style={{...text(32, C.white, 600), background: C.ink, borderRadius: 26, padding: '10px 26px'}}>nouveau</div>
						</Pop>
					</div>
					<ContactShadow width={560} opacity={0.8} />
				</div>
			</Glide>
		</Center>
	);
};

// ── 6. Carte de fin ──────────────────────────────────────────────────────────

export const Fin: React.FC = () => {
	const t = useT();
	const s = interpolate(t, [at('marque'), until('marque')], [1, 1.03]);
	return (
		<Center y={960}>
			<Focus at={at('marque')}>
				<div style={{...text(90, C.ink, 700), transform: `scale(${s})`}}>{BRAND}</div>
			</Focus>
		</Center>
	);
};
