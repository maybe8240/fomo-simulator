import { PLAYER_STAT_KEYS, WORLD_STAT_KEYS } from './types.ts';
import type { GameState, StatKey, WorldStatKey } from './types.ts';

export type StatLimit = { scope: 'player'; key: StatKey; value: number }
  | { scope: 'world'; key: WorldStatKey; value: number };

export function getStatLimits(state: Pick<GameState, 'player' | 'world'>): StatLimit[] {
  const limits: StatLimit[] = [];
  for (const key of PLAYER_STAT_KEYS) {
    const value = state.player[key];
    if (value <= 0 || value >= 100) limits.push({ scope: 'player', key, value });
  }
  for (const key of WORLD_STAT_KEYS) {
    const value = state.world[key];
    if (value <= 0 || value >= 100) limits.push({ scope: 'world', key, value });
  }
  return limits;
}
