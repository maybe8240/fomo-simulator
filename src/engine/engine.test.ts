import { describe, expect, it } from 'vitest';
import { getEnding } from './endings';
import { STARTER_EVENTS } from './events';
import { generateTurnEvents } from './generator';
import { resolveAction } from './resolver';
import { createInitialState } from './state';
import { parseMaxTurns } from '../services/config';

describe('static game rules', () => {
  it('applies a choice without mutating the original and records alternatives', () => {
    const state = createInitialState(123);
    const event = STARTER_EVENTS[0];
    const next = resolveAction(state, event, event.actions[0], { currentEvent: event });
    expect(state.world.turn).toBe(1);
    expect(state.history).toEqual([]);
    expect(next.player).toEqual({ money: 54, skill_ai: 50, network: 56,
      energy: 45, curiosity: 49, chaos: 50 });
    expect(next.world).toEqual({ ai_hype: 52, economy: 51, turn: 2 });
    expect(next.history[0].missedPathsText).toHaveLength(2);
  });

  it('clamps player and world stats and completes on the configured final action', () => {
    const state = createInitialState(123);
    const event = STARTER_EVENTS[0];
    const action = { ...event.actions[0], playerDelta: { money: 500, energy: -500 },
      worldDelta: { ai_hype: 500, economy: -500 } };
    const next = resolveAction(state, event, action, { currentEvent: event }, 1);
    expect(next.player.money).toBe(100);
    expect(next.player.energy).toBe(0);
    expect(next.world).toEqual({ ai_hype: 100, economy: 0, turn: 2 });
    expect(next.completed).toBe(true);
  });

  it('replays a complete seeded game with no immediate event repeats', () => {
    const play = () => {
      let state = createInitialState(42);
      while (!state.completed) {
        const turn = generateTurnEvents(state);
        expect(turn.currentEvent.id).not.toBe(state.history[state.history.length - 1]?.eventId);
        state = resolveAction(state, turn.currentEvent, turn.currentEvent.actions[0], turn);
      }
      return state;
    };
    const state = play();
    expect(play()).toEqual(state);
    expect(state.history).toHaveLength(5);
    expect(state.world.turn).toBe(6);
  });

  it.each([
    [{ curiosity: 70, chaos: 75, network: 80 }, 'delightfully_strange_person'],
    [{ chaos: 75, network: 80 }, 'chaotic_innovator'],
    [{ network: 75, skill_ai: 80 }, 'connected_builder'],
    [{ skill_ai: 75, chaos: 59 }, 'quiet_specialist'],
    [{ skill_ai: 75, chaos: 60 }, 'stable_generalist'],
  ] as const)('selects the ordered ending for %j', (player, id) => {
    const state = createInitialState(42);
    expect(getEnding({ ...state, player: { ...state.player, ...player } }).id).toBe(id);
  });

  it.each(['', '0', '-1', '1.5', '101', 'Infinity', 'nope', undefined])(
    'uses five turns for invalid configuration %s', (value) => {
      expect(parseMaxTurns(value)).toBe(5);
    });

  it('accepts an explicit positive integer turn limit', () => {
    expect(parseMaxTurns('20')).toBe(20);
  });
});
