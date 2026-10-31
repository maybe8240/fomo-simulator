import type { Locale } from '../i18n';
import type { GameState } from '../engine/types';

export class GenerationTimeoutError extends Error {
  constructor() { super('Generation timed out'); }
}

// This transport only talks to the same-origin application server. No provider credentials.
export async function requestGameGeneration(
  kind: 'event' | 'ending', state: GameState, signal: AbortSignal, fetcher: typeof fetch = fetch,
  onNarrative?: (text: string) => void, locale: Locale = 'en',
): Promise<unknown> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal.aborted) abort();
  else signal.addEventListener('abort', abort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; abort(); }, 40_000);
  try {
    const response = await fetcher('/api/game/' + kind, {
      method: 'POST', credentials: 'same-origin', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(onNarrative ? { Accept: 'application/x-ndjson' } : {}) }, body: JSON.stringify({ state, locale }),
    });
    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null);
      if (response.status === 504 || (body && typeof body === 'object' && 'code' in body && body.code === 'GENERATION_TIMEOUT')) {
        throw new GenerationTimeoutError();
      }
      throw new Error('Generation unavailable');
    }
    if (response.headers.get('content-type')?.includes('application/x-ndjson')) {
      if (!response.body) throw new Error('Missing stream');
      const reader = response.body.getReader();
      const cancelReader = () => { void reader.cancel().catch(() => {}); };
      controller.signal.addEventListener('abort', cancelReader, { once: true });
      if (controller.signal.aborted) cancelReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let bytes = 0;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (controller.signal.aborted) throw new Error('Cancelled');
          if (done) throw new Error('Incomplete stream');
          bytes += value.byteLength;
          if (bytes > 2_000_000) throw new Error('Stream too large');
          buffer += decoder.decode(value, { stream: true });
          let newline;
          while ((newline = buffer.indexOf('\n')) >= 0) {
            const frame = JSON.parse(buffer.slice(0, newline));
            buffer = buffer.slice(newline + 1);
            if (!frame || typeof frame !== 'object') throw new Error('Invalid frame');
            if (frame.type === 'error' && frame.code === 'GENERATION_TIMEOUT') throw new GenerationTimeoutError();
            if (frame.type === 'result') return frame.value;
            if (frame.type !== 'narrative' || typeof frame.text !== 'string' || frame.text.length > 8000) {
              throw new Error('Invalid stream');
            }
            onNarrative?.(frame.text);
          }
          if (buffer.length > 100_000) throw new Error('Frame too large');
        }
      } finally {
        controller.signal.removeEventListener('abort', cancelReader);
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }
    }
    return await response.json();
  } catch (error) {
    if (timedOut && !signal.aborted) throw new GenerationTimeoutError();
    throw error;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}
