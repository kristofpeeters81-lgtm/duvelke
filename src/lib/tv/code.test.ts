import { describe, expect, it } from 'vitest';
import { decodeCode, encodeCode } from './code';

// Zoals Chrome op Android een aanbod voor een datakanaal maakt (ingekort tot wat telt).
const OFFER = [
  'v=0',
  'o=- 4611731400430051336 2 IN IP4 127.0.0.1',
  's=-',
  't=0 0',
  'a=group:BUNDLE 0',
  'a=extmap-allow-mixed',
  'a=msid-semantic: WMS',
  'm=application 51472 UDP/DTLS/SCTP webrtc-datachannel',
  'c=IN IP4 192.0.2.10',
  'a=candidate:3091478853 1 udp 2113937151 0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0.local 51472 typ host generation 0 network-cost 999',
  'a=candidate:842163049 1 udp 1677729535 198.51.100.7 51472 typ srflx raddr 0.0.0.0 rport 0 generation 0 network-cost 999',
  'a=candidate:1234 1 tcp 1518280447 0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0.local 9 typ host tcptype active generation 0',
  'a=ice-ufrag:Ab3d',
  'a=ice-pwd:Zx9yW8vU7tS6rQ5pO4nM3lK2',
  'a=ice-options:trickle',
  'a=fingerprint:sha-256 0A:1B:2C:3D:4E:5F:60:71:82:93:A4:B5:C6:D7:E8:F9:0A:1B:2C:3D:4E:5F:60:71:82:93:A4:B5:C6:D7:E8:F9',
  'a=setup:actpass',
  'a=mid:0',
  'a=sctp-port:5000',
  'a=max-message-size:262144',
  '',
].join('\r\n');

describe('koppelcode', () => {
  it('is kort genoeg voor een grove QR-code', () => {
    const code = encodeCode('A', OFFER);
    expect(code.startsWith('A')).toBe(true);
    expect(code.length).toBeLessThan(160);
  });

  it('bouwt weer een beschrijving met dezelfde sleutels, vingerafdruk en adressen (enkel udp)', () => {
    const sdp = decodeCode(encodeCode('A', OFFER), 'A');
    expect(sdp).toContain('a=ice-ufrag:Ab3d');
    expect(sdp).toContain('a=ice-pwd:Zx9yW8vU7tS6rQ5pO4nM3lK2');
    expect(sdp).toContain('a=fingerprint:sha-256 0A:1B:2C:3D:4E:5F:60:71:82:93:A4:B5:C6:D7:E8:F9:0A:1B:2C:3D:4E:5F:60:71:82:93:A4:B5:C6:D7:E8:F9');
    expect(sdp).toContain('0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0.local 51472 typ host');
    expect(sdp).toContain('198.51.100.7 51472 typ srflx');
    expect(sdp).not.toContain('tcp');
    expect(sdp).toContain('a=setup:actpass');
  });

  it('maakt van een antwoord een antwoord (setup active)', () => {
    const answer = OFFER.replace('a=setup:actpass', 'a=setup:active');
    expect(decodeCode(encodeCode('B', answer), 'B')).toContain('a=setup:active');
  });

  it('weigert de verkeerde code met een duidelijke uitleg', () => {
    const code = encodeCode('A', OFFER);
    expect(() => decodeCode(code, 'B')).toThrow(/niet de code van de tv/);
    expect(() => decodeCode('A~|x', 'A')).toThrow(/niet volledig/);
  });

  it('herkent een code van een oudere versie van de app', () => {
    expect(() => decodeCode('AeJzLSM3JyQcABiwCFQ', 'A')).toThrow(/andere versie/);
  });
});
