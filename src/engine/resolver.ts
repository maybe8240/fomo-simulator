import { applyPlayerDelta, applyWorldDelta } from './utils';
import type { Action, DisplayedTurn, Event, GameState, HistoryEntry } from './types';
import { getMaxTurns } from './utils';

function getMissedPaths(action: Action, displayedTurn: DisplayedTurn): string[] {
  return displayedTurn.currentEvent.actions
    .filter((turnAction) => turnAction.id !== action.id)
    .map(
      (turnAction) =>
        `You did not choose the ${turnAction.type} option "${turnAction.label}".`,
    );
}

export function resolveAction(
  state: GameState,
  event: Event,
  action: Action,
  displayedTurn: DisplayedTurn,
): GameState {
  const currentTurn = state.world.turn;
  const player = applyPlayerDelta(state.player, action.playerDelta);
  const worldAfterDelta = applyWorldDelta(state.world, action.worldDelta);

  const historyEntry: HistoryEntry = {
    turn: currentTurn,
    eventId: event.id,
    eventTitle: event.title,
    actionId: action.id,
    actionLabel: action.label,
    resultText: `You chose the ${action.type} option "${action.label}" from "${event.title}".`,
    missedPathsText: getMissedPaths(action, displayedTurn),
  };

  return {
    ...state,
    player,
    world: {
      ...worldAfterDelta,
      turn: currentTurn + 1,
    },
    history: [...state.history, historyEntry],
    completed: currentTurn >= getMaxTurns(),
  };
}
