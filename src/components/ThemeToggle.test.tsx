import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createMemoryStore } from '../storage/keyValue';
import { renderApp } from '../test/renderApp';

describe('dark mode', () => {
  it('switches on and off from the top bar', async () => {
    const user = userEvent.setup();
    renderApp();
    const toggle = screen.getByRole('button', { name: 'Dark mode' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(document.documentElement.dataset.theme).toBe('light');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(toggle).toHaveAttribute('title', 'Switch to light mode');
    expect(document.documentElement.dataset.theme).toBe('dark');

    await user.click(toggle);
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('keeps the choice after a refresh', async () => {
    const user = userEvent.setup();
    const themeStorage = createMemoryStore();
    const first = renderApp({ themeStorage });
    await user.click(screen.getByRole('button', { name: 'Dark mode' }));
    first.unmount();
    delete document.documentElement.dataset.theme;

    renderApp({ themeStorage });
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(screen.getByRole('button', { name: 'Dark mode' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('can follow the device, or be set, on the profile page', async () => {
    const user = userEvent.setup();
    renderApp({ path: '/profile' });
    const appearance = screen.getByRole('radiogroup', { name: 'Appearance' });
    expect(within(appearance).getByRole('radio', { name: 'Match my device' })).toBeChecked();

    await user.click(within(appearance).getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    // The top bar toggle agrees with the setting.
    expect(screen.getByRole('button', { name: 'Dark mode' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(within(appearance).getByRole('radio', { name: 'Light' }));
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
