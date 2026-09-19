import { expect, type Page } from '@playwright/test';
import type { Question } from '../src/content/types';

/** The order the A/B verdict offers its calls in. */
const VERDICT_ORDER = ['ship', 'kill', 'wait'];

/** A fixed date, so anything that depends on the day is the same on every run. */
export const FIXED_TIME = new Date('2026-03-10T09:00:00');

/** Sets an input's value the way a browser does, for controls Playwright cannot type into. */
async function setValue(page: Page, selector: string, value: string) {
  await page.locator(selector).evaluate((element, next) => {
    const input = element as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set;
    setter?.call(input, next);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

/** Answers the question on screen correctly, the way a learner would. */
export async function answerCorrectly(page: Page, question: Question) {
  switch (question.type) {
    case 'multiple_choice':
      // The radio itself is visually hidden behind its card, so use the number key shortcut.
      await page.keyboard.press(String(question.correctIndex + 1));
      await expect(page.getByRole('radio').nth(question.correctIndex)).toBeChecked();
      break;
    case 'numeric_estimate':
      await page.getByRole('textbox').fill(String(question.correctValue));
      break;
    case 'predict_reveal': {
      const { min, max, step } = question.slider;
      const snapped = min + Math.round((question.trueValue - min) / step) * step;
      // The slider must move to count as an answer, so nudge it to the end first.
      await setValue(page, 'input[type="range"]', String(max));
      await setValue(page, 'input[type="range"]', String(snapped));
      break;
    }
    case 'tap_outlier': {
      const dots = page.getByRole('checkbox');
      for (const index of question.outlierIndices) await dots.nth(index).click();
      break;
    }
    case 'inbox_triage':
    case 'spot_the_lie':
    case 'courtroom':
    case 'ab_verdict': {
      const index =
        question.type === 'inbox_triage'
          ? question.answerableIndex
          : question.type === 'courtroom'
            ? question.confounderIndex
            : question.type === 'ab_verdict'
              ? VERDICT_ORDER.indexOf(question.verdict)
              : question.correctIndex;
      await page.keyboard.press(String(index + 1));
      await expect(page.getByRole('radio').nth(index)).toBeChecked();
      break;
    }
    case 'build_metric':
      // Tapping a card fills the next empty box: the top first, then the bottom.
      for (const index of [question.numeratorIndex, question.denominatorIndex]) {
        await page.getByRole('button', { name: question.cards[index].label, exact: true }).click();
      }
      break;
    case 'order_steps':
      // Tapping a step adds it to the end of the order.
      for (const step of question.steps) {
        await page.getByRole('button', { name: step, exact: true }).click();
      }
      break;
  }
}

/** Plays a started lesson to its summary, answering everything correctly. */
export async function playLesson(page: Page, questions: readonly Question[]) {
  for (const question of questions) {
    await answerCorrectly(page, question);
    await page.getByRole('button', { name: 'Check', exact: true }).click();
    await page.getByRole('button', { name: /continue/i }).click();
  }
  await expect(page.getByRole('heading', { name: 'Lesson complete' })).toBeVisible();
}

/**
 * Replaces the code in the editor. Types it like a learner, then checks the result: CodeMirror
 * closes brackets by itself, so the text is set through its own API if typing came out different.
 */
export async function writeCode(page: Page, code: string) {
  const editor = page.locator('.cm-content');
  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(code);

  const typed = await editor.evaluate((element) => element.textContent ?? '');
  if (typed.replace(/\u00a0/g, ' ') !== code.trimEnd()) {
    await editor.evaluate((element, next) => {
      const view = (element as unknown as { cmTile?: { view: EditorViewLike } }).cmTile?.view;
      view?.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } });
    }, code);
  }
}

interface EditorViewLike {
  state: { doc: { length: number } };
  dispatch(transaction: { changes: { from: number; to: number; insert: string } }): void;
}

/** Runs the open mission task and waits for the hidden check to pass. */
export async function runTaskAndPass(page: Page) {
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  const check = page.getByRole('group', { name: 'Task check' });
  await expect(check).toContainText('Task passed', { timeout: 60_000 });
}
