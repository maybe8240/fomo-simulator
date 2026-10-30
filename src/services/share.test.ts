import { describe, expect, it, vi } from 'vitest';
import { createRunImage, downloadRunImage } from './share';
import { createInitialState } from '../engine/state';

describe('run image sharing', () => {
  it('renders final stats, ending and every history entry into a PNG', async () => {
    const drawn: string[] = [];
    const context = { font: '', fillStyle: '', textBaseline: '', scale: vi.fn(), fillRect: vi.fn(),
      measureText: (text: string) => ({ width: [...text].length * 14 }),
      fillText: (text: string) => drawn.push(text) };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(new Blob(['png'], { type: 'image/png' })));
    const state = createInitialState(1);
    state.completed = true;
    state.player.money = 73;
    state.history = [1, 2].map(turn => ({ turn, eventId: `custom-${turn}`, eventTitle: `Event ${turn}`,
      actionId: `action-${turn}`, actionLabel: `Choice ${turn}`, resultText: `Outcome ${turn}`, missedPathsText: [`Missed ${turn}`] }));
    const file = await createRunImage(state, { id: 'ai_generated', title: 'Your ending', summary: 'Your journey.' }, 'en');
    expect(file.type).toBe('image/png');
    const text = drawn.join('\n');
    for (const value of ['Your ending', 'Your journey.', 'Final Stats', 'Money: 73 / 100', 'History Log', 'Choice 1', 'Choice 2', 'Missed 1', 'Missed 2']) {
      expect(text).toContain(value);
    }
  });
  it('downloads a PNG directly even when native sharing is available', async () => {
    vi.useFakeTimers();
    try {
      const share = vi.fn();
      const canShare = vi.fn(() => true);
      vi.stubGlobal('navigator', { share, canShare });
      const create = vi.fn().mockReturnValue('blob:run');
      const revoke = vi.fn();
      vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke });
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toBe('run.png');
        expect(this.href).toBe('blob:run');
      });
      downloadRunImage(new File(['png'], 'run.png'));
      expect(share).not.toHaveBeenCalled();
      expect(canShare).not.toHaveBeenCalled();
      expect(click).toHaveBeenCalledOnce();
      await vi.advanceTimersByTimeAsync(60_000);
      expect(revoke).toHaveBeenCalledWith('blob:run');
    } finally { vi.useRealTimers(); }
  });
});
