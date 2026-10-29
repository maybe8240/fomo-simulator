import type Anthropic from '@anthropic-ai/sdk';
import type { DisplayedTurn, Ending, GameState } from '../src/engine/types.ts';
import { getEnding } from '../src/engine/endings.ts';
import { generateTurnEvents } from '../src/engine/generator.ts';
import { isDisplayedTurn, isEnding } from '../src/engine/validation.ts';
import { NARRATOR_SYSTEM_PROMPT } from './narrator.ts';
import { buildEventPrompt, buildUncachedSystemPrompt, buildEndingPrompt,
  buildEndingSystemPrompt, parseAIResponse, parseEndingResponse } from './prompts.ts';

export interface GenerationService {
  event(state: GameState, signal: AbortSignal): Promise<DisplayedTurn>;
  ending(state: GameState, signal: AbortSignal): Promise<Ending>;
}

export function createGenerationService(client: Anthropic | null, model: string): GenerationService {
  async function generate(system: string, prompt: string, maxTokens: number, signal: AbortSignal) {
    if (!client) throw new Error('AI unavailable');
    const message = await client.messages.create({
      model, max_tokens: maxTokens, system,
      messages: [{ role: 'user', content: prompt }],
    }, { signal });
    return message.content.filter((block) => block.type === 'text').map((block) => block.text).join('\n');
  }
  return {
    async event(state, signal) {
      if (!client) return generateTurnEvents(state);
      const first = state.history.length === 0;
      const result = parseAIResponse(await generate(first ? NARRATOR_SYSTEM_PROMPT : buildUncachedSystemPrompt(),
        buildEventPrompt({ playerState: state.player, worldState: state.world, recentHistory: state.history }, first),
        first ? 2048 : 1024, signal));
      const turn = { currentEvent: { id: `ai-${state.world.turn}`, title: result.eventTitle,
        description: result.description, actions: result.actions }, isAIGenerated: true };
      if (!result.success || !isDisplayedTurn(turn)) throw new Error('Invalid AI event');
      return turn;
    },
    async ending(state, signal) {
      if (!client) return getEnding(state);
      const result = parseEndingResponse(await generate(buildEndingSystemPrompt(),
        buildEndingPrompt({ playerState: state.player, worldState: state.world, history: state.history }), 256, signal));
      const ending = { id: 'ai_generated' as const, title: result.title, summary: result.summary };
      if (!result.success || !isEnding(ending)) throw new Error('Invalid AI ending');
      return ending;
    },
  };
}
