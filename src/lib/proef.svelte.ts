/**
 * Een proefronde: één opdracht uit een voorbereiding echt spelen (uitleg, voorlezen, timer, resultaat),
 * met de spelers van de voorbereiding, maar zonder briefing, roddel of schat. Het telt nergens mee en
 * wordt nooit bewaard; een lopend echt spel blijft intussen onaangeroerd.
 */
import { createGame, MIN_PLAYERS, startTasks, type Game } from './game';
import { app, flagTask, go } from './store.svelte';
import { swapItem, type PlanContext } from './tasks/program';
import { allTasks } from './tasks/registry';

let backup: Game | null = null;

/** Het spel in voorbereiding als context om opdrachten te kiezen of te wisselen. */
export function draftContext(): PlanContext | null {
  const d = app.draft;
  if (!d) return null;
  return {
    settings: $state.snapshot(d.settings),
    playerCount: Math.max(d.playerIds.length, MIN_PLAYERS),
    tasks: allTasks(),
    ratings: app.taskStats.ratings,
    recentTaskIds: app.taskStats.recent,
    hostPlays: d.gameMasterId !== null,
    flagged: Object.keys(app.taskStats.flags),
  };
}

/** Start een proefronde van opdracht nummer index; geeft een foutmelding terug als het niet kan. */
export function startProef(index: number): string | null {
  const d = app.draft;
  const item = d?.program[index];
  if (!d || !item) return 'Die opdracht staat niet meer in het programma.';
  const players = app.players.filter((p) => d.playerIds.includes(p.id));
  if (players.length < MIN_PLAYERS) return `Kies eerst minstens ${MIN_PLAYERS} spelers (bij Nieuw spel).`;
  const game = createGame($state.snapshot(players), $state.snapshot(d.settings), d.gameMasterId, null, [$state.snapshot(item)]);
  game.test = { index };
  for (const p of game.players) p.hasSeenRole = true;
  startTasks(game);
  backup = app.game;
  app.game = game;
  go('spel');
  return null;
}

/**
 * Einde van de proefronde. goed: blijft staan. wissel: een andere opdracht in de plaats.
 * eruit: uit het programma en gemarkeerd om na te kijken (met de reden). stop: niets veranderen.
 */
export function endProef(verdict: 'goed' | 'wissel' | 'eruit' | 'stop', note = ''): void {
  const index = app.game?.test?.index;
  app.game = backup;
  backup = null;
  const d = app.draft;
  if (d && index !== undefined && d.program[index]) {
    const item = d.program[index];
    if (verdict === 'wissel') {
      const ctx = draftContext();
      if (ctx) d.program = swapItem($state.snapshot(d.program), index, ctx);
    } else if (verdict === 'eruit') {
      flagTask(item.taskId, note);
      d.program = d.program.filter((_, i) => i !== index);
    }
  }
  go('programma');
}
