import { useEffect, useRef, useState, type ReactNode } from 'react';
import { buttonStyles } from '../../components/buttonStyles';
import { PlayIcon, RefreshIcon } from '../../components/icons';
import type { CodeTask } from '../../content/types';
import type { RunOutcome } from '../python/pythonRuntime';
import { CodeEditor } from './CodeEditor';
import { OutputPanel } from './OutputPanel';

interface CodeTaskPanelProps {
  task: CodeTask;
  label: string;
  /** Saved code for this task, or null to start from the starter code. */
  savedCode: string | null;
  canRun: boolean;
  running: boolean;
  /** Packages being downloaded before the code can start. */
  downloadingPackages: string | null;
  runLabel: string;
  outcome: RunOutcome | null;
  /** Check feedback for the latest run, shown between the run button and the output. */
  feedback: ReactNode;
  onCodeChange: (code: string) => void;
  onRun: (code: string) => void;
  onResetEnvironment: () => void;
}

const SAVE_DELAY_MS = 600;

/** Editor, run controls and output for one code task. Mount one per task (key by task id). */
export function CodeTaskPanel({
  task,
  label,
  savedCode,
  canRun,
  running,
  downloadingPackages,
  runLabel,
  outcome,
  feedback,
  onCodeChange,
  onRun,
  onResetEnvironment,
}: CodeTaskPanelProps) {
  // The editor owns the text while it is open; saved code only seeds it.
  const [initialCode] = useState(() => savedCode ?? task.starterCode);
  const code = useRef(initialCode);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingSave = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      clearTimeout(saveTimer.current);
      pendingSave.current?.();
    },
    [],
  );

  const handleChange = (next: string) => {
    code.current = next;
    clearTimeout(saveTimer.current);
    pendingSave.current = () => {
      pendingSave.current = null;
      onCodeChange(next);
    };
    saveTimer.current = setTimeout(() => pendingSave.current?.(), SAVE_DELAY_MS);
  };

  const run = () => {
    if (!canRun) return;
    clearTimeout(saveTimer.current);
    pendingSave.current = null;
    onRun(code.current);
  };

  return (
    <div className="space-y-3">
      <CodeEditor
        initialCode={initialCode}
        label={`Python code for task ${label}: ${task.title}`}
        onChange={handleChange}
        onRun={run}
      />
      <p className="text-xs text-slate-500">
        Press Esc then Tab to move out of the editor. Ctrl + Enter (⌘ + Enter on Mac) runs your
        code.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={run}
          disabled={!canRun}
          className={`${buttonStyles.primary} min-w-32`}
        >
          <PlayIcon aria-hidden="true" />
          {runLabel}
        </button>
        <button
          type="button"
          onClick={onResetEnvironment}
          disabled={running}
          className={`ml-auto ${buttonStyles.ghost} text-sm`}
        >
          <RefreshIcon aria-hidden="true" />
          Reset environment
        </button>
      </div>
      {!running && feedback}
      <OutputPanel outcome={outcome} running={running} downloadingPackages={downloadingPackages} />
    </div>
  );
}
