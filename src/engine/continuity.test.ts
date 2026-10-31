import { describe, expect, it } from 'vitest';
import { createInitialState } from './state';
import { STARTER_EVENTS } from './events';
import { resolveAction } from './resolver';
import { isGameState } from './validation';
import { getLocalizedHistoryEntry } from '../i18n';
import { saveGame, loadSavedGame, STORAGE_KEY } from '../services/storage';

function run() {
  const event = { ...STARTER_EVENTS[0], id: 'ai-custom', description: 'An unpaid invoice remains.' };
  return resolveAction(createInitialState(1, 3), event, event.actions[2], { currentEvent: event });
}

describe('persisted story continuity', () => {
  it('saves narrative details and the real action type, preserving run length', () => {
    const state = run();
    expect(state.history[0]).toMatchObject({ actionType: 'absurd', eventDescription: 'An unpaid invoice remains.',
      actionFlavor: STARTER_EVENTS[0].actions[2].flavor });
    saveGame({ gameState: state, displayedTurn: null, ending: null, locale: 'en' });
    expect(loadSavedGame()?.gameState).toEqual(state);
    expect(isGameState(state)).toBe(true);
    expect(getLocalizedHistoryEntry('en', state.history[0]).resultText).toContain('absurd option');
    expect(getLocalizedHistoryEntry('zh', state.history[0]).resultText).toContain('荒诞');
  });
  it('reads old saves without inventing safe types or scene details', () => {
    const state = run();
    delete state.maxTurns;
    delete state.history[0].actionType;
    delete state.history[0].eventDescription;
    delete state.history[0].actionFlavor;
    saveGame({ gameState: state, displayedTurn: null, ending: null, locale: 'en' });
    expect(loadSavedGame()?.gameState).toEqual(state);
    expect(getLocalizedHistoryEntry('en', state.history[0]).resultText).toContain('You chose the option');
    expect(getLocalizedHistoryEntry('zh', state.history[0]).resultText).not.toContain('稳妥');
  });
  it.each(['actionType', 'eventDescription', 'actionFlavor', 'maxTurns', 'phase'])(
    'rejects malformed optional context at both storage and HTTP boundaries: %s', field => {
      const state = run();
      if (field === 'maxTurns') state.maxTurns = 101;
      else if (field === 'phase') state.maxTurns = 1;
      else Object.assign(state.history[0], { [field]: field === 'actionType' ? 'unknown' : 'x'.repeat(6001) });
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, gameState: state, displayedTurn: null, ending: null, locale: 'en' }));
      expect(isGameState(state)).toBe(false);
      expect(loadSavedGame()).toBeNull();
    });
  it('bounds scene excerpts without losing the full displayed event', () => {
    const event = { ...STARTER_EVENTS[0], description: 'x'.repeat(6000) };
    const state = resolveAction(createInitialState(1), event, event.actions[0], { currentEvent: event });
    expect(state.history[0].eventDescription).toHaveLength(1600);
    expect(event.description).toHaveLength(6000);
  });
});
