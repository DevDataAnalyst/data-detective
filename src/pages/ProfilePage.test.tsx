import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { unit1 } from '../content/unit1';
import { markLessonCompleted } from '../game/progress';
import { createMemoryStore } from '../storage/keyValue';
import { createProgressStore } from '../storage/progressStore';
import { renderApp } from '../test/renderApp';

describe('profile page', () => {
  it('resets progress from the developer tools after confirming', async () => {
    const user = userEvent.setup();
    const store = createProgressStore(createMemoryStore());
    store.update((state) => markLessonCompleted(state, unit1.lessons[0].id, new Date()));
    renderApp({ path: '/profile', store });

    expect(screen.getByText('1 of 7 lessons completed')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset progress' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Reset all progress?' });
    await user.click(within(dialog).getByRole('button', { name: 'Reset progress' }));

    expect(screen.getByText('0 of 7 lessons completed')).toBeInTheDocument();
    expect(store.getSnapshot().lessons).toEqual({});
  });
});
