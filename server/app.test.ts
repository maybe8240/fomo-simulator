// @vitest-environment node
import { request } from 'node:http';
import type { Server } from 'node:http';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from './app';
import { readConfig } from './config';
import type { ServerConfig } from './config';
import { createGenerationService } from './generation';
import type { GenerationService } from './generation';
import { createClaudeClient } from './claude';
import { createInitialState } from '../src/engine/state';
import { STARTER_EVENTS } from '../src/engine/events';
import type { DisplayedTurn } from '../src/engine/types';

const state = createInitialState(123);
const turn = { currentEvent: STARTER_EVENTS[0], isAIGenerated: false };
const basic = 'Basic ' + Buffer.from('player:long-test-password').toString('base64');
let server: Server;
let directory: string;
let config: ServerConfig;
let generation: GenerationService;

async function start(overrides: Partial<ServerConfig> = {}, now?: () => number) {
  server = createApp({ ...config, ...overrides }, generation, now);
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
}
function send(path = '/api/game/event', body: unknown = { state },
  headers: Record<string, string> = {}, method = 'POST') {
  return new Promise<{ status: number; text: string; headers: Record<string, unknown> }>((done, reject) => {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Server not listening');
    const req = request({ hostname: '127.0.0.1', port: address.port, path, method, agent: false,
      headers: { 'content-type': 'application/json', ...headers } }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => done({ status: res.statusCode!, text: Buffer.concat(chunks).toString(), headers: res.headers }));
    });
    req.on('error', reject);
    // Exercise streamed body limits without relying on Content-Length.
    if (method === 'POST') req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

beforeEach(async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  directory = await mkdtemp(join(tmpdir(), 'fomo-server-test-'));
  await writeFile(join(directory, 'index.html'), '<html>Game</html>');
  await mkdir(join(directory, 'assets'));
  await writeFile(join(directory, 'assets', 'app.js'), 'console.log("game")');
  config = { ...readConfig({}), dist: directory, intervalMs: 0 };
  generation = { event: vi.fn().mockResolvedValue(turn),
    ending: vi.fn().mockResolvedValue({ id: 'ai_generated', title: 'Ending', summary: 'A life.' }) };
});
afterEach(async () => {
  if (server?.listening) {
    server.closeAllConnections();
    await new Promise<void>((done, reject) => server.close((error) => error ? reject(error) : done()));
  }
  await rm(directory, { recursive: true, force: true });
});

