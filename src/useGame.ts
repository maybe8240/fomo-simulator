import { useEffect, useState } from 'react';
import { getEnding } from './engine/endings';
import { getStatLimits } from './engine/limits';
import { STARTER_EVENTS } from './engine/events';
import { generateTurnEvents } from './engine/generator';
import { resolveAction } from './engine/resolver';
import { createInitialState } from './engine/state';
import type { Action, Event, GameState } from './engine/types';
import type { Locale } from './i18n';
import type { GameServices } from './services/game';
import { clearSavedGame, loadSavedGame, saveGame } from './services/storage';
import type { PersistedGame } from './services/storage';

type Run = Omit<PersistedGame, 'version'>;

function freshRun(services: GameServices, locale: Locale = 'en'): Run {
  return {
    gameState: createInitialState(undefined, services.maxTurns),
    displayedTurn: services.aiEnabled
      ? null
      : { currentEvent: STARTER_EVENTS[0], isAIGenerated: false },
    locale,
    ending: null,
  };
}

export function useGame(services: GameServices) {
  const [run, setRun] = useState<Run>(() => {
    const saved = loadSavedGame();
    if (!saved) return freshRun(services);
    if (!saved.gameState.completed && saved.gameState.history.length > 0 && getStatLimits(saved.gameState).length) {
      saved.gameState = { ...saved.gameState, completed: true };
      saved.ending = null;
    }
    if (saved.gameState.maxTurns === undefined) {
      const length = saved.gameState.completed ? saved.gameState.history.length
        : Math.max(services.maxTurns, saved.gameState.world.turn);
      // Legacy runs beyond the API's 100-turn bound can still finish offline.
      if (length >= 1 && length <= 100) saved.gameState = { ...saved.gameState, maxTurns: length };
    }
    if (services.aiEnabled) {
      if (!saved.gameState.completed && saved.displayedTurn?.isAIGenerated
        && saved.displayedTurn.generatedLocale !== saved.locale) saved.displayedTurn = null;
      if (saved.ending?.id === 'ai_generated' && saved.ending.generatedLocale !== saved.locale) saved.ending = null;
    }
    return saved;
  });
  const { gameState, displayedTurn, ending, locale } = run;
  const [preview, setPreview] = useState<{ state: GameState; locale: Locale; text: string } | null>(null);

  useEffect(() => {
    saveGame(run);
  }, [run]);

  useEffect(() => {
    if (gameState.completed ? ending !== null : displayedTurn !== null) return;

    const controller = new AbortController();
    let active = true;
    const onNarrative = (text: string) => {
      if (active && !controller.signal.aborted) setPreview({ state: gameState, locale, text });
    };
    // Deferring lets Strict Mode's initial cleanup cancel before issuing a request.
    void Promise.resolve().then(async () => {
      if (!active) return;
      if (gameState.completed) {
        let result;
        try {
          result = await services.generateEnding(gameState, controller.signal, onNarrative, locale);
        } catch {
          result = getEnding(gameState);
        }
        if (active) setRun((current) => current.gameState === gameState
          ? { ...current, ending: result.id === 'ai_generated' ? { ...result, generatedLocale: locale } : result } : current);
      } else {
        let result;
        try {
          result = await services.generateTurn(gameState, controller.signal, onNarrative, locale);
        } catch {
          result = generateTurnEvents(gameState);
        }
        if (active) setRun((current) => current.gameState === gameState
          ? { ...current, displayedTurn: result.isAIGenerated ? { ...result, generatedLocale: locale } : result } : current);
      }
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [gameState, displayedTurn, ending, services, locale]);

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
    narrative: preview?.state === gameState && preview.locale === locale && (gameState.completed ? ending === null : displayedTurn === null) ? preview.text : '',
    isGenerating: !gameState.completed && displayedTurn === null,
    isGeneratingEnding: gameState.completed && ending === null,
    selectAction,
    setLocale: (locale: Locale) => setRun((current) => current.locale === locale ? current : ({
      ...current, locale, gameState: { ...current.gameState },
      displayedTurn: services.aiEnabled && !current.gameState.completed && current.displayedTurn?.isAIGenerated
        ? null : current.displayedTurn,
      ending: services.aiEnabled && current.ending?.id === 'ai_generated' ? null : current.ending,
    })),
    restart: () => {
      clearSavedGame();
      setRun((current) => freshRun(services, current.locale));
    },
  };
}
