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
 it('sends only game state to the event endpoint and accepts a validated turn', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response(turn));
  expect(await services(fetcher).generateTurn(state, signal())).toEqual(turn);
  const [url, init] = fetcher.mock.calls[0];
  expect(url).toBe('/api/game/event');
  expect(init?.credentials).toBe('same-origin');
  expect(JSON.parse(String(init?.body))).toEqual({state});
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
  const pending=services(fetcher).generateTurn(state,controller.signal);
  controller.abort();
  expect((await pending).isAIGenerated).toBe(false);
  expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
 });
 it('bounds browser waiting time',async()=>{
  vi.useFakeTimers();
  try {
   const fetcher=vi.fn<typeof fetch>().mockImplementation((_url,init)=>new Promise((_resolve,reject)=>{
    init?.signal?.addEventListener('abort',()=>reject(new Error('timeout')),{once:true});
   }));
   const pending=services(fetcher).generateTurn(state,signal());
   await vi.advanceTimersByTimeAsync(40_000);
   expect((await pending).isAIGenerated).toBe(false);
   expect(vi.getTimerCount()).toBe(0);
  } finally {vi.useRealTimers();}
 });
});
