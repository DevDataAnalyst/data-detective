import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom logs "not implemented" for scrolling; the app only scrolls for comfort.
window.scrollTo = () => {};

afterEach(() => {
  cleanup();
});
