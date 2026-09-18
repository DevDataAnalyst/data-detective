import { CheckIcon, LockIcon } from '../../components/icons';
import type { MissionTask } from '../../content/types';
import type { MissionTaskStatus } from '../../game/missionProgress';
import { taskLabel } from '../missionHelpers';

interface TaskListProps {
  tasks: readonly MissionTask[];
  activeTaskId: string;
  statusOf: (taskId: string) => MissionTaskStatus;
  isLocked: (taskId: string) => boolean;
  onSelect: (taskId: string) => void;
}

const STATUS_TEXT: Record<MissionTaskStatus, string> = {
  not_started: 'not started',
  attempted: 'attempted',
  passed: 'passed',
};

/** Numbered tasks with their status. A row on phones, a column on wide screens. */
export function TaskList({ tasks, activeTaskId, statusOf, isLocked, onSelect }: TaskListProps) {
  return (
    <nav aria-label="Mission tasks">
      <ol className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
        {tasks.map((task) => {
          const status = statusOf(task.id);
          const locked = isLocked(task.id);
          const active = task.id === activeTaskId;
          const label = taskLabel(tasks, task.id);
          return (
            <li key={task.id} className="shrink-0 lg:shrink">
              <button
                type="button"
                onClick={() => onSelect(task.id)}
                aria-current={active ? 'step' : undefined}
                className={`relative flex min-h-12 w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-semibold ring-1 transition-colors ${
                  active
                    ? 'bg-current-50 text-current-ink-800 ring-2 ring-current-600'
                    : locked
                      ? 'bg-slate-100 text-slate-600 ring-slate-200 hover:bg-slate-50'
                      : 'bg-surface text-slate-700 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                <StatusMark status={status} label={label} locked={locked} />
                <span className="whitespace-nowrap lg:whitespace-normal">
                  {task.title}
                  {task.stretch && (
                    <span className="ml-1.5 rounded-full bg-xp-100 px-1.5 py-0.5 text-xs text-xp-ink-700">
                      Stretch
                    </span>
                  )}
                </span>
                <span className="sr-only">, {locked ? 'locked' : STATUS_TEXT[status]}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StatusMark({
  status,
  label,
  locked,
}: {
  status: MissionTaskStatus;
  label: string;
  locked: boolean;
}) {
  if (locked) {
    return (
      <span
        aria-hidden="true"
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-locked-200 text-sm text-locked-600"
      >
        <LockIcon />
      </span>
    );
  }
  if (status === 'passed') {
    return (
      <span
        aria-hidden="true"
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-correct-700 text-sm text-white"
      >
        <CheckIcon />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        status === 'attempted'
          ? 'bg-current-100 text-current-ink-800 ring-2 ring-current-600'
          : 'bg-slate-100 text-slate-600 ring-1 ring-slate-300'
      }`}
    >
      {label}
    </span>
  );
}
