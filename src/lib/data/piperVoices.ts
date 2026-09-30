/** Los van piper.ts, zodat instellingen de stem-ids kennen zonder de zware bibliotheek te laden. */
export const PIPER_VOICE_IDS = ['nl_BE-rdh-medium', 'nl_BE-nathalie-medium', 'nl_BE-rdh-x_low', 'nl_BE-nathalie-x_low'] as const;

export type PiperVoiceId = (typeof PIPER_VOICE_IDS)[number];

export const DEFAULT_PIPER_VOICE: PiperVoiceId = 'nl_BE-rdh-medium';
