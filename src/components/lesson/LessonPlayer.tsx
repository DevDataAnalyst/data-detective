import {
  useEffect,
  useEffectEvent,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useEvents } from '../../storage/eventsContext';
import { fillTemplate } from '../../content/template';
import type { Lesson } from '../../content/types';
import type { LessonXpAward } from '../../game/xp';
import { gradeAnswer, isAnswerReady, type Answer } from '../../game/grading';
import {
  attemptNumber,
  createLessonSession,
  currentQuestionId,
  firstAttemptAccuracy,
  isRetry,
  lessonSessionReducer,
  sessionDurationMs,
  type LessonSessionAction,
} from '../../game/lessonSession';
import { buttonStyles } from '../buttonStyles';
import { ConfirmDialog } from '../ConfirmDialog';
import { handlesEnterNatively, usePrefersReducedMotion } from '../hooks';
import { CloseIcon } from '../icons';
import { QuestionView } from '../questions/QuestionView';
import { RichText } from '../RichText';
import { feedbackHeadline } from './feedbackCopy';
import { FeedbackPanel } from './FeedbackPanel';
import { LessonSummary } from './LessonSummary';
import { ProgressBar } from './ProgressBar';

export interface LessonResult {
  lessonId: string;
  /** Share of questions right on the first try, 0 to 1. */
  firstAttemptAccuracy: number;
  durationMs: number;
}

interface LessonPlayerProps {
  lesson: Lesson;
  /** One-based position on the path, shown on the intro. */
  lessonNumber: number;
  onExit: () => void;
  /** Called once when the summary is reached. Returns the XP awarded, to show on the summary. */
  onFinish?: (result: LessonResult) => LessonXpAward | void;
  /** Shown under the summary, for a one-tap question at a natural pause. */
  summaryExtra?: ReactNode;
}

