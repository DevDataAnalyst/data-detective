import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '../routes';
import { createMemoryStore, type KeyValueStore } from '../storage/keyValue';
import { ProgressProvider } from '../storage/ProgressProvider';
import { createProgressStore, type ProgressStore } from '../storage/progressStore';

interface RenderAppOptions {
  path?: string;
  keyValue?: KeyValueStore;
  store?: ProgressStore;
}

/** Renders the whole app at a path, with its own in-memory storage. */
export function renderApp({ path = '/', keyValue, store }: RenderAppOptions = {}) {
  const progressStore = store ?? createProgressStore(keyValue ?? createMemoryStore());
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const view = render(
    <ProgressProvider store={progressStore}>
      <RouterProvider router={router} />
    </ProgressProvider>,
  );
  return { ...view, router, store: progressStore };
}
