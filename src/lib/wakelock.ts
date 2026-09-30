/** Houdt het scherm aan zolang er gespeeld wordt (ook buiten, als niemand de tablet aanraakt). */
export function keepScreenOn(): () => void {
  let sentinel: WakeLockSentinel | null = null;
  let active = true;

  async function acquire(): Promise<void> {
    if (!active || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    try {
      sentinel = await navigator.wakeLock.request('screen');
    } catch {
      // Geen toestemming of niet ondersteund: het spel werkt ook zonder.
    }
  }

  // Een wake lock vervalt als de app even op de achtergrond gaat: opnieuw aanvragen.
  const onVisibility = (): void => void acquire();
  document.addEventListener('visibilitychange', onVisibility);
  void acquire();

  return () => {
    active = false;
    document.removeEventListener('visibilitychange', onVisibility);
    void sentinel?.release().catch(() => {});
    sentinel = null;
  };
}
