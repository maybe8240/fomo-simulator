import { readConfig } from './config.ts';
import { createApp } from './app.ts';
import { createClaudeClient } from './claude.ts';
import { createGenerationService } from './generation.ts';

try {
  const config = readConfig();
  const client = config.aiEnabled ? createClaudeClient() : null;
  const server = createApp(config, createGenerationService(client, config.model));
  server.listen(config.port, config.host, () => {
    console.log(`FOMO server listening on ${config.host}:${config.port}; AI ${config.aiEnabled ? 'enabled' : 'disabled'}`);
  });
  const shutdown = () => {
    server.close(() => process.exit(0));
    server.closeIdleConnections();
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  server.on('error', () => { console.error('Server failed to listen. Check host/port configuration.'); process.exitCode = 1; });
} catch {
  console.error('Server configuration invalid. Check the required environment settings in README.md.');
  process.exitCode = 1;
}
