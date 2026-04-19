import { useEffect, useRef, useState } from 'react';

import { getEnding } from './engine/endings';
import { generateTurnEvents } from './engine/generator';
import { resolveAction } from './engine/resolver';
import { createInitialState } from './engine/state';
import { getLocalizedEnding, translate } from './i18n';
import type { Locale } from './i18n';
import type { Action, DisplayedTurn, Event, GameState } from './engine/types';
import { clearSavedGame, loadSavedGame, saveGame } from './services/storage';
import EventCard from './ui/EventCard';
import HistoryLog from './ui/HistoryLog';
import StatPanel from './ui/StatPanel';

type AppState = {
  gameState: GameState;
  displayedTurn: DisplayedTurn;
  locale: Locale;
};

function createFreshAppState(locale: Locale = 'en'): AppState {
  const gameState = createInitialState();

  return {
    gameState,
    displayedTurn: generateTurnEvents(gameState),
    locale,
  };
}

function App() {
  const [{ gameState, displayedTurn, locale }, setAppState] = useState<AppState>(() => {
    const savedGame = loadSavedGame();

    if (savedGame?.displayedTurn) {
      return {
        gameState: savedGame.gameState,
        displayedTurn: savedGame.displayedTurn,
        locale: savedGame.locale,
      };
    }

    return createFreshAppState();
  });
  const [isResolving, setIsResolving] = useState(false);
  const isResolvingRef = useRef(false);

  const ending = gameState.completed ? getEnding(gameState) : null;
  const currentEvent = displayedTurn.currentEvent;
  const localizedEnding = ending
    ? getLocalizedEnding(locale, ending.id, ending.title, ending.summary)
    : null;

  const handleSelectAction = (event: Event, action: Action) => {
    if (isResolvingRef.current || gameState.completed) {
      return;
    }

    isResolvingRef.current = true;
    setIsResolving(true);

    try {
      setAppState((current) => {
        const nextGameState = resolveAction(
          current.gameState,
          event,
          action,
          current.displayedTurn,
        );

        return {
          locale: current.locale,
          gameState: nextGameState,
          displayedTurn: nextGameState.completed
            ? current.displayedTurn
            : generateTurnEvents(nextGameState),
        };
      });
    } finally {
      isResolvingRef.current = false;
      setIsResolving(false);
    }
  };

  const handleRestart = () => {
    isResolvingRef.current = false;
    setIsResolving(false);
    clearSavedGame();
    setAppState(createFreshAppState(locale));
  };

  useEffect(() => {
    saveGame({
      gameState,
      displayedTurn,
      locale,
    });
  }, [displayedTurn, gameState, locale]);

  return (
    <main className="app-shell">
      <section className="app-layout">
        <header className="hero">
          <div className="hero-topbar">
            <div>
              <p className="eyebrow">{translate(locale, 'app_title')}</p>
              <h1>{translate(locale, 'app_subtitle')}</h1>
            </div>
            <div className="language-switcher" aria-label={translate(locale, 'language')}>
              <button
                className={`language-button${locale === 'en' ? ' language-button--active' : ''}`}
                onClick={() =>
                  setAppState((current) => ({
                    ...current,
                    locale: 'en',
                  }))
                }
                type="button"
              >
                {translate(locale, 'english')}
              </button>
              <button
                className={`language-button${locale === 'zh' ? ' language-button--active' : ''}`}
                onClick={() =>
                  setAppState((current) => ({
                    ...current,
                    locale: 'zh',
                  }))
                }
                type="button"
              >
                {translate(locale, 'chinese')}
              </button>
            </div>
          </div>
          <p className="status">{translate(locale, 'app_description')}</p>
        </header>

        <StatPanel gameState={gameState} locale={locale} />

        <section className="section-block">
          <div className="panel-heading">
            <h2>{translate(locale, 'current_event')}</h2>
          </div>
          <EventCard
            disabled={isResolving || gameState.completed}
            event={currentEvent}
            key={currentEvent.id}
            locale={locale}
            onSelectAction={handleSelectAction}
          />
        </section>

        {localizedEnding ? (
          <section className="panel ending-panel">
            <div className="panel-heading">
              <h2>{translate(locale, 'ending')}</h2>
            </div>
            <p className="ending-title">{localizedEnding.title}</p>
            <p className="status">{localizedEnding.summary}</p>
            <button className="restart-button" onClick={handleRestart} type="button">
              {translate(locale, 'restart_run')}
            </button>
          </section>
        ) : (
          <section className="panel">
            <div className="panel-heading">
              <h2>{translate(locale, 'turn_status')}</h2>
            </div>
            <p className="muted-text">
              {isResolving
                ? translate(locale, 'resolving')
                : translate(locale, 'pick_action')}
            </p>
          </section>
        )}

        <HistoryLog history={gameState.history} locale={locale} />
      </section>
    </main>
  );
}

export default App;
