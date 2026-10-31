import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { STARTER_EVENTS } from '../engine/events';
import { getLocalizedActionText } from '../i18n';
import EventCard from './EventCard';

describe('choice order', () => {
  it('shuffles every choice once and forwards the original event and action', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const event = STARTER_EVENTS[0];
    const original = [...event.actions];
    const onSelectAction = vi.fn();
    render(<EventCard event={event} disabled={false} locale="en" onSelectAction={onSelectAction} />);
    const buttons = screen.getAllByRole('button');
    const expected = [event.actions[1], event.actions[2], event.actions[0]];
    expect(buttons.map(button => button.textContent)).toEqual(expected.map(action => action.label));
    buttons.forEach((button, index) => {
      fireEvent.click(button);
      expect(onSelectAction).toHaveBeenNthCalledWith(index + 1, event, expected[index]);
    });
    expect(event.actions).toEqual(original);
  });

  it('keeps the order on rerender and language changes, with current action references', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    const event = STARTER_EVENTS[0];
    const onSelectAction = vi.fn();
    const { rerender } = render(<EventCard event={event} disabled={false} locale="en" onSelectAction={onSelectAction} />);
    random.mockClear();
    const updated = { ...event, actions: event.actions.map(action => ({ ...action })) };
    rerender(<EventCard event={updated} disabled locale="zh" onSelectAction={onSelectAction} />);
    const buttons = screen.getAllByRole('button') as HTMLButtonElement[];
    expect(buttons.map(button => button.textContent)).toEqual([1, 2, 0].map(index => {
      const action = updated.actions[index];
      return getLocalizedActionText('zh', action.id, 'label', action.label);
    }));
    expect(buttons.every(button => button.disabled)).toBe(true);
    expect(random).not.toHaveBeenCalled();
    rerender(<EventCard event={updated} disabled={false} locale="en" onSelectAction={onSelectAction} />);
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(onSelectAction).toHaveBeenCalledWith(updated, updated.actions[1]);
  });
});
