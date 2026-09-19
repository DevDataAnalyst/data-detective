import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { theFinalRound } from '../content/mission4';
import type { CodeTask } from '../content/types';
import { markTaskPassed, recordTaskRun, selectTask } from '../game/missionProgress';
import { createMemoryStore } from '../storage/keyValue';
import { createProgressStore } from '../storage/progressStore';
import { NO_OUTPUT, pythonReady, renderWorkspace, runActiveTask } from '../test/renderWorkspace';

const codeTask = (id: string) => theFinalRound.tasks.find((task) => task.id === id) as CodeTask;

/** A learner who has answered the two question tasks, on the first SQL task. */
function atTheGrainTask() {
  const store = createProgressStore(createMemoryStore());
  store.update((state) =>
    selectTask(
      ['clarify', 'plan'].reduce(
        (next, taskId) => markTaskPassed(next, theFinalRound.id, taskId, new Date()),
        state,
      ),
      theFinalRound.id,
      'grain',
    ),
  );
  return store;
}

describe('SQL tasks in the workspace', () => {
  it('loads every table of the mission and describes each one', async () => {
    const user = userEvent.setup();
    const { workers } = renderWorkspace(undefined, theFinalRound);
    await waitFor(() => expect(workers).toHaveLength(1));
    expect(workers[0].sent[0]).toMatchObject({
      type: 'init',
      missionId: 'the-final-round',
      files: [
        {
          fileName: 'orders.csv',
          table: 'orders',
          url: `${window.location.origin}/data/orders.csv`,
        },
        { fileName: 'customers.csv', table: 'customers' },
        { fileName: 'order_items.csv', table: 'order_items' },
      ],
    });

    await user.click(screen.getByText('The case'));
    const items = screen.getByText('order_items.csv').closest('details');
    if (!items) throw new Error('No description of order_items.csv');
    expect(within(items).getByText('(table', { exact: false })).toHaveTextContent(
      '(table order_items)',
    );
  });

  it('runs a SQL task as a query, saved under its variable', async () => {
    const user = userEvent.setup();
    const { workers } = renderWorkspace(atTheGrainTask(), theFinalRound);
    const worker = await pythonReady(workers);

    expect(await screen.findByRole('heading', { name: 'Check the grain' })).toBeVisible();
    expect(
      screen.getByRole('textbox', { name: 'SQL query for task 3: Check the grain' }),
    ).toBeVisible();
    expect(screen.getByText(/^Saved as/)).toHaveTextContent('Saved as: grain');
    expect(screen.getByText(/runs your query/)).toBeVisible();

    await runActiveTask(user, worker);
    expect(worker.lastRun()).toMatchObject({
      taskId: 'grain',
      code: `grain = sql(${JSON.stringify(codeTask('grain').starterCode)})\ngrain`,
    });
    worker.finishLastRun({
      ...NO_OUTPUT,
      error: { type: 'SQL error', message: 'no such table: order', line: null, trace: [] },
    });
    expect(await screen.findByText('no such table: order')).toBeVisible();
    expect(
      screen.getByText(
        'There is no table called `order`. The tables are `orders`, `customers` and `order_items`.',
      ),
    ).toBeVisible();
  });

  it('brings SQL results back after Python restarts, by running the queries again', async () => {
    const store = atTheGrainTask();
    const grain =
      'SELECT COUNT(*) AS item_rows, COUNT(DISTINCT order_id) AS orders FROM order_items;';
    const pandas = 'item_revenue = 1';
    store.update((state) =>
      recordTaskRun(
        recordTaskRun(state, theFinalRound.id, 'grain', { code: grain, succeeded: true }),
        theFinalRound.id,
        'second-way',
        { code: pandas, succeeded: true },
      ),
    );
    const { workers } = renderWorkspace(store, theFinalRound);
    const worker = await pythonReady(workers);

    await waitFor(() => expect(worker.runs()).toHaveLength(1));
    expect(worker.runs()[0].code).toBe(`grain = sql(${JSON.stringify(grain)})\ngrain`);
    worker.finishLastRun(NO_OUTPUT);
    await waitFor(() => expect(worker.runs()).toHaveLength(2));
    expect(worker.runs()[1].code).toBe(pandas);
  });
});
