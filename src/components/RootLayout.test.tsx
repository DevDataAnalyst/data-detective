import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { markLessonCompleted } from '../game/progress';
import { createMemoryStore } from '../storage/keyValue';
import { createProgressStore } from '../storage/progressStore';
import { renderApp } from '../test/renderApp';

describe('app-wide notices', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('says when progress cannot be saved, and can be dismissed', async () => {
    const user = userEvent.setup();
    renderApp({ store: createProgressStore(createMemoryStore(), { persistent: false }) });

    expect(screen.getByText(/this browser isn’t saving your progress/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText(/this browser isn’t saving your progress/i)).not.toBeInTheDocument();
  });

  it('warns as soon as a save fails, for example when storage is full', () => {
    const keyValue = createMemoryStore();
    const store = createProgressStore(keyValue);
    renderApp({ store });
    expect(screen.queryByText(/isn’t saving your progress/i)).not.toBeInTheDocument();

    keyValue.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    act(() => store.update((state) => markLessonCompleted(state, 'the-mean', new Date())));
    expect(screen.getByText(/isn’t saving your progress/i)).toBeInTheDocument();
  });

  it('shows an offline notice while the connection is down', () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    renderApp();
    expect(screen.queryByText(/you’re offline/i)).not.toBeInTheDocument();

    onLine.mockReturnValue(false);
    act(() => void window.dispatchEvent(new Event('offline')));
    expect(screen.getByText(/you’re offline\. lessons keep working/i)).toBeInTheDocument();

    onLine.mockReturnValue(true);
    act(() => void window.dispatchEvent(new Event('online')));
    expect(screen.queryByText(/you’re offline/i)).not.toBeInTheDocument();
  });
});
