import { createContext, useContext, useSyncExternalStore } from 'react';
import { createEventLog, type EventLog, type PlaytestEvent } from './events';
import { createMemoryStore } from './keyValue';

/**
 * The playtest event log. Components outside a provider (isolated component tests) record into a
 * throwaway log, so recording never has to be guarded.
 */
export const EventsContext = createContext<EventLog>(createEventLog(createMemoryStore()));

export function useEvents(): EventLog {
  return useContext(EventsContext);
}

/** The recorded events. Re-renders when a new one arrives. */
export function usePlaytestEvents(): readonly PlaytestEvent[] {
  const log = useEvents();
  return useSyncExternalStore(log.subscribe, log.getSnapshot, log.getSnapshot);
}
