

export function parseMaxTurns(value: string | undefined): number {
  const turns = Number(value);
  return Number.isSafeInteger(turns) && turns > 0 ? turns : 5;
}

export function getGameConfig() {
  return {
    aiEnabled: import.meta.env.VITE_AI_ENABLED === 'true',
    maxTurns: parseMaxTurns(import.meta.env.VITE_TURNS),
  };
}
