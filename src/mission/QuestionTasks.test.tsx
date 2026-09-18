import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { theFalseAlarm } from '../content/mission2';
import { missionProgress } from '../game/missionProgress';
import { renderWorkspace } from '../test/renderWorkspace';

const triage = theFalseAlarm.tasks[0];

describe('question tasks in a mission', () => {
  it('works before Python loads: explains a wrong pick, then passes and pays XP', async () => {
    if (triage.kind !== 'question' || triage.question.type !== 'inbox_triage') {
      throw new Error('Mission 2 should open with an inbox triage task');
    }
    const user = userEvent.setup();
    const { store, events } = renderWorkspace(undefined, theFalseAlarm);

    expect(await screen.findByRole('heading', { name: 'Pin down the question' })).toBeVisible();
    expect(screen.getByRole('article', { name: /message from ritika/i })).toBeVisible();

    // The raw-count question is the wrong metric; the note says why, without the answer.
    await user.keyboard('3');
    await user.keyboard('{Enter}');
    const check = await screen.findByRole('group', { name: 'Task check' });
    expect(check).toHaveTextContent('Not quite yet');
    expect(check).toHaveTextContent('Wrong metric: Raw counts favour the biggest segment.');
    expect(screen.queryByText('Correct answer')).not.toBeInTheDocument();

    await user.keyboard(String(triage.question.answerableIndex + 1));
    await user.click(screen.getByRole('button', { name: 'Check' }));
    const passed = await screen.findByRole('group', { name: 'Task check' });
    expect(passed).toHaveTextContent('Task passed');
    expect(passed).toHaveTextContent('+20 XP');
    expect(missionProgress(store.getSnapshot(), theFalseAlarm.id).tasks[triage.id]).toMatchObject({
      status: 'passed',
      runs: 2,
    });
    expect(store.getSnapshot().activity.totalXp).toBe(20);
    const answered = events.getSnapshot().filter((event) => event.type === 'question_answered');
    expect(answered.map((event) => [event.source, event.correct, event.firstAttempt])).toEqual([
      ['mission', false, true],
      ['mission', true, false],
    ]);

    await user.click(within(passed).getByRole('button', { name: /next: is april unusual\?/i }));
    expect(await screen.findByRole('heading', { name: 'Is April unusual?' })).toBeVisible();
    expect(screen.getByText('1 of 5 tasks passed')).toBeVisible();
  });

  it('shows a passed question task solved when the learner comes back to it', async () => {
    const user = userEvent.setup();
    const { store } = renderWorkspace(undefined, theFalseAlarm);
    await screen.findByRole('heading', { name: 'Pin down the question' });
    if (triage.kind !== 'question' || triage.question.type !== 'inbox_triage') return;
    await user.keyboard(String(triage.question.answerableIndex + 1));
    await user.keyboard('{Enter}');
    await screen.findByText('Task passed');

    const taskList = screen.getByRole('navigation', { name: 'Mission tasks' });
    await user.click(within(taskList).getByRole('button', { name: /is april unusual\?/i }));
    await user.click(within(taskList).getByRole('button', { name: /pin down the question/i }));
    expect(await screen.findByText('Correct answer')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Check' })).not.toBeInTheDocument();
    expect(store.getSnapshot().activity.totalXp).toBe(20);
  });
});
