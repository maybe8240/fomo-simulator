import { getAIConfig, isAIEnabled } from './ai';

export function parseMaxTurns(value: string | undefined): number {
  const turns = Number(value);
  return Number.isSafeInteger(turns) && turns > 0 ? turns : 5;
}

export function getGameConfig() {
  return {
    ai: isAIEnabled() ? getAIConfig() : null,
    maxTurns: parseMaxTurns(import.meta.env.VITE_TURNS),
  };
}
