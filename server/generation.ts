import { narrativePreview } from './preview.ts';
import type Anthropic from '@anthropic-ai/sdk';
import type { DisplayedTurn, Ending, GameState } from '../src/engine/types.ts';
import { getEnding } from '../src/engine/endings.ts';
import { generateTurnEvents } from '../src/engine/generator.ts';
import { isDisplayedTurn, isEnding } from '../src/engine/validation.ts';
import { buildEventPrompt, buildEventSystemPrompt, buildEndingPrompt,
  buildEndingSystemPrompt, parseAIResponse, parseEndingResponse } from './prompts.ts';

export interface GenerationService {
  event(state: GameState, signal: AbortSignal, onNarrative?: (text: string) => void, locale?: 'en' | 'zh'): Promise<DisplayedTurn>;
  ending(state: GameState, signal: AbortSignal, onNarrative?: (text: string) => void, locale?: 'en' | 'zh'): Promise<Ending>;
}

export class GenerationError extends Error {
  readonly reason: 'output_limit' | 'invalid_event' | 'invalid_ending';
  constructor(reason: 'output_limit' | 'invalid_event' | 'invalid_ending') {
    super(reason);
    this.reason = reason;
  }
}

export function createGenerationService(client: Anthropic | null, model: string): GenerationService {
  async function generate(system: string, prompt: string, maxTokens: number, signal: AbortSignal, onNarrative?: (text: string) => void) {
    if (!client) throw new Error('AI unavailable');
    const params = {
      model, max_tokens: maxTokens,
      system: [{ type: 'text' as const, text: system, cache_control: { type: 'ephemeral' as const } }],
      messages: [{ role: 'user' as const, content: prompt }],
      // Haiku 5.5 enables thinking by default, sharing max_tokens with the JSON.
      // This short narrative task needs the budget for complete playable output.
      ...(/^claude-haiku-5-5(?:-|$)/.test(model) ? { thinking: { type: 'disabled' as const } } : {}),
    };
    if (onNarrative) {
      const stream = client.messages.stream(params, { signal });
      let last = '';
      stream.on('text', (_delta, snapshot) => {
        const preview = narrativePreview(snapshot);
        if (preview && (!last || preview.length >= last.length + 32) && !signal.aborted) { last = preview; onNarrative(preview); }
      });
      const message = await stream.finalMessage();
      if (message.stop_reason === 'max_tokens') throw new GenerationError('output_limit');
      return message.content.filter((block) => block.type === 'text').map((block) => block.text).join('\n');
    }
    const message = await client.messages.create(params, { signal });
    if (message.stop_reason === 'max_tokens') throw new GenerationError('output_limit');
    return message.content.filter((block) => block.type === 'text').map((block) => block.text).join('\n');
  }
  return {
    async event(state, signal, onNarrative, locale = 'en') {
      if (!client) return generateTurnEvents(state);
      const first = state.history.length === 0;
      const result = parseAIResponse(await generate(buildEventSystemPrompt(locale),
        buildEventPrompt({ playerState: state.player, worldState: state.world, recentHistory: state.history, maxTurns: state.maxTurns }, first, locale),
        2048, signal, onNarrative));
      const turn = { currentEvent: { id: `ai-${state.world.turn}`, title: result.eventTitle,
        description: result.description, actions: result.actions }, isAIGenerated: true };
      if (!result.success || !isDisplayedTurn(turn)) throw new GenerationError('invalid_event');
      return turn;
    },
    async ending(state, signal, onNarrative, locale = 'en') {
      if (!client) return getEnding(state);
      const result = parseEndingResponse(await generate(buildEndingSystemPrompt(locale),
        buildEndingPrompt({ playerState: state.player, worldState: state.world, history: state.history, maxTurns: state.maxTurns }, locale), 1024, signal, onNarrative));
      const ending = { id: 'ai_generated' as const, title: result.title, summary: result.summary };
      if (!result.success || !isEnding(ending)) throw new GenerationError('invalid_ending');
      return ending;
    },
  };
}
