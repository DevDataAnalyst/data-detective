import { useState, type ReactNode } from 'react';
import { buttonStyles } from '../components/buttonStyles';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { CopyIcon, DownloadIcon } from '../components/icons';
import { Mascot } from '../components/Mascot';
import { lateDeliveryMystery } from '../content/missions';
import { unit1 } from '../content/unit1';
import { formatMs, playtestSummaryText, summarizePlaytest } from '../game/playtest';
import { EVENTS_SCHEMA_VERSION } from '../storage/events';
import { useEvents, usePlaytestEvents } from '../storage/eventsContext';

const QUESTION_TYPE_NAMES: Record<string, string> = {
  multiple_choice: 'Multiple choice',
  numeric_estimate: 'Numeric estimate',
  predict_reveal: 'Predict and reveal',
  tap_outlier: 'Tap the outlier',
};

function taskTitle(taskId: string): string {
  return lateDeliveryMystery.tasks.find((task) => task.id === taskId)?.title ?? taskId;
}

function lessonTitle(lessonId: string): string {
  return unit1.lessons.find((lesson) => lesson.id === lessonId)?.title ?? lessonId;
}

/** Playtest metrics from the local event log, with an export a tester can send back. */
export function PlaytestPage() {
  const log = useEvents();
  const events = usePlaytestEvents();
  const summary = summarizePlaytest(events);
  const [status, setStatus] = useState('');
  const [clearing, setClearing] = useState(false);

  const exportData = () => {
    const payload = {
      version: EVENTS_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      summary,
      events,
    };
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `data-detective-playtest-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus('Export saved to your downloads.');
    } catch {
      setStatus('This browser blocked the download. Try “Copy summary” instead.');
    }
  };

  const copySummary = async () => {
    try {
      if (!navigator.clipboard) throw new Error('No clipboard');
      await navigator.clipboard.writeText(playtestSummaryText(summary));
      setStatus('Summary copied to your clipboard.');
    } catch {
      setStatus('Copying didn’t work here. Select the summary below and copy it yourself.');
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Playtest data</h1>
        <p className="text-slate-600">
          Everything below is worked out on this device from {summary.events} saved events. Nothing
          is sent anywhere. The only thing you typed that leaves with the export is the optional
          note at the end of the mission.
        </p>
      </header>

      {summary.events === 0 && (
        <div className="flex items-center gap-4 rounded-2xl bg-surface p-4 ring-1 ring-slate-200">
          <Mascot pose="thinking" className="h-20 w-auto shrink-0" />
          <p className="text-slate-700">
            Nothing recorded yet. Play a lesson, then come back to see what the numbers say.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={exportData} className={buttonStyles.primary}>
          <DownloadIcon aria-hidden="true" />
          Export data
        </button>
        <button type="button" onClick={() => void copySummary()} className={buttonStyles.secondary}>
          <CopyIcon aria-hidden="true" />
          Copy summary
        </button>
        <p aria-live="polite" className="text-sm text-slate-600">
          {status}
        </p>
      </div>

      <Panel title="Lessons">
        <Row label="Completed">
          {summary.lessonsCompleted} of {unit1.lessons.length}
        </Row>
        <Row label="Started">{summary.lessonsStarted}</Row>
        <Row label="Left part way">{summary.lessonsAbandoned}</Row>
        <Row label="Median lesson time">{formatMs(summary.medianLessonMs)}</Row>
        <Row label="Daily goal met">{summary.dailyGoalMetDays} day(s)</Row>
      </Panel>

      <Panel title="First-try accuracy by question type">
        {summary.accuracyByType.length === 0 ? (
          <p className="text-slate-600">No questions answered yet.</p>
        ) : (
          <ul className="space-y-2">
            {summary.accuracyByType.map((row) => (
              <li key={row.type} className="flex flex-wrap justify-between gap-2">
                <span className="text-slate-700">{QUESTION_TYPE_NAMES[row.type] ?? row.type}</span>
                <span className="font-semibold text-slate-900 tabular-nums">
                  {row.correct} of {row.answered} (
                  {row.answered === 0 ? '—' : `${Math.round((row.correct / row.answered) * 100)}%`})
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Checkpoint">
        <Row label="Attempts">{summary.checkpoint.attempts}</Row>
        <Row label="Passed">{summary.checkpoint.passed ? 'Yes' : 'No'}</Row>
        <Row label="Last score">{summary.checkpoint.lastScore ?? '—'}</Row>
      </Panel>

      <Panel title="Mission">
        <Row label="Opened">{summary.mission.opened ? 'Yes' : 'No'}</Row>
        <Row label="Python load time">{formatMs(summary.mission.pyodideLoadMs)}</Row>
        <Row label="Gap after last lesson">{formatMs(summary.mission.gapFromLastLessonMs)}</Row>
        <Row label="Completed">{summary.mission.completed ? 'Yes' : 'No'}</Row>
        {summary.mission.tasks.length > 0 && (
          <table className="mt-2 w-full text-sm">
            <caption className="sr-only">Mission task runs and hints</caption>
            <thead>
              <tr className="text-left text-slate-600">
                <th scope="col" className="py-1 font-semibold">
                  Task
                </th>
                <th scope="col" className="py-1 font-semibold">
                  Runs
                </th>
                <th scope="col" className="py-1 font-semibold">
                  Passed
                </th>
                <th scope="col" className="py-1 font-semibold">
                  Hints
                </th>
              </tr>
            </thead>
            <tbody>
              {summary.mission.tasks.map((task) => (
                <tr key={task.taskId} className="border-t border-slate-100">
                  <td className="py-1.5 text-slate-800">{taskTitle(task.taskId)}</td>
                  <td className="py-1.5 tabular-nums">{task.runs}</td>
                  <td className="py-1.5">{task.passed ? 'Yes' : 'No'}</td>
                  <td className="py-1.5 tabular-nums">
                    {task.hints}
                    {task.deepestHint > 0 && ` (to level ${task.deepestHint})`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel title="Where you stopped">
        <p className="text-slate-800">{stopLabel(summary.stoppedAt)}</p>
      </Panel>

      <Panel title="Survey answers">
        {summary.surveys.length === 0 && summary.notes.length === 0 ? (
          <p className="text-slate-600">Nothing answered yet.</p>
        ) : (
          <ul className="space-y-2">
            {summary.surveys.map((row, index) => (
              <li key={`${row.surveyId}-${index}`} className="flex flex-wrap justify-between gap-2">
                <span className="text-slate-700">{SURVEY_NAMES[row.surveyId] ?? row.surveyId}</span>
                <span className="font-semibold text-slate-900">{row.answer}</span>
              </li>
            ))}
            {summary.notes.map((note, index) => (
              <li key={`note-${index}`} className="text-slate-800">
                “{note}”
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Summary text">
        <pre className="overflow-x-auto rounded-xl bg-slate-50 p-3 font-mono text-xs whitespace-pre-wrap text-slate-800 ring-1 ring-slate-200 select-all">
          {playtestSummaryText(summary)}
        </pre>
      </Panel>

      <div>
        <button
          type="button"
          onClick={() => setClearing(true)}
          className={`${buttonStyles.secondary} text-sm`}
        >
          Clear playtest data
        </button>
      </div>

      <ConfirmDialog
        open={clearing}
        title="Clear the playtest data?"
        description="This deletes the saved events and survey answers on this device. Your lessons, XP and mission progress stay as they are."
        cancelLabel="Keep the data"
        confirmLabel="Clear it"
        onCancel={() => setClearing(false)}
        onConfirm={() => {
          log.clear();
          setClearing(false);
          setStatus('Playtest data cleared.');
        }}
      />
    </div>
  );
}

const SURVEY_NAMES: Record<string, string> = {
  lessons_feel: 'How the lessons felt',
  mission_ready: 'How ready for the mission (1–5)',
  lessons_prepared: 'Did lessons prepare you (1–5)',
  more_useful: 'Which part was more useful',
};

/** Swaps the ids in the stop description for titles a reader knows. */
function stopLabel(stoppedAt: string): string {
  return stoppedAt.replace(/“([^”]+)”/g, (_match, id: string) => {
    const lesson = unit1.lessons.find((candidate) => candidate.id === id);
    if (lesson) return `“${lessonTitle(id)}”`;
    const task = lateDeliveryMystery.tasks.find((candidate) => candidate.id === id);
    return task ? `“${taskTitle(id)}”` : `“${id}”`;
  });
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2 rounded-2xl bg-surface p-4 ring-1 ring-slate-200">
      <h2 className="font-bold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p className="flex flex-wrap justify-between gap-2">
      <span className="text-slate-700">{label}</span>
      <span className="font-semibold text-slate-900 tabular-nums">{children}</span>
    </p>
  );
}
