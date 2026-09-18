import type { ReactNode } from 'react';
import type { EventLog } from './events';
import { EventsContext } from './eventsContext';
import { ProgressContext } from './progressContext';
import type { ProgressStore } from './progressStore';
import type { ThemeStore } from './theme';
import { ThemeContext } from './themeContext';

/** Gives the app its progress store and, when passed, its event log and theme. */
export function ProgressProvider({
  store,
  events,
  theme,
  children,
}: {
  store: ProgressStore;
  events?: EventLog;
  theme?: ThemeStore;
  children: ReactNode;
}) {
  let tree = <ProgressContext value={store}>{children}</ProgressContext>;
  if (events) tree = <EventsContext value={events}>{tree}</EventsContext>;
  if (theme) tree = <ThemeContext value={theme}>{tree}</ThemeContext>;
  return tree;
}
