import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from './test/renderApp';

describe('app shell', () => {
  it('moves between the path and profile pages with the bottom navigation', async () => {
    const user = userEvent.setup();
    renderApp({ path: '/' });

    expect(screen.getByRole('heading', { level: 2, name: 'Data Detective' })).toBeInTheDocument();

    const bottomNav = within(screen.getByTestId('bottom-nav'));
    await user.click(bottomNav.getByRole('link', { name: /profile/i }));
    expect(screen.getByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument();

    await user.click(bottomNav.getByRole('link', { name: /path/i }));
    expect(screen.getByRole('heading', { level: 2, name: 'Data Detective' })).toBeInTheDocument();
  });
});
