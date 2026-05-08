import type { Locale } from '../i18n';
import type { DisplayedTurn, Ending, GameState } from '../engine/types';

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
    isObject(value.player) &&
    isObject(value.world) &&
    Array.isArray(value.history) &&
    typeof value.seed === 'number' &&
    typeof value.completed === 'boolean'
  );
}

function isValidDisplayedTurn(value: unknown): value is DisplayedTurn | null {
  if (value === null) {
    return true;
  }

  return isObject(value) && isObject(value.currentEvent) && 'isAIGenerated' in value;
}

function isValidEnding(value: unknown): value is Ending | null {
  if (value === null) {
    return true;
  }

  return isObject(value) && typeof value.id === 'string' && typeof value.title === 'string' && typeof value.summary === 'string';
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
  if (typeof window === 'undefined' || !window.localStorage) {
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
  if (typeof window === 'undefined' || !window.localStorage) {
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
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage removal failures so gameplay continues normally.
  }
}
