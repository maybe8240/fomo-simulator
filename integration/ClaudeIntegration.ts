import Anthropic from '@anthropic-ai/sdk';
import { createClaudeClient, ClaudeError } from '../server/claude.ts';
import type { ClaudeEnvironment } from '../server/claude.ts';
export { ClaudeError as ClaudeIntegrationError } from '../server/claude.ts';
export class ClaudeIntegration {
  private readonly client: Anthropic;
  constructor(environment: ClaudeEnvironment = process.env, fetcher: typeof fetch = fetch) {
    this.client = createClaudeClient(environment, fetcher);
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
        throw new ClaudeError('Claude returned no text; integration smoke test failed.');
      }
      return text;
    } catch (error) {
      if (error instanceof ClaudeError) throw error;
      const status = error instanceof Anthropic.APIError && error.status !== undefined ? ` (HTTP ${error.status})` : '';
      throw new ClaudeError(`Claude Messages request failed${status}.`);
    }
  }
}
