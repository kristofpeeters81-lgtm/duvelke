export type SupplyGroup = 'spel' | 'knutsel' | 'huis' | 'buiten';

export interface Supply {
  id: string;
  label: string;
  emoji: string;
  group: SupplyGroup;
}

export const SUPPLY_GROUPS: { id: SupplyGroup; label: string }[] = [
  { id: 'spel', label: 'Spelmateriaal' },
  { id: 'knutsel', label: 'Knutselen & schrijven' },
  { id: 'huis', label: 'Uit de kast' },
  { id: 'buiten', label: 'Buiten & sport' },
];

export const SUPPLIES: Supply[] = [
  // Spelmateriaal
  { id: 'dobbelstenen', label: 'Dobbelstenen', emoji: '🎲', group: 'spel' },
  { id: 'speelkaarten', label: 'Speelkaarten', emoji: '🃏', group: 'spel' },
  { id: 'blinddoek', label: 'Blinddoek(en)', emoji: '🙈', group: 'spel' },
  { id: 'ballonnen', label: 'Ballonnen', emoji: '🎈', group: 'spel' },
  { id: 'knikkers', label: 'Knikkers', emoji: '🔮', group: 'spel' },
  { id: 'legoblokjes', label: 'Lego / blokken', emoji: '🧱', group: 'spel' },
  { id: 'puzzel', label: 'Kleine puzzel', emoji: '🧩', group: 'spel' },
  { id: 'fluitje', label: 'Fluitje', emoji: '📯', group: 'spel' },
  { id: 'zandloper', label: 'Zandloper', emoji: '⏳', group: 'spel' },
  { id: 'hoedjes', label: 'Hoeden / verkleedkleren', emoji: '🎩', group: 'spel' },
  { id: 'knuffels', label: 'Knuffels', emoji: '🧸', group: 'spel' },
  // Knutselen & schrijven
  { id: 'papier', label: 'Papier', emoji: '📄', group: 'knutsel' },
  { id: 'stiften', label: 'Stiften / potloden', emoji: '🖍️', group: 'knutsel' },
  { id: 'schaar', label: 'Schaar', emoji: '✂️', group: 'knutsel' },
  { id: 'plakband', label: 'Plakband', emoji: '🩹', group: 'knutsel' },
  { id: 'karton', label: 'Karton / dozen', emoji: '📦', group: 'knutsel' },
  { id: 'postits', label: 'Post-its', emoji: '🗒️', group: 'knutsel' },
  { id: 'krantenpapier', label: 'Oude kranten', emoji: '📰', group: 'knutsel' },
  { id: 'wol', label: 'Wol / touwtjes', emoji: '🧶', group: 'knutsel' },
  { id: 'rietjes', label: 'Rietjes', emoji: '🥤', group: 'knutsel' },
  { id: 'elastiekjes', label: 'Elastiekjes', emoji: '➰', group: 'knutsel' },
  { id: 'paperclips', label: 'Paperclips', emoji: '📎', group: 'knutsel' },
  // Uit de kast
  { id: 'plastiekbekers', label: 'Plastic bekertjes', emoji: '🥛', group: 'huis' },
  { id: 'lepels', label: 'Lepels', emoji: '🥄', group: 'huis' },
  { id: 'wasknijpers', label: 'Wasknijpers', emoji: '🪝', group: 'huis' },
  { id: 'wc-rollen', label: 'Lege wc-rollen', emoji: '🧻', group: 'huis' },
  { id: 'emmers', label: 'Emmers', emoji: '🪣', group: 'huis' },
  { id: 'handdoeken', label: 'Handdoeken / dekens', emoji: '🛏️', group: 'huis' },
  { id: 'kussens', label: 'Kussens', emoji: '🛋️', group: 'huis' },
  { id: 'lakens', label: 'Oud laken', emoji: '🏳️', group: 'huis' },
  { id: 'zaklampen', label: 'Zaklamp(en)', emoji: '🔦', group: 'huis' },
  { id: 'sokken', label: 'Sokken', emoji: '🧦', group: 'huis' },
  { id: 'stoelen', label: 'Stoelen', emoji: '🪑', group: 'huis' },
  { id: 'wasmand', label: 'Wasmand', emoji: '🧺', group: 'huis' },
  { id: 'kookwekker', label: 'Kookwekker', emoji: '⏲️', group: 'huis' },
  { id: 'snoep', label: 'Snoepjes (verpakt)', emoji: '🍬', group: 'huis' },
  // Buiten & sport
  { id: 'bal', label: 'Bal', emoji: '⚽', group: 'buiten' },
  { id: 'tennisballen', label: 'Tennisballen', emoji: '🎾', group: 'buiten' },
  { id: 'springtouw', label: 'Springtouw', emoji: '🪢', group: 'buiten' },
  { id: 'lang-touw', label: 'Lang touw', emoji: '〰️', group: 'buiten' },
  { id: 'stoepkrijt', label: 'Stoepkrijt', emoji: '🖌️', group: 'buiten' },
  { id: 'hoepels', label: 'Hoepels', emoji: '⭕', group: 'buiten' },
  { id: 'pionnen', label: 'Pionnen / kegels', emoji: '🔺', group: 'buiten' },
  { id: 'frisbee', label: 'Frisbee', emoji: '🥏', group: 'buiten' },
  { id: 'schepjes', label: 'Schepjes', emoji: '⛏️', group: 'buiten' },
  { id: 'kompas', label: 'Kompas', emoji: '🧭', group: 'buiten' },
  { id: 'verrekijker', label: 'Verrekijker', emoji: '🔭', group: 'buiten' },
];

export const SUPPLY_IDS = new Set(SUPPLIES.map((s) => s.id));
