import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { buttonStyles } from '../components/buttonStyles';
import { BoltIcon, CheckIcon, LockIcon, SearchIcon } from '../components/icons';
import { RichText } from '../components/RichText';
import { useRewards } from '../components/rewards/useRewards';
import type { CodeTask, Mission, MissionTask } from '../content/types';
import {
  missionProgress,
  recordHintShown,
  recordTaskRun,
  replayCode,
  saveMissionFacts,
  saveRecommendation,
  saveTaskCode,
  selectTask,
  taskProgress,
} from '../game/missionProgress';
import {
  missionTaskCounts,
  nextTaskId,
  suggestedTaskId,
  taskLock,
  taskStatus,
} from '../game/missionRules';
import { useProgress, useProgressStore } from '../storage/progressContext';
import { CodeTaskPanel } from './components/CodeTaskPanel';
import { HintPanel } from './components/HintPanel';
import { RuntimeBanner } from './components/RuntimeBanner';
import { TaskFeedbackPanel, type ShownFeedback } from './components/TaskFeedbackPanel';
import { TaskList } from './components/TaskList';
import { WrittenTaskPanel } from './components/WrittenTaskPanel';
import { feedbackForRun, type TaskFeedback } from './grading';
import {
  describeOutcome,
  HINT_LEVELS,
  MISSION_SUMMARY_PATH,
  runSucceeded,
  taskLabel,
} from './missionHelpers';
import type {
  PythonRuntime,
  PythonRuntimeOptions,
  RunOutcome,
  RuntimePhase,
} from './python/pythonRuntime';
import { usePythonRuntime } from './python/usePythonRuntime';

interface MissionWorkspaceProps {
  mission: Mission;
  /** Lets tests swap in a runtime with a fake worker. */
  createRuntime?: (options: PythonRuntimeOptions) => PythonRuntime;
}

function absoluteUrl(path: string): string {
  return new URL(path, document.baseURI).href;
}

function announceFeedback(outcome: RunOutcome, feedback: TaskFeedback | null, xp: number): string {
  const ran = describeOutcome(outcome);
  if (!feedback) return ran;
  if (feedback.kind === 'passed') {
    return `${ran} Task passed${xp > 0 ? `, ${xp} XP earned` : ''}. ${feedback.message}`;
  }
  return `${ran} Not quite yet. ${feedback.message}`;
}

