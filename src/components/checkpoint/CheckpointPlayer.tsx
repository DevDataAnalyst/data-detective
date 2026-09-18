import { useEffect, useEffectEvent, useMemo, useReducer, useRef, useState } from 'react';
import type { Checkpoint } from '../../content/types';
import {
  checkpointSessionReducer,
  correctNeeded,
  createCheckpointSession,
  type CheckpointSessionAction,
  type CheckpointSessionState,
} from '../../game/checkpoint';
import { gradeAnswer, isAnswerReady, type Answer } from '../../game/grading';
import { useEvents } from '../../storage/eventsContext';
import { buttonStyles } from '../buttonStyles';
import { ConfirmDialog } from '../ConfirmDialog';
import { handlesEnterNatively, usePrefersReducedMotion } from '../hooks';
import { CloseIcon } from '../icons';
import { ProgressBar } from '../lesson/ProgressBar';
import { QuestionView } from '../questions/QuestionView';

interface CheckpointPlayerProps {
  checkpoint: Checkpoint;
  lessonCount: number;
  /** XP for passing, shown on the intro. */
  xp: number;
  /** How long a learner waits to retake after failing, in words, e.g. "1 hour". */
  retakeDelay: string;
  onExit: () => void;
  /** Called once, when the last question is answered. */
  onFinish: (session: CheckpointSessionState) => void;
}

/** The test-out checkpoint: every question once, in order, with results only at the end. */
export function CheckpointPlayer({
  checkpoint,
  lessonCount,
  xp,
  retakeDelay,
  onExit,
  onFinish,
}: CheckpointPlayerProps) {
  const questions = useMemo(
    () => new Map(checkpoint.items.map((item) => [item.question.id, item.question])),
    [checkpoint],
  );
  const [session, dispatch] = useReducer(
    checkpointSessionReducer,
    checkpoint.items.map((item) => item.question.id),
    createCheckpointSession,
  );
  const [draft, setDraft] = useState<{ key: string; answer: Answer | null } | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const finishReported = useRef(false);
  const reducedMotion = usePrefersReducedMotion();
  const events = useEvents();
  /** When the current question appeared, set by the effect below. */
  const shownAt = useRef(0);

  const questionId = session.phase === 'question' ? session.questionIds[session.index] : null;
  const question = questionId ? (questions.get(questionId) ?? null) : null;
  const answer = draft && draft.key === questionId ? draft.answer : null;
  const total = session.questionIds.length;
  const isLast = session.index === total - 1;

  const apply = (action: CheckpointSessionAction) => {
    const next = checkpointSessionReducer(session, action);
    dispatch(action);
    if (next.phase === 'finished' && !finishReported.current) {
      finishReported.current = true;
      onFinish(next);
    }
  };

  const start = () => {
    events.record({ type: 'checkpoint_started', checkpointId: checkpoint.id });
    apply({ type: 'start', now: Date.now() });
  };
  const submit = () => {
    if (!question || !isAnswerReady(answer)) return;
    const correct = gradeAnswer(question, answer);
    events.record({
      type: 'question_answered',
      questionId: question.id,
      questionType: question.type,
      source: 'checkpoint',
      lessonId: checkpoint.items[session.index]?.lessonId ?? null,
      firstAttempt: true,
      correct,
      ms: Date.now() - shownAt.current,
    });
    apply({ type: 'answer', answer, correct, now: Date.now() });
  };

  // Enter moves on once an answer is given. Buttons and links keep their own Enter behaviour.
  const onEnter = useEffectEvent(() => submit());
  useEffect(() => {
    if (session.phase !== 'question' || exitOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.repeat || event.isComposing) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (handlesEnterNatively(event.target)) return;
      event.preventDefault();
      onEnter();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [session.phase, exitOpen]);

  // Each new question takes focus, so screen readers read the prompt first.
  useEffect(() => {
    if (!questionId) return;
    shownAt.current = Date.now();
    window.scrollTo?.({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, [questionId]);

  // Leaving part way through does not count as an attempt, but it is worth knowing about.
  const reportAbandoned = useEffectEvent(() => {
    if (session.phase !== 'question') return;
    events.record({
      type: 'checkpoint_abandoned',
      checkpointId: checkpoint.id,
      answered: session.index,
      total,
    });
  });
  useEffect(() => () => reportAbandoned(), []);

  const exit = () => (session.phase === 'question' ? setExitOpen(true) : onExit());

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-2xl items-center gap-3 px-3">
          <button
            type="button"
            aria-label="Exit checkpoint"
            className={buttonStyles.icon}
            onClick={exit}
          >
            <CloseIcon className="text-2xl" />
          </button>
          <ProgressBar done={session.index} total={total} label="Checkpoint progress" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-32">
        {session.phase === 'intro' && (
          <section aria-labelledby="checkpoint-intro-title" className="space-y-5 pt-2">
            <p className="text-sm font-bold tracking-wide text-current-ink-700 uppercase">
              Test out · {total} questions · about 5 min
            </p>
            <h1 id="checkpoint-intro-title" className="text-3xl font-bold text-slate-900">
              {checkpoint.title}
            </h1>
            <p className="text-lg leading-relaxed text-slate-700">
              Get {correctNeeded(checkpoint)} of {total} right to mark all {lessonCount} lessons as
              done, open the mission and earn {xp} XP.
            </p>
            <ul className="space-y-2 text-slate-700">
              <li className="flex gap-2">
                <span aria-hidden="true">•</span>Each question is asked once.
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true">•</span>
                You’ll see what you got right, with explanations, at the end.
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true">•</span>
                If you don’t pass, the lessons are still there, and you can try again after{' '}
                {retakeDelay}.
              </li>
            </ul>
          </section>
        )}

        {session.phase === 'question' && question && (
          <div key={question.id} className="space-y-3">
            <p className="text-sm font-semibold text-slate-600">
              Question {session.index + 1} of {total}
            </p>
            <QuestionView
              question={question}
              answer={answer}
              onAnswer={(nextAnswer) => setDraft({ key: question.id, answer: nextAnswer })}
              reveal={false}
              locked={false}
              shortcuts={!exitOpen}
              animate={!reducedMotion}
              headingRef={headingRef}
            />
          </div>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-surface pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-2xl px-4 py-3">
          {session.phase === 'intro' && (
            <button
              type="button"
              autoFocus
              className={`w-full ${buttonStyles.primary}`}
              onClick={start}
            >
              Start checkpoint
            </button>
          )}
          {session.phase === 'question' && (
            <button
              type="button"
              className={`w-full ${buttonStyles.primary}`}
              disabled={!isAnswerReady(answer)}
              onClick={submit}
            >
              {isLast ? 'Finish' : 'Next'}
            </button>
          )}
        </div>
      </footer>

      <ConfirmDialog
        open={exitOpen}
        title="Leave the checkpoint?"
        description="This attempt won’t count, so you can start again whenever you like."
        cancelLabel="Keep going"
        confirmLabel="Leave"
        onCancel={() => setExitOpen(false)}
        onConfirm={onExit}
      />
    </div>
  );
}
