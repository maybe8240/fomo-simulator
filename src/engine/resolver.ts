import { applyPlayerDelta, applyWorldDelta } from './utils.ts';
import { getStatLimits } from './limits.ts';
import type { Action, DisplayedTurn, Event, GameState, HistoryEntry } from './types.ts';

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
  maxTurns = 5,
): GameState {
  const currentTurn = state.world.turn;
  const player = applyPlayerDelta(state.player, action.playerDelta);
  const worldAfterDelta = applyWorldDelta(state.world, action.worldDelta);

  const historyEntry: HistoryEntry = {
    actionType: action.type,
    eventDescription: event.description.slice(0, 1600),
    actionFlavor: action.flavor.slice(0, 400),
    missedActions: displayedTurn.currentEvent.actions.filter(candidate => candidate.id !== action.id)
      .map(candidate => ({ type: candidate.type, label: candidate.label })),
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
    completed: currentTurn >= (state.maxTurns ?? maxTurns)
      || getStatLimits({ player, world: worldAfterDelta }).length > 0,
  };
}
