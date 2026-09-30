import { describe, expect, it } from 'vitest';
import { PLAYER_AVATARS, PLAYER_COLORS } from './data/looks';
import { createPlayer, sortPlayers, validatePlayerName } from './players';
import type { Player } from './types';

function player(name: string, overrides: Partial<Player> = {}): Player {
  return { id: name, name, color: '#fff', avatar: '🦊', isAdult: false, createdAt: 0, ...overrides };
}

describe('validatePlayerName', () => {
  const others = [player('Lotte'), player('Emma')];

  it('weigert lege namen', () => {
    expect(validatePlayerName('   ', others)).not.toBeNull();
  });

  it('weigert dubbele namen, ongeacht hoofdletters en spaties', () => {
    expect(validatePlayerName(' lotte ', others)).not.toBeNull();
  });

  it('laat je eigen naam behouden bij het bewerken', () => {
    expect(validatePlayerName('Lotte', others, 'Lotte')).toBeNull();
  });

  it('weigert te lange namen', () => {
    expect(validatePlayerName('x'.repeat(30), others)).not.toBeNull();
  });

  it('aanvaardt een nieuwe naam', () => {
    expect(validatePlayerName('Noor', others)).toBeNull();
  });
});

describe('createPlayer', () => {
  it('kiest een kleur en dier die nog niet gebruikt zijn', () => {
    const others = [player('A', { color: PLAYER_COLORS[0], avatar: PLAYER_AVATARS[0] })];
    const created = createPlayer(others);
    expect(created.color).not.toBe(PLAYER_COLORS[0]);
    expect(created.avatar).not.toBe(PLAYER_AVATARS[0]);
    expect(created.id).toBeTruthy();
  });
});

describe('sortPlayers', () => {
  it('sorteert alfabetisch zonder het origineel te wijzigen', () => {
    const list = [player('Zoë'), player('Anna'), player('Émilie')];
    expect(sortPlayers(list).map((p) => p.name)).toEqual(['Anna', 'Émilie', 'Zoë']);
    expect(list[0]?.name).toBe('Zoë');
  });
});
