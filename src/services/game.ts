import { getEnding } from '../engine/endings';
import { generateTurnEvents } from '../engine/generator';
import type { DisplayedTurn, Ending, GameState } from '../engine/types';
import { generateEndingWithAI, generateEventWithAI } from './ai';
import type { AIConfig } from './ai';
import { getGameConfig } from './config';

export interface GameServices {
  aiEnabled: boolean;
  maxTurns: number;
  generateTurn(state: GameState, signal: AbortSignal): Promise<DisplayedTurn>;
  generateEnding(state: GameState, signal: AbortSignal): Promise<Ending>;
}

export function createGameServices(
  config: { ai: AIConfig | null; maxTurns: number },
  fetcher?: typeof fetch,
): GameServices {
  return {
    aiEnabled: config.ai !== null,
    maxTurns: config.maxTurns,
    async generateTurn(state, signal) {
      if (config.ai) {
        const result = await generateEventWithAI(config.ai, {
          playerState: state.player,
          worldState: state.world,
          recentHistory: state.history,
        }, state.history.length === 0, { signal, fetcher });
        if (result.success) {
          return {
            currentEvent: {
              id: `ai-${state.world.turn}`,
              title: result.eventTitle,
              description: result.description,
              actions: result.actions,
            },
            isAIGenerated: true,
          };
        }
      }
      return generateTurnEvents(state);
    },
    async generateEnding(state, signal) {
      if (config.ai) {
        const result = await generateEndingWithAI(config.ai, {
          playerState: state.player,
          worldState: state.world,
          history: state.history,
        }, { signal, fetcher });
        if (result.success) {
          return { id: 'ai_generated', title: result.title, summary: result.summary };
        }
      }
      return getEnding(state);
    },
  };
}

export const defaultGameServices = createGameServices(getGameConfig());
