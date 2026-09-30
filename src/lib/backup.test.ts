import { describe, expect, it } from 'vitest';
import { base64ToBlob, BACKUP_KIND, blobToBase64, BackupError, makeBackup, readBackup } from './backup';
import { defaultSettings } from './settings';

describe('back-up', () => {
  it('bewaart en herstelt alles, ook opnames', async () => {
    const audio = new Blob([new Uint8Array([1, 2, 3, 250])], { type: 'audio/webm' });
    const backup = await makeBackup(
      {
        players: [{ id: 'p1', name: 'Lotte', color: '#fff', avatar: '🦊', isAdult: false, createdAt: 1 }],
        settings: { ...defaultSettings(), hostName: 'Wendy' },
        windyLines: { custom: [{ id: 'x', category: 'zoon', text: 'Onzen {zoon} slaapt.', builtIn: false }], disabled: ['w001'] },
        customTasks: [],
        taskStats: { ratings: { bekertoren: 2 }, recent: ['bekertoren'] },
      },
      [{ lineId: 'w001', audio, durationMs: 1200, createdAt: 5 }],
    );
    const restored = readBackup(JSON.parse(JSON.stringify(backup)));
    expect(restored.players[0]!.name).toBe('Lotte');
    expect(restored.settings.hostName).toBe('Wendy');
    expect(restored.windyLines.custom).toHaveLength(1);
    expect(restored.taskStats.ratings['bekertoren']).toBe(2);
    expect(restored.recordings).toHaveLength(1);
    expect([...new Uint8Array(await restored.recordings[0]!.audio.arrayBuffer())]).toEqual([1, 2, 3, 250]);
  });

  it('weigert bestanden die geen back-up zijn', () => {
    expect(() => readBackup({ hallo: 'wereld' })).toThrow(BackupError);
    expect(() => readBackup({ kind: BACKUP_KIND, version: 99 })).toThrow(BackupError);
  });

  it('zet base64 correct heen en terug', async () => {
    const blob = new Blob([new Uint8Array(70000).map((_, i) => i % 256)]);
    const back = base64ToBlob(await blobToBase64(blob), 'application/octet-stream');
    expect(back.size).toBe(70000);
  });
});
