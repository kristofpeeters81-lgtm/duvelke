/**
 * Wat er op het tv-scherm mag. De tablet stuurt de tv enkel dit: een vaste lijst openbare info,
 * nooit het spel zelf. Geheimen (rollen, dossiers, tips, kaartjes, geheime lijstjes, antwoorden
 * vóór ze onthuld zijn, de pincode) kunnen er dus niet per ongeluk in terechtkomen.
 * Een pure functie, zodat een test kan nagaan dat er niets geheims in zit.
 */
import { ranking, type Score } from '../finale';
import type { Game, GamePlayer } from '../game';
import { quizOrder, targetFor, treasure } from '../gameplay';
import { LOCATIONS } from '../data/locations';
import { CATEGORY_LABELS } from '../tasks/labels';
import { fillVars } from '../tasks/program';
import { QUIZ } from '../tasks/quiz';
import { getTask } from '../tasks/registry';
import { hostWording, windyReadsList } from '../tasks/wording';

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

export type TvState =
  | { kind: 'wacht'; emoji: string; title: string; text: string }
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
    }
  | { kind: 'schat'; gain: number; happy: boolean }
  | { kind: 'eindschat'; pct: number; groupWins: boolean; saboteurName: string }
  | { kind: 'ontmaskering'; players: (TvPlayer & { cleared: boolean; saboteur: boolean })[]; unmasked: boolean; saboteurs: string[]; saboteurName: string }
  | { kind: 'uitslag'; rows: (TvPlayer & { place: number; shown: boolean; score: string; found: boolean })[]; done: boolean; noTest: string[] }
  | { kind: 'terugblik'; saboteurName: string; items: { emoji: string; title: string; who: string | null; tip: string }[] }
  | { kind: 'fotos' };

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
      // De roddel zelf hoort iedereen als Windy (of de buurvrouw) hem vertelt; vooraf nog niets verklappen.
      return wait(current.gossip?.source === 'buurvrouw' ? '🗣️' : '👀', 'Roddeltijd!', 'Luister goed...');
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
        explain: w(fillVars(task.explain, item.vars)),
        roles: (task.roles ?? []).map((r) => ({ name: r.name, players: (current.roles[r.name] ?? []).map(name) })),
        list: open && list ? { title: w(list.title), items: item.list.map(w) } : null,
        note,
        timer: current.step === 'bezig' && current.timer ? { ...current.timer } : null,
        quiz,
        stopwatch: sw,
        waiting: current.step === 'resultaat' ? 'Hoe ging het? Het hulpje duidt het resultaat aan.' : null,
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
      return wait('🏁', 'Het moment van de waarheid', `Alle opdrachten zijn gespeeld! Nu volgt De Test: ${f.questions.length} vragen over ${sab}.`);
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
