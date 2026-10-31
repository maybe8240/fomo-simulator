import { PLAYER_STAT_KEYS, WORLD_STAT_KEYS } from './types.ts';
import type { DisplayedTurn, Ending, GameState } from './types.ts';

export function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function validGeneratedLocale(value: Record<string, unknown>): boolean {
  return value.generatedLocale === undefined || value.generatedLocale === 'en' || value.generatedLocale === 'zh';
}
export function text(value: unknown, max = 1600): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}
export function validHistoryContext(value: Record<string, unknown>): boolean {
  return (value.actionType === undefined || (typeof value.actionType === 'string'
    && ['safe', 'risky', 'absurd'].includes(value.actionType)))
    && (value.eventDescription === undefined || (typeof value.eventDescription === 'string' && value.eventDescription.length <= 1600))
    && (value.actionFlavor === undefined || (typeof value.actionFlavor === 'string' && value.actionFlavor.length <= 400));
}
export function validRunLength(value: Record<string, unknown>): boolean {
  return value.maxTurns === undefined || (Number.isSafeInteger(value.maxTurns)
    && Number(value.maxTurns) >= 1 && Number(value.maxTurns) <= 100
    && object(value.world) && Number(value.world.turn) <= Number(value.maxTurns) + 1
    && value.completed === (Number(value.world.turn) === Number(value.maxTurns) + 1));
}
function stats(value: unknown, keys: readonly string[]): boolean {
  return object(value) && keys.every((key) => typeof value[key] === 'number'
    && Number.isFinite(value[key]) && Number(value[key]) >= 0 && Number(value[key]) <= 100);
}
function delta(value: unknown, keys: readonly string[]): boolean {
  return object(value) && Object.entries(value).every(([key, number]) => keys.includes(key)
    && typeof number === 'number' && Number.isFinite(number) && Math.abs(number) <= 100);
}
export function isGameState(value: unknown): value is GameState {
  if (!object(value) || !object(value.world) || !Array.isArray(value.history)) return false;
  return validRunLength(value) && stats(value.player, PLAYER_STAT_KEYS) && stats(value.world, WORLD_STAT_KEYS)
    && Number.isSafeInteger(value.world.turn) && Number(value.world.turn) >= 1
    && Number(value.world.turn) <= 101 && value.history.length === Number(value.world.turn) - 1
    && typeof value.seed === 'number' && Number.isSafeInteger(value.seed)
    && typeof value.completed === 'boolean'
    && value.history.every((entry, index) => object(entry) && validHistoryContext(entry) && entry.turn === index + 1
      && text(entry.eventId, 160) && text(entry.actionId, 160)
      && text(entry.eventTitle) && text(entry.actionLabel) && text(entry.resultText, 4000)
      && Array.isArray(entry.missedPathsText) && entry.missedPathsText.length <= 2
      && entry.missedPathsText.every((line) => text(line, 4000)));
}
export function isDisplayedTurn(value: unknown): value is DisplayedTurn {
  if (!object(value) || !validGeneratedLocale(value) || typeof value.isAIGenerated !== 'boolean' || !object(value.currentEvent)) return false;
  const event = value.currentEvent;
  return text(event.id, 160) && text(event.title) && text(event.description, 6000)
    && Array.isArray(event.actions) && event.actions.length === 3
    && event.actions.every((action) => object(action) && text(action.id, 160)
      && text(action.label) && text(action.flavor, 4000)
      && ['safe', 'risky', 'absurd'].includes(String(action.type))
      && delta(action.playerDelta, PLAYER_STAT_KEYS) && delta(action.worldDelta, WORLD_STAT_KEYS))
    && new Set(event.actions.map((action) => action.type)).size === 3
    && new Set(event.actions.map((action) => action.id)).size === 3;
}
export function isEnding(value: unknown): value is Ending {
  return object(value) && validGeneratedLocale(value) && ['ai_generated', 'quiet_specialist', 'stable_generalist',
    'chaotic_innovator', 'connected_builder', 'delightfully_strange_person'].includes(String(value.id))
    && text(value.title) && text(value.summary, 6000);
}
