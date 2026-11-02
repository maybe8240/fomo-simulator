import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import { STARTER_EVENTS } from './engine/events';
import { createInitialState } from './engine/state';
import type { DisplayedTurn, Ending } from './engine/types';
import { createGameServices } from './services/game';
import type { GameServices } from './services/game';
import { downloadRunImage } from './services/share';
import { saveGame } from './services/storage';

vi.mock('./services/share', () => ({
  createRunImage: vi.fn().mockImplementation(async () => new File(['png'], 'run.png', { type: 'image/png' })),
  downloadRunImage: vi.fn(),
}));

describe('game interface', () => {
  it.each(['en', 'zh'] as const)('keeps the %s streamed ending after failed repair and reload at simultaneous stat limits', async locale => {
    const event = { ...STARTER_EVENTS[0], actions: STARTER_EVENTS[0].actions.map(action => ({
      ...action, playerDelta: { energy: -100, chaos: 100 }, worldDelta: {},
    })) };
    saveGame({ gameState: createInitialState(123, 5), displayedTurn: { currentEvent: event, isAIGenerated: false }, ending: null, locale });
    const draft = locale === 'zh' ? '你把最后一张账单放在桌上。' : 'You leave the final invoice on the table.';
    let output!: ReadableStreamDefaultController<Uint8Array>;
    const body = new ReadableStream<Uint8Array>({ start(controller) { output = controller; } });
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { headers: { 'content-type': 'application/x-ndjson' } }));
    const services = createGameServices({ aiEnabled: true, maxTurns: 5 }, fetcher);
    const first = render(<App services={services} />);
    fireEvent.click(document.querySelector('.action-button')!);
    await waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
    await act(async () => { output.enqueue(new TextEncoder().encode(JSON.stringify({ type: 'narrative', text: draft }) + '\n')); });
    expect(screen.getByText(draft)).toBeTruthy();
    await act(async () => { output.enqueue(new TextEncoder().encode('{"type":"error"}\n')); output.close(); });
    expect(screen.getByText(draft)).toBeTruthy();
    expect(document.querySelector('.ending-panel')?.querySelector('[aria-busy="true"]')).toBeNull();
    expect(document.querySelector('.ending-panel')?.textContent).not.toMatch(/本局因|Your run ended when/);
    first.unmount();
    render(<App services={services} />);
    expect(screen.getByText(draft)).toBeTruthy();
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it.each([false, true])('shows the ending panel throughout generation (stat limit=%s)', async statLimit => {
    let resolve!: (ending: Ending) => void;
    const pending = new Promise<Ending>(done => { resolve = done; });
    const event = {
      ...STARTER_EVENTS[0],
      actions: STARTER_EVENTS[0].actions.map(action => ({
        ...action, playerDelta: statLimit ? { energy: -100 } : {}, worldDelta: {},
      })),
    };
    const services: GameServices = {
      aiEnabled: true, maxTurns: statLimit ? 5 : 1,
      generateTurn: vi.fn().mockResolvedValue({ currentEvent: event, isAIGenerated: true }),
      generateEnding: vi.fn().mockReturnValue(pending),
    };
    render(<App services={services} />);
    fireEvent.click(await screen.findByRole('button', { name: /Apply immediately/ }));
    const panel = screen.getByRole('heading', { name: 'Ending' }).closest('section');
    expect(panel?.classList.contains('ending-panel')).toBe(true);
    expect(panel?.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(panel?.textContent).toContain('Writing your ending...');
    expect(screen.queryByRole('button', { name: 'Restart Run' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Share Run' })).toBeNull();
    await waitFor(() => expect(services.generateEnding).toHaveBeenCalledOnce());
    act(() => vi.mocked(services.generateEnding).mock.calls[0][2]?.('You return home with a new plan.'));
    expect(panel?.textContent).toContain('You return home with a new plan.');
    expect(screen.queryByRole('button', { name: 'Restart Run' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Share Run' })).toBeNull();
    await act(async () => { resolve({ id: 'ai_generated', title: 'A new start', summary: 'Your story continues.' }); });
    expect(screen.getByRole('heading', { name: 'Ending' }).closest('section')).toBe(panel);
    expect(panel?.querySelector('[aria-busy="true"]')).toBeNull();
    expect(panel?.textContent).toContain('A new start');
    expect(panel?.textContent).toContain('Your story continues.');
    expect(panel?.textContent).not.toContain('You return home with a new plan.');
    expect(screen.getByRole('button', { name: 'Share Run' }).closest('section')).toBe(panel);
    expect(screen.getByRole('button', { name: 'Restart Run' }).closest('section')).toBe(panel);
  });

  it('shows a timeout notice with fallback choices and clears it on restart', async () => {
    const service: GameServices = {
      aiEnabled: true, maxTurns: 5,
      generateTurn: vi.fn(async (_state, _signal, _preview, _locale, onTimeout) => {
        onTimeout?.();
        return { currentEvent: STARTER_EVENTS[0], isAIGenerated: false };
      }), generateEnding: vi.fn(),
    };
    render(<App services={service} />);
    await screen.findByText(/AI generation timed out/);
    expect(document.querySelectorAll('.action-button')).toHaveLength(3);
    service.generateTurn = vi.fn().mockResolvedValue({ currentEvent: STARTER_EVENTS[0], isAIGenerated: false });
    fireEvent.click(screen.getByTitle('Restart Run'));
    await waitFor(() => expect(screen.queryByText(/AI generation timed out/)).toBeNull());
  });
  it('plays an offline run to an ending and restarts in the selected language', async () => {
    render(<App services={createGameServices({ aiEnabled: false, maxTurns: 2 })} />);
    fireEvent.click(screen.getByRole('button', { name: /Apply immediately/ }));
    await waitFor(() => expect(document.querySelectorAll('.action-button')).toHaveLength(3));
    fireEvent.click(document.querySelector('.action-button')!);
    await screen.findByRole('heading', { name: 'Ending' });
    const share = screen.getByRole('button', { name: 'Share Run' });
    await waitFor(() => expect((share as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(share);
    await waitFor(() => expect(downloadRunImage).toHaveBeenCalledOnce());
    expect(Array.from(document.querySelectorAll<HTMLButtonElement>('.action-button'))
      .every((button) => button.disabled)).toBe(true);
    expect(document.querySelectorAll('.history-entry')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Chinese' }));
    fireEvent.click(screen.getByRole('button', { name: '重新开始' }));
    expect(screen.queryByRole('heading', { name: '结局' })).toBeNull();
    expect(screen.queryByRole('button', { name: '分享本次人生' })).toBeNull();
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