export default function MissionWorkspace({ mission, createRuntime }: MissionWorkspaceProps) {
  const store = useProgressStore();
  const progress = useProgress();
  const rewards = useRewards();
  const navigate = useNavigate();
  const saved = missionProgress(progress, mission.id);
  const taskIds = mission.tasks.map((task) => task.id);

  const { runtime, state: runtimeState } = usePythonRuntime(
    {
      datasetUrl: absoluteUrl(mission.dataset.url),
      datasetFileName: mission.dataset.fileName,
      replayCode: () => replayCode(store.getSnapshot(), mission.id, taskIds),
    },
    createRuntime,
  );

  const [outcomes, setOutcomes] = useState<Record<string, RunOutcome>>({});
  const [feedback, setFeedback] = useState<Record<string, ShownFeedback>>({});
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  // Keep what Python worked out about the dataset, for the summary screen.
  const facts = runtimeState.summary;
  useEffect(() => {
    if (facts) store.update((state) => saveMissionFacts(state, mission.id, facts));
  }, [store, mission.id, facts]);

  const activeTask =
    mission.tasks.find((task) => task.id === saved.activeTaskId) ??
    mission.tasks.find((task) => task.id === suggestedTaskId(mission, saved)) ??
    mission.tasks[0];
  const activeLabel = taskLabel(mission.tasks, activeTask.id);
  const lock = taskLock(mission, saved, activeTask.id);
  const ready = runtimeState.phase === 'ready';
  const completed = saved.completedAt !== null;
  const counts = missionTaskCounts(mission, saved);

  const select = (taskId: string) => store.update((state) => selectTask(state, mission.id, taskId));

  const runTask = async (task: CodeTask, code: string) => {
    setRunningTaskId(task.id);
    // Save the task as the active one too, so passing it does not move the learner on by itself.
    store.update((state) =>
      selectTask(saveTaskCode(state, mission.id, task.id, code), mission.id, task.id),
    );
    const outcome = await runtime.run(code, task.id);
    setRunningTaskId(null);
    setOutcomes((previous) => ({ ...previous, [task.id]: outcome }));

    const alreadyPassed =
      taskProgress(store.getSnapshot(), mission.id, task.id).status === 'passed';
    if (outcome.kind === 'completed') {
      store.update((state) =>
        recordTaskRun(state, mission.id, task.id, { code, succeeded: runSucceeded(outcome) }),
      );
    }
    const result = feedbackForRun(outcome, { alreadyPassed });
    const xp = result?.kind === 'passed' ? rewards.passMissionTask(mission, task.id).xp : 0;
    setFeedback((previous) => {
      const next = { ...previous };
      if (result) next[task.id] = { ...result, xp };
      else delete next[task.id];
      return next;
    });
    setAnnouncement(announceFeedback(outcome, result, xp));
  };

  const resetEnvironment = async () => {
    await runtime.resetEnvironment();
    setOutcomes({});
    setFeedback({});
    setAnnouncement('Python was reset. Run your tasks again to recreate their variables.');
  };

  const showHint = (task: CodeTask, level: number) =>
    store.update((state) => recordHintShown(state, mission.id, task.id, level));

  const submitRecommendation = (answer: { text: string; selfReview: string[] }) => {
    const outcome = rewards.completeMission({
      mission,
      recommendation: answer.text,
      selfReview: answer.selfReview,
      facts: runtimeState.summary,
    });
    if (outcome.completedNow) {
      void navigate(MISSION_SUMMARY_PATH, { state: { justCompleted: true } });
    }
  };

  const runLabel =
    runningTaskId === activeTask.id
      ? 'Running…'
      : runtimeState.phase === 'failed'
        ? 'Python unavailable'
        : ready || runtimeState.phase === 'running'
          ? 'Run'
          : 'Python is loading…';

  const renderFeedback = (task: CodeTask) => {
    const shown = feedback[task.id];
    if (!shown) return null;
    const hintsShown = saved.tasks[task.id]?.hintsShown ?? 0;
    const nextId = shown.kind === 'passed' ? nextTaskId(mission, saved, task.id) : null;
    const next = mission.tasks.find((candidate) => candidate.id === nextId);
    return (
      <TaskFeedbackPanel
        feedback={shown}
        next={
          next
            ? {
                label: taskLabel(mission.tasks, next.id),
                title: next.title,
                onSelect: () => select(next.id),
              }
            : null
        }
        summaryHref={completed ? MISSION_SUMMARY_PATH : null}
        hint={
          hintsShown < HINT_LEVELS
            ? {
                label: hintsShown === 0 ? 'Show a hint' : 'Show another hint',
                onShow: () => showHint(task, hintsShown + 1),
              }
            : null
        }
      />
    );
  };

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-current-700 hover:bg-current-50"
          >
            ← Path
          </Link>
          <p className="flex min-w-0 flex-1 items-center gap-2 font-bold text-slate-900">
            <SearchIcon className="shrink-0 text-xp-600" aria-hidden="true" />
            <span className="truncate">{mission.title}</span>
          </p>
          <RuntimeStatusPill phase={runtimeState.phase} />
          <p
            className="hidden items-center gap-1 rounded-full bg-xp-50 px-2.5 py-1 text-sm font-bold text-xp-700 sm:flex"
            aria-label={`${progress.activity.totalXp} XP in total`}
          >
            <BoltIcon aria-hidden="true" />
            <span aria-hidden="true">{progress.activity.totalXp} XP</span>
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-4 px-4 py-4">
        <h1 className="sr-only">Mission: {mission.title}</h1>

        {completed && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-correct-50 p-3 ring-1 ring-correct-200">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-correct-700 text-lg text-white"
            >
              <CheckIcon />
            </span>
            <p className="min-w-0 flex-1 font-semibold text-correct-900">
              Mission complete.{' '}
              {counts.stretchPassed < counts.stretchTotal
                ? 'The stretch tasks are still open if you want more practice.'
                : 'You finished every task.'}
            </p>
            <Link
              to={MISSION_SUMMARY_PATH}
              className={`${buttonStyles.secondary} min-h-11 text-sm`}
            >
              See your summary
            </Link>
          </div>
        )}

        <details open={!completed} className="group rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-bold text-slate-900">
            The case
            <span aria-hidden="true" className="text-slate-500 group-open:rotate-180">
              ▾
            </span>
          </summary>
          <RichText
            text={mission.brief}
            className="mt-2 space-y-2 leading-relaxed text-slate-700"
          />
          <details className="mt-3 rounded-xl bg-slate-50 p-3">
            <summary className="min-h-11 cursor-pointer content-center font-semibold text-slate-800">
              About the data: <code className="font-mono">{mission.dataset.fileName}</code>
            </summary>
            <dl className="mt-2 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
              {mission.dataset.columns.map((column) => (
                <div key={column.name} className="contents">
                  <dt className="font-mono font-semibold text-slate-900">{column.name}</dt>
                  <dd className="mb-1 text-slate-600 sm:mb-0">{column.description}</dd>
                </div>
              ))}
            </dl>
          </details>
        </details>

        <RuntimeBanner state={runtimeState} onRetry={() => runtime.retry()} />

        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start">
          <div className="min-w-0 space-y-2 lg:sticky lg:top-18">
            <p className="text-sm font-semibold text-slate-600">
              {counts.requiredPassed} of {counts.requiredTotal} code tasks passed
            </p>
            <TaskList
              tasks={mission.tasks}
              activeTaskId={activeTask.id}
              statusOf={(taskId) => taskStatus(mission, saved, taskId)}
              isLocked={(taskId) => taskLock(mission, saved, taskId).locked}
              onSelect={select}
            />
          </div>

          <section
            aria-labelledby="task-title"
            className="min-w-0 space-y-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200"
          >
            <div>
              <p className="text-sm font-bold text-current-700">
                {activeTask.stretch ? 'Stretch task' : `Task ${activeLabel}`}
              </p>
              <h2 id="task-title" className="text-xl font-bold text-slate-900">
                {activeTask.title}
              </h2>
            </div>
            <RichText
              text={activeTask.instructions}
              className="space-y-2 leading-relaxed text-slate-700"
            />

            {lock.locked ? (
              <LockedTask
                reason={lock.reason}
                openTask={mission.tasks.find((task) => task.id === suggestedTaskId(mission, saved))}
                tasks={mission.tasks}
                onSelect={select}
              />
            ) : activeTask.kind === 'code' ? (
              <>
                {activeTask.creates.length > 0 && (
                  <p className="text-sm text-slate-600">
                    Creates:{' '}
                    {activeTask.creates.map((name, index) => (
                      <span key={name}>
                        {index > 0 && ', '}
                        <code className="rounded bg-slate-100 px-1 font-mono text-slate-900">
                          {name}
                        </code>
                      </span>
                    ))}
                  </p>
                )}
                <HintPanel
                  key={`hints-${activeTask.id}`}
                  hints={activeTask.hints}
                  shown={saved.tasks[activeTask.id]?.hintsShown ?? 0}
                  onShow={(level) => showHint(activeTask, level)}
                />
                <CodeTaskPanel
                  key={activeTask.id}
                  task={activeTask}
                  label={activeLabel}
                  savedCode={saved.tasks[activeTask.id]?.code ?? null}
                  canRun={ready && runningTaskId === null}
                  running={runningTaskId === activeTask.id}
                  downloadingPackages={runtimeState.downloadingPackages}
                  runLabel={runLabel}
                  outcome={outcomes[activeTask.id] ?? null}
                  feedback={renderFeedback(activeTask)}
                  onCodeChange={(code) =>
                    store.update((state) => saveTaskCode(state, mission.id, activeTask.id, code))
                  }
                  onRun={(code) => void runTask(activeTask, code)}
                  onResetEnvironment={() => void resetEnvironment()}
                />
              </>
            ) : (
              <WrittenTaskPanel
                key={`${activeTask.id}-${completed ? 'sent' : 'draft'}`}
                task={activeTask}
                savedText={saved.recommendation}
                sent={
                  completed
                    ? { selfReview: saved.selfReview, summaryHref: MISSION_SUMMARY_PATH }
                    : null
                }
                onTextChange={(text) =>
                  store.update((state) => saveRecommendation(state, mission.id, text))
                }
                onSubmit={submitRecommendation}
              />
            )}
          </section>
        </div>
      </main>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

