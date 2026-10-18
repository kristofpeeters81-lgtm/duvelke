/**
 * Wat er op het tv-scherm mag. De tablet stuurt de tv enkel dit: een vaste lijst openbare info,
 * nooit het spel zelf. Geheimen (rollen, dossiers, tips, kaartjes, geheime lijstjes, antwoorden
 * vóór ze onthuld zijn, de pincode) kunnen er dus niet per ongeluk in terechtkomen.
 * Een pure functie, zodat een test kan nagaan dat er niets geheims in zit.
 */
import { potPrizes, potShare, ranking, suspectVotes, type PrizeKind, type Score } from '../finale';
import { multipleSaboteursPossible, type Game, type GamePlayer } from '../game';
import { quizOrder, targetFor, treasure } from '../gameplay';
import { LOCATIONS } from '../data/locations';
import { CATEGORY_LABELS } from '../tasks/labels';
import { explainWithGoal, fillVars } from '../tasks/program';
import { QUIZ } from '../tasks/quiz';
import { getTask } from '../tasks/registry';
import { hostWording, windyReadsList } from '../tasks/wording';
import { seededRng } from '../util';

export interface TvPlayer {
  name: string;
  avatar: string;
  color: string;
}

export interface TvQuiz {
  number: number;
  total: number;
  question: string;
  /** In de volgorde van de tablet (geschud). */
  options: string[];
  /** Pas na het antwoorden: wat gekozen werd en wat juist was (plaats op het scherm). */
  chosen: number | null;
  right: number | null;
}

/** De roddel zoals de tablet hem toont (pas als hij verteld wordt). */
export interface TvGossip {
  stage: 'intro' | 'roddel';
  badge: string;
  /** ok = klopt altijd (Windy of het machien), warn = de buurvrouw (soms zever). */
  tone: 'ok' | 'warn';
  speaker: 'windy' | 'buurvrouw' | 'machien';
  text: string;
}

export type TvState =
  | { kind: 'wacht'; emoji: string; title: string; text: string }
  | { kind: 'roddel'; gossip: TvGossip | null }
  | { kind: 'aankondiging'; nr: number; total: number; emoji: string; title: string; tags: string[] }
  | {
      kind: 'opdracht';
      nr: number;
      total: number;
      emoji: string;
      title: string;
      explain: string;
      roles: { name: string; players: string[] }[];
      /** Een open lijst die iedereen mag zien. */
      list: { title: string; items: string[] } | null;
      /** Wat er gebeurt met een lijst die niet open is (geheim, kaartjes, Windy leest voor). */
      note: string | null;
      timer: { total: number; remainingMs: number; endsAt: number | null } | null;
      quiz: TvQuiz | null;
      stopwatch: { running: boolean; elapsed: number | null; target: number | null } | null;
      waiting: string | null;
      /** Op het resultaatscherm: wanneer is het gelukt of bijna (enkel bij gelukt/bijna/mislukt). */
      judge: { gelukt: string; bijna: string } | null;
    }
  | { kind: 'schat'; gain: number; happy: boolean }
  | { kind: 'eindschat'; pct: number; groupWins: boolean; saboteurName: string }
  | { kind: 'ontmaskering'; players: (TvPlayer & { cleared: boolean; saboteur: boolean })[]; unmasked: boolean; saboteurs: string[]; saboteurName: string }
  | { kind: 'uitslag'; rows: (TvPlayer & { place: number; shown: boolean; score: string; found: boolean })[]; done: boolean; noTest: string[] }
  | { kind: 'pot'; pot: PotView }
  | { kind: 'terugblik'; saboteurName: string; items: { emoji: string; title: string; who: string | null; tip: string }[] }
  | { kind: 'fotos' };

/** De verdeling van de echte schat, zoals ze op het eindscherm en op de tv staat (na de ontmaskering). */
export interface PotView {
  items: { name: string; total: number; earned: number; base: number }[];
  prizes: { emoji: string; label: string; why: string; player: TvPlayer; amount: string }[];
  /** Per soort: wie een geluksmuntje kreeg. */
  lucky: { item: string; names: string[] }[];
  /** Iedereen, op naam, met wat die krijgt. */
  rows: (TvPlayer & { amount: string })[];
}

