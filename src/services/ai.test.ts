import { describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../engine/state';
import { generateEventWithAI } from './ai';
import { createGameServices } from './game';

const config = { apiKey: 'test-key', baseURL: '/api/anthropic', model: 'test-model' };
const state = createInitialState(123);
const request = { playerState: state.player, worldState: state.world, recentHistory: [] };
const signal = () => new AbortController().signal;

function eventPayload() {
  return { event_title: 'A specific event', description: 'Something happens.',
    choices: ['safe', 'risky', 'absurd'].map((type) => ({
      type, label: type, flavor: 'A detail', player_delta: { money: 3.7 },
      world_delta: { economy: -200 },
    })) };
}

function response(payload: unknown) {
  return new Response(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(payload) }] }),
    { status: 200, headers: { 'Content-Type': 'application/json' } });
}

describe('AI boundary', () => {
  it('normalizes choices and sends the configured request through the proxy', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response(eventPayload()));
    const result = await generateEventWithAI(config, request, true, { fetcher });
    expect(result.success).toBe(true);
    expect(result.actions.map((action) => action.type)).toEqual(['safe', 'risky', 'absurd']);
    expect(result.actions[0].playerDelta.money).toBe(4);
    expect(result.actions[0].worldDelta.economy).toBe(-100);
    expect(fetcher.mock.calls[0][0]).toBe('/api/anthropic/v1/messages');
    const init = fetcher.mock.calls[0][1]!;
    expect(init.headers).toMatchObject({ 'x-api-key': 'test-key' });
    expect(JSON.parse(String(init.body))).toMatchObject({ model: 'test-model', max_tokens: 2048 });
  });

  it.each(['duplicates', 'invalid-number', 'missing-description', 'bad-json'])(
    'falls back to a static event for %s', async (problem) => {
      const payload = eventPayload();
      if (problem === 'duplicates') payload.choices[1].type = 'safe';
      if (problem === 'invalid-number') Object.assign(payload.choices[0].player_delta, { money: 'oops' });
      if (problem === 'missing-description') payload.description = '';
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(problem === 'bad-json'
        ? new Response('{', { status: 200 }) : response(payload));
      const services = createGameServices({ ai: config, maxTurns: 5 }, fetcher);
      expect((await services.generateTurn(state, signal())).isAIGenerated).toBe(false);
    });

  it.each([429, 500])('falls back for HTTP %s', async (status) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status }));
    const services = createGameServices({ ai: config, maxTurns: 5 }, fetcher);
    expect((await services.generateTurn(state, signal())).isAIGenerated).toBe(false);
    expect((await services.generateEnding(state, signal())).id).toBe('stable_generalist');
  });

  it('falls back on a network failure and makes no calls in offline mode', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('offline'));
    const online = createGameServices({ ai: config, maxTurns: 5 }, fetcher);
    expect((await online.generateTurn(state, signal())).isAIGenerated).toBe(false);
    fetcher.mockClear();
    const offline = createGameServices({ ai: null, maxTurns: 5 }, fetcher);
    await offline.generateTurn(state, signal());
    await offline.generateEnding(state, signal());
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('accepts an AI ending and rejects a malformed ending', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response({ title: 'A New Direction', summary: 'Your choices mattered.' }))
      .mockResolvedValueOnce(response({ title: {}, summary: 12 }));
    const services = createGameServices({ ai: config, maxTurns: 5 }, fetcher);
    expect((await services.generateEnding(state, signal())).id).toBe('ai_generated');
    expect((await services.generateEnding(state, signal())).id).toBe('stable_generalist');
  });

  it('propagates cancellation to the transport', async () => {
    const controller = new AbortController();
    const fetcher = vi.fn<typeof fetch>().mockImplementation((_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
      }));
    const pending = generateEventWithAI(config, request, false,
      { fetcher, signal: controller.signal });
    controller.abort();
    expect((await pending).success).toBe(false);
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it('times out a stalled request and returns a fallback', async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi.fn<typeof fetch>().mockImplementation((_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('timed out')), { once: true });
        }));
      const services = createGameServices({ ai: config, maxTurns: 5 }, fetcher);
      const pending = services.generateTurn(state, signal());
      await vi.advanceTimersByTimeAsync(30_000);
      expect((await pending).isAIGenerated).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
