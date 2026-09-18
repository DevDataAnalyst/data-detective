import { act, fireEvent, screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { expect } from 'vitest';
import type { BuildMetricQuestion, Question } from '../content/types';
import { VERDICTS } from '../game/abTest';

/** Places cards in the metric's top and bottom boxes: focus a card, press Space. */
async function placeMetricCards(
  user: UserEvent,
  question: BuildMetricQuestion,
  top: number,
  bottom: number,
) {
  for (const index of [top, bottom]) {
    const card = screen.getByRole('button', { name: question.cards[index].label });
    act(() => card.focus());
    await user.keyboard(' ');
  }
}

/** Answers the question on screen correctly, using the keyboard wherever a learner could. */
export async function answerCorrectly(user: UserEvent, question: Question) {
  switch (question.type) {
    case 'multiple_choice':
      await user.keyboard(String(question.correctIndex + 1));
      break;
    case 'numeric_estimate': {
      const input = screen.getByRole('textbox');
      act(() => input.focus());
      await user.keyboard(String(question.correctValue));
      break;
    }
    case 'predict_reveal': {
      const { min, max, step } = question.slider;
      const snapped = min + Math.round((question.trueValue - min) / step) * step;
      const slider = screen.getByRole('slider');
      // Learners must move the slider to commit, even when the answer is where it starts.
      fireEvent.change(slider, { target: { value: String(max) } });
      fireEvent.change(slider, { target: { value: String(snapped) } });
      break;
    }
    case 'tap_outlier': {
      const dots = screen.getAllByRole('checkbox');
      for (const index of question.outlierIndices) {
        act(() => dots[index].focus());
        await user.keyboard(' ');
      }
      break;
    }
    case 'inbox_triage':
      await user.keyboard(String(question.answerableIndex + 1));
      break;
    case 'spot_the_lie':
      await user.keyboard(String(question.correctIndex + 1));
      break;
    case 'courtroom':
      await user.keyboard(String(question.confounderIndex + 1));
      break;
    case 'build_metric':
      await placeMetricCards(user, question, question.numeratorIndex, question.denominatorIndex);
      break;
    case 'ab_verdict':
      await user.keyboard(String(VERDICTS.indexOf(question.verdict) + 1));
      break;
  }
}

/** Answers the question on screen wrongly, in a way the grading can never accept. */
export async function answerIncorrectly(user: UserEvent, question: Question) {
  switch (question.type) {
    case 'multiple_choice':
      await user.keyboard(String(((question.correctIndex + 1) % question.options.length) + 1));
      break;
    case 'numeric_estimate': {
      const input = screen.getByRole('textbox');
      act(() => input.focus());
      await user.keyboard(String(question.correctValue + question.tolerance * 10 + 1000));
      break;
    }
    case 'predict_reveal': {
      const { min, max } = question.slider;
      const far = question.trueValue - min > max - question.trueValue ? min : max;
      const near = far === min ? max : min;
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: String(near) } });
      fireEvent.change(slider, { target: { value: String(far) } });
      break;
    }
    case 'tap_outlier': {
      const dots = screen.getAllByRole('checkbox');
      const notOutlier = dots.findIndex((_, index) => !question.outlierIndices.includes(index));
      act(() => dots[notOutlier].focus());
      await user.keyboard(' ');
      break;
    }
    case 'inbox_triage':
      await user.keyboard(
        String(((question.answerableIndex + 1) % question.candidates.length) + 1),
      );
      break;
    case 'spot_the_lie':
      await user.keyboard(String(((question.correctIndex + 1) % question.options.length) + 1));
      break;
    case 'courtroom':
      await user.keyboard(String(((question.confounderIndex + 1) % question.suspects.length) + 1));
      break;
    case 'build_metric':
      // Upside down: the denominator on top.
      await placeMetricCards(user, question, question.denominatorIndex, question.numeratorIndex);
      break;
    case 'ab_verdict':
      await user.keyboard(String(((VERDICTS.indexOf(question.verdict) + 1) % VERDICTS.length) + 1));
      break;
  }
}

/** Presses Enter to check, then Enter on the focused Continue button. */
export async function checkAndContinue(user: UserEvent) {
  await user.keyboard('{Enter}');
  const continueButton = await screen.findByRole('button', { name: /continue/i });
  expect(continueButton).toHaveFocus();
  await user.keyboard('{Enter}');
}

/** Plays every question of a started lesson correctly. */
export async function playQuestions(user: UserEvent, questions: readonly Question[]) {
  for (const question of questions) {
    await answerCorrectly(user, question);
    await checkAndContinue(user);
  }
}
