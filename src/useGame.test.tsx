import { StrictMode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { STARTER_EVENTS } from './engine/events';
import type { DisplayedTurn, Ending } from './engine/types';
import { createGameServices } from './services/game';
import type { GameServices } from './services/game';
import { loadSavedGame, saveGame } from './services/storage';
import { useGame } from './useGame';

const turn = (index = 0): DisplayedTurn => ({ currentEvent: STARTER_EVENTS[index], isAIGenerated: false });

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function choose(result: { current: ReturnType<typeof useGame> }) {
  const event = result.current.displayedTurn!.currentEvent;
  act(() => result.current.selectAction(event, event.actions[0]));
}

function services(): GameServices {
  return {
    aiEnabled: true, maxTurns: 5,
    generateTurn: vi.fn().mockResolvedValue(turn()),
    generateEnding: vi.fn().mockResolvedValue({ id: 'ai_generated', title: 'Ending', summary: 'Summary' }),
  };
}

describe('run lifecycle', () => {
  it('finishes an old unfinished save at a boundary without applying another choice', async () => {
    const state = createGameServices({ aiEnabled: false, maxTurns: 5 });
    const first = renderHook(() => useGame(state));
    choose(first.result);
    await waitFor(() => expect(first.result.current.displayedTurn).not.toBeNull());
    const saved = loadSavedGame()!;
    first.unmount();
    saved.gameState.player.energy = 0;
    saveGame(saved);
    const service = services();
    const resumed = renderHook(() => useGame(service));
    await waitFor(() => expect(resumed.result.current.ending).not.toBeNull());
    expect(resumed.result.current.gameState.completed).toBe(true);
    expect(resumed.result.current.gameState.history).toHaveLength(1);
    expect(resumed.result.current.gameState.world.turn).toBe(2);
    expect(service.generateTurn).not.toHaveBeenCalled();
    expect(service.generateEnding).toHaveBeenCalledTimes(1);
  });
  it('requests an ending immediately after a stat limit and restores it on reload', async () => {
    const service = services();
    const event = { ...STARTER_EVENTS[0], actions: STARTER_EVENTS[0].actions.map(action => ({ ...action, playerDelta: { energy: -100 }, worldDelta: {} })) };
    service.generateTurn = vi.fn().mockResolvedValue({ currentEvent: event, isAIGenerated: true });
    const first = renderHook(() => useGame(service));
    await waitFor(() => expect(first.result.current.displayedTurn).not.toBeNull());
    choose(first.result);
    await waitFor(() => expect(first.result.current.ending).not.toBeNull());
    expect(service.generateTurn).toHaveBeenCalledTimes(1);
    expect(service.generateEnding).toHaveBeenCalledTimes(1);
    expect(first.result.current.gameState.world.turn).toBe(2);
    first.unmount();
    const secondService = services();
    const second = renderHook(() => useGame(secondService));
    expect(second.result.current.gameState.completed).toBe(true);
    expect(second.result.current.ending).not.toBeNull();
    expect(secondService.generateTurn).not.toHaveBeenCalled();
    expect(secondService.generateEnding).not.toHaveBeenCalled();
  });
  it('generates a fresh Chinese ending after switching a completed run', async () => {
    const service = services();
    service.maxTurns = 1;
    const { result } = renderHook(() => useGame(service));
    await waitFor(() => expect(result.current.displayedTurn).not.toBeNull());
    choose(result);
    await waitFor(() => expect(result.current.ending?.generatedLocale).toBe('en'));
    act(() => result.current.setLocale('zh'));
    await waitFor(() => expect(result.current.ending?.generatedLocale).toBe('zh'));
    expect(vi.mocked(service.generateEnding).mock.calls[1][3]).toBe('zh');
    expect(result.current.gameState.history).toHaveLength(1);
  });
  it('regenerates unplayed AI events in Chinese without applying actions or accepting stale English', async () => {
    const old = deferred<DisplayedTurn>();
    const chinese = deferred<DisplayedTurn>();
    const service = services();
    service.generateTurn = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(chinese.promise);
    const { result } = renderHook(() => useGame(service));
    await waitFor(() => expect(service.generateTurn).toHaveBeenCalledTimes(1));
    const oldSignal = vi.mocked(service.generateTurn).mock.calls[0][1];
    act(() => result.current.setLocale('zh'));
    await waitFor(() => expect(service.generateTurn).toHaveBeenCalledTimes(2));
    expect(oldSignal.aborted).toBe(true);
    expect(vi.mocked(service.generateTurn).mock.calls[1][3]).toBe('zh');
    await act(async () => old.resolve({ ...turn(), isAIGenerated: true }));
    expect(result.current.displayedTurn).toBeNull();
    await act(async () => chinese.resolve({ ...turn(1), isAIGenerated: true }));
    expect(result.current.displayedTurn?.generatedLocale).toBe('zh');
    expect(result.current.gameState.history).toHaveLength(0);
    expect(loadSavedGame()?.displayedTurn?.generatedLocale).toBe('zh');
  });
  it('replaces an already displayed AI event after a language change', async () => {
    const service = services();
    service.generateTurn = vi.fn().mockResolvedValue({ ...turn(), isAIGenerated: true });
    const { result } = renderHook(() => useGame(service));
    await waitFor(() => expect(result.current.displayedTurn?.generatedLocale).toBe('en'));
    act(() => result.current.setLocale('zh'));
    await waitFor(() => expect(result.current.displayedTurn?.generatedLocale).toBe('zh'));
    expect(service.generateTurn).toHaveBeenCalledTimes(2);
    expect(result.current.gameState.world.turn).toBe(1);
  });
  it('keeps a saved run length when the current configuration changes', async () => {
    const firstService = services();
    firstService.maxTurns = 1;
    const first = renderHook(() => useGame(firstService));
    await waitFor(() => expect(first.result.current.displayedTurn).not.toBeNull());
    first.unmount();
    const changed = services();
    changed.maxTurns = 5;
    const resumed = renderHook(() => useGame(changed));
    choose(resumed.result);
    await waitFor(() => expect(resumed.result.current.ending).not.toBeNull());
    expect(resumed.result.current.gameState.history).toHaveLength(1);
    expect(resumed.result.current.gameState.maxTurns).toBe(1);
  });
  it('starts one request in Strict Mode and one per restart, retaining language', async () => {
    const service = services();
    const { result } = renderHook(() => useGame(service), { wrapper: StrictMode });
    await waitFor(() => expect(result.current.displayedTurn).not.toBeNull());
    expect(service.generateTurn).toHaveBeenCalledTimes(1);
    act(() => result.current.setLocale('zh'));
    act(() => result.current.restart());
    await waitFor(() => expect(service.generateTurn).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.isGenerating).toBe(false));
    expect(result.current.locale).toBe('zh');
  });

  it('ignores an old event response after restart even when transport ignores abort', async () => {
    const old = deferred<DisplayedTurn>();
    const fresh = deferred<DisplayedTurn>();
    const service = services();
    service.generateTurn = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
    const { result } = renderHook(() => useGame(service));
    await waitFor(() => expect(service.generateTurn).toHaveBeenCalledTimes(1));
    const oldSignal = vi.mocked(service.generateTurn).mock.calls[0][1];
    const oldPreview = vi.mocked(service.generateTurn).mock.calls[0][2]!;
    act(() => oldPreview('Partial story'));
    expect(result.current.narrative).toBe('Partial story');
    expect(loadSavedGame()?.displayedTurn).toBeNull();
    expect(JSON.stringify(loadSavedGame())).not.toContain('Partial story');
    act(() => result.current.restart());
    await waitFor(() => expect(service.generateTurn).toHaveBeenCalledTimes(2));
    expect(oldSignal.aborted).toBe(true);
    act(() => oldPreview('Stale story'));
    expect(result.current.narrative).toBe('');
    await act(async () => { fresh.resolve(turn(1)); });
    await act(async () => { old.resolve(turn(2)); });
    expect(result.current.displayedTurn?.currentEvent.id).toBe(STARTER_EVENTS[1].id);
    expect(result.current.gameState.history).toHaveLength(0);
  });

  it('persists a pending turn and resumes it after refresh without replaying the action', async () => {
    const pending = deferred<DisplayedTurn>();
    const service = services();
    service.generateTurn = vi.fn().mockResolvedValueOnce(turn()).mockReturnValueOnce(pending.promise);
    const first = renderHook(() => useGame(service));
    await waitFor(() => expect(first.result.current.displayedTurn).not.toBeNull());
    const event = first.result.current.displayedTurn!.currentEvent;
    act(() => {
      first.result.current.selectAction(event, event.actions[0]);
      first.result.current.selectAction(event, event.actions[0]);
    });
    await waitFor(() => expect(service.generateTurn).toHaveBeenCalledTimes(2));
    expect(loadSavedGame()?.displayedTurn).toBeNull();
    expect(loadSavedGame()?.gameState.history).toHaveLength(1);
    first.unmount();
    const resumedService = services();
    resumedService.generateTurn = vi.fn().mockResolvedValue(turn(1));
    const resumed = renderHook(() => useGame(resumedService));
    await waitFor(() => expect(resumed.result.current.isGenerating).toBe(false));
    expect(resumed.result.current.gameState.world.turn).toBe(2);
    expect(resumed.result.current.gameState.player.money).toBe(54);
    expect(vi.mocked(resumedService.generateTurn).mock.calls[0][0].history).toHaveLength(1);
    await act(async () => { pending.resolve(turn(2)); });
    expect(resumed.result.current.displayedTurn?.currentEvent.id).toBe(STARTER_EVENTS[1].id);
  });

  it('ignores an old ending after restart', async () => {
    const pending = deferred<Ending>();
    const service = services();
    service.maxTurns = 1;
    service.generateEnding = vi.fn().mockReturnValue(pending.promise);
    const { result } = renderHook(() => useGame(service));
    await waitFor(() => expect(result.current.displayedTurn).not.toBeNull());
    choose(result);
    await waitFor(() => expect(service.generateEnding).toHaveBeenCalledTimes(1));
    act(() => result.current.restart());
    await waitFor(() => expect(result.current.isGenerating).toBe(false));
    await act(async () => { pending.resolve({ id: 'ai_generated', title: 'Old ending', summary: 'Old' }); });
    expect(result.current.ending).toBeNull();
    expect(result.current.gameState.completed).toBe(false);
  });

  it('reloads a completed ending without generating again', async () => {
    const service = createGameServices({ aiEnabled: false, maxTurns: 1 });
    const first = renderHook(() => useGame(service));
    choose(first.result);
    await waitFor(() => expect(first.result.current.ending).not.toBeNull());
    const saved = loadSavedGame()!;
    first.unmount();
    saveGame(saved);
    const reloaded = services();
    const second = renderHook(() => useGame(reloaded));
    expect(second.result.current.ending).toEqual(saved.ending);
    expect(reloaded.generateTurn).not.toHaveBeenCalled();
    expect(reloaded.generateEnding).not.toHaveBeenCalled();
  });

  it('falls back if an injected service rejects', async () => {
    const service = services();
    service.generateTurn = vi.fn().mockRejectedValue(new Error('unavailable'));
    const first = renderHook(() => useGame(service));
    await waitFor(() => expect(first.result.current.displayedTurn).not.toBeNull());
    first.unmount();
    expect(vi.mocked(service.generateTurn).mock.calls[0][1].aborted).toBe(true);
  });

  it('aborts a pending opening when unmounted', async () => {
    const pending = deferred<DisplayedTurn>();
    const service = services();
    service.generateTurn = vi.fn().mockReturnValue(pending.promise);
    const { unmount } = renderHook(() => useGame(service));
    await waitFor(() => expect(service.generateTurn).toHaveBeenCalledTimes(1));
    const signal = vi.mocked(service.generateTurn).mock.calls[0][1];
    expect(signal.aborted).toBe(false);
    unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => { pending.resolve(turn()); });
  });
});
