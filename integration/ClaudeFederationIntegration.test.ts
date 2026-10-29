// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { ClaudeFederationIntegration, GOOGLE_METADATA_URL } from './ClaudeFederationIntegration';

const environment = {
  ANTHROPIC_FEDERATION_RULE_ID: 'fdrl_test',
  ANTHROPIC_ORGANIZATION_ID: 'test-organization',
  ANTHROPIC_SERVICE_ACCOUNT_ID: 'svac_test',
  ANTHROPIC_WORKSPACE_ID: 'wrkspc_test',
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json' },
  });
}

function transport() {
  return vi.fn<typeof fetch>()
    .mockResolvedValueOnce(new Response('fake.identity.jwt'))
    .mockResolvedValueOnce(response({
      access_token: 'fake-access-token', token_type: 'Bearer', expires_in: 600,
    }))
    .mockResolvedValueOnce(response({
      id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-opus-5-5',
      content: [{ type: 'text', text: 'Hello from the mock.' }],
      stop_reason: 'end_turn', stop_sequence: null,
      usage: { input_tokens: 5, output_tokens: 5 },
    }));
}

describe('Claude federation integration (mocked transport)', () => {
  it('exchanges Google identity and sends a bearer-authenticated message using the real SDK', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'ignored-test-key');
    vi.stubEnv('ANTHROPIC_AUTH_TOKEN', 'ignored-test-auth-token');
    vi.stubEnv('ANTHROPIC_BASE_URL', 'https://untrusted.invalid');
    const fetcher = transport();
    expect(await new ClaudeFederationIntegration(environment, fetcher).run()).toEqual(['Hello from the mock.']);
    expect(fetcher).toHaveBeenCalledTimes(3);
    const [metadata, exchange, message] = fetcher.mock.calls;
    expect(String(metadata[0])).toBe(GOOGLE_METADATA_URL);
    expect(new Headers(metadata[1]?.headers).get('Metadata-Flavor')).toBe('Google');
    expect(String(exchange[0])).toBe('https://api.anthropic.com/v1/oauth/token');
    expect(JSON.parse(String(exchange[1]?.body))).toMatchObject({
      assertion: 'fake.identity.jwt', federation_rule_id: 'fdrl_test',
      organization_id: 'test-organization', service_account_id: 'svac_test', workspace_id: 'wrkspc_test',
    });
    expect(String(message[0])).toBe('https://api.anthropic.com/v1/messages');
    const headers = new Headers(message[1]?.headers);
    expect(headers.get('authorization')).toBe('Bearer fake-access-token');
    expect(headers.has('x-api-key')).toBe(false);
    expect(JSON.parse(String(message[1]?.body))).toMatchObject({
      model: 'claude-opus-5-5', max_tokens: 1024,
      messages: [{ role: 'user', content: 'Hello from Cloud Run' }],
    });
    expect(metadata[1]?.signal).toBeDefined();
    expect(exchange[1]?.redirect).toBe('error');
  });

  it.each(['ANTHROPIC_FEDERATION_RULE_ID', 'ANTHROPIC_ORGANIZATION_ID'] as const)(
    'fails before any network call if %s is missing', (name) => {
      const fetcher = transport();
      expect(() => new ClaudeFederationIntegration({ ...environment, [name]: ' ' }, fetcher))
        .toThrow(`Missing required environment variable: ${name}`);
      expect(fetcher).not.toHaveBeenCalled();
    });

  it.each([403, 500])('stops at metadata HTTP %s without exchanging a token', async (status) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('private response', { status }));
    await expect(new ClaudeFederationIntegration(environment, fetcher).run())
      .rejects.toThrow(`Google metadata request failed (HTTP ${status}).`);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('reports unavailable Google metadata without leaking transport error details', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('private credential detail'));
    await expect(new ClaudeFederationIntegration(environment, fetcher).run())
      .rejects.toThrow('Google metadata server unavailable.');
  });

  it('rejects a malformed metadata token', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('not-a-jwt'));
    await expect(new ClaudeFederationIntegration(environment, fetcher).run())
      .rejects.toThrow('Google metadata did not return an identity JWT.');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('reports exchange rejection without printing the response body', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('fake.identity.jwt'))
      .mockResolvedValueOnce(response({ error: 'private credential detail' }, 401));
    await expect(new ClaudeFederationIntegration(environment, fetcher).run())
      .rejects.toThrow('Claude federation exchange failed.');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('reports a Messages failure without printing response details', async () => {
    const fetcher = transport();
    fetcher.mockReset()
      .mockResolvedValueOnce(new Response('fake.identity.jwt'))
      .mockResolvedValueOnce(response({ access_token: 'fake-access-token', token_type: 'Bearer', expires_in: 600 }))
      .mockResolvedValueOnce(response({ error: { message: 'private credential detail' } }, 404));
    await expect(new ClaudeFederationIntegration(environment, fetcher).run())
      .rejects.toThrow('Claude Messages request failed (HTTP 404).');
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
