import { useEffect, useState } from 'react';
import { getEnding } from './engine/endings';
import { STARTER_EVENTS } from './engine/events';
import { generateTurnEvents } from './engine/generator';
import { resolveAction } from './engine/resolver';
import { createInitialState } from './engine/state';
import type { Action, Event } from './engine/types';
import type { Locale } from './i18n';
import type { GameServices } from './services/game';
import { clearSavedGame, loadSavedGame, saveGame } from './services/storage';
import type { PersistedGame } from './services/storage';

type Run = Omit<PersistedGame, 'version'>;

function freshRun(services: GameServices, locale: Locale = 'en'): Run {
  return {
    gameState: createInitialState(),
    displayedTurn: services.aiEnabled
      ? null
      : { currentEvent: STARTER_EVENTS[0], isAIGenerated: false },
    locale,
    ending: null,
  };
}

export function useGame(services: GameServices) {
  const [run, setRun] = useState<Run>(() => loadSavedGame() ?? freshRun(services));
  const { gameState, displayedTurn, ending } = run;

  useEffect(() => {
    saveGame(run);
  }, [run]);

  useEffect(() => {
    if (gameState.completed ? ending !== null : displayedTurn !== null) return;

    const controller = new AbortController();
    let active = true;
    // Deferring lets Strict Mode's initial cleanup cancel before issuing a request.
    void Promise.resolve().then(async () => {
      if (!active) return;
      if (gameState.completed) {
        let result;
        try {
          result = await services.generateEnding(gameState, controller.signal);
        } catch {
          result = getEnding(gameState);
        }
        if (active) setRun((current) => current.gameState === gameState
          ? { ...current, ending: result } : current);
      } else {
        let result;
        try {
          result = await services.generateTurn(gameState, controller.signal);
        } catch {
          result = generateTurnEvents(gameState);
        }
        if (active) setRun((current) => current.gameState === gameState
          ? { ...current, displayedTurn: result } : current);
      }
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [gameState, displayedTurn, ending, services]);

  const selectAction = (event: Event, action: Action) => {
    setRun((current) => {
      if (current.gameState.completed || current.displayedTurn?.currentEvent !== event
        || !event.actions.includes(action)) return current;
      const nextState = resolveAction(current.gameState, event, action,
        current.displayedTurn, services.maxTurns);
      return {
        ...current,
        gameState: nextState,
        // Persist the pending turn explicitly; refresh resumes generation for this state.
        displayedTurn: nextState.completed ? current.displayedTurn : null,
      };
    });
  };

  return {
    ...run,
    isGenerating: !gameState.completed && displayedTurn === null,
    isGeneratingEnding: gameState.completed && ending === null,
    selectAction,
    setLocale: (locale: Locale) => setRun((current) => ({ ...current, locale })),
    restart: () => {
      clearSavedGame();
      setRun((current) => freshRun(services, current.locale));
    },
  };
}
