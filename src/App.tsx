import { getLocalizedEnding, translate } from './i18n';
import { defaultGameServices } from './services/game';
import type { GameServices } from './services/game';
import { useGame } from './useGame';
import EventCard from './ui/EventCard';
import HistoryLog from './ui/HistoryLog';
import StatPanel from './ui/StatPanel';

function App({ services = defaultGameServices }: { services?: GameServices }) {
  const { gameState, displayedTurn, locale, ending, isGenerating, isGeneratingEnding,
    selectAction, setLocale, restart, narrative } = useGame(services);
  const currentEvent = displayedTurn?.currentEvent;
  const localizedEnding = ending
    ? getLocalizedEnding(locale, ending.id, ending.title, ending.summary)
    : null;

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
                onClick={() => setLocale('en')}
                type="button"
              >
                {translate(locale, 'english')}
              </button>
              <button
                className={`language-button${locale === 'zh' ? ' language-button--active' : ''}`}
                onClick={() => setLocale('zh')}
                type="button"
              >
                {translate(locale, 'chinese')}
              </button>
              <button
                className="restart-button restart-button--small"
                onClick={restart}
                type="button"
                title={translate(locale, 'restart_run')}
              >
                ↻
              </button>
            </div>
          </div>
        </header>

        {import.meta.env.DEV && <StatPanel gameState={gameState} locale={locale} />}

        <section className="section-block">
          <div className="panel-heading">
            <h2>{translate(locale, 'current_event')}</h2>
            {import.meta.env.DEV && displayedTurn?.isAIGenerated && (
              <span className="event-badge event-badge--ai">{translate(locale, 'ai_generated')}</span>
            )}
          </div>
          {currentEvent ? <EventCard
            disabled={gameState.completed}
            event={currentEvent}
            key={currentEvent.id}
            locale={locale}
            onSelectAction={selectAction}
          /> : <div aria-busy="true"><p className="loading-status" role="status"><span className="loading-spinner" aria-hidden="true" />{translate(locale, 'generating_event')}</p>{narrative && <p className="streaming-narrative">{narrative}</p>}</div>}
        </section>

        {localizedEnding ? (
          <section className="panel ending-panel">
            <div className="panel-heading">
              <h2>{translate(locale, 'ending')}</h2>
            </div>
            <p className="ending-title">{localizedEnding.title}</p>
            <p className="status">{localizedEnding.summary}</p>
            <button className="restart-button" onClick={restart} type="button">
              {translate(locale, 'restart_run')}
            </button>
          </section>
        ) : isGeneratingEnding ? (
          <div aria-busy="true"><p className="loading-status" role="status"><span className="loading-spinner" aria-hidden="true" />{translate(locale, 'generating_ending')}</p>{narrative && <p className="streaming-narrative">{narrative}</p>}</div>
        ) : (
          import.meta.env.DEV && (
            <section className="panel">
              <div className="panel-heading">
                <h2>{translate(locale, 'turn_status')}</h2>
              </div>
              <p className="muted-text">
                {isGenerating
                  ? translate(locale, 'generating_event')
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
