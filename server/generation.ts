import { narrativePreview } from './preview.ts';
import type Anthropic from '@anthropic-ai/sdk';
import type { DisplayedTurn, Ending, GameState } from '../src/engine/types.ts';
import { getEnding } from '../src/engine/endings.ts';
import { generateTurnEvents } from '../src/engine/generator.ts';
import { isDisplayedTurn, isEnding } from '../src/engine/validation.ts';
import { NARRATOR_SYSTEM_PROMPT } from './narrator.ts';
import { buildEventPrompt, buildEventSystemPrompt, buildEndingPrompt,
  buildEndingSystemPrompt, parseAIResponse, parseEndingResponse } from './prompts.ts';

export interface GenerationService {
  event(state: GameState, signal: AbortSignal, onNarrative?: (text: string) => void): Promise<DisplayedTurn>;
  ending(state: GameState, signal: AbortSignal, onNarrative?: (text: string) => void): Promise<Ending>;
}

export function createGenerationService(client: Anthropic | null, model: string): GenerationService {
  async function generate(system: string, prompt: string, maxTokens: number, signal: AbortSignal, onNarrative?: (text: string) => void) {
    if (!client) throw new Error('AI unavailable');
    const params = {
      model, max_tokens: maxTokens,
      system: [{ type: 'text' as const, text: system, cache_control: { type: 'ephemeral' as const } }],
      messages: [{ role: 'user' as const, content: prompt }],
    };
    if (onNarrative) {
      const stream = client.messages.stream(params, { signal });
      let last = '';
      stream.on('text', (_delta, snapshot) => {
        const preview = narrativePreview(snapshot);
        if (preview && (!last || preview.length >= last.length + 32) && !signal.aborted) { last = preview; onNarrative(preview); }
      });
      const message = await stream.finalMessage();
      return message.content.filter((block) => block.type === 'text').map((block) => block.text).join('\n');
    }
    const message = await client.messages.create(params, { signal });
    return message.content.filter((block) => block.type === 'text').map((block) => block.text).join('\n');
  }
  return {
    async event(state, signal, onNarrative) {
      if (!client) return generateTurnEvents(state);
      const first = state.history.length === 0;
      const result = parseAIResponse(await generate(first ? NARRATOR_SYSTEM_PROMPT : buildEventSystemPrompt(),
        buildEventPrompt({ playerState: state.player, worldState: state.world, recentHistory: state.history }, first),
        first ? 2048 : 1024, signal, onNarrative));
      const turn = { currentEvent: { id: `ai-${state.world.turn}`, title: result.eventTitle,
        description: result.description, actions: result.actions }, isAIGenerated: true };
      if (!result.success || !isDisplayedTurn(turn)) throw new Error('Invalid AI event');
      return turn;
    },
    async ending(state, signal, onNarrative) {
      if (!client) return getEnding(state);
      const result = parseEndingResponse(await generate(buildEndingSystemPrompt(),
        buildEndingPrompt({ playerState: state.player, worldState: state.world, history: state.history }), 256, signal, onNarrative));
      const ending = { id: 'ai_generated' as const, title: result.title, summary: result.summary };
      if (!result.success || !isEnding(ending)) throw new Error('Invalid AI ending');
      return ending;
    },
  };
}
