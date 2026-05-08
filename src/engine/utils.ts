import { PLAYER_STAT_KEYS, WORLD_STAT_KEYS } from './types';
import type { PlayerDelta, PlayerState, WorldDelta, WorldState } from './types';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function clampStat(value: number): number {
  return clamp(value, 0, 100);
}

export function getMaxTurns(): number {
  const turns = Number(import.meta.env.VITE_TURNS);
  return turns > 0 ? turns : 5;
}

export function applyPlayerDelta(
  player: PlayerState,
  delta: PlayerDelta,
): PlayerState {
  const nextPlayer = { ...player };

  for (const key of PLAYER_STAT_KEYS) {
    nextPlayer[key] = clampStat(player[key] + (delta[key] ?? 0));
  }

  return nextPlayer;
}

export function applyWorldDelta(world: WorldState, delta: WorldDelta): WorldState {
  const nextWorld = { ...world };

  for (const key of WORLD_STAT_KEYS) {
    nextWorld[key] = clampStat(world[key] + (delta[key] ?? 0));
  }

  return nextWorld;
}
