import { useEffect, useRef, useState } from 'react';

import { getEnding } from './engine/endings';
import { STARTER_EVENTS } from './engine/events';
import { generateTurnEvents } from './engine/generator';
import { resolveAction } from './engine/resolver';
import { createInitialState } from './engine/state';
import { getLocalizedEnding, translate } from './i18n';
import type { Locale } from './i18n';
import type { Action, DisplayedTurn, Ending, Event, GameState } from './engine/types';
import { clearSavedGame, loadSavedGame, saveGame } from './services/storage';
import EventCard from './ui/EventCard';
import HistoryLog from './ui/HistoryLog';
import StatPanel from './ui/StatPanel';

type AppState = {
  gameState: GameState;
  displayedTurn: DisplayedTurn;
  locale: Locale;
  isGenerating: boolean;
};

function createFreshAppState(locale: Locale = 'en'): AppState {
  const gameState = createInitialState();

  return {
    gameState,
    displayedTurn: { currentEvent: STARTER_EVENTS[0], isAIGenerated: false },
    locale,
    isGenerating: false,
  };
}

function App() {
  const [{ gameState, displayedTurn, locale, isGenerating }, setAppState] = useState<AppState>(() => {
    const savedGame = loadSavedGame();

    if (savedGame?.displayedTurn) {
      return {
        gameState: savedGame.gameState,
        displayedTurn: savedGame.displayedTurn,
        locale: savedGame.locale,
        isGenerating: false,
      };
    }

    return createFreshAppState();
  });
  const [isResolving, setIsResolving] = useState(false);
  const [isGeneratingEnding, setIsGeneratingEnding] = useState(false);
  const [ending, setEnding] = useState<Ending | null>(() => {
    const saved = loadSavedGame();
    return saved?.ending ?? null;
  });
  const isResolvingRef = useRef(false);

  const currentEvent = displayedTurn.currentEvent;
  const localizedEnding = ending
    ? getLocalizedEnding(locale, ending.id, ending.title, ending.summary)
    : null;

  useEffect(() => {
    if (gameState.completed && !ending && !isGeneratingEnding) {
      setIsGeneratingEnding(true);
      getEnding(gameState).then((result) => {
        setEnding(result);
        setIsGeneratingEnding(false);
      });
    }
  }, [gameState.completed, ending, isGeneratingEnding]);

  const handleSelectAction = async (event: Event, action: Action) => {
    if (isResolvingRef.current || gameState.completed) {
      return;
    }

    isResolvingRef.current = true;
    setIsResolving(true);

    try {
      const nextGameState = resolveAction(
        gameState,
        event,
        action,
        displayedTurn,
      );

      if (nextGameState.completed) {
        setAppState({
          locale,
          gameState: nextGameState,
          displayedTurn,
          isGenerating: false,
        });
        return;
      }

      setAppState((current) => ({
        ...current,
        gameState: nextGameState,
        isGenerating: true,
      }));

      const newDisplayedTurn = await generateTurnEvents(nextGameState);

      setAppState((current) => ({
        ...current,
        gameState: nextGameState,
        displayedTurn: newDisplayedTurn,
        isGenerating: false,
      }));
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
    setEnding(null);
  };

  useEffect(() => {
    saveGame({
      gameState,
      displayedTurn,
      locale,
      ending,
    });
  }, [displayedTurn, gameState, locale, ending]);

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
        </header>

        {import.meta.env.DEV && <StatPanel gameState={gameState} locale={locale} />}

        <section className="section-block">
          <div className="panel-heading">
            <h2>{translate(locale, 'current_event')}</h2>
            {import.meta.env.DEV && displayedTurn.isAIGenerated && (
              <span className="event-badge event-badge--ai">{translate(locale, 'ai_generated')}</span>
            )}
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
          import.meta.env.DEV && (
            <section className="panel">
              <div className="panel-heading">
                <h2>{translate(locale, 'turn_status')}</h2>
              </div>
              <p className="muted-text">
                {isGenerating
                  ? translate(locale, 'generating_event')
                  : isResolving
                    ? translate(locale, 'resolving')
                    : translate(locale, 'pick_action')}
              </p>
            </section>
          )
        )}

        <HistoryLog history={gameState.history} locale={locale} />
      </section>
    </main>
  );
}

export default App;
