import Anthropic from '@anthropic-ai/sdk';
import { transientConnection } from './network.ts';

export type ClaudeEnvironment = Partial<Record<'ANTHROPIC_API_KEY', string>>;

// Only messages constructed here are safe to print; SDK errors can contain response bodies.
export class ClaudeError extends Error {}

export function requireApiKey(environment: ClaudeEnvironment): string {
  const apiKey = environment.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new ClaudeError('Missing required environment variable: ANTHROPIC_API_KEY');
  return apiKey;
}

export function createClaudeClient(environment: ClaudeEnvironment = process.env, fetcher: typeof fetch = fetch): Anthropic {
  const apiKey = requireApiKey(environment);
  const boundedFetch: typeof fetch = async (input, init) => {
    const options: RequestInit = {
      ...init,
      redirect: 'error',
      signal: init?.signal
        ? AbortSignal.any([init.signal, AbortSignal.timeout(30_000)])
        : AbortSignal.timeout(30_000),
    };
    try {
      return await fetcher(input, options);
    } catch (error) {
      // Retry once only before receiving a response. Never restart a partially
      // consumed stream or reset the original transport/caller deadline.
      if (options.signal?.aborted || !transientConnection(error)
        || input instanceof Request || (init?.body != null && typeof init.body !== 'string')) throw error;
      return await fetcher(input, options);
    }
  };
  return new Anthropic({
    apiKey,
    // Explicit settings prevent inherited bearer tokens or API hosts from overriding authentication.
    authToken: null,
    baseURL: 'https://api.anthropic.com',
    fetch: boundedFetch,
    timeout: 30_000,
    maxRetries: 0,
    logLevel: 'off',
  });
}
