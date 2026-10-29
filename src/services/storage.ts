import type { Locale } from '../i18n';
import type { DisplayedTurn, Ending, GameState } from '../engine/types';
import { PLAYER_STAT_KEYS, WORLD_STAT_KEYS } from '../engine/types';

export const STORAGE_KEY = 'fomo-simulator-save';
const STORAGE_VERSION = 1;

export type PersistedGame = {
  version: number;
  gameState: GameState;
  displayedTurn: DisplayedTurn | null;
  locale: Locale;
  ending: Ending | null;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isValidLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'zh';
}

function isValidGameState(value: unknown): value is GameState {
  if (!isObject(value)) {
    return false;
  }

  return (
    isValidStats(value.player, PLAYER_STAT_KEYS) &&
    isValidStats(value.world, WORLD_STAT_KEYS) &&
    Number.isSafeInteger(value.world.turn) && Number(value.world.turn) >= 1 &&
    Array.isArray(value.history) && value.history.every(isValidHistoryEntry) &&
    value.history.length === Number(value.world.turn) - 1 &&
    value.history.every((entry, index) => entry.turn === index + 1) &&
    typeof value.seed === 'number' && Number.isSafeInteger(value.seed) &&
    typeof value.completed === 'boolean'
  );
}

function isValidStats(value: unknown, keys: readonly string[]): value is Record<string, number> {
  return isObject(value) && keys.every((key) =>
    typeof value[key] === 'number' && Number.isFinite(value[key])
    && Number(value[key]) >= 0 && Number(value[key]) <= 100);
}

function isValidHistoryEntry(value: unknown): value is GameState['history'][number] {
  return isObject(value) && Number.isSafeInteger(value.turn)
    && ['eventId', 'eventTitle', 'actionId', 'actionLabel', 'resultText']
      .every((key) => typeof value[key] === 'string')
    && Array.isArray(value.missedPathsText)
    && value.missedPathsText.every((text) => typeof text === 'string');
}

function isValidDelta(value: unknown, keys: readonly string[]): boolean {
  return isObject(value) && Object.entries(value).every(([key, delta]) =>
    keys.includes(key) && typeof delta === 'number' && Number.isFinite(delta));
}

function isValidDisplayedTurn(value: unknown): value is DisplayedTurn | null {
  if (value === null) {
    return true;
  }

  if (!isObject(value) || !isObject(value.currentEvent)) return false;
  const event = value.currentEvent;
  return (value.isAIGenerated === undefined || typeof value.isAIGenerated === 'boolean')
    && ['id', 'title', 'description'].every((key) => typeof event[key] === 'string')
    && Array.isArray(event.actions) && event.actions.length === 3
    && event.actions.every((action) => isObject(action)
      && ['id', 'label', 'flavor'].every((key) => typeof action[key] === 'string')
      && ['safe', 'risky', 'absurd'].includes(String(action.type))
      && isValidDelta(action.playerDelta, PLAYER_STAT_KEYS)
      && isValidDelta(action.worldDelta, WORLD_STAT_KEYS))
    && new Set(event.actions.map((action) => action.type)).size === 3
    && new Set(event.actions.map((action) => action.id)).size === 3;
}

function isValidEnding(value: unknown): value is Ending | null {
  if (value === null) {
    return true;
  }

  return isObject(value)
    && ['quiet_specialist', 'stable_generalist', 'chaotic_innovator', 'connected_builder',
      'delightfully_strange_person', 'ai_generated'].includes(String(value.id))
    && typeof value.title === 'string' && typeof value.summary === 'string';
}

function isValidPersistedGame(value: unknown): value is PersistedGame {
  if (!isObject(value)) {
    return false;
  }

  return (
    value.version === STORAGE_VERSION &&
    isValidGameState(value.gameState) &&
    isValidDisplayedTurn(value.displayedTurn) &&
    isValidLocale(value.locale) &&
    isValidEnding(value.ending)
  );
}

export function loadSavedGame(): PersistedGame | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);

    if (!isValidPersistedGame(parsed)) {
      clearSavedGame();
      return null;
    }

    return parsed;
  } catch {
    clearSavedGame();
    return null;
  }
}

export function saveGame(data: Omit<PersistedGame, 'version'>): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const payload: PersistedGame = {
      version: STORAGE_VERSION,
      ...data,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage write failures so gameplay continues normally.
  }
}

export function clearSavedGame(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage removal failures so gameplay continues normally.
  }
}