export function LessonPlayer({
  lesson,
  lessonNumber,
  onExit,
  onFinish,
  summaryExtra,
}: LessonPlayerProps) {
  const questionsById = useMemo(
    () => new Map(lesson.questions.map((question) => [question.id, question])),
    [lesson],
  );
  const [session, dispatch] = useReducer(
    lessonSessionReducer,
    lesson.questions.map((question) => question.id),
    createLessonSession,
  );
  const [draft, setDraft] = useState<{ key: string; answer: Answer | null } | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const [award, setAward] = useState<LessonXpAward | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const finishReported = useRef(false);
  const reducedMotion = usePrefersReducedMotion();
  const events = useEvents();
  /** When the current question appeared, set by the effect below. */
  const shownAt = useRef(0);

  const questionId = currentQuestionId(session);
  const question = questionId ? (questionsById.get(questionId) ?? null) : null;
  const attemptKey = questionId ? `${questionId}:${attemptNumber(session)}` : '';
  const answer = draft?.key === attemptKey ? draft.answer : null;
  const inFeedback = session.phase === 'question' && session.status === 'feedback';
  const total = lesson.questions.length;

  const apply = (action: LessonSessionAction) => {
    const next = lessonSessionReducer(session, action);
    dispatch(action);
    if (next.phase === 'summary' && !finishReported.current) {
      finishReported.current = true;
      events.record({
        type: 'lesson_completed',
        lessonId: lesson.id,
        firstAttemptAccuracy: firstAttemptAccuracy(next),
        ms: sessionDurationMs(next) ?? 0,
      });
      const awarded = onFinish?.({
        lessonId: lesson.id,
        firstAttemptAccuracy: firstAttemptAccuracy(next),
        durationMs: sessionDurationMs(next) ?? 0,
      });
      if (awarded) setAward(awarded);
    }
  };

  const start = () => {
    events.record({ type: 'lesson_started', lessonId: lesson.id });
    apply({ type: 'start', now: Date.now() });
  };
  const check = () => {
    if (!question || inFeedback || !isAnswerReady(answer)) return;
    const correct = gradeAnswer(question, answer);
    events.record({
      type: 'question_answered',
      questionId: question.id,
      questionType: question.type,
      source: 'lesson',
      lessonId: lesson.id,
      firstAttempt: attemptNumber(session) === 0,
      correct,
      ms: Date.now() - shownAt.current,
    });
    apply({ type: 'submit', correct });
  };
  const next = () => apply({ type: 'continue', now: Date.now() });

  // Enter checks an answer, then continues. Buttons and links keep their own Enter behaviour.
  const onEnter = useEffectEvent(() => (inFeedback ? next() : check()));
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
    if (!attemptKey) return;
    shownAt.current = Date.now();
    window.scrollTo?.({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, [attemptKey]);

  // Leaving part way through is the signal that a lesson was abandoned.
  const reportAbandoned = useEffectEvent(() => {
    if (session.phase !== 'question') return;
    events.record({
      type: 'lesson_abandoned',
      lessonId: lesson.id,
      answered: session.completedIds.length,
      total,
      ms: Date.now() - (session.startedAt ?? Date.now()),
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
            aria-label={session.phase === 'summary' ? 'Close lesson' : 'Exit lesson'}
            className={buttonStyles.icon}
            onClick={exit}
          >
            <CloseIcon className="text-2xl" />
          </button>
          <ProgressBar done={session.completedIds.length} total={total} label="Lesson progress" />
        </div>
      </header>

      <main
        className={`mx-auto w-full max-w-2xl flex-1 px-4 pt-4 ${inFeedback ? 'pb-[26rem]' : 'pb-32'}`}
      >
        {session.phase === 'intro' && (
          <section aria-labelledby="lesson-intro-title" className="space-y-5 pt-2">
            <p className="text-sm font-bold tracking-wide text-current-ink-700 uppercase">
              Lesson {lessonNumber} · about {lesson.estimatedMinutes} min
            </p>
            <h1 id="lesson-intro-title" className="text-3xl font-bold text-slate-900">
              {lesson.title}
            </h1>
            <RichText
              text={lesson.intro}
              className="space-y-3 text-lg leading-relaxed text-slate-700"
            />
            <p className="text-sm text-slate-600">
              {total} questions. Anything you miss comes back later, so there is no rush.
            </p>
          </section>
        )}

        {session.phase === 'question' && question && (
          <div key={attemptKey}>
            {isRetry(session) && (
              <p className="mb-3 inline-flex rounded-full bg-incorrect-100 px-3 py-1 text-sm font-semibold text-incorrect-ink-900">
                Second look: you have seen the explanation now
              </p>
            )}
            <QuestionView
              question={question}
              answer={answer}
              onAnswer={(nextAnswer) => setDraft({ key: attemptKey, answer: nextAnswer })}
              reveal={inFeedback}
              locked={inFeedback}
              shortcuts={!exitOpen}
              animate={!reducedMotion}
              headingRef={headingRef}
            />
          </div>
        )}

        {session.phase === 'summary' && (
          <div className="space-y-6">
            <LessonSummary
              lessonTitle={lesson.title}
              accuracy={firstAttemptAccuracy(session)}
              durationMs={sessionDurationMs(session) ?? 0}
              award={award}
            />
            {summaryExtra}
          </div>
        )}
      </main>

      {!inFeedback && (
        <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-surface pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto max-w-2xl px-4 py-3">
            {session.phase === 'intro' && (
              <button
                key="start"
                type="button"
                autoFocus
                className={`w-full ${buttonStyles.primary}`}
                onClick={start}
              >
                Start
              </button>
            )}
            {session.phase === 'question' && (
              <button
                key="check"
                type="button"
                className={`w-full ${buttonStyles.primary}`}
                disabled={!isAnswerReady(answer)}
                onClick={check}
              >
                Check
              </button>
            )}
            {session.phase === 'summary' && (
              <button
                key="back"
                type="button"
                autoFocus
                className={`w-full ${buttonStyles.primary}`}
                onClick={onExit}
              >
                Back to path
              </button>
            )}
          </div>
        </footer>
      )}

      {inFeedback && question && (
        <FeedbackPanel
          key={attemptKey}
          correct={session.lastAnswerCorrect === true}
          headline={feedbackHeadline(session.lastAnswerCorrect === true, attemptKey)}
          explanation={fillTemplate(question.explanation, question.dataset)}
          note={
            session.lastAnswerCorrect
              ? undefined
              : 'This question will come back before the lesson ends.'
          }
          onContinue={next}
        />
      )}

      <p aria-live="polite" className="sr-only">
        {inFeedback ? (session.lastAnswerCorrect ? 'Correct.' : 'Not quite.') : ''}
      </p>

      <ConfirmDialog
        open={exitOpen}
        title="Leave this lesson?"
        description="Your answers in this lesson won't be saved, but you can start it again any time."
        cancelLabel="Keep learning"
        confirmLabel="Leave lesson"
        onCancel={() => setExitOpen(false)}
        onConfirm={onExit}
      />
    </div>
  );
}
