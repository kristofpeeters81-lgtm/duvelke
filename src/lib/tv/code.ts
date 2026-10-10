/**
 * Een zo kort mogelijke koppelcode voor de QR-code. Een verbinding heeft maar een paar gegevens nodig
 * (sleutel, wachtwoord, vingerafdruk en de netwerkadressen); de rest van de beschrijving bouwen we aan
 * de andere kant zelf weer op. Zo wordt de QR-code grof genoeg om vlot van een gsm-scherm te scannen.
 *
 * Vorm: <A|B>~<ufrag>|<pwd>|<vingerafdruk>|<adres>,<adres>...
 * De ~ (die nooit in een oudere code stond) toont dat beide toestellen dezelfde versie hebben.
 * A = aanbod van de tablet, B = antwoord van de tv.
 * Adres: <h|s><poort in base36>.<ip, of @ + de .local-naam als 16 bytes>
 */

export type CodeKind = 'A' | 'B';

export const VERSION_MISMATCH =
  'Deze code komt van een andere versie van de app. Sluit de app op beide toestellen helemaal af (ook uit de recente apps) en open ze opnieuw. Kijk daarna of de versie op beide toestellen gelijk is.';

const PRIORITY = { host: 2122260223, srflx: 1686052607 } as const;

function toB64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  let bin: string;
  try {
    bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  } catch {
    throw new Error('Die code is niet goed gelezen. Scan nog eens.');
  }
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

const UUID_LOCAL = /^([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})\.local$/i;

function packAddress(addr: string): string {
  const m = addr.match(UUID_LOCAL);
  if (!m) return addr;
  const hex = m.slice(1).join('');
  return '@' + toB64(Uint8Array.from(hex.match(/../g) ?? [], (h) => parseInt(h, 16)));
}

function unpackAddress(s: string): string {
  if (!s.startsWith('@')) return s;
  const hex = [...fromB64(s.slice(1))].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}.local`;
}

/** Maakt de korte code uit de beschrijving die de browser gaf. */
export function encodeCode(kind: CodeKind, sdp: string): string {
  const get = (re: RegExp): string => sdp.match(re)?.[1]?.trim() ?? '';
  const ufrag = get(/a=ice-ufrag:(\S+)/);
  const pwd = get(/a=ice-pwd:(\S+)/);
  const fpHex = get(/a=fingerprint:sha-256 ([0-9A-F:]+)/i);
  if (!ufrag || !pwd || !fpHex) throw new Error('De verbinding kon niet klaargemaakt worden.');
  const fp = toB64(Uint8Array.from(fpHex.split(':'), (h) => parseInt(h, 16)));
  const cands: string[] = [];
  for (const m of sdp.matchAll(/a=candidate:\S+ \d+ (\S+) \d+ (\S+) (\d+) typ (host|srflx)/gi)) {
    if (m[1]?.toLowerCase() !== 'udp') continue;
    const entry = `${m[4] === 'srflx' ? 's' : 'h'}${Number(m[3]).toString(36)}.${packAddress(m[2] ?? '')}`;
    if (!cands.includes(entry)) cands.push(entry);
  }
  return `${kind}~${ufrag}|${pwd}|${fp}|${cands.join(',')}`;
}

/** Bouwt uit de korte code weer een volledige beschrijving voor de browser. */
export function decodeCode(code: string, kind: CodeKind): string {
  const clean = code.trim();
  if (!clean.startsWith(kind)) throw new Error(kind === 'A' ? 'Dit is niet de code van de tablet.' : 'Dit is niet de code van de tv.');
  if (clean[1] !== '~') throw new Error(VERSION_MISMATCH);
  const [ufrag, pwd, fp, list] = clean.slice(2).split('|');
  if (!ufrag || !pwd || !fp) throw new Error('Die code is niet volledig. Scan nog eens.');
  const fpHex = [...fromB64(fp)].map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(':');
  const cands = (list ?? '')
    .split(',')
    .filter((c) => c.length > 2)
    .map((c, i) => {
      const type = c[0] === 's' ? 'srflx' : 'host';
      const dot = c.indexOf('.');
      const port = parseInt(c.slice(1, dot), 36);
      const addr = unpackAddress(c.slice(dot + 1));
      return `a=candidate:${i + 1} 1 udp ${PRIORITY[type]} ${addr} ${port} typ ${type}${type === 'srflx' ? ' raddr 0.0.0.0 rport 0' : ''} generation 0`;
    });
  return [
    'v=0',
    `o=- ${Date.now()} 2 IN IP4 127.0.0.1`,
    's=-',
    't=0 0',
    'a=group:BUNDLE 0',
    'a=msid-semantic: WMS',
    'm=application 9 UDP/DTLS/SCTP webrtc-datachannel',
    'c=IN IP4 0.0.0.0',
    ...cands,
    `a=ice-ufrag:${ufrag}`,
    `a=ice-pwd:${pwd}`,
    'a=ice-options:trickle',
    `a=fingerprint:sha-256 ${fpHex}`,
    `a=setup:${kind === 'A' ? 'actpass' : 'active'}`,
    'a=mid:0',
    'a=sctp-port:5000',
    'a=max-message-size:262144',
    '',
  ].join('\r\n');
}
