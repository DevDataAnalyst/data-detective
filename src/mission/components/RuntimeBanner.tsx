import { buttonStyles } from '../../components/buttonStyles';
import { AlertIcon, RefreshIcon } from '../../components/icons';
import type { LoadStage } from '../python/protocol';
import type { RuntimeState } from '../python/pythonRuntime';

const STAGES: Record<LoadStage, { step: number; text: string; percent: number }> = {
  python: { step: 1, text: 'Downloading Python', percent: 25 },
  packages: { step: 2, text: 'Loading pandas', percent: 65 },
  data: { step: 3, text: 'Loading the delivery data', percent: 90 },
};

interface RuntimeBannerProps {
  state: RuntimeState;
  /** False while the browser has no connection. */
  online: boolean;
  onRetry: () => void;
}

/** Explains what Python is doing while it is not ready to run code. */
export function RuntimeBanner({ state, online, onRetry }: RuntimeBannerProps) {
  if (state.phase === 'failed') {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-start gap-3 rounded-2xl border-2 border-incorrect-200 bg-incorrect-50 p-4 text-incorrect-900"
      >
        <AlertIcon className="mt-0.5 shrink-0 text-xl" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-bold">Python couldn’t load</p>
          <p className="text-sm">
            {online
              ? 'Check your internet connection and try again. Your code is saved on this device.'
              : 'You’re offline. Python will try again when you reconnect. Your code is saved on this device.'}
          </p>
          {state.error && <p className="mt-1 font-mono text-xs break-words">{state.error}</p>}
        </div>
        <button type="button" onClick={onRetry} className={buttonStyles.secondary}>
          <RefreshIcon aria-hidden="true" />
          Try again
        </button>
      </div>
    );
  }

  if (state.phase !== 'loading' && state.phase !== 'restarting' && state.phase !== 'restoring') {
    return null;
  }

  const stage = state.stage ? STAGES[state.stage] : null;
  const title =
    state.phase === 'restoring'
      ? 'Restoring your earlier work'
      : state.phase === 'restarting'
        ? 'Restarting Python'
        : 'Setting up Python in your browser';
  const detail =
    state.phase === 'restoring'
      ? 'Running the code from tasks you have already done, so their variables exist again.'
      : stage
        ? `Step ${stage.step} of 3: ${stage.text}…`
        : 'Starting…';

  return (
    <div role="status" className="rounded-2xl bg-current-50 p-4 ring-1 ring-current-200">
      <p className="font-bold text-slate-900">{title}</p>
      <p className="text-sm text-slate-700">{detail}</p>
      <div
        aria-hidden="true"
        className="mt-3 h-2 overflow-hidden rounded-full bg-white ring-1 ring-current-200"
      >
        <div
          className="h-full rounded-full bg-current-600 transition-[width] duration-700 motion-reduce:transition-none"
          style={{ width: `${state.phase === 'restoring' ? 95 : (stage?.percent ?? 8)}%` }}
        />
      </div>
      {state.phase === 'loading' && (
        <p className="mt-2 text-xs text-slate-600">
          The first time takes a while on a slow connection (about 25 MB, saved for next time). You
          can read the tasks and start writing code while you wait.
        </p>
      )}
    </div>
  );
}
