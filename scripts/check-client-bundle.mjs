import { readdir, readFile } from 'node:fs/promises';

// Catch accidental imports of the server SDK, provider configuration, or prompts.
const forbidden = ['api.anthropic.com', 'x-api-key',
  'VITE_CLAUDE_API_KEY', 'ANTHROPIC_API_KEY', 'YOUR VOICE'];
for (const name of await readdir('dist/assets')) {
  if (!name.endsWith('.js')) continue;
  const source = await readFile(`dist/assets/${name}`, 'utf8');
  if (forbidden.some((marker) => source.includes(marker))) {
    console.error('Browser build contains a server-only integration marker.');
    process.exit(1);
  }
}
console.log('Browser bundle contains no server integration markers.');