export interface TvScreen {
  state: TvState;
  /** De schat tot nu toe. */
  gems: number;
  max: number;
  /** Tijd op de tablet bij het versturen, om timers juist te zetten op een toestel met een andere klok. */
  now: number;
}

/** Wat de tablet zelf nog weet maar niet in het spel bewaart (bv. welke quizvraag nu getoond wordt). */
export interface TvUi {
  quiz?: { index: number; revealed: boolean };
  gossip?: TvGossip;
}

function tvPlayer(p: GamePlayer): TvPlayer {
  return { name: p.name, avatar: p.avatar, color: p.color };
}

/**
 * De volgorde van de ontmaskering: iedereen (ook wie De Test oversloeg), in de volgorde van De Test,
 * en 't Duvelke altijd als laatste. Gedeeld met het eindscherm, zodat tablet en tv gelijk lopen.
 */
export function unmaskOrder(game: Game): GamePlayer[] {
  const ids = [...(game.finale?.order ?? []), ...game.players.map((p) => p.playerId)];
  return [...new Set(ids)].map((id) => game.players.find((p) => p.playerId === id)).filter((p): p is GamePlayer => !!p && p.role !== 'saboteur');
}

/** De uitslag van De Test zonder de Speurneus (die speelt voor een eigen medaille). */
export function mainRanking(game: Game): Score[] {
  const f = game.finale;
  if (!f) return [];
  const speurneus = game.players.find((p) => p.speurneus)?.playerId;
  return ranking(game.players, f.questions, f.answers).filter((r) => r.playerId !== speurneus);
}

const PRIZE_LABEL: Record<PrizeKind, { emoji: string; label: string }> = {
  winnaar: { emoji: '👑', label: 'Winnaar van De Test' },
  loon: { emoji: '😈', label: 'Sabotageloon' },
  verborgen: { emoji: '🕶️', label: 'Niet ontmaskerd' },
  speurneus: { emoji: '🔍', label: 'Speurneus-medaille' },
  afleider: { emoji: '🙋', label: 'Beste afleider' },
};

/** Wie hoeveel stemmen kreeg bij "Wie is 't Duvelke?" (zonder die van 't Duvelke zelf). */
export function gameVotes(game: Game): { votes: Record<string, number>; voters: number } {
  return game.finale ? suspectVotes(game.players, game.finale.questions, game.finale.answers) : { votes: {}, voters: 0 };
}

/**
 * De pot verdelen: enkel bij een echte schat, na de uitslag. Alles wordt verdeeld: het verdiende deel
 * gelijk over iedereen, het gemiste deel als (begrensde) prijzen, de restjes als geluksmuntjes.
 */
