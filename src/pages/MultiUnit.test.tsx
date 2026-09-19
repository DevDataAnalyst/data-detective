import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { lateDeliveryMystery } from '../content/mission1';
import { bossPath, checkpointPath, missionPath } from '../content/paths';
import { unit1 } from '../content/unit1';
import { unit2 } from '../content/unit2';
import { unit3 } from '../content/unit3';
import { unit4 } from '../content/unit4';
import { updateMission } from '../game/missionProgress';
import { finishCheckpoint } from '../game/rewards';
import { createMemoryStore } from '../storage/keyValue';
import { createProgressStore } from '../storage/progressStore';
import { answerCorrectly, playQuestions } from '../test/answerQuestion';
import { renderApp } from '../test/renderApp';

/** A learner who has finished Unit 1's mission. */
function unitOneDone() {
  const keyValue = createMemoryStore();
  const store = createProgressStore(keyValue);
  store.update((state) =>
    updateMission(state, lateDeliveryMystery.id, (mission) => ({
      ...mission,
      completedAt: '2026-03-09T18:00:00.000Z',
    })),
  );
  return { keyValue, store };
}

const section = (title: string) => within(screen.getByRole('region', { name: title }));

describe('units in sequence', () => {
  it('keeps Unit 2 locked, and says how to open it', async () => {
    const user = userEvent.setup();
    renderApp();
    const unitTwo = section(unit2.title);
    expect(
      unitTwo.getByText(/finish unit 1 first: complete “the late delivery mystery”/i),
    ).toBeVisible();
    expect(screen.getByText('Finish Unit 1 to open Unit 2')).toBeVisible();
    expect(screen.queryByRole('region', { name: /new message/i })).not.toBeInTheDocument();

    await user.click(
      unitTwo.getByRole('button', { name: /lesson 1: what is probability, really\?, locked/i }),
    );
    expect(screen.getByRole('dialog')).toHaveTextContent(/finish unit 1 first/i);
  });

  it('refuses Unit 2 pages opened by URL while it is locked', async () => {
    const lessonView = renderApp({ path: `/lesson/${unit2.lessons[0].id}` });
    expect(await screen.findByRole('heading', { name: /is still locked/ })).toBeVisible();
    expect(screen.getByText(/finish unit 1 first/i)).toBeVisible();
    lessonView.unmount();

    for (const path of [checkpointPath(unit2.id), bossPath(unit2.id), missionPath(unit2.id)]) {
      const view = renderApp({ path });
      expect(await screen.findByText(/finish unit 1 first/i), path).toBeVisible();
      view.unmount();
    }
  });

  it('opens Unit 2 with the founder’s message once Unit 1’s mission is done, and shows it once', async () => {
    const user = userEvent.setup();
    const { keyValue, store } = unitOneDone();
    const first = renderApp({ store });
    // The path opens on Unit 2: its anchor goes in the URL, and the router scrolls to it.
    await waitFor(() => expect(first.router.state.location.hash).toBe('#unit-2'));
    expect(document.getElementById('unit-2')).toHaveAttribute('data-unit', unit2.id);

    expect(screen.getByText('Unit 1 complete!')).toBeVisible();
    const hook = screen.getByRole('region', { name: 'New message for unit 2' });
    expect(within(hook).getByRole('article', { name: /message from ritika/i })).toHaveTextContent(
      /200 subscribers/,
    );
    await user.click(within(hook).getByRole('button', { name: 'I’m on it' }));
    expect(screen.queryByRole('region', { name: /new message/i })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: unit2.title })).toHaveFocus();
    expect(store.getSnapshot().hooksSeen).toEqual([unit2.id]);
    first.unmount();

    renderApp({ store: createProgressStore(keyValue) });
    expect(screen.queryByRole('region', { name: /new message/i })).not.toBeInTheDocument();
    expect(
      section(unit2.title).getByRole('button', {
        name: /lesson 1: what is probability, really\?, ready to start/i,
      }),
    ).toBeVisible();
  });

  it('plays a Unit 2 lesson just like a Unit 1 lesson', async () => {
    const user = userEvent.setup();
    const { store } = unitOneDone();
    renderApp({ store });
    const [lesson] = unit2.lessons;

    await user.click(
      section(unit2.title).getByRole('button', { name: /lesson 1: what is probability/i }),
    );
    await user.click(within(screen.getByRole('dialog')).getByRole('link', { name: 'Start' }));
    expect(await screen.findByRole('heading', { name: lesson.title })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Start' }));
    await playQuestions(user, lesson.questions);
    expect(await screen.findByRole('heading', { name: 'Lesson complete' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Back to path' }));
    expect(section(unit2.title).getByText('1 of 7 lessons')).toBeVisible();
    expect(store.getSnapshot().lessons[lesson.id]).toBeDefined();
  });

  it('puts Unit 2’s boss battle before its mission once the learner tests out', async () => {
    const user = userEvent.setup();
    const { store } = unitOneDone();
    renderApp({ store, path: checkpointPath(unit2.id) });
    expect(await screen.findByRole('heading', { name: 'Unit 2 checkpoint' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Start checkpoint' }));
    for (const item of unit2.checkpoint.items) {
      await answerCorrectly(user, item.question);
      await user.keyboard('{Enter}');
    }
    expect(await screen.findByRole('heading', { name: 'You tested out' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Open the mission' })).toHaveAttribute(
      'href',
      missionPath(unit2.id),
    );

    await user.click(screen.getByRole('link', { name: 'Back to path' }));
    const unitTwo = section(unit2.title);
    const boss = unitTwo.getByRole('button', { name: /boss battle for the churn culprit, ready/i });
    expect(within(boss).getByText('Next')).toBeInTheDocument();
    expect(
      unitTwo.getByRole('button', { name: /mission: the false alarm, unlocked/i }),
    ).toBeVisible();
  });

  it('opens Unit 3 with the product manager’s email once Unit 2 is tested out', async () => {
    const { store } = unitOneDone();
    const allRight = Object.fromEntries(
      unit2.checkpoint.items.map((item) => [item.question.id, true]),
    );
    store.update(
      (state) =>
        finishCheckpoint(state, { unit: unit2, correctByQuestion: allRight, now: new Date() })
          .state,
    );
    const { router } = renderApp({ store });

    expect(screen.getByText('Unit 2 tested out')).toBeVisible();
    const hook = screen.getByRole('region', { name: 'New message for unit 3' });
    expect(within(hook).getByRole('article', { name: /email from arjun/i })).toHaveTextContent(
      /Checkout redesign: roll out on Monday\?/,
    );
    // Unit 2's mission is still to do, so the path opens on Unit 2.
    await waitFor(() => expect(router.state.location.hash).toBe('#unit-2'));
    expect(
      section(unit3.title).getByRole('button', {
        name: /lesson 1: what’s a hypothesis\?, ready to start/i,
      }),
    ).toBeVisible();
  });

  it('opens Unit 4 with the interviewer’s email once Unit 3 is tested out', async () => {
    const { store } = unitOneDone();
    for (const unit of [unit2, unit3]) {
      const allRight = Object.fromEntries(
        unit.checkpoint.items.map((item) => [item.question.id, true]),
      );
      store.update(
        (state) =>
          finishCheckpoint(state, { unit, correctByQuestion: allRight, now: new Date() }).state,
      );
    }
    renderApp({ store });

    const hook = screen.getByRole('region', { name: 'New message for unit 4' });
    expect(within(hook).getByRole('article', { name: /email from kavya/i })).toHaveTextContent(
      /Your technical round on Friday/,
    );
    expect(
      section(unit4.title).getByRole('button', {
        name: /lesson 1: think before you type, ready to start/i,
      }),
    ).toBeVisible();
  });

  it('sends links from before there were units to Unit 1', async () => {
    const { router } = renderApp({ path: '/checkpoint' });
    expect(
      await screen.findByRole('heading', { name: `${unit1.title} checkpoint` }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(checkpointPath(unit1.id));
  });
});
