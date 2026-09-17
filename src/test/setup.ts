import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom logs "not implemented" for scrolling; the app only scrolls for comfort.
window.scrollTo = () => {};

// CodeMirror measures text with Range geometry, which jsdom does not implement.
Range.prototype.getBoundingClientRect ??= () => new DOMRect();
Range.prototype.getClientRects ??= () =>
  Object.assign([], { item: () => null }) as unknown as DOMRectList;

afterEach(() => {
  cleanup();
});
