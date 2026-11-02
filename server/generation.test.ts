// @vitest-environment node
import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import { createGenerationService } from './generation';
import { createInitialState } from '../src/engine/state';
import { resolveAction } from '../src/engine/resolver';

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
  it('sends the actual final status to endings in both languages', async () => {
    const final = { ...state, completed: true,
      player: { ...state.player, money: 4, energy: 3, network: 98, skill_ai: 81 },
      world: { ...state.world, economy: 19, ai_hype: 88 } };
    for (const locale of ['en', 'zh'] as const) {
      const { generation, create } = service({ title: 'A New Path', summary: 'A concrete ending.' });
      await generation.ending(final, new AbortController().signal, undefined, locale);
      const request = create.mock.calls[0][0];
      const prompt = request.messages[0].content;
      expect(prompt).toContain(JSON.stringify(final.player));
      expect(prompt).toContain(JSON.stringify(final.world));
      expect(request.system[0].text).toContain(locale === 'en' ? 'AFTER the last choice' : '最后一次行动结算后的最终状态');
      expect(request.system[0].text).toContain(locale === 'en' ? 'at least two salient' : '至少让两项');
    }
  });
  it('sends native Chinese system and user instructions to the SDK', async () => {
    const { generation, create } = service({ ...payload(), event_title: '报销证明', description: '代理拿到酬劳，你却没有发票。' });
    const turn = await generation.event(state, new AbortController().signal, undefined, 'zh');
    expect(turn.currentEvent.title).toBe('报销证明');
    const request = create.mock.calls[0][0];
    expect(request.system[0].text).toContain('用自然、简练的简体中文直接创作');
    expect(request.messages[0].content).toContain('请直接用简体中文创作新故事和选项');
    expect(request.system[0].text).not.toContain('All generated prose must be English');
  });
  it('reserves output for complete JSON on Haiku 5.5 and pinned versions', async () => {
    for (const model of ['claude-haiku-5-5', 'claude-haiku-5-5-20261007']) {
      const create = vi.fn().mockResolvedValue({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(payload()) }] });
      const client = { messages: { create } } as unknown as Anthropic;
      const initial = createInitialState(1, 5);
      const event = { id: 'old', title: 'A job', description: 'An invoice.', actions: [] };
      const next = resolveAction(initial, event, { id: 'choice', type: 'risky', label: 'Accept', flavor: 'Low pay', playerDelta: {}, worldDelta: {} }, { currentEvent: event });
      await createGenerationService(client, model).event(next, new AbortController().signal);
      expect(create.mock.calls[0][0]).toMatchObject({ thinking: { type: 'disabled' }, max_tokens: 2048 });
    }
  });
  it('classifies token exhaustion even if a truncated response contains parseable JSON', async () => {
    const { generation, create } = service(payload());
    create.mockResolvedValue({ stop_reason: 'max_tokens', content: [{ type: 'text', text: JSON.stringify(payload()) }] });
    await expect(generation.event(state, new AbortController().signal)).rejects.toMatchObject({ reason: 'output_limit' });
  });
  it('reuses the stable policy while sending saved run length and chosen scene to the SDK', async () => {
    const { generation, create } = service(payload());
    const initial = createInitialState(123, 2);
    const signal = new AbortController().signal;
    const first = await generation.event(initial, signal);
    const next = resolveAction(initial, first.currentEvent, first.currentEvent.actions[1], first);
    await generation.event(next, signal);
    expect(create.mock.calls[0][0].system).toEqual(create.mock.calls[1][0].system);
    const prompt = create.mock.calls[1][0].messages[0].content;
    expect(prompt).toContain('turn 2 of 2');
    expect(prompt).toContain(first.currentEvent.description);
    expect(prompt).toContain('"action_type":"risky"');
    expect(prompt).toContain('Final choice:');
  });
  it('normalizes and bounds deltas', async () => {
    const { generation, create } = service(payload());
    const signal = new AbortController().signal;
    const turn = await generation.event(state, signal);
    expect(turn.currentEvent.actions[0].playerDelta.money).toBe(4);
    expect(turn.currentEvent.actions[0].worldDelta.economy).toBe(-100);
    expect(create.mock.calls[0][0].max_tokens).toBe(2048);
    expect(create.mock.calls[0][0].thinking).toBeUndefined();
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
    expect(create.mock.calls[0][0].max_tokens).toBe(1024);
  });
  it('rejects a malformed ending', async () => {
    const { generation, create } = service({ title: {}, summary: 1 });
    await expect(generation.ending(state, new AbortController().signal)).rejects.toMatchObject({ reason: 'invalid_ending' });
    expect(create).toHaveBeenCalledTimes(3);
  });
  it.each(['en', 'zh'] as const)('repairs an invalid %s ending using the received response, with at most two retries', async locale => {
    const { generation, create } = service(null);
    const invalid = '{"title":"Draft","summary":"A story with an "unescaped" quote."}';
    const second = JSON.stringify({ title: '', summary: 'Keep this scene.' });
    const ending = { title: locale === 'zh' ? '最后一班车' : 'The Last Bus', summary: locale === 'zh' ? '你带着账单回家。' : 'You return home with the invoice.' };
    const message = (text: string) => ({ content: [{ type: 'text', text }] });
    create.mockResolvedValueOnce(message(invalid)).mockResolvedValueOnce(message(second))
      .mockResolvedValueOnce(message(JSON.stringify(ending)));
    expect(await generation.ending(state, new AbortController().signal, undefined, locale))
      .toEqual({ id: 'ai_generated', ...ending });
    expect(create).toHaveBeenCalledTimes(3);
    const requests = create.mock.calls.map(([request]) => request);
    expect(requests[1].messages[0]).toEqual(requests[0].messages[0]);
    expect(requests[1].messages[1]).toEqual({ role: 'assistant', content: invalid });
    expect(requests[2].messages[1]).toEqual({ role: 'assistant', content: second });
    expect(requests[1].messages[2].content).toContain(locale === 'zh' ? '修复已有结局' : 'Repair the existing ending');
    expect(requests[2].system).toEqual(requests[0].system);
  });
  it('retains the streamed draft while repairing and does not retry after cancellation', async () => {
    const draft = '{"title":"A draft","summary":"You return home with the invoice."';
    const controller = new AbortController();
    const create = vi.fn();
    const stream = {
      on: vi.fn(), finalMessage: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: draft }] }),
    };
    stream.on.mockImplementation((_event, callback) => { callback('', draft); });
    const client = { messages: { stream: vi.fn().mockReturnValue(stream), create } } as unknown as Anthropic;
    const preview = vi.fn(() => controller.abort());
    await expect(createGenerationService(client, 'claude-haiku-4-5').ending(state, controller.signal, preview))
      .rejects.toThrow('Generation cancelled');
    expect(preview).toHaveBeenCalledWith('You return home with the invoice.');
    expect(create).not.toHaveBeenCalled();
  });
  it('keeps the original preview visible until a streamed ending is repaired', async () => {
    const draft = '{"title":"A draft","summary":"Your original closing scene."';
    const create = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: JSON.stringify({ title: 'Repaired', summary: 'Your original closing scene.' }) }] });
    const stream = { on: vi.fn(), finalMessage: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: draft }] }) };
    stream.on.mockImplementation((_event, callback) => { callback('', draft); });
    const client = { messages: { stream: vi.fn().mockReturnValue(stream), create } } as unknown as Anthropic;
    const preview = vi.fn();
    const result = await createGenerationService(client, 'claude-haiku-4-5').ending(state, new AbortController().signal, preview);
    expect(result).toEqual({ id: 'ai_generated', title: 'Repaired', summary: 'Your original closing scene.' });
    expect(create).toHaveBeenCalledOnce();
    expect(preview.mock.calls.every(([text]) => text === 'Your original closing scene.')).toBe(true);
    expect(create.mock.calls[0][0].messages[1].content).toBe(draft);
  });
  it('uses static events and endings when AI is off', async () => {
    const generation = createGenerationService(null, 'claude-haiku-4-5');
    expect((await generation.event(state, new AbortController().signal)).isAIGenerated).toBe(false);
    expect((await generation.ending(state, new AbortController().signal)).id).toBe('stable_generalist');
  });
});
