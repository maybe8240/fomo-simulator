import { describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../engine/state';
import { STARTER_EVENTS } from '../engine/events';
import { createGameServices } from './game';
const state = createInitialState(123);
const signal = () => new AbortController().signal;
const services = (fetcher: typeof fetch, enabled = true) => createGameServices({ aiEnabled: enabled, maxTurns: 5 }, fetcher);
const turn = { currentEvent: STARTER_EVENTS[0], isAIGenerated: true };
const response = (value: unknown) => new Response(JSON.stringify(value), { status: 200 });
describe('same-origin generation', () => {
 it.each(['http','stream','gateway'])('reports a %s timeout while retaining static fallback', async source => {
  const value = source === 'stream'
   ? new Response('{"type":"error","code":"GENERATION_TIMEOUT"}\n', { headers: { 'content-type': 'application/x-ndjson' } })
   : new Response(JSON.stringify({ code: 'GENERATION_TIMEOUT' }), { status: source === 'gateway' ? 504 : 502 });
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(value);
  const onTimeout = vi.fn();
  expect((await services(fetcher).generateTurn(state, signal(), undefined, 'en', onTimeout)).isAIGenerated).toBe(false);
  expect(onTimeout).toHaveBeenCalledOnce();
 });
 it('passes Chinese as a bounded locale setting for events and endings', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response(turn));
  await services(fetcher).generateTurn(state, signal(), undefined, 'zh');
  await services(fetcher).generateEnding(state, signal(), undefined, 'zh');
  expect(fetcher.mock.calls.map(([,init]) => JSON.parse(String(init?.body)).locale)).toEqual(['zh','zh']);
 });
 it('delivers narrative before the final result across split UTF-8 chunks', async () => {
  let output!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({ start(controller) { output = controller; } });
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { headers: { 'content-type': 'application/x-ndjson' } }));
  const preview = vi.fn();
  const pending = services(fetcher).generateTurn(state, signal(), preview);
  const bytes = new TextEncoder().encode(JSON.stringify({ type: 'narrative', text: 'Hello 世界' }) + '\n');
  for (const byte of bytes) output.enqueue(new Uint8Array([byte]));
  await vi.waitFor(() => expect(preview).toHaveBeenCalledWith('Hello 世界'));
  output.enqueue(new TextEncoder().encode(JSON.stringify({ type: 'result', value: turn }) + '\n'));
  output.close();
  expect(await pending).toEqual(turn);
 });
 it.each(['', '{"type":"error"}\n', '{"type":"result","value":{}}\n'])(
  'falls back when a stream ends or fails without valid gameplay: %s', async suffix => {
   const body = JSON.stringify({ type: 'narrative', text: 'Draft' }) + '\n' + suffix;
   const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { headers: { 'content-type': 'application/x-ndjson' } }));
   expect((await services(fetcher).generateTurn(state, signal(), vi.fn())).isAIGenerated).toBe(false);
  });
 it('cancels a stalled response body even when the injected fetch ignores abort', async () => {
  const cancelled = vi.fn();
  const body = new ReadableStream<Uint8Array>({ cancel: cancelled });
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { headers: { 'content-type': 'application/x-ndjson' } }));
  const controller = new AbortController();
  const pending = services(fetcher).generateTurn(state, controller.signal, vi.fn());
  await Promise.resolve();
  controller.abort();
  expect((await pending).isAIGenerated).toBe(false);
  expect(cancelled).toHaveBeenCalled();
 });
 it('sends game state and locale to the event endpoint and accepts a validated turn', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response(turn));
  expect(await services(fetcher).generateTurn(state, signal())).toEqual(turn);
  const [url, init] = fetcher.mock.calls[0];
  expect(url).toBe('/api/game/event');
  expect(init?.credentials).toBe('same-origin');
  expect(JSON.parse(String(init?.body))).toEqual({state,locale:'en'});
  expect(new Headers(init?.headers).has('x-api-key')).toBe(false);
  expect(new Headers(init?.headers).has('authorization')).toBe(false);
 });
 it('accepts a server ending', async () => {
  const ending={id:'ai_generated',title:'A Life',summary:'An ending.'};
  const fetcher=vi.fn<typeof fetch>().mockResolvedValue(response(ending));
  expect(await services(fetcher).generateEnding(state,signal())).toEqual(ending);
  expect(fetcher.mock.calls[0][0]).toBe('/api/game/ending');
 });
 it.each([401,403,429,500,502])('falls back on HTTP %s', async status=>{
  const fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response('',{status}));
  expect((await services(fetcher).generateTurn(state,signal())).isAIGenerated).toBe(false);
  expect((await services(fetcher).generateEnding(state,signal())).id).toBe('stable_generalist');
 });
 it.each([null,{}, {currentEvent:{},isAIGenerated:true}])('rejects malformed success responses %j',async value=>{
  const fetcher=vi.fn<typeof fetch>().mockResolvedValue(response(value));
  expect((await services(fetcher).generateTurn(state,signal())).isAIGenerated).toBe(false);
 });
 it('falls back on network and JSON errors',async()=>{
  const fetcher=vi.fn<typeof fetch>().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(new Response('{'));
  expect((await services(fetcher).generateTurn(state,signal())).isAIGenerated).toBe(false);
  expect((await services(fetcher).generateEnding(state,signal())).id).toBe('stable_generalist');
 });
 it('never contacts the server in static mode',async()=>{
  const fetcher=vi.fn<typeof fetch>();
  await services(fetcher,false).generateTurn(state,signal());
  await services(fetcher,false).generateEnding(state,signal());
  expect(fetcher).not.toHaveBeenCalled();
 });
 it('propagates cancellation and returns a static fallback',async()=>{
  const controller=new AbortController();
  const fetcher=vi.fn<typeof fetch>().mockImplementation((_url,init)=>new Promise((_resolve,reject)=>{
   init?.signal?.addEventListener('abort',()=>reject(new Error('aborted')),{once:true});
  }));
  const onTimeout = vi.fn();
  const pending=services(fetcher).generateTurn(state,controller.signal,undefined,'en',onTimeout);
  controller.abort();
  expect((await pending).isAIGenerated).toBe(false);
  expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
  expect(onTimeout).not.toHaveBeenCalled();
 });
 it('bounds browser waiting time',async()=>{
  vi.useFakeTimers();
  try {
   const fetcher=vi.fn<typeof fetch>().mockImplementation((_url,init)=>new Promise((_resolve,reject)=>{
    init?.signal?.addEventListener('abort',()=>reject(new Error('timeout')),{once:true});
   }));
   const onTimeout = vi.fn();
   const pending=services(fetcher).generateTurn(state,signal(),undefined,'en',onTimeout);
   await vi.advanceTimersByTimeAsync(40_000);
   expect((await pending).isAIGenerated).toBe(false);
   expect(vi.getTimerCount()).toBe(0);
   expect(onTimeout).toHaveBeenCalledOnce();
  } finally {vi.useRealTimers();}
 });
});
