import { translate } from '../i18n';
import type { Locale } from '../i18n';
import { getEnding } from '../engine/endings';
import { generateTurnEvents } from '../engine/generator';
import type { DisplayedTurn, Ending, GameState } from '../engine/types';
import { isDisplayedTurn, isEnding } from '../engine/validation';
import { requestGameGeneration, GenerationTimeoutError } from './ai';
import { getGameConfig } from './config';

export interface GameServices {
  aiEnabled: boolean;
  maxTurns: number;
  generateTurn(state: GameState, signal: AbortSignal, onNarrative?: (text: string) => void, locale?: Locale, onTimeout?: () => void): Promise<DisplayedTurn>;
  generateEnding(state: GameState, signal: AbortSignal, onNarrative?: (text: string) => void, locale?: Locale, onTimeout?: () => void): Promise<Ending>;
}
export function createGameServices(
  config: { aiEnabled: boolean; maxTurns: number }, fetcher?: typeof fetch,
): GameServices {
  return {
    ...config,
    async generateTurn(state, signal, onNarrative, locale = 'en', onTimeout) {
      if (config.aiEnabled) {
        try {
          const result = await requestGameGeneration('event', state, signal, fetcher, onNarrative, locale);
          if (isDisplayedTurn(result)) return result;
        } catch (error) {
          if (!signal.aborted && error instanceof GenerationTimeoutError) onTimeout?.();
        }
      }
      return generateTurnEvents(state);
    },
    async generateEnding(state, signal, onNarrative, locale = 'en', onTimeout) {
      let draft = '';
      if (config.aiEnabled) {
        try {
          const result = await requestGameGeneration('ending', state, signal, fetcher, text => {
            draft = text;
            onNarrative?.(text);
          }, locale);
          if (isEnding(result)) return result;
        } catch (error) {
          if (!signal.aborted && error instanceof GenerationTimeoutError) onTimeout?.();
        }
      }
      // An ending is display-only prose: preserve received narrative if repair fails.
      // Never promote event drafts to playable choices, or retain cancelled results.
      if (!signal.aborted && draft.trim()) return {
        id: 'ai_generated', title: translate(locale, 'ending'), summary: draft.slice(0, 6000).replace(/[\uD800-\uDBFF]$/, ''),
      };
      return getEnding(state);
    },
  };
}
export const defaultGameServices = createGameServices(getGameConfig());
