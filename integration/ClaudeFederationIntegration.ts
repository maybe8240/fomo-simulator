import Anthropic from '@anthropic-ai/sdk';
import { createFederatedClient, FederationError } from '../server/federation.ts';
import type { FederationEnvironment } from '../server/federation.ts';
export { GOOGLE_METADATA_URL } from '../server/federation.ts';
export { FederationError as FederationIntegrationError } from '../server/federation.ts';
export class ClaudeFederationIntegration {
  private readonly client: Anthropic;
  constructor(environment: FederationEnvironment = process.env, fetcher: typeof fetch = fetch) {
    this.client = createFederatedClient(environment, fetcher);
  }

  async run(): Promise<string[]> {
    try {
      const message = await this.client.messages.create({
        model: 'claude-opus-5-5',
        max_tokens: 1024,
        messages: [{ role: 'user', content: 'Hello from Cloud Run' }],
      });
      const text = message.content.filter((block) => block.type === 'text').map((block) => block.text);
      if (!text.some((block) => block.trim())) {
        throw new FederationError('Claude returned no text; integration smoke test failed.');
      }
      return text;
    } catch (error) {
      if (error instanceof FederationError) throw error;
      const status = error instanceof Anthropic.APIError ? ` (HTTP ${error.status})` : '';
      throw new FederationError(`Claude Messages request failed${status}.`);
    }
  }
}
