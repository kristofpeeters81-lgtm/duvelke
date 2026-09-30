import { describe, expect, it } from 'vitest';
import { defaultSettings, formatDuration, normalizeSettings, validateCustomSupplyLabel } from './settings';

describe('normalizeSettings', () => {
  it('geeft de standaard terug bij lege of kapotte invoer', () => {
    expect(normalizeSettings(undefined)).toEqual(defaultSettings());
    expect(normalizeSettings('onzin')).toEqual(defaultSettings());
    expect(normalizeSettings([1, 2, 3])).toEqual(defaultSettings());
  });

  it('behoudt geldige waarden', () => {
    const input = {
      ...defaultSettings(),
      saboteurName: 'De Foefelaar',
      durationMinutes: 45,
      difficulty: 'pittig',
      locations: ['bos', 'dorp'],
      supplies: ['bal', 'emmers'],
      briefingEvery: 2,
    };
    expect(normalizeSettings(input)).toEqual(input);
  });

  it('begrenst en rondt de speelduur af op stappen van 15 minuten', () => {
    expect(normalizeSettings({ durationMinutes: 5 }).durationMinutes).toBe(30);
    expect(normalizeSettings({ durationMinutes: 500 }).durationMinutes).toBe(150);
    expect(normalizeSettings({ durationMinutes: 68 }).durationMinutes).toBe(75);
    expect(normalizeSettings({ durationMinutes: Number.NaN }).durationMinutes).toBe(90);
  });

  it('gooit onbekende locaties en benodigdheden weg, en dubbels ook', () => {
    const result = normalizeSettings({ locations: ['bos', 'maan', 'bos'], supplies: ['bal', 'raket', 'bal', 7] });
    expect(result.locations).toEqual(['bos']);
    expect(result.supplies).toEqual(['bal']);
  });

  it('valt terug op standaardlocaties als er geen enkele geldige overblijft', () => {
    expect(normalizeSettings({ locations: ['maan'] }).locations).toEqual(defaultSettings().locations);
  });

  it('vervangt lege namen door de standaardnamen', () => {
    const result = normalizeSettings({ saboteurName: '   ', hostName: 42 });
    expect(result.saboteurName).toBe("'t Duvelke");
    expect(result.hostName).toBe('Windy');
  });

  it('ruimt de fysieke schat op', () => {
    const result = normalizeSettings({
      treasureItems: [
        { id: 'a', name: ' snoepjes ', quantity: 30.4 },
        { id: 'b', name: '', quantity: 3 },
        { name: 'stickers', quantity: -5 },
        'onzin',
      ],
    });
    expect(result.treasureItems).toHaveLength(2);
    expect(result.treasureItems[0]).toEqual({ id: 'a', name: 'snoepjes', quantity: 30 });
    expect(result.treasureItems[1]?.name).toBe('stickers');
    expect(result.treasureItems[1]?.quantity).toBe(1);
  });
});

describe('eigen benodigdheden', () => {
  it('bewaart eigen spullen en laat ze aangevinkt blijven', () => {
    const result = normalizeSettings({
      customSupplies: [{ id: 'eigen-1', label: ' Trampoline ', emoji: '🪀' }],
      supplies: ['bal', 'eigen-1'],
    });
    expect(result.customSupplies).toEqual([{ id: 'eigen-1', label: 'Trampoline', emoji: '🪀' }]);
    expect(result.supplies).toEqual(['bal', 'eigen-1']);
  });

  it('gooit aangevinkte eigen spullen weg die niet meer bestaan', () => {
    expect(normalizeSettings({ supplies: ['eigen-weg'] }).supplies).toEqual([]);
  });

  it('weigert lege, dubbele of met de vaste lijst botsende eigen spullen', () => {
    const result = normalizeSettings({
      customSupplies: [
        { id: 'eigen-1', label: 'Tent' },
        { id: 'eigen-2', label: 'tent' },
        { id: 'eigen-3', label: '   ' },
        { id: 'eigen-4', label: 'Emmers' },
        { id: 'bal', label: 'Bal-kopie' },
        { label: 'zonder id' },
      ],
    });
    expect(result.customSupplies.map((c) => c.label)).toEqual(['Tent']);
    expect(result.customSupplies[0]?.emoji).toBe('📦');
  });
});

describe('validateCustomSupplyLabel', () => {
  const custom = [{ id: 'eigen-1', label: 'Tent', emoji: '📦' }];

  it('aanvaardt iets nieuws', () => {
    expect(validateCustomSupplyLabel('Parachute', custom)).toBeNull();
  });

  it('weigert iets dat al bestaat, in de vaste of eigen lijst', () => {
    expect(validateCustomSupplyLabel(' tent ', custom)).not.toBeNull();
    expect(validateCustomSupplyLabel('emmers', custom)).not.toBeNull();
  });

  it('weigert leeg en te lang', () => {
    expect(validateCustomSupplyLabel('  ', custom)).not.toBeNull();
    expect(validateCustomSupplyLabel('x'.repeat(40), custom)).not.toBeNull();
  });
});

describe('formatDuration', () => {
  it('toont minuten en uren leesbaar', () => {
    expect(formatDuration(30)).toBe('30 min');
    expect(formatDuration(60)).toBe('1 uur');
    expect(formatDuration(135)).toBe('2 u 15 min');
  });
});
