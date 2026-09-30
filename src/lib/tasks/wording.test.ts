import { describe, expect, it } from 'vitest';
import { ALL_BUILTIN } from './registry';
import { hostWording, windyReadsList } from './wording';

const task = (id: string) => ALL_BUILTIN.find((t) => t.id === id)!;

describe('hostWording', () => {
  it('laat Windy voorlezen bij opdrachten met antwoorden', () => {
    const t = task('b-fabeltjes');
    expect(windyReadsList(t)).toBe(true);
    expect(hostWording(t.explain, t, 'Windy')).toContain('Windy leest een weetje voor');
  });

  it('maakt van de spelleider het hulpje bij fysieke taken', () => {
    const t = task('standbeelden');
    expect(windyReadsList(t)).toBe(false);
    const out = hostWording(t.explain, t, 'Windy');
    expect(out).toContain('Het hulpje draait zich om');
    expect(out).not.toMatch(/spelleider/i);
  });

  it('laat nergens nog "spelleider" staan in de ingebouwde opdrachten', () => {
    for (const t of ALL_BUILTIN) {
      for (const text of [t.explain, t.prep ?? '', t.list?.title ?? '']) {
        expect(hostWording(text, t, 'Windy'), t.id).not.toMatch(/spelleider/i);
      }
    }
  });
});
