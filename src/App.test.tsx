import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { routes } from './routes';

describe('app shell', () => {
  it('moves between the path and profile pages with the bottom navigation', async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter(routes, { initialEntries: ['/'] });
    render(<RouterProvider router={router} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Data Detective' })).toBeInTheDocument();

    const bottomNav = within(screen.getByTestId('bottom-nav'));
    await user.click(bottomNav.getByRole('link', { name: /profile/i }));
    expect(screen.getByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument();

    await user.click(bottomNav.getByRole('link', { name: /path/i }));
    expect(screen.getByRole('heading', { level: 1, name: 'Data Detective' })).toBeInTheDocument();
  });
});
