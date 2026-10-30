import type { GameState } from '../engine/types';

// This transport only talks to the same-origin application server. No provider credentials.
export async function requestGameGeneration(
  kind: 'event' | 'ending', state: GameState, signal: AbortSignal, fetcher: typeof fetch = fetch,
): Promise<unknown> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal.aborted) abort();
  else signal.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 40_000);
  try {
    const response = await fetcher('/api/game/' + kind, {
      method: 'POST', credentials: 'same-origin', signal: controller.signal,
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state }),
    });
    if (!response.ok) throw new Error('Generation unavailable');
    return await response.json();
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}
