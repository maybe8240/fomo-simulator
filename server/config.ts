import { resolve } from 'node:path';
import { requireApiKey } from './claude.ts';

export interface ServerConfig {
  production: boolean;
  port: number;
  host: string;
  origin: string;
  username: string;
  password: string;
  aiEnabled: boolean;
  model: string;
  dist: string;
  bodyLimit: number;
  maxConcurrent: number;
  maxDaily: number;
  intervalMs: number;
  generationTimeoutMs: number;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const production = env.NODE_ENV === 'production';
  const integer = (name: string, fallback: number, min: number, max: number) => {
    const value = env[name] === undefined ? fallback : Number(env[name]);
    if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error(`Invalid ${name}`);
    return value;
  };
  const username = env.APP_ACCESS_USER ?? '';
  const password = env.APP_ACCESS_PASSWORD ?? '';
  if (production && (!username || password.length < 16)) {
    throw new Error('Production requires APP_ACCESS_USER and APP_ACCESS_PASSWORD (at least 16 characters).');
  }
  if (Boolean(username) !== Boolean(password) || username.includes(':')) throw new Error('Invalid application access credentials.');
  const origin = env.APP_ORIGIN ?? 'http://localhost:5173';
  const parsed = new URL(origin);
  if (parsed.origin !== origin || (production && parsed.protocol !== 'https:')
    || !['http:', 'https:'].includes(parsed.protocol)) throw new Error('Invalid APP_ORIGIN');
  if (production && !env.APP_ORIGIN) throw new Error('Production requires APP_ORIGIN');
  const aiEnabled = env.AI_ENABLED === 'true';
  if (aiEnabled) requireApiKey(env);
  const model = env.CLAUDE_MODEL ?? 'claude-haiku-4-5';
  if (!/^claude-[a-zA-Z0-9.-]{1,80}$/.test(model)) throw new Error('Invalid CLAUDE_MODEL');
  return {
    production, port: integer('PORT', 3001, 1, 65535),
    host: production ? '0.0.0.0' : '127.0.0.1', origin, username, password, aiEnabled, model,
    dist: resolve('dist'), bodyLimit: 32 * 1024,
    maxConcurrent: integer('MAX_AI_CONCURRENT', 2, 1, 10),
    maxDaily: integer('MAX_AI_REQUESTS_PER_DAY', 100, 1, 10000),
    intervalMs: integer('AI_REQUEST_INTERVAL_MS', 3100, 0, 60000),
    generationTimeoutMs: integer('GENERATION_TIMEOUT_MS', 35000, 1000, 60000),
  };
}
