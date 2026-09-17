import type { ReactNode } from 'react';
import type { EventLog } from './events';
import { EventsContext } from './eventsContext';
import { ProgressContext } from './progressContext';
import type { ProgressStore } from './progressStore';

/** Gives the app its progress store and, for playtesting, its event log. */
export function ProgressProvider({
  store,
  events,
  children,
}: {
  store: ProgressStore;
  events?: EventLog;
  children: ReactNode;
}) {
  const withProgress = <ProgressContext value={store}>{children}</ProgressContext>;
  return events ? <EventsContext value={events}>{withProgress}</EventsContext> : withProgress;
}
