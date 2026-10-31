import type { HistoryEntry } from '../engine/types';
import { getLocalizedHistoryEntry, translate } from '../i18n';
import type { Locale } from '../i18n';

type HistoryLogProps = {
  history: HistoryEntry[];
  locale: Locale;
};

function HistoryLog({ history, locale }: HistoryLogProps) {
  const entries = [...history].reverse();

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{translate(locale, 'history_log')}</h2>
      </div>

      {entries.length === 0 ? (
        <p className="muted-text">{translate(locale, 'no_history')}</p>
      ) : (
        <div className="history-log">
          {entries.map((entry) => (
            <article className="history-entry" key={`${entry.turn}-${entry.actionId}`}>
              {(() => {
                const localized = getLocalizedHistoryEntry(locale, entry);

                return (
                  <>
                    <p className="history-entry__meta">{localized.metaText}</p>
                    <p>{localized.eventDescription}</p>
                    <p className="history-entry__choice">{localized.chosenText}</p>
                  </>
                );
              })()}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default HistoryLog;
