import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { fillQuestionText } from '../content/template';
import { PREVIEW_QUESTIONS } from '../dev/previewQuestions';
import { answerCorrectly, answerIncorrectly, checkAndContinue } from '../test/answerQuestion';
import { renderApp } from '../test/renderApp';

const TYPES = [
  { type: 'inbox_triage', button: /inbox triage/i },
  { type: 'spot_the_lie', button: /spot the lie/i },
  { type: 'courtroom', button: /courtroom/i },
  { type: 'build_metric', button: /build the metric/i },
  { type: 'ab_verdict', button: /a\/b verdict/i },
] as const;

describe('question preview (development only)', () => {
  for (const { type, button } of TYPES) {
    it(`plays every ${type} placeholder with the keyboard alone`, async () => {
      const user = userEvent.setup();
      renderApp({ path: '/dev/question-preview' });
      await user.click(await screen.findByRole('button', { name: button }));
      await user.keyboard('{Enter}');

      const questions = PREVIEW_QUESTIONS.filter((question) => question.type === type);
      const [first, ...rest] = questions;

      // A wrong answer shows the explanation, and the question comes back at the end.
      await screen.findByRole('heading', { name: fillQuestionText(first, first.prompt) });
      await answerIncorrectly(user, first);
      await user.keyboard('{Enter}');
      const feedback = await screen.findByRole('region', {
        name: /not quite|almost|good try|not this time/i,
      });
      expect(within(feedback).getByText(fillQuestionText(first, first.explanation))).toBeVisible();
      expect(within(feedback).getByText(/will come back/i)).toBeVisible();
      await user.keyboard('{Enter}');

      for (const question of [...rest, first]) {
        await screen.findByRole('heading', { name: fillQuestionText(question, question.prompt) });
        await answerCorrectly(user, question);
        await checkAndContinue(user);
      }
      expect(await screen.findByRole('heading', { name: 'Lesson complete' })).toBeVisible();
    });
  }

  it('shows what was wrong once a challenge is answered', async () => {
    const user = userEvent.setup();
    renderApp({ path: '/dev/question-preview' });
    await user.click(await screen.findByRole('button', { name: /inbox triage/i }));
    await user.keyboard('{Enter}');
    const [triage] = PREVIEW_QUESTIONS;
    if (triage.type !== 'inbox_triage') throw new Error('Expected inbox triage first');
    await answerIncorrectly(user, triage);
    await user.keyboard('{Enter}');
    const flaws = await screen.findAllByText(/^(data not available|too vague|wrong metric):$/i);
    expect(flaws).toHaveLength(2);
    expect(screen.getByText('Answerable:')).toBeVisible();
  });

  it('draws the honest version of a misleading chart after answering', async () => {
    const user = userEvent.setup();
    renderApp({ path: '/dev/question-preview' });
    await user.click(await screen.findByRole('button', { name: /spot the lie/i }));
    await user.keyboard('{Enter}');
    const lie = PREVIEW_QUESTIONS.find((question) => question.type === 'spot_the_lie');
    if (!lie) throw new Error('No spot the lie placeholder');
    expect(screen.getByRole('img', { name: /axis runs from 950/i })).toBeVisible();
    await answerCorrectly(user, lie);
    await user.keyboard('{Enter}');
    const honest = await screen.findByRole('region', { name: 'The honest version' });
    expect(within(honest).getByRole('img', { name: /axis runs from 0/i })).toBeVisible();
  });

  it('shows what each A/B call leads to once the learner decides', async () => {
    const user = userEvent.setup();
    renderApp({ path: '/dev/question-preview' });
    await user.click(await screen.findByRole('button', { name: /a\/b verdict/i }));
    await user.keyboard('{Enter}');
    expect(screen.getByText('less than 0.001')).toBeVisible();
    await user.keyboard('3');
    await user.keyboard('{Enter}');
    expect(
      await screen.findByText(
        'Two more weeks pass with the weaker banner, and the answer does not change.',
      ),
    ).toBeVisible();
    expect(
      screen.getByText('Sign-ups rise by about 0.8 points, just as the test said. Good call.'),
    ).toBeVisible();
  });

  it('lets a card be taken back out of the metric', async () => {
    const user = userEvent.setup();
    renderApp({ path: '/dev/question-preview' });
    await user.click(await screen.findByRole('button', { name: /build the metric/i }));
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: 'Page views' }));
    const top = screen.getByRole('button', { name: /top box: page views/i });
    await user.click(top);
    expect(screen.getByRole('button', { name: /top box, empty/i })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Page views' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled();
  });
});
