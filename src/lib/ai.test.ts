import { describe, expect, it } from 'vitest';
import { buildPrompt } from './ai';
import { extractJsonArray, validateTask } from './tasks/validate';

describe('buildPrompt', () => {
  const prompt = buildPrompt({
    count: 5,
    locations: ['binnen', 'bos'],
    difficulty: 'normaal',
    playerCount: 8,
    supplies: ['bal', 'eigen-1'],
    customSupplies: [{ id: 'eigen-1', label: 'Trampoline', emoji: '🪀' }],
    theme: 'piraten',
    saboteurName: "'t Duvelke",
    hostName: 'Windy',
    existingTitles: ['De bekertoren'],
  });

  it('bevat de plekken, spullen, het thema en de bestaande titels', () => {
    expect(prompt).toContain('"binnen"');
    expect(prompt).toContain('"bos"');
    expect(prompt).toContain('"eigen-1" (Trampoline)');
    expect(prompt).toContain('piraten');
    expect(prompt).toContain('De bekertoren');
    expect(prompt).toContain("Wie is 't Duvelke?");
  });

  it('bevat een voorbeeld dat zelf door de controle raakt', () => {
    const example = extractJsonArray(prompt);
    expect(example).toHaveLength(1);
    const r = validateTask(example![0], { customSupplies: [], source: 'ai' });
    expect(r.errors).toEqual([]);
  });
});