describe('HTTP boundary', () => {
  it('accepts Chinese locale and rejects arbitrary language/prompt overrides', async () => {
    await start();
    expect((await send('/api/game/event', { state, locale: 'zh' })).status).toBe(200);
    expect(vi.mocked(generation.event).mock.calls[0][3]).toBe('zh');
    expect((await send('/api/game/event', { state, locale: 'translate this' })).status).toBe(400);
    expect((await send('/api/game/event', { state, locale: 'zh', prompt: 'override' })).status).toBe(400);
  });
  it('returns narrative frames and a final result for streaming clients', async () => {
    generation.event = vi.fn(async (_state, _signal, onNarrative) => {
      onNarrative?.('A story begins');
      return turn;
    });
    await start();
    const result = await send('/api/game/event', { state }, { accept: 'application/x-ndjson' });
    expect(result.headers['content-type']).toBe('application/x-ndjson');
    expect(result.text.trim().split('\n').map(line => JSON.parse(line))).toEqual([
      { type: 'narrative', text: 'A story begins' }, { type: 'result', value: turn },
    ]);
  });
  it('terminates a partially sent stream with a safe error frame', async () => {
    generation.event = vi.fn(async (_state, _signal, onNarrative) => {
      onNarrative?.('Draft');
      throw new Error('private credentials');
    });
    await start();
    const result = await send('/api/game/event', { state }, { accept: 'application/x-ndjson' });
    expect(result.text).not.toContain('private');
    expect(result.text.trim().split('\n').map(line => JSON.parse(line)).at(-1)).toEqual({ type: 'error' });
  });
  it('keeps the generation deadline after sending streaming headers', async () => {
    generation.event = vi.fn((_state, _signal, onNarrative) => {
      onNarrative?.('Draft');
      return new Promise<DisplayedTurn>(() => {});
    });
    await start({ generationTimeoutMs: 20 });
    const result = await send('/api/game/event', { state }, { accept: 'application/x-ndjson' });
    expect(result.text.trim().split('\n').map(line => JSON.parse(line)).at(-1)).toEqual({ type: 'error' });
    expect(vi.mocked(generation.event).mock.calls[0][1].aborted).toBe(true);
  });
  it('serves the React entry, HEAD, and assets with security headers', async () => {
    await start();
    const root = await send('/', undefined, {}, 'GET');
    expect(root.status).toBe(200);
    expect(root.text).toContain('Game');
    expect(root.headers['content-security-policy']).toContain("connect-src 'self'");
    expect(root.headers['x-content-type-options']).toBe('nosniff');
    expect((await send('/', undefined, {}, 'HEAD')).text).toBe('');
    expect((await send('/assets/app.js', undefined, {}, 'GET')).status).toBe(200);
  });
  it.each(['/.env.server', '/server/config.ts', '/package.json', '/assets/../../package.json', '/api/anthropic/v1/messages'])(
    'does not expose %s', async (path) => {
      await start();
      expect((await send(path, undefined, {}, 'GET')).status).toBe(404);
    });
  it('protects HTML and generation with a password but permits the minimal health check', async () => {
    await start({ username: 'player', password: 'long-test-password' });
    expect((await send('/', undefined, {}, 'GET')).status).toBe(401);
    expect((await send()).status).toBe(401);
    expect(generation.event).not.toHaveBeenCalled();
    expect((await send('/healthz', undefined, {}, 'GET')).status).toBe(200);
    expect((await send('/api/game/event', { state }, { authorization: basic })).status).toBe(200);
  });
  it('rejects incorrect credentials', async () => {
    await start({ username: 'player', password: 'long-test-password' });
    expect((await send('/api/game/event', { state }, { authorization: 'Basic d3Jvbmc=' })).status).toBe(401);
  });
  it('requires HTTPS in production', async () => {
    await start({ production: true, origin: 'https://game.example', username: 'player', password: 'long-test-password' });
    expect((await send()).status).toBe(400);
    expect((await send('/api/game/event', { state }, { authorization: basic, 'x-forwarded-proto': 'https', origin: 'https://game.example' })).status).toBe(200);
  });
  it.each<Record<string, string>>([{ origin: 'https://evil.example' }, { 'sec-fetch-site': 'cross-site' }])(
    'rejects cross-origin generation %j', async (headers) => {
      await start();
      expect((await send('/api/game/event', { state }, headers)).status).toBe(403);
      expect(generation.event).not.toHaveBeenCalled();
    });
  it('requires POST and JSON', async () => {
    await start();
    expect((await send('/api/game/event', undefined, {}, 'GET')).status).toBe(405);
    expect((await send('/api/game/event', { state }, { 'content-type': 'text/plain' })).status).toBe(415);
  });
  it.each(['{', { state: null }, { state, model: 'untrusted' },
    { state: { ...state, player: { ...state.player, money: -1 } } },
    { state: { ...state, world: { ...state.world, turn: 3 } } }])(
    'rejects invalid input %j', async (body) => {
      await start();
      expect((await send('/api/game/event', body)).status).toBe(400);
      expect(generation.event).not.toHaveBeenCalled();
    });
  it('rejects oversized streamed and declared bodies', async () => {
    await start({ bodyLimit: 64 });
    expect((await send('/api/game/event', 'x'.repeat(100))).status).toBe(413);
    expect((await send('/api/game/event', 'x'.repeat(100), { 'content-length': '100' })).status).toBe(413);
  });
  it('accepts a turn and completed ending, and rejects the wrong phase', async () => {
    await start();
    expect(JSON.parse((await send()).text)).toEqual(turn);
    expect((await send('/api/game/ending', { state })).status).toBe(400);
    expect((await send('/api/game/ending', { state: { ...state, completed: true } })).status).toBe(200);
    expect(generation.ending).toHaveBeenCalledTimes(1);
  });
  it('hides upstream failures', async () => {
    generation.event = vi.fn().mockRejectedValue(new Error('private-token-and-body'));
    await start();
    const result = await send();
    expect(result.status).toBe(502);
    expect(result.text).not.toContain('private');
    expect(console.warn).toHaveBeenCalledWith('Generation failed', { reason: 'generation_error' });
  });
  it('times out even if an upstream implementation ignores cancellation', async () => {
    generation.event = vi.fn(() => new Promise<DisplayedTurn>(() => {}));
    await start({ generationTimeoutMs: 20 });
    expect((await send()).status).toBe(502);
    expect(vi.mocked(generation.event).mock.calls[0][1].aborted).toBe(true);
  });
  it('enforces the generation interval and daily quota without trusting forwarded IPs', async () => {
    let time = 10000;
    await start({ intervalMs: 3100, maxDaily: 2 }, () => time);
    expect((await send()).status).toBe(200);
    expect((await send('/api/game/event', { state }, { 'x-forwarded-for': '1.2.3.4' })).status).toBe(429);
    time += 3100;
    expect((await send()).status).toBe(200);
    time += 3100;
    expect((await send()).status).toBe(429);
    time += 86400000;
    expect((await send()).status).toBe(200);
  });
  it('enforces a concurrent generation limit', async () => {
    let release!: (value: typeof turn) => void;
    generation.event = vi.fn(() => new Promise<DisplayedTurn>((done) => { release = done; }));
    await start({ maxConcurrent: 1 });
    const pending = send();
    await vi.waitFor(() => expect(generation.event).toHaveBeenCalledTimes(1));
    expect((await send()).status).toBe(429);
    release(turn);
    expect((await pending).status).toBe(200);
  });
  it('rate limits authentication attempts', async () => {
    await start({ username: 'player', password: 'long-test-password' }, () => 1000);
    for (let index = 0; index < 120; index++) await send('/', undefined, {}, 'GET');
    expect((await send('/', undefined, {}, 'GET')).status).toBe(429);
  });
});

