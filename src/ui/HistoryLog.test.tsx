import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import HistoryLog from './HistoryLog';
import type { HistoryEntry } from '../engine/types';
import type { Locale } from '../i18n';

const entry: HistoryEntry = {
  turn: 1, eventId: 'ai-1', eventTitle: '借来的会议室', actionId: 'ai-absurd',
  actionType: 'absurd', actionLabel: '把讲义打包成付费课卖',
  eventDescription: '会议室只借到下午三点，主办方的转账还在审批。',
  resultText: 'You chose the absurd option "把讲义打包成付费课卖" from "借来的会议室".',
  missedPathsText: ['You did not choose the safe option "找HR问清流程".',
    'You did not choose the risky option "直接在群里@主办方要转账".'],
};

describe('AI history language', () => {
  it.each([false, true])('localizes every wrapper after switching to Chinese (structured=%s)', structured => {
    const history = [{ ...entry, ...(structured ? { missedActions: [
      { type: 'safe' as const, label: '找HR问清流程' },
      { type: 'risky' as const, label: '直接在群里@主办方要转账' },
    ] } : {}) }];
    function Example() {
      const [locale, setLocale] = useState<Locale>('en');
      return <><button onClick={() => setLocale('zh')}>Chinese</button><HistoryLog history={history} locale={locale} /></>;
    }
    const { container } = render(<Example />);
    fireEvent.click(screen.getByRole('button', { name: 'Chinese' }));
    const text = container.querySelector('.history-log')!.textContent;
    expect(text).toContain('第 1 回合');
    expect(text).toContain(entry.eventTitle);
    expect(text).toContain(entry.eventDescription);
    expect(text).toContain('你选择了把讲义打包成付费课卖。');
    expect(text).not.toContain('找HR问清流程');
    expect(text).not.toContain('你没有选择');
    expect(text).not.toMatch(/Turn|You chose|You did not choose|safe|risky|absurd/);
  });

  it('tells each turn as a choice you made, including older entries', () => {
    const { container } = render(<HistoryLog history={[
      { ...entry, actionLabel: 'Publish your course' },
      { ...entry, turn: 2, actionLabel: 'Call the organizer' },
    ]} locale="en" />);
    const choices = Array.from(container.querySelectorAll('.history-entry__choice'), node => node.textContent);
    expect(choices).toEqual(['You chose to call the organizer.', 'You chose to publish your course.']);
    expect(container.textContent).not.toContain('Chosen option');
  });

  it('avoids duplicate punctuation and preserves acronyms within the choice', () => {
    render(<HistoryLog history={[{ ...entry, actionLabel: 'Build an AI tool.' }]} locale="en" />);
    expect(screen.getByText('You chose to build an AI tool.')).toBeDefined();
  });
});
