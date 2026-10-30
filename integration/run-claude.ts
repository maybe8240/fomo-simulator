import { ClaudeIntegration, ClaudeIntegrationError } from './ClaudeIntegration.ts';

try {
  const text = await new ClaudeIntegration().run();
  for (const block of text) console.log(block);
} catch (error) {
  console.error(error instanceof ClaudeIntegrationError
    ? error.message : 'Claude integration test failed. Error details suppressed to protect credentials.');
  process.exitCode = 1;
}
