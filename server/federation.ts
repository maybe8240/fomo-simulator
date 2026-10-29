import Anthropic from '@anthropic-ai/sdk';
import { oidcFederationProvider } from '@anthropic-ai/sdk/lib/credentials/oidc-federation';

const BASE_URL = 'https://api.anthropic.com';
export const GOOGLE_METADATA_URL =
  'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity'
  + '?audience=https://api.anthropic.com&format=full';

export type FederationEnvironment = Partial<Record<
  'ANTHROPIC_FEDERATION_RULE_ID' | 'ANTHROPIC_ORGANIZATION_ID'
  | 'ANTHROPIC_SERVICE_ACCOUNT_ID' | 'ANTHROPIC_WORKSPACE_ID', string>>;

// Only messages constructed here are safe to print; SDK errors can contain response bodies.
export class FederationError extends Error {}

export function createFederatedClient(environment: FederationEnvironment = process.env, fetcher: typeof fetch = fetch): Anthropic {
  const required = (name: keyof FederationEnvironment) => {
    const value = environment[name]?.trim();
    if (!value) throw new FederationError(`Missing required environment variable: ${name}`);
    return value;
  };
  const federationRuleId = required('ANTHROPIC_FEDERATION_RULE_ID');
  const organizationId = required('ANTHROPIC_ORGANIZATION_ID');

  const boundedFetch: typeof fetch = (input, init) => fetcher(input, {
    ...init,
    redirect: 'error',
    signal: init?.signal
      ? AbortSignal.any([init.signal, AbortSignal.timeout(30_000)])
      : AbortSignal.timeout(30_000),
  });
  const provider = oidcFederationProvider({
    identityTokenProvider: fetchGoogleIdentityToken,
    federationRuleId,
    organizationId,
    serviceAccountId: environment.ANTHROPIC_SERVICE_ACCOUNT_ID?.trim() || undefined,
    workspaceId: environment.ANTHROPIC_WORKSPACE_ID?.trim() || undefined,
    baseURL: BASE_URL,
    fetch: boundedFetch,
  });

  return new Anthropic({
    // Prevent inherited API keys, auth tokens, or API hosts from shadowing federation.
    apiKey: null,
    authToken: null,
    baseURL: BASE_URL,
    credentials: async () => {
      try {
        return await provider();
      } catch (error) {
        if (error instanceof FederationError) throw error;
        throw new FederationError(
          'Claude federation exchange failed. Check the rule and Claude Console authentication events.',
        );
      }
    },
    fetch: boundedFetch,
    timeout: 30_000,
    maxRetries: 0,
    logLevel: 'off',
  });

  async function fetchGoogleIdentityToken(): Promise<string> {
    let response: Response;
    let token: string;
    try {
      response = await boundedFetch(GOOGLE_METADATA_URL, {
        headers: { 'Metadata-Flavor': 'Google' },
      });
      if (!response.ok) {
        throw new FederationError(`Google metadata request failed (HTTP ${response.status}).`);
      }
      token = (await response.text()).trim();
    } catch (error) {
      if (error instanceof FederationError) throw error;
      throw new FederationError(
        'Google metadata server unavailable. Run inside a Google workload with its service account attached.',
      );
    }
    if (token.split('.').length !== 3 || token.split('.').some((part) => !part)) {
      throw new FederationError('Google metadata did not return an identity JWT.');
    }
    return token;
  }

}
