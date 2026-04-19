import type { GameState, PlayerState, WorldState } from './types';

export function createInitialPlayerState(): PlayerState {
  return {
    money: 50,
    skill_ai: 50,
    network: 50,
    energy: 50,
    curiosity: 50,
    chaos: 50,
  };
}

export function createInitialWorldState(): WorldState {
  return {
    ai_hype: 50,
    economy: 50,
    turn: 1,
  };
}

export function createInitialState(seed = Date.now()): GameState {
  return {
    player: createInitialPlayerState(),
    world: createInitialWorldState(),
    history: [],
    seed,
    completed: false,
  };
}