function LockedTask({
  reason,
  openTask,
  tasks,
  onSelect,
}: {
  reason: string;
  openTask: MissionTask | undefined;
  tasks: readonly MissionTask[];
  onSelect: (taskId: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <p className="flex items-start gap-2 font-semibold text-slate-800">
        <LockIcon className="mt-0.5 shrink-0 text-locked-500" aria-hidden="true" />
        {reason}
      </p>
      {openTask && (
        <button
          type="button"
          onClick={() => onSelect(openTask.id)}
          className={buttonStyles.primary}
        >
          Go to {openTask.stretch ? 'stretch task' : `task ${taskLabel(tasks, openTask.id)}`}:{' '}
          {openTask.title}
        </button>
      )}
    </div>
  );
}

function RuntimeStatusPill({ phase }: { phase: RuntimePhase }) {
  const { text, dot } = {
    idle: { text: 'Python starting', dot: 'bg-slate-400' },
    loading: { text: 'Python loading', dot: 'bg-streak-500' },
    restoring: { text: 'Restoring work', dot: 'bg-streak-500' },
    restarting: { text: 'Restarting', dot: 'bg-streak-500' },
    ready: { text: 'Python ready', dot: 'bg-correct-600' },
    running: { text: 'Running', dot: 'bg-current-600' },
    failed: { text: 'Python offline', dot: 'bg-incorrect-600' },
  }[phase];
  return (
    <p className="flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
      <span aria-hidden="true" className={`size-2 rounded-full ${dot}`} />
      {text}
    </p>
  );
}
