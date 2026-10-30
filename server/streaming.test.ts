// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createClaudeClient } from './claude';
import { createGenerationService } from './generation';
import { narrativePreview } from './preview';
import { createInitialState } from '../src/engine/state';

describe('streamed generation', () => {
  it('decodes partial narrative escapes without exposing JSON or choices', () => {
    const value = { event_title: 'Title', description: 'A "quote" and ?\nnew line', choices: [] };
    const source = JSON.stringify(value);
    for (let i = 0; i < source.length; i++) {
      expect(value.description.startsWith(narrativePreview(source.slice(0, i)))).toBe(true);
    }
    expect(narrativePreview(source)).toBe(value.description);
    expect(narrativePreview('{"choices":[{"description":"private"}]}')).toBe('');
    expect(narrativePreview('{"title":"An ending","summary":"A life unfolds')).toBe('A life unfolds');
  });
  it('streams with the real SDK before completion and caches only the stable system prefix', async () => {
    let output!: ReadableStreamDefaultController<Uint8Array>;
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({ start(controller) { output = controller; } });
    const send = (type: string, data: object) => output.enqueue(encoder.encode('event: ' + type + '\ndata: ' + JSON.stringify({ type, ...data }) + '\n\n'));
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { headers: { 'content-type': 'text/event-stream' } }));
    const generation = createGenerationService(createClaudeClient({ ANTHROPIC_API_KEY: 'test-key' }, fetcher), 'claude-haiku-4-5');
    const preview = vi.fn();
    const pending = generation.event(createInitialState(1), new AbortController().signal, preview);
    send('message_start', { message: { id: 'msg_test', type: 'message', role: 'assistant', content: [], model: 'claude-haiku-4-5', stop_reason: null, stop_sequence: null, usage: { input_tokens: 1, output_tokens: 0 } } });
    send('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
    const prefix = '{"event_title":"An email","description":"You received';
    send('content_block_delta', { index: 0, delta: { type: 'text_delta', text: prefix } });
    await vi.waitFor(() => expect(preview).toHaveBeenCalledWith('You received'));
    const choices = ['safe', 'risky', 'absurd'].map(type => ({ type, label: type, flavor: 'Detail', player_delta: {}, world_delta: {} }));
    send('content_block_delta', { index: 0, delta: { type: 'text_delta', text: ' an offer.","choices":' + JSON.stringify(choices) + '}' } });
    send('content_block_stop', { index: 0 });
    send('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 100 } });
    send('message_stop', {});
    output.close();
    expect((await pending).currentEvent.actions).toHaveLength(3);
    const params = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
    expect(params.stream).toBe(true);
    expect(params.system[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(params.messages[0].cache_control).toBeUndefined();
  });
});
