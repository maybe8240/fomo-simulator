// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { ClaudeIntegration } from './ClaudeIntegration';
import { createClaudeClient } from '../server/claude';
import { networkCode } from '../server/network';

const environment = { ANTHROPIC_API_KEY: 'test-api-key' };
function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json' },
  });
}
function transport() {
  return vi.fn<typeof fetch>().mockResolvedValue(response({
    id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-opus-5-5',
    content: [{ type: 'text', text: 'Hello from the mock.' }],
    stop_reason: 'end_turn', stop_sequence: null,
    usage: { input_tokens: 5, output_tokens: 5 },
  }));
}

describe('Claude API key integration (mocked transport)', () => {
  it('extracts only allowlisted network codes, including aggregate connection errors', () => {
    const privateError = Object.assign(new Error('private credentials'), { code: 'PRIVATE_SECRET' });
    expect(networkCode(privateError)).toBeUndefined();
    expect(networkCode(new Error('wrapper', { cause: new AggregateError([
      privateError, Object.assign(new Error('private IP'), { code: 'ENETUNREACH' }),
    ]) }))).toBe('ENETUNREACH');
  });
  it('recovers from one transient socket failure within the same deadline', async () => {
    const fetcher = transport();
    const success = await fetcher('https://api.anthropic.com/v1/messages');
    fetcher.mockReset().mockRejectedValueOnce(new TypeError('private details', {
      cause: Object.assign(new Error('private transport message'), { code: 'ECONNRESET' }),
    })).mockResolvedValueOnce(success);
    expect(await new ClaudeIntegration(environment, fetcher).run()).toEqual(['Hello from the mock.']);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0][1]?.signal).toBe(fetcher.mock.calls[1][1]?.signal);
    expect(fetcher.mock.calls[1][1]?.redirect).toBe('error');
  });
  it.each(['ECONNRESET', 'CERT_HAS_EXPIRED'])(
    'bounds retries for %s and suppresses private transport errors', async code => {
      const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('private detail', {
        cause: Object.assign(new Error(), { code }),
      }));
      await expect(new ClaudeIntegration(environment, fetcher).run()).rejects.toThrow('Claude Messages request failed.');
      expect(fetcher).toHaveBeenCalledTimes(code === 'ECONNRESET' ? 2 : 1);
    });
  it('does not retry cancelled transient failures', async () => {
    const controller = new AbortController();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
      controller.abort();
      throw Object.assign(new Error('private'), { code: 'ECONNRESET' });
    });
    await expect(createClaudeClient(environment, fetcher).messages.create({
      model: 'claude-haiku-4-5', max_tokens: 1, messages: [{ role: 'user', content: 'Test' }],
    }, { signal: controller.signal })).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('sends one API-key-authenticated message using the real SDK and fixed destination', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'ignored-test-key');
    vi.stubEnv('ANTHROPIC_AUTH_TOKEN', 'ignored-test-auth-token');
    vi.stubEnv('ANTHROPIC_BASE_URL', 'https://untrusted.invalid');
    const fetcher = transport();
    expect(await new ClaudeIntegration(environment, fetcher).run()).toEqual(['Hello from the mock.']);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [input, init] = fetcher.mock.calls[0];
    expect(String(input)).toBe('https://api.anthropic.com/v1/messages');
    const headers = new Headers(init?.headers);
    expect(headers.get('x-api-key')).toBe('test-api-key');
    expect(headers.has('authorization')).toBe(false);
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: 'claude-opus-5-5', max_tokens: 1024,
      messages: [{ role: 'user', content: 'Hello from Cloud Run' }],
    });
    expect(init?.signal).toBeDefined();
    expect(init?.redirect).toBe('error');
  });

  it.each([undefined, '', ' '])('requires an API key before any network call (%s)', (apiKey) => {
    const fetcher = transport();
    expect(() => new ClaudeIntegration({ ANTHROPIC_API_KEY: apiKey }, fetcher))
      .toThrow('Missing required environment variable: ANTHROPIC_API_KEY');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([401, 403, 429, 500])('hides Messages HTTP %s response details without retrying', async (status) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ error: { message: 'private detail' } }, status));
    await expect(new ClaudeIntegration(environment, fetcher).run())
      .rejects.toThrow(`Claude Messages request failed (HTTP ${status}).`);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('hides transport error details', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('private credential detail'));
    await expect(new ClaudeIntegration(environment, fetcher).run())
      .rejects.toThrow('Claude Messages request failed.');
  });

  it('rejects responses without text', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ content: [] }));
    await expect(new ClaudeIntegration(environment, fetcher).run()).rejects.toThrow('Claude returned no text');
  });

  it('forwards cancellation to the bounded transport', async () => {
    const fetcher = transport();
    const controller = new AbortController();
    await createClaudeClient(environment, fetcher).messages.create({
      model: 'claude-haiku-4-5', max_tokens: 1, messages: [{ role: 'user', content: 'Test' }],
    }, { signal: controller.signal });
    const signal = fetcher.mock.calls[0][1]?.signal;
    expect(signal?.aborted).toBe(false);
    controller.abort();
    expect(signal?.aborted).toBe(true);
  });
});