export function potView(game: Game): PotView | null {
  const f = game.finale;
  const items = game.settings.treasureItems.filter((i) => i.quantity > 0);
  if (!f || game.settings.treasureMode !== 'fysiek' || items.length === 0) return null;
  const sab = game.settings.saboteurName;
  const t = treasure(game.program, game.results, getTask);
  const fraction = t.max > 0 ? t.gems / t.max : 0;
  const groupWins = t.max > 0 && Math.round(fraction * 100) >= 50;
  const { votes, voters } = gameVotes(game);
  const speurneus = game.players.find((p) => p.speurneus);
  const speurneusScore = speurneus ? ranking(game.players, f.questions, f.answers).find((r) => r.playerId === speurneus.playerId) : undefined;
  const prizes = potPrizes({
    winnerId: mainRanking(game)[0]?.playerId ?? null,
    saboteurIds: game.players.filter((p) => p.role === 'saboteur').map((p) => p.playerId),
    votes,
    voters,
    groupWins,
    speurneus: speurneus && speurneusScore ? { playerId: speurneus.playerId, found: speurneusScore.foundSaboteur } : null,
    bemoeialId: game.players.find((p) => p.bemoeial)?.playerId ?? null,
  });
  const ids = game.players.map((p) => p.playerId);
  const shares = items.map((it) => potShare(it, fraction, ids, prizes, seededRng(`${game.id}:pot:${it.id}`)));
  const amount = (get: (s: (typeof shares)[number]) => number): string =>
    shares
      .map((s) => [get(s), s.name] as const)
      .filter(([n]) => n > 0)
      // Eén soort: enkel het getal (de naam staat in de titel).
      .map(([n, name]) => (shares.length > 1 ? `${n} ${name}` : String(n)))
      .join(', ');
  const player = (id: string): GamePlayer | undefined => game.players.find((p) => p.playerId === id);
  const why = (kind: PrizeKind, id: string): string => {
    const v = votes[id] ?? 0;
    switch (kind) {
      case 'winnaar':
        return 'De beste speurder van vandaag';
      case 'loon':
        return 'Voor al dat stiekeme saboteren';
      case 'verborgen':
        return !groupWins ? 'De groep haalde minder dan de helft van de schat' : v === 0 ? `Niemand had ${sab} juist` : `Maar ${v} van de ${voters} speurders had het juist`;
      case 'speurneus':
        return `Had ${sab} juist`;
      case 'afleider':
        return `${v} speurders dachten dat dit ${sab} was`;
    }
  };
  return {
    items: shares.map((s) => ({ name: s.name, total: s.total, earned: s.earned, base: s.base })),
    prizes: prizes.flatMap((p, i) => {
      const who = player(p.playerId);
      return who ? [{ ...PRIZE_LABEL[p.kind], why: why(p.kind, p.playerId), player: tvPlayer(who), amount: amount((s) => s.prizes[i]?.amount ?? 0) }] : [];
    }),
    lucky: shares.filter((s) => s.lucky.length > 0).map((s) => ({ item: s.name, names: s.lucky.map((id) => player(id)?.name ?? '?') })),
    rows: [...game.players]
      .sort((a, b) => a.name.localeCompare(b.name, 'nl'))
      .map((p) => ({ ...tvPlayer(p), amount: amount((s) => s.perPlayer[p.playerId] ?? 0) || '0' })),
  };
}

function wait(emoji: string, title: string, text = ''): TvState {
  return { kind: 'wacht', emoji, title, text };
}

