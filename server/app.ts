import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { isGameState, object } from '../src/engine/validation.ts';
import type { GenerationService } from './generation.ts';
import type { ServerConfig } from './config.ts';

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

function reply(res: ServerResponse, status: number, data: unknown) {
  if (res.destroyed) return;
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

function readBody(req: IncomingMessage, limit: number): Promise<unknown> {
  return new Promise((done, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let failed = false;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        failed = true;
        chunks.length = 0;
        reject(new HttpError(413, 'Request body too large.'));
      } else if (!failed) chunks.push(chunk);
    });
    req.once('end', () => {
      if (failed) return;
      try { done(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new HttpError(400, 'Invalid JSON.')); }
    });
    req.once('error', () => reject(new HttpError(400, 'Request interrupted.')));
    req.once('aborted', () => reject(new HttpError(400, 'Request interrupted.')));
  });
}

function authorized(req: IncomingMessage, config: ServerConfig) {
  if (!config.username) return true; // Development only; production config forbids this.
  const authorization = req.headers.authorization ?? '';
  if (!authorization.startsWith('Basic ') || authorization.length > 1024) return false;
  const digest = (text: string) => createHash('sha256').update(text).digest();
  const supplied = Buffer.from(authorization.slice(6), 'base64').toString('utf8');
  return timingSafeEqual(digest(supplied), digest(`${config.username}:${config.password}`));
}

/** Limits are deliberately global per process so spoofed IP headers cannot bypass them. */
export function createApp(config: ServerConfig, generation: GenerationService, now = Date.now) {
  let minute = -1;
  let requests = 0;
  let day = -1;
  let dailyAI = 0;
  let activeAI = 0;
  let lastAI = -Infinity;
  const server = createServer({ maxHeaderSize: 8192 }, (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    if (config.production) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    void handle(req, res).catch((error: unknown) => {
      if (error instanceof HttpError) reply(res, error.status, { error: error.message });
      else reply(res, 500, { error: 'Request failed.' });
    });
  });
  server.requestTimeout = 10_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;

  async function handle(req: IncomingMessage, res: ServerResponse) {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (path === '/healthz' && req.method === 'GET') return reply(res, 200, { ok: true });
    if (config.production && req.headers['x-forwarded-proto'] !== 'https') {
      throw new HttpError(400, 'HTTPS required.');
    }
    const currentMinute = Math.floor(now() / 60000);
    if (minute !== currentMinute) { minute = currentMinute; requests = 0; }
    if (++requests > 120) {
      res.setHeader('Retry-After', '60');
      throw new HttpError(429, 'Too many requests.');
    }
    if (!authorized(req, config)) {
      res.setHeader('WWW-Authenticate', 'Basic realm="FOMO Simulator", charset="UTF-8"');
      throw new HttpError(401, 'Authentication required.');
    }
    if (!config.production && !config.username
      && !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '')) {
      throw new HttpError(403, 'Local access only.');
    }
    if (path.startsWith('/api/')) {
      if (!['/api/game/event', '/api/game/ending'].includes(path)) throw new HttpError(404, 'Not found.');
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        throw new HttpError(405, 'POST required.');
      }
      if (req.headers['sec-fetch-site'] === 'cross-site'
        || (req.headers.origin && req.headers.origin !== config.origin)) throw new HttpError(403, 'Origin denied.');
      if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] ?? '')) {
        throw new HttpError(415, 'JSON content type required.');
      }
      if (Number(req.headers['content-length']) > config.bodyLimit) {
        req.resume();
        throw new HttpError(413, 'Request body too large.');
      }
      const body = await readBody(req, config.bodyLimit);
      if (!object(body) || Object.keys(body).length !== 1 || !isGameState(body.state)) {
        throw new HttpError(400, 'Invalid game state.');
      }
      const state = body.state;
      const ending = path.endsWith('/ending');
      if (ending !== state.completed) throw new HttpError(400, 'Invalid game phase.');
      const currentDay = Math.floor(now() / 86400000);
      if (day !== currentDay) { day = currentDay; dailyAI = 0; }
      if (activeAI >= config.maxConcurrent || dailyAI >= config.maxDaily
        || now() - lastAI < config.intervalMs) {
        res.setHeader('Retry-After', String(Math.max(1, Math.ceil(config.intervalMs / 1000))));
        throw new HttpError(429, 'Generation limit reached.');
      }
      activeAI++;
      dailyAI++;
      lastAI = now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.generationTimeoutMs);
      res.once('close', () => controller.abort());
      const streaming = req.headers.accept === 'application/x-ndjson';
      const frame = (data: unknown) => {
        if (controller.signal.aborted || res.destroyed || res.writableEnded) return;
        if (!res.headersSent) {
          res.writeHead(200, { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' });
          res.flushHeaders();
        }
        // Disconnect slow consumers instead of accumulating an unbounded output queue.
        if (!res.write(JSON.stringify(data) + '\n')) controller.abort();
      };
      const onNarrative = streaming ? (text: string) => frame({ type: 'narrative', text }) : undefined;
      try {
        const result = await Promise.race([
          ending ? generation.ending(state, controller.signal, onNarrative) : generation.event(state, controller.signal, onNarrative),
          new Promise<never>((_done, reject) => {
            const cancelled = () => reject(new Error('Generation cancelled'));
            if (controller.signal.aborted) cancelled();
            else controller.signal.addEventListener('abort', cancelled, { once: true });
          }),
        ]);
        if (streaming) { frame({ type: 'result', value: result }); res.end(); }
        else reply(res, 200, result);
      } catch {
        // Never expose SDK errors, upstream bodies, tokens, or prompt/history data.
        if (res.headersSent) {
          if (!res.destroyed) res.end(JSON.stringify({ type: 'error' }) + '\n');
        } else reply(res, 502, { error: 'Generation unavailable. Please try again later.' });
      } finally {
        clearTimeout(timer);
        activeAI--;
      }
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'GET or HEAD required.');
    const relative = path === '/' || path === '/index.html' ? 'index.html'
      : /^\/assets\/[a-zA-Z0-9._-]+\.(js|css|svg|png|ico|woff2)$/.test(path) ? path.slice(1) : null;
    if (!relative) throw new HttpError(404, 'Not found.');
    let file: string;
    try {
      const root = await realpath(config.dist);
      file = await realpath(resolve(root, relative));
      if (!file.startsWith(root + sep)) throw new Error('Outside static root');
    } catch { throw new HttpError(404, 'Not found. Build the frontend first.'); }
    const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
      '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': relative === 'index.html' ? 'no-store' : 'private, max-age=31536000, immutable' });
    res.end(req.method === 'HEAD' ? undefined : data);
  }
  return server;
}
