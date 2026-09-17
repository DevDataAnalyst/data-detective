import { describe, expect, it, vi } from 'vitest';
import {
  createEventLog,
  EVENTS_STORAGE_KEY,
  MAX_EVENTS,
  parseStoredEvents,
  serializeEvents,
} from './events';
import { createMemoryStore } from './keyValue';

describe('event log', () => {
  it('records events with a timestamp and reads them back after a refresh', () => {
    const keyValue = createMemoryStore();
    const log = createEventLog(keyValue);
    const listener = vi.fn();
    log.subscribe(listener);

    log.record({ type: 'lesson_started', lessonId: 'the-mean' }, new Date('2026-03-10T10:00:00Z'));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(log.getSnapshot()).toEqual([
      { type: 'lesson_started', lessonId: 'the-mean', at: '2026-03-10T10:00:00.000Z' },
    ]);
    expect(createEventLog(keyValue).getSnapshot()).toEqual(log.getSnapshot());
  });

  it('keeps only the most recent events so storage cannot fill up', () => {
    const log = createEventLog(createMemoryStore());
    for (let index = 0; index < MAX_EVENTS + 5; index += 1) {
      log.record({ type: 'hint_viewed', taskId: `task-${index}`, level: 1 });
    }
    const events = log.getSnapshot();
    expect(events).toHaveLength(MAX_EVENTS);
    expect(events[0]).toMatchObject({ taskId: 'task-5' });
  });

  it('clears everything, including what was saved', () => {
    const keyValue = createMemoryStore();
    const log = createEventLog(keyValue);
    log.record({ type: 'mission_opened', missionId: 'late-delivery-mystery' });
    log.clear();
    expect(log.getSnapshot()).toEqual([]);
    expect(createEventLog(keyValue).getSnapshot()).toEqual([]);
  });

  it('keeps working when storage is blocked', () => {
    const keyValue = createMemoryStore();
    keyValue.getItem = () => {
      throw new Error('blocked');
    };
    keyValue.setItem = () => {
      throw new Error('blocked');
    };
    const log = createEventLog(keyValue);
    expect(() => log.record({ type: 'checkpoint_started', checkpointId: 'c' })).not.toThrow();
    expect(log.getSnapshot()).toHaveLength(1);
  });

  it('ignores corrupt or unexpected saved data', () => {
    expect(parseStoredEvents(null)).toEqual([]);
    expect(parseStoredEvents('not json')).toEqual([]);
    expect(parseStoredEvents(JSON.stringify({ events: 'nope' }))).toEqual([]);
    expect(
      parseStoredEvents(
        JSON.stringify({ events: [{ type: 'lesson_started', at: 'x' }, { type: 5 }, null] }),
      ),
    ).toEqual([{ type: 'lesson_started', at: 'x' }]);
  });

  it('saves under its own key, separate from progress', () => {
    const keyValue = createMemoryStore();
    createEventLog(keyValue).record({ type: 'pyodide_loaded', ms: 12_000 });
    const raw = keyValue.getItem(EVENTS_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw ?? '{}')).toMatchObject({ version: 1 });
    expect(serializeEvents([])).toBe('{"version":1,"events":[]}');
  });
});
