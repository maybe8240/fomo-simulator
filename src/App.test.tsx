import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import { STARTER_EVENTS } from './engine/events';
import type { DisplayedTurn } from './engine/types';
import { createGameServices } from './services/game';
import type { GameServices } from './services/game';

describe('game interface', () => {
  it('plays an offline run to an ending and restarts in the selected language', async () => {
    render(<App services={createGameServices({ aiEnabled: false, maxTurns: 2 })} />);
    fireEvent.click(screen.getByRole('button', { name: /Apply immediately/ }));
    await waitFor(() => expect(document.querySelectorAll('.action-button')).toHaveLength(3));
    fireEvent.click(document.querySelector('.action-button')!);
    await screen.findByRole('heading', { name: 'Ending' });
    expect(Array.from(document.querySelectorAll<HTMLButtonElement>('.action-button'))
      .every((button) => button.disabled)).toBe(true);
    expect(document.querySelectorAll('.history-entry')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Chinese' }));
    fireEvent.click(screen.getByRole('button', { name: '重新开始' }));
    expect(screen.queryByRole('heading', { name: '结局' })).toBeNull();
    expect(document.querySelectorAll('.history-entry')).toHaveLength(0);
    expect(screen.getByRole('button', { name: /立刻投递申请/ })).toBeDefined();
  });

  it('shows pending status without playable choices until the opening arrives', async () => {
    let resolve!: (turn: DisplayedTurn) => void;
    const pending = new Promise<DisplayedTurn>((done) => { resolve = done; });
    const services: GameServices = {
      aiEnabled: true, maxTurns: 5,
      generateTurn: vi.fn().mockReturnValue(pending),
      generateEnding: vi.fn(),
    };
    render(<App services={services} />);
    expect(screen.getByRole('status').textContent).toBe('Generating new event...');
    expect(document.querySelector('.action-button')).toBeNull();
    await waitFor(() => expect(services.generateTurn).toHaveBeenCalledTimes(1));
    act(() => vi.mocked(services.generateTurn).mock.calls[0][2]?.('An email arrives...'));
    expect(screen.getByText('An email arrives...')).toBeDefined();
    expect(document.querySelector('.action-button')).toBeNull();
    await act(async () => { resolve({ currentEvent: STARTER_EVENTS[0], isAIGenerated: true }); });
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByText('An email arrives...')).toBeNull();
    expect(screen.getByRole('button', { name: /Apply immediately/ })).toBeDefined();
  });
});
