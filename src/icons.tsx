// Pictogrammes d'interface génériques (style SF Symbols simplifié). Aucun logo de marque.
import React from 'react';

export type IconName =
	| 'search'
	| 'heart'
	| 'star'
	| 'globe'
	| 'coin'
	| 'bookmark'
	| 'bookmarkFill'
	| 'play'
	| 'pencil'
	| 'camera'
	| 'music'
	| 'palette'
	| 'book'
	| 'bulb';

const paths: Record<IconName, React.ReactNode> = {
	search: (
		<>
			<circle cx="10.5" cy="10.5" r="6.5" />
			<path d="M15.5 15.5 L21 21" />
		</>
	),
	heart: <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7C19.5 15.9 12 20.5 12 20.5z" />,
	star: <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" />,
	globe: (
		<>
			<circle cx="12" cy="12" r="8.5" />
			<path d="M3.5 12h17M12 3.5c2.6 2.6 3.6 5.4 3.6 8.5s-1 5.9-3.6 8.5c-2.6-2.6-3.6-5.4-3.6-8.5s1-5.9 3.6-8.5z" />
		</>
	),
	coin: (
		<>
			<circle cx="12" cy="12" r="8.5" />
			<path d="M14.8 9.2c-.5-.9-1.6-1.4-2.8-1.4-1.6 0-2.8.8-2.8 2s1.2 1.7 2.8 2.1 2.8.9 2.8 2.1-1.2 2.1-2.8 2.1c-1.3 0-2.4-.6-2.9-1.5M12 6.2v1.6M12 16.1v1.7" />
		</>
	),
	bookmark: <path d="M6.5 3.5h11v17L12 16.3l-5.5 4.2z" />,
	bookmarkFill: <path d="M6.5 3.5h11v17L12 16.3l-5.5 4.2z" fill="currentColor" />,
	play: <path d="M8.5 5.5v13l10-6.5z" fill="currentColor" />,
	pencil: (
		<>
			<path d="M4 20l1-4.5L15.8 4.7a1.8 1.8 0 0 1 2.5 0l1 1a1.8 1.8 0 0 1 0 2.5L8.5 19z" />
			<path d="M13.8 6.7l3.5 3.5" />
		</>
	),
	camera: (
		<>
			<path d="M3.5 8.5a1.5 1.5 0 0 1 1.5-1.5h2.5L9 5h6l1.5 2H19a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z" />
			<circle cx="12" cy="12.8" r="3.4" />
		</>
	),
	music: (
		<>
			<path d="M9 17.5V5.5l10-2v12" />
			<circle cx="6.8" cy="17.5" r="2.3" />
			<circle cx="16.8" cy="15.5" r="2.3" />
		</>
	),
	palette: (
		<>
			<path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.3 0 1.9-.8 1.9-1.7 0-1.1-.9-1.5-.9-2.5 0-.9.7-1.6 1.7-1.6h2.1a3.7 3.7 0 0 0 3.7-3.7c0-4.2-3.8-7.5-8.5-7.5z" />
			<circle cx="7.8" cy="11" r="1.1" fill="currentColor" />
			<circle cx="10.5" cy="7.4" r="1.1" fill="currentColor" />
			<circle cx="15" cy="7.8" r="1.1" fill="currentColor" />
		</>
	),
	book: (
		<>
			<path d="M12 6.5C10.3 5 7.8 4.5 4 4.8v13.5c3.8-.3 6.3.2 8 1.7 1.7-1.5 4.2-2 8-1.7V4.8c-3.8-.3-6.3.2-8 1.7z" />
			<path d="M12 6.5V20" />
		</>
	),
	bulb: (
		<>
			<path d="M9 17.5h6M10 20.5h4M12 3.5a5.8 5.8 0 0 0-3.3 10.6c.6.5.9 1.2.9 2V17h4.8v-.9c0-.8.3-1.5.9-2A5.8 5.8 0 0 0 12 3.5z" />
		</>
	),
};

export const Icon: React.FC<{name: IconName; size: number; color: string; stroke?: number}> = ({
	name,
	size,
	color,
	stroke = 1.7,
}) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke={color}
		strokeWidth={stroke}
		strokeLinecap="round"
		strokeLinejoin="round"
		style={{color, display: 'block'}}
	>
		{paths[name]}
	</svg>
);