function taskState(game: Game, ui: TvUi): TvState {
  const current = game.current;
  const item = game.program[game.taskIndex];
  const task = item ? getTask(item.taskId) : undefined;
  if (!current || !item || !task) return wait('🎬', 'Even geduld...');
  const nr = game.taskIndex + 1;
  const total = game.program.length;
  const name = (id: string): string => game.players.find((p) => p.playerId === id)?.name ?? '?';
  const host = game.settings.hostName;

  switch (current.step) {
    case 'roddel':
      // Pas als de tablet de roddel vertelt, staat hij ook op de tv; vooraf nog niets verklappen.
      return { kind: 'roddel', gossip: ui.gossip?.stage === 'roddel' ? ui.gossip : null };
    case 'aankondiging': {
      const loc = LOCATIONS.find((l) => l.id === item.location);
      return { kind: 'aankondiging', nr, total, emoji: task.emoji, title: task.title, tags: [CATEGORY_LABELS[task.category], ...(loc ? [`${loc.emoji} ${loc.label}`] : [])] };
    }
    case 'briefing': {
      const b = current.briefing;
      const who = b ? b.order[b.index] : undefined;
      return wait('🤫', 'Geheime briefing', `De tablet gaat rond: iedereen krijgt een geheime tip.${who ? ` Nu: ${name(who)}.` : ''}`);
    }
    case 'uitleg':
    case 'bezig':
    case 'resultaat': {
      const w = (t: string): string => hostWording(t, task, host);
      const list = task.list;
      // Enkel een open lijst die de app niet zelf voorleest, mag op de tv. Al de rest krijgt een korte uitleg.
      const open = list && !list.secret && !list.turns && !list.read && item.list.length > 0;
      let note: string | null = null;
      if (list && !open && item.list.length > 0) {
        if (list.turns) note = `🃏 Kaartjes: ${current.cards.index} van ${item.list.length} gespeeld, ✓ ${current.cards.guessed} geraden`;
        else if (list.read === 'willekeurig') note = `🔊 ${host} roept af en toe iets: luister goed!`;
        else if (list.streak) {
          const goal = Number(item.vars.doel) || null;
          const best = current.cards.best ?? 0;
          note = `🔥 ${current.cards.guessed} op een rij${goal ? ` (doel: ${goal})` : ''}${best > current.cards.guessed ? ` · beste reeks: ${best}` : ''}${goal && best >= goal ? ' 🎉' : ''}`;
        }
        else if (list.read || windyReadsList(task)) note = `🔊 ${host} leest voor: ${Math.min(current.cards.index + 1, item.list.length)} van ${item.list.length}`;
        else {
          const owner = Object.values(current.roles)[0]?.[0];
          note = `🤫 Geheim lijstje voor ${owner ? name(owner) : 'het hulpje'}`;
        }
      }
      let quiz: TvQuiz | null = null;
      if (task.scoring.type === 'quiz' && current.step === 'bezig' && current.quiz.length > 0) {
        const firstOpen = current.quizAnswers.findIndex((a) => a === null);
        const index = ui.quiz?.index ?? (firstOpen === -1 ? current.quiz.length - 1 : firstOpen);
        const q = QUIZ[game.settings.difficulty][current.quiz[index] ?? 0];
        if (q) {
          const order = quizOrder(`${item.uid}:${current.quiz[index] ?? 0}`, q.options.length);
          const answered = current.quizAnswers[index] ?? null;
          const revealed = ui.quiz ? ui.quiz.revealed : answered !== null;
          quiz = {
            number: index + 1,
            total: current.quiz.length,
            question: q.q,
            options: order.map((o) => q.options[o] ?? ''),
            chosen: revealed && answered !== null ? order.indexOf(answered) : null,
            right: revealed ? order.indexOf(q.answer) : null,
          };
        }
      }
      const sw = task.scoring.type === 'stopwatch' && current.step === 'bezig'
        ? { running: current.stopwatch.startedAt !== null, elapsed: current.stopwatch.elapsedMs !== null ? Math.round(current.stopwatch.elapsedMs / 100) / 10 : null, target: targetFor(task, item) }
        : null;
      return {
        kind: 'opdracht',
        nr,
        total,
        emoji: task.emoji,
        title: task.title,
        explain: w(explainWithGoal(task, item)),
        roles: (task.roles ?? []).map((r) => ({ name: r.name, players: (current.roles[r.name] ?? []).map(name) })),
        list: open && list ? { title: w(list.title), items: item.list.map(w) } : null,
        note,
        timer: current.step === 'bezig' && current.timer ? { ...current.timer } : null,
        quiz,
        stopwatch: sw,
        waiting: current.step === 'resultaat' ? 'Hoe ging het? Het hulpje duidt het resultaat aan.' : null,
        judge: current.step === 'resultaat' && task.scoring.type === 'gelukt' && task.judge ? { gelukt: w(fillVars(task.judge.gelukt, item.vars)), bijna: w(fillVars(task.judge.bijna, item.vars)) } : null,
      };
    }
    case 'schat':
      return { kind: 'schat', gain: current.pending?.gems ?? 0, happy: current.pending ? current.pending.gems >= current.pending.maxGems * 0.6 : false };
    case 'dilemma':
      return wait('💎', 'Het dilemma', 'Edelstenen houden, of ruilen voor een Kijk-joker?');
    case 'duim':
      return wait('👍', 'Vonden jullie dit een leuke opdracht?');
  }
}

