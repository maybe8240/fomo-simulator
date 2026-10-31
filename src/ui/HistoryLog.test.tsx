import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import HistoryLog from './HistoryLog';
import type { HistoryEntry } from '../engine/types';
import type { Locale } from '../i18n';

const entry: HistoryEntry = {
  turn: 1, eventId: 'ai-1', eventTitle: '借来的会议室', actionId: 'ai-absurd',
  actionType: 'absurd', actionLabel: '把讲义打包成付费课卖',
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
    expect(text).toContain('选择了荒诞选项');
    expect(text).toContain('你没有选择稳妥选项“找HR问清流程”。');
    expect(text).toContain('你没有选择冒险选项“直接在群里@主办方要转账”。');
    expect(text).not.toMatch(/Turn|You chose|You did not choose|safe|risky|absurd/);
  });
});
