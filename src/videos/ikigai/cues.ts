import timings from './timings.json';
import type { TimedWord } from '../../components/Subtitles';

/**
 * Tous les temps (secondes) viennent de timings.json, généré par
 * scripts/align_voiceover.py à partir de la voix off : si la voix change,
 * on relance l'alignement et toute l'animation se recale.
 */
type Segment = { text: string; start: number; end: number; words: TimedWord[] };
const SEGMENTS = timings.segments as Segment[];

const norm = (s: string) => s.toLowerCase().replace(/[.,;:!?]/g, '');

const seg = (i: number) => SEGMENTS[i];
const word = (i: number, w: string) => {
  const found = SEGMENTS[i].words.find((x) => norm(x.w) === norm(w));
  if (!found) throw new Error(`Mot « ${w} » introuvable dans le segment ${i} (« ${SEGMENTS[i].text} »)`);
  return found.t;
};

export const WORDS: TimedWord[] = SEGMENTS.flatMap((s) => s.words);
export const AUDIO_DURATION = timings.duration;

export const CUE = {
  // 1. Accroche
  jai: seg(0).start,
  decouvert: word(0, 'découvert'),
  japonaise: word(0, 'japonaise'),
  qui: seg(1).start,
  changer: word(1, 'changer'),
  perception: word(1, 'perception'),
  bonheur: word(1, 'bonheur'),
  si: seg(2).start,
  volonte: word(2, 'volonté'),
  creation: word(2, 'création'),
  creationEnd: seg(2).end,
  // 2. Le principe
  principeStart: seg(3).start,
  principe: word(3, 'principe'),
  ikigai: word(4, "l'IKIGAI"),
  elle: seg(5).start,
  quatre: word(5, '4'),
  piliers: word(5, 'piliers'),
  // 3. Les 4 piliers
  pillar: [seg(6).start, seg(7).start, seg(8).start, seg(10).start],
  pillarWord: [word(6, 'aimes'), word(7, 'doué'), word(8, 'monde'), word(10, 'payé')],
  enfin: seg(9).start,
  // 4. L'équilibre
  cet: seg(11).start,
  equilibre: word(11, 'équilibre'),
  trouver: word(11, 'trouver'),
  direction: word(11, 'direction'),
  remettre: seg(12).start,
  sens: word(12, 'sens'),
  vie: word(12, 'vie'),
  etDe: seg(13).start,
  pleinement: word(13, 'pleinement'),
  epanouir: seg(14).start,
  projets: word(14, 'projets'),
  creatifs: word(14, 'créatifs'),
  // 5. Appel à l'action
  hesite: seg(15).start,
  enregistrer: word(15, 'enregistrer'),
  video: word(15, 'vidéo'),
  oublier: word(15, "l'oublier"),
  aBientot: seg(16).start,
  tresVite: word(16, 'très'),
  nouvelles: word(16, 'nouvelles'),
  inspirations: word(16, 'inspirations'),
  voiceEnd: seg(16).end,
} as const;