function finaleState(game: Game): TvState {
  const f = game.finale;
  const sab = game.settings.saboteurName;
  if (!f) return wait('🏁', 'Het moment van de waarheid');
  const name = (id: string): string => game.players.find((p) => p.playerId === id)?.name ?? '?';
  switch (f.step) {
    case 'intro':
      return wait(
        '🏁',
        'Het moment van de waarheid',
        `Alle opdrachten zijn gespeeld! Nu volgt De Test: ${f.questions.length} vragen over ${sab}.${game.gossipLog.length === 0 && multipleSaboteursPossible(game.players.length) ? ` Opgelet: er kan meer dan één ${sab} zijn. Of niet...` : ''}`,
      );
    case 'test': {
      const who = f.order[f.index];
      return wait('📝', 'De Test', `Iedereen antwoordt apart op de tablet.${who ? ` Nu: ${name(who)}.` : ''}`);
    }
    case 'schat': {
      const t = treasure(game.program, game.results, getTask);
      const pct = t.max > 0 ? Math.round((t.gems / t.max) * 100) : 0;
      return { kind: 'eindschat', pct, groupWins: pct >= 50, saboteurName: sab };
    }
    case 'ontmaskering': {
      const innocents = unmaskOrder(game);
      const unmasked = f.reveal >= innocents.length;
      const saboteurs = game.players.filter((p) => p.role === 'saboteur');
      return {
        kind: 'ontmaskering',
        // 't Duvelke staat er pas als 't Duvelke bij als iedereen anders vrijgepleit is.
        players: game.players.map((p) => {
          const idx = innocents.findIndex((x) => x.playerId === p.playerId);
          return { ...tvPlayer(p), cleared: idx >= 0 && idx < f.reveal, saboteur: unmasked && p.role === 'saboteur' };
        }),
        unmasked,
        saboteurs: unmasked ? saboteurs.map((s) => s.name) : [],
        saboteurName: sab,
      };
    }
    case 'ranking': {
      const ranks = mainRanking(game);
      return {
        kind: 'uitslag',
        rows: ranks.map((r, i) => {
          const p = game.players.find((x) => x.playerId === r.playerId);
          const shown = ranks.length - f.reveal <= i;
          return shown && p
            ? { ...tvPlayer(p), place: i + 1, shown, score: `${r.correct}/${r.total}`, found: r.foundSaboteur }
            : { name: '???', avatar: '❓', color: '#555', place: i + 1, shown: false, score: '', found: false };
        }),
        done: f.reveal >= ranks.length,
        noTest: f.reveal >= ranks.length ? game.players.filter((p) => p.role !== 'saboteur' && !f.answers[p.playerId]).map((p) => p.name) : [],
      };
    }
    case 'pot': {
      const pot = potView(game);
      return pot ? { kind: 'pot', pot } : wait('🍫', 'De pot verdelen');
    }
    case 'terugblik': {
      const multiple = game.players.filter((p) => p.role === 'saboteur').length > 1;
      return {
        kind: 'terugblik',
        saboteurName: sab,
        items: game.sabotageLog.map((s) => {
          const it = game.program.find((p) => p.uid === s.taskUid);
          const task = it ? getTask(it.taskId) : undefined;
          return { emoji: task?.emoji ?? '❓', title: task?.title ?? '', who: multiple ? name(s.playerId) : null, tip: task ? hostWording(s.tip, task, game.settings.hostName) : s.tip };
        }),
      };
    }
    case 'fotos':
      return { kind: 'fotos' };
  }
}

export function publicState(game: Game | null, ui: TvUi = {}): TvScreen {
  const now = Date.now();
  if (!game) return { state: wait('📺', "Wie is 't Duvelke?", 'Het spel begint zo meteen.'), gems: 0, max: 0, now };
  const t = treasure(game.program, game.results, getTask);
  let state: TvState;
  switch (game.phase) {
    case 'intro':
      state = wait('🎬', "Wie is 't Duvelke?", `${game.settings.hostName} stelt zich voor.`);
      break;
    case 'rollen': {
      const who = game.revealOrder[game.revealIndex];
      const p = game.players.find((x) => x.playerId === who);
      state = wait('🕵️', 'De geheime dossiers', `De tablet gaat rond: iedereen leest stiekem zijn rol.${p ? ` Nu: ${p.name}.` : ''}`);
      break;
    }
    case 'klaar':
      state = wait('🕵️', "Wie is 't Duvelke?");
      break;
    case 'opdrachten':
      state = taskState(game, ui);
      break;
    case 'einde':
      state = finaleState(game);
      break;
  }
  return { state, gems: t.gems, max: t.max, now };
}
