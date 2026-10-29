// @vitest-environment node
import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import { createGenerationService } from './generation';
import { createInitialState } from '../src/engine/state';

const state = createInitialState(123);
function payload() {
  return { event_title: 'A personal dilemma', description: 'Something specific happened.',
    choices: ['safe', 'risky', 'absurd'].map((type) => ({ type, label: type, flavor: 'A real detail.',
      player_delta: { money: 3.7 }, world_delta: { economy: -200 } })) };
}
function service(value: unknown) {
  const create = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: JSON.stringify(value) }] });
  const client = { messages: { create } } as unknown as Anthropic;
  return { generation: createGenerationService(client, 'claude-haiku-4-5'), create };
}
describe('server-owned generation', () => {
  it('normalizes and bounds deltas', async () => {
    const { generation, create } = service(payload());
    const signal = new AbortController().signal;
    const turn = await generation.event(state, signal);
    expect(turn.currentEvent.actions[0].playerDelta.money).toBe(4);
    expect(turn.currentEvent.actions[0].worldDelta.economy).toBe(-100);
    expect(create.mock.calls[0][0].max_tokens).toBe(2048);
    expect(create.mock.calls[0][1].signal).toBe(signal);
  });
  it.each(['duplicate-type', 'invalid-type', 'invalid-delta', 'missing-title', 'oversized-label'])(
    'rejects malformed model content: %s', async (problem) => {
      const value = payload();
      if (problem === 'duplicate-type') value.choices[1].type = 'safe';
      if (problem === 'invalid-type') value.choices[1].type = 'unknown';
      if (problem === 'invalid-delta') Object.assign(value.choices[1].player_delta, { money: 'bad' });
      if (problem === 'missing-title') value.event_title = '';
      if (problem === 'oversized-label') value.choices[1].label = 'x'.repeat(1601);
      await expect(service(value).generation.event(state, new AbortController().signal)).rejects.toThrow();
    });
  it('validates and returns an ending', async () => {
    const { generation, create } = service({ title: 'A New Path', summary: 'You built a life.' });
    expect(await generation.ending(state, new AbortController().signal)).toEqual({
      id: 'ai_generated', title: 'A New Path', summary: 'You built a life.',
    });
    expect(create.mock.calls[0][0].max_tokens).toBe(256);
  });
  it('rejects a malformed ending', async () => {
    await expect(service({ title: {}, summary: 1 }).generation.ending(state, new AbortController().signal)).rejects.toThrow();
  });
  it('uses static events and endings when AI is off', async () => {
    const generation = createGenerationService(null, 'claude-haiku-4-5');
    expect((await generation.event(state, new AbortController().signal)).isAIGenerated).toBe(false);
    expect((await generation.ending(state, new AbortController().signal)).id).toBe('stable_generalist');
  });
});
