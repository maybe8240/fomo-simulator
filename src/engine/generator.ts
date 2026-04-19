import { STARTER_EVENTS } from './events';
import { createRng, randomInt } from './rng';
import type { DisplayedTurn, Event, GameState } from './types';

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(index);
    hash |= 0;
  }

  return hash >>> 0;
}

function getTurnSeed(state: GameState): number {
  let seed = state.seed >>> 0;

  for (const entry of state.history) {
    seed ^= hashString(`${entry.turn}:${entry.eventId}:${entry.actionId}`);
    seed = Math.imul(seed ^ (seed >>> 16), 2246822507) >>> 0;
  }

  return seed;
}

function pickRandomEvent(
  events: Event[],
  rng: () => number,
  excludedIds: Set<string>,
): Event {
  const candidates = events.filter((event) => !excludedIds.has(event.id));
  const pool = candidates.length > 0 ? candidates : events;
  const index = randomInt(rng, 0, pool.length - 1);

  return pool[index];
}

export function generateTurnEvents(state: GameState): DisplayedTurn {
  const latestHistoryEntry = state.history[state.history.length - 1];
  const excludedIds = latestHistoryEntry
    ? new Set<string>([latestHistoryEntry.eventId])
    : new Set<string>();
  const rng = createRng(getTurnSeed(state));

  return {
    currentEvent: pickRandomEvent(STARTER_EVENTS, rng, excludedIds),
  };
}
