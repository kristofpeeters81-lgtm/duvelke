/** Opnemen via de microfoon van de tablet. */

export const MAX_RECORDING_MS = 20000;

export function recordingSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
}

function pickMimeType(): string | undefined {
  const options = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return options.find((m) => MediaRecorder.isTypeSupported(m));
}

export interface ActiveRecording {
  /** Stopt de opname en geeft het geluid terug. */
  stop: () => Promise<{ audio: Blob; durationMs: number }>;
  /** Afbreken zonder iets te bewaren. */
  cancel: () => void;
}

export class MicrophoneDeniedError extends Error {}

export async function startRecording(onAutoStop?: () => void): Promise<ActiveRecording> {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch (err) {
    throw new MicrophoneDeniedError(err instanceof Error ? err.message : String(err));
  }
  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  const startedAt = performance.now();
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const release = (): void => stream.getTracks().forEach((t) => t.stop());
  const finished = new Promise<{ audio: Blob; durationMs: number }>((resolve) => {
    recorder.onstop = () => {
      release();
      resolve({ audio: new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' }), durationMs: performance.now() - startedAt });
    };
  });

  const auto = setTimeout(() => {
    if (recorder.state === 'recording') {
      recorder.stop();
      onAutoStop?.();
    }
  }, MAX_RECORDING_MS);

  recorder.start();

  return {
    stop: () => {
      clearTimeout(auto);
      if (recorder.state === 'recording') recorder.stop();
      return finished;
    },
    cancel: () => {
      clearTimeout(auto);
      recorder.onstop = () => release();
      if (recorder.state === 'recording') recorder.stop();
      else release();
    },
  };
}
