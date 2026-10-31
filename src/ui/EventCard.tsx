import { useState } from 'react';
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
  const [actionOrder] = useState(() => {
    const order = event.actions.map((_, index) => index);
    for (let index = order.length - 1; index > 0; index -= 1) {
      const other = Math.floor(Math.random() * (index + 1));
      [order[index], order[other]] = [order[other], order[index]];
    }
    return order;
  });

  return (
    <article className="panel event-card">
      <div className="event-card__header">
        <h3>{getLocalizedEventText(locale, event.id, 'title', event.title)}</h3>
      </div>

      <p className="event-description">
        {getLocalizedEventText(locale, event.id, 'description', event.description)}
      </p>

      <div className="action-stack">
        {actionOrder.map(index => event.actions[index]).map((action) => (
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
