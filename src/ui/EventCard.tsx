import type { Action, Event } from '../engine/types';
import {
  getLocalizedActionText,
  getLocalizedEventText,
} from '../i18n';
import type { Locale } from '../i18n';

type EventCardProps = {
  event: Event;
  disabled: boolean;
  locale: Locale;
  onSelectAction: (event: Event, action: Action) => void;
};

function EventCard({ event, disabled, locale, onSelectAction }: EventCardProps) {
  return (
    <article className="panel event-card">
      <div className="event-card__header">
        <h3>{getLocalizedEventText(locale, event.id, 'title', event.title)}</h3>
      </div>

      <p className="event-description">
        {getLocalizedEventText(locale, event.id, 'description', event.description)}
      </p>

      <div className="action-stack">
        {event.actions.map((action) => (
          <button
            className="action-button"
            disabled={disabled}
            key={action.id}
            onClick={() => onSelectAction(event, action)}
            type="button"
          >
            <strong>{getLocalizedActionText(locale, action.id, 'label', action.label)}</strong>
          </button>
        ))}
      </div>
    </article>
  );
}

export default EventCard;
