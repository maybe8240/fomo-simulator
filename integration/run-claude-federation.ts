import { ClaudeFederationIntegration, FederationIntegrationError } from './ClaudeFederationIntegration.ts';

try {
  const text = await new ClaudeFederationIntegration().run();
  for (const block of text) console.log(block);
} catch (error) {
  console.error(error instanceof FederationIntegrationError
    ? error.message : 'Federation integration test failed. Error details suppressed to protect credentials.');
  process.exitCode = 1;
}
