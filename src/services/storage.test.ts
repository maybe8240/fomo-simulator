import { describe, expect, it, vi } from 'vitest';
import { STARTER_EVENTS } from '../engine/events';
import { createInitialState } from '../engine/state';
import { resolveAction } from '../engine/resolver';
import { loadSavedGame, saveGame, STORAGE_KEY } from './storage';

function saveFixture() {
  return { gameState: createInitialState(123), locale: 'en' as const,
    displayedTurn: { currentEvent: STARTER_EVENTS[0], isAIGenerated: false }, ending: null };
}

describe('versioned saves', () => {
  it.each([{ fr: {} }, { en: null }, { en: { generatedLocale: 'zh' } }, { en: { generatedLocale: 'en', currentEvent: {} } }])(
    'rejects malformed language caches %j', variants => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...saveFixture(), turnVariants: variants }));
      expect(loadSavedGame()).toBeNull();
    });
  it('round-trips the displayed event and language', () => {
    const save = saveFixture();
    saveGame(save);
    expect(loadSavedGame()).toEqual({ version: 1, ...save });
  });

  it('round-trips a pending next turn without restoring the previous event', () => {
    const save = saveFixture();
    const event = save.displayedTurn.currentEvent;
    const gameState = resolveAction(save.gameState, event, event.actions[0], save.displayedTurn);
    saveGame({ ...save, gameState, displayedTurn: null });
    expect(loadSavedGame()?.displayedTurn).toBeNull();
    expect(loadSavedGame()?.gameState.world.turn).toBe(2);
  });

  it.each([
    (save: ReturnType<typeof saveFixture> & { version: number }) => { save.version = 99; },
    (save: ReturnType<typeof saveFixture>) => { save.gameState.player.money = -1; },
    (save: ReturnType<typeof saveFixture>) => { save.gameState.world.turn = 2; },
    (save: ReturnType<typeof saveFixture>) => { save.displayedTurn.currentEvent = {
      ...save.displayedTurn.currentEvent, actions: [] }; },
  ])('discards incompatible or malformed saves (%#)', (corrupt) => {
    const save = structuredClone({ version: 1, ...saveFixture() });
    corrupt(save);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    expect(loadSavedGame()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('discards invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{');
    expect(loadSavedGame()).toBeNull();
  });

  it('continues when browser storage is unavailable', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('Storage disabled');
    });
    expect(() => saveGame(saveFixture())).not.toThrow();
    expect(loadSavedGame()).toBeNull();
    vi.restoreAllMocks();
  });
});
