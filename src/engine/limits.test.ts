import { describe, expect, it } from 'vitest';
import { PLAYER_STAT_KEYS, WORLD_STAT_KEYS } from './types';
import { createInitialState } from './state';
import { resolveAction } from './resolver';
import { STARTER_EVENTS } from './events';
import { getStatLimits } from './limits';
import { getEnding } from './endings';
import { isGameState } from './validation';
import { getLocalizedEnding } from '../i18n';
import { saveGame, loadSavedGame } from '../services/storage';

describe('status-limit endings', () => {
  for (const scope of ['player', 'world'] as const) {
    const keys = scope === 'player' ? PLAYER_STAT_KEYS : WORLD_STAT_KEYS;
    for (const key of keys) {
      it.each([0, 100])(`ends immediately when ${scope}.${key} reaches %s`, value => {
        const state = createInitialState(1, 5);
        const event = STARTER_EVENTS[0];
        const action = { ...event.actions[0], playerDelta: {}, worldDelta: {},
          [scope === 'player' ? 'playerDelta' : 'worldDelta']: { [key]: value === 0 ? -100 : 100 } };
        const next = resolveAction(state, event, action, { currentEvent: event });
        expect(next.completed).toBe(true);
        expect(next.history).toHaveLength(1);
        expect(next.world.turn).toBe(2);
        expect(next.maxTurns).toBe(5);
        expect(getStatLimits(next)).toEqual([{ scope, key, value }]);
        expect(isGameState(next)).toBe(true);
        const ending = getEnding(next);
        expect(ending.id).toBe('stat_limit');
        saveGame({ gameState: next, ending, displayedTurn: null, locale: 'en' });
        expect(loadSavedGame()?.ending).toEqual(ending);
        expect(loadSavedGame()?.gameState.completed).toBe(true);
        expect(isGameState({ ...next, completed: false })).toBe(false);
      });
    }
  }
  it('keeps going at 1 and 99 and ignores the turn counter as a status', () => {
    const state = createInitialState(1, 100);
    const event = STARTER_EVENTS[0];
    const next = resolveAction(state, event, { ...event.actions[0], playerDelta: { money: -49, energy: 49 }, worldDelta: {} }, { currentEvent: event });
    expect(next.completed).toBe(false);
    expect(getStatLimits({ ...next, world: { ...next.world, turn: 100 } })).toEqual([]);
  });
  it('emphasizes every simultaneous trigger in localized fallback endings', () => {
    const state = createInitialState(1, 5);
    state.player.money = 0;
    state.player.energy = 100;
    state.world.economy = 0;
    state.completed = true;
    const ending = getEnding(state);
    expect(ending.summary).toContain('money reached 0');
    const zh = getLocalizedEnding('zh', ending.id, ending.title, ending.summary, state);
    expect(zh.summary).toContain('金钱达到0');
    expect(zh.summary).toContain('精力达到100');
    expect(zh.summary).toContain('经济达到0');
  });
});
