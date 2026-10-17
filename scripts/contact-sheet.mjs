// Rend une image au milieu de chaque beat (et quelques temps forts) puis les assemble en planche.
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('out/frames');
mkdirSync(outDir, {recursive: true});
const browserExecutable = process.env.REMOTION_BROWSER;
const times = process.argv.slice(2).map(Number);

const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const composition = await selectComposition({serveUrl, id: 'Ikigai', browserExecutable});
const files = [];
for (const s of times) {
	const frame = Math.min(composition.durationInFrames - 1, Math.round(s * composition.fps));
	const output = path.join(outDir, `f${String(frame).padStart(4, '0')}.png`);
	await renderStill({composition, serveUrl, frame, output, browserExecutable, scale: 0.5});
	files.push(output);
	console.log('frame', frame);
}
const cols = 6;
execFileSync('ffmpeg', [
	'-loglevel', 'error', '-y',
	...files.flatMap((f) => ['-i', f]),
	'-filter_complex',
	files.map((_, i) => `[${i}:v]drawtext=text='${times[i].toFixed(2)}s':x=10:y=10:fontsize=28:fontcolor=red[v${i}]`).join(';') + ';' +
		files.map((_, i) => `[v${i}]`).join('') + `xstack=inputs=${files.length}:layout=` +
		files.map((_, i) => `${(i % cols) * 540}_${Math.floor(i / cols) * 960}`).join('|') + ':fill=gray',
	path.resolve('out/contact-sheet.png'),
]);
console.log('out/contact-sheet.png');