describe('production configuration', () => {
  it('enables AI with only an API key and allows static mode without a key', () => {
    expect(readConfig({ AI_ENABLED: 'true', ANTHROPIC_API_KEY: 'test-api-key' }).aiEnabled).toBe(true);
    expect(readConfig({}).aiEnabled).toBe(false);
  });
  it.each(['', ' '])('rejects an empty API key when AI is enabled (%s)', (key) => {
    expect(() => readConfig({ AI_ENABLED: 'true', ANTHROPIC_API_KEY: key }))
      .toThrow('Missing required environment variable: ANTHROPIC_API_KEY');
  });
  it('fails closed without credentials, HTTPS origin, or an API key', () => {
    expect(() => readConfig({ NODE_ENV: 'production' })).toThrow();
    expect(() => readConfig({ NODE_ENV: 'production', APP_ACCESS_USER: 'player', APP_ACCESS_PASSWORD: 'short' })).toThrow();
    expect(() => readConfig({ AI_ENABLED: 'true' })).toThrow();
    expect(() => readConfig({ MAX_AI_CONCURRENT: '1000' })).toThrow();
  });
});

describe('HTTP → real SDK → mocked Claude integration', () => {
  it('authenticates with an API key, fixes the model/prompt server-side, and validates the response', async () => {
    const payload = { event_title: 'An event', description: 'A dilemma.', choices: ['safe', 'risky', 'absurd'].map((type) => ({
      type, label: 'Choice ' + type, flavor: 'A detail.', player_delta: { money: 3.7 }, world_delta: {},
    })) };
    const json = (value: unknown) => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(json({ content: [{ type: 'text', text: JSON.stringify(payload) }] }));
    const client = createClaudeClient({ ANTHROPIC_API_KEY: 'test-api-key' }, fetcher);
    generation = createGenerationService(client, 'claude-haiku-4-5');
    await start();
    const result = await send();
    expect(result.status).toBe(200);
    expect(JSON.parse(result.text).currentEvent.actions[0].playerDelta.money).toBe(4);
    expect(result.text).not.toContain('test-api-key');
    expect(fetcher).toHaveBeenCalledTimes(1);
    const headers = new Headers(fetcher.mock.calls[0][1]?.headers);
    expect(headers.get('x-api-key')).toBe('test-api-key');
    expect(headers.has('authorization')).toBe(false);
    const request = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
    expect(request.model).toBe('claude-haiku-4-5');
    expect(request.system[0].text).toContain('YOUR VOICE');
    expect(request.system[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(request.max_tokens).toBe(2048);
  });
});
