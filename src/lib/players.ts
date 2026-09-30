import { PLAYER_AVATARS, PLAYER_COLORS } from './data/looks';
import { newId } from './ids';
import { MAX_NAME_LENGTH } from './settings';
import type { Player } from './types';

export const MAX_SAVED_PLAYERS = 40;

/** Geeft een foutmelding terug, of null als de naam in orde is. */
export function validatePlayerName(name: string, others: Player[], ownId?: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'Vul een naam in.';
  if (trimmed.length > MAX_NAME_LENGTH) return `Maximum ${MAX_NAME_LENGTH} letters.`;
  const clash = others.some((p) => p.id !== ownId && p.name.trim().toLocaleLowerCase('nl-BE') === trimmed.toLocaleLowerCase('nl-BE'));
  if (clash) return 'Die naam bestaat al. Voeg bv. een initiaal toe.';
  return null;
}

/** Kiest een kleur en avatar die nog zo weinig mogelijk gebruikt zijn. */
export function createPlayer(others: Player[]): Player {
  const leastUsed = (options: string[], used: string[]): string => {
    let best = options[0] ?? '';
    let bestCount = Infinity;
    for (const option of options) {
      const count = used.filter((u) => u === option).length;
      if (count < bestCount) {
        best = option;
        bestCount = count;
      }
    }
    return best;
  };
  return {
    id: newId(),
    name: '',
    color: leastUsed(PLAYER_COLORS, others.map((p) => p.color)),
    avatar: leastUsed(PLAYER_AVATARS, others.map((p) => p.avatar)),
    isAdult: false,
    createdAt: Date.now(),
  };
}

export function sortPlayers(players: Player[]): Player[] {
  return [...players].sort((a, b) => a.name.localeCompare(b.name, 'nl-BE'));
}
