import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Lesson } from '../../content/types';
import { unit1 } from '../../content/unit1';
import { answerCorrectly, checkAndContinue } from '../../test/answerQuestion';
import { LessonPlayer } from './LessonPlayer';

describe('LessonPlayer', () => {
  it.each(unit1.lessons.map((lesson, index) => [lesson.title, lesson, index] as const))(
    'plays "%s" from start to finish with the keyboard',
    async (_title, lesson, index) => {
      const user = userEvent.setup();
      const onFinish = vi.fn();
      render(
        <LessonPlayer
          lesson={lesson}
          lessonNumber={index + 1}
          onExit={vi.fn()}
          onFinish={onFinish}
        />,
      );

      expect(screen.getByRole('heading', { level: 1, name: lesson.title })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Start' })).toHaveFocus();
      await user.keyboard('{Enter}');

      for (const question of lesson.questions) {
        await answerCorrectly(user, question);
        expect(screen.getByRole('button', { name: 'Check' })).toBeEnabled();
        await checkAndContinue(user);
      }

      expect(screen.getByRole('heading', { name: 'Lesson complete' })).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Back to path' })).toHaveFocus();
      expect(onFinish).toHaveBeenCalledTimes(1);
      expect(onFinish).toHaveBeenCalledWith(
        expect.objectContaining({ lessonId: lesson.id, firstAttemptAccuracy: 1 }),
      );
    },
  );

  const miniLesson: Lesson = {
    id: 'mini',
    title: 'Mini lesson',
    estimatedMinutes: 3,
    intro: 'A **tiny** lesson.',
    questions: [
      {
        id: 'mini-mc',
        type: 'multiple_choice',
        prompt: 'Which column is categorical?',
        options: ['city', 'distance_km'],
        correctIndex: 0,
        explanation: 'city holds labels.',
      },
      {
        id: 'mini-estimate',
        type: 'numeric_estimate',
        prompt: 'Estimate the mean.',
        dataset: { label: 'Delivery time', suffix: 'min', values: [28, 35, 31, 40, 26] },
        statistic: 'mean',
        correctValue: 32,
        tolerance: 3,
        explanation: 'The mean is {mean} minutes.',
      },
    ],
  };

  it('shows amber feedback for a wrong answer and asks the question again at the end', async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(
      <LessonPlayer lesson={miniLesson} lessonNumber={1} onExit={vi.fn()} onFinish={onFinish} />,
    );
    await user.click(screen.getByRole('button', { name: 'Start' }));

    // Wrong answer to the first question.
    expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: /distance_km/ }));
    await user.click(screen.getByRole('button', { name: 'Check' }));
    const feedback = screen.getByRole('region', {
      name: /not quite|almost there|good try|not this time/i,
    });
    expect(within(feedback).getByText('city holds labels.')).toBeInTheDocument();
    expect(within(feedback).getByText(/will come back/)).toBeInTheDocument();
    expect(screen.getByText('Correct answer')).toBeInTheDocument();
    await user.click(within(feedback).getByRole('button', { name: 'Continue' }));

    // Second question, answered right, with a filled-in explanation.
    await user.type(screen.getByRole('textbox'), '30');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByText('The mean is 32 minutes.')).toBeInTheDocument();
    expect(screen.getByText(/off by 2 min/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    // The missed question comes back.
    expect(
      screen.getByRole('heading', { name: 'Which column is categorical?' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/second look/i)).toBeInTheDocument();
    expect(onFinish).not.toHaveBeenCalled();
    await user.click(screen.getByRole('radio', { name: /city/ }));
    await user.click(screen.getByRole('button', { name: 'Check' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByRole('heading', { name: 'Lesson complete' })).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ firstAttemptAccuracy: 0.5 }));
  });

  it('asks before leaving a lesson in progress', async () => {
    const user = userEvent.setup();
    const onExit = vi.fn();
    render(<LessonPlayer lesson={miniLesson} lessonNumber={1} onExit={onExit} />);
    await user.click(screen.getByRole('button', { name: 'Start' }));

    await user.click(screen.getByRole('button', { name: 'Exit lesson' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Leave this lesson?' });
    expect(within(dialog).getByRole('button', { name: 'Keep learning' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onExit).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Exit lesson' }));
    await user.click(screen.getByRole('button', { name: 'Leave lesson' }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
