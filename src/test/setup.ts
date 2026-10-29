import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, vi } from 'vitest';

const blockedFetch = vi.fn<typeof fetch>(() => {
  throw new Error('Unexpected network request: inject a fetch mock');
});

function offlineEnvironment() {
  vi.stubEnv('VITE_AI_ENABLED', 'false');
  vi.stubEnv('VITE_CLAUDE_API_KEY', '');
  vi.stubEnv('VITE_TURNS', '5');
  vi.stubGlobal('fetch', blockedFetch);
}

// Also isolate module initialization from a developer's local .env credentials.
offlineEnvironment();

beforeEach(() => {
  localStorage.clear();
  blockedFetch.mockClear();
  offlineEnvironment();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  expect(blockedFetch).not.toHaveBeenCalled();
});
