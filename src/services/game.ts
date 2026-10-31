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
      if (config.aiEnabled) {
        try {
          const result = await requestGameGeneration('ending', state, signal, fetcher, onNarrative, locale);
          if (isEnding(result)) return result;
        } catch (error) {
          if (!signal.aborted && error instanceof GenerationTimeoutError) onTimeout?.();
        }
      }
      return getEnding(state);
    },
  };
}
export const defaultGameServices = createGameServices(getGameConfig());
