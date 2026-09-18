import { useEffect, useEffectEvent, useId, useMemo, useReducer, useRef, useState } from 'react';
import type { Question, Unit } from '../../content/types';
import {
  BOSS_RULES,
  bossSecondsLeft,
  bossSessionReducer,
  createBossSession,
  currentBossQuestionId,
  scoreBoss,
  selectBossQuestions,
  type BossScore,
  type BossSessionAction,
  type BossSessionState,
} from '../../game/bossBattle';
import { gradeAnswer, isAnswerReady, type Answer } from '../../game/grading';
import type { BossOutcome } from '../../game/rewards';
import { XP_RULES } from '../../game/xp';
import { useEvents } from '../../storage/eventsContext';
import { buttonStyles } from '../buttonStyles';
import { ConfirmDialog } from '../ConfirmDialog';
import { handlesEnterNatively, usePrefersReducedMotion } from '../hooks';
import { CheckIcon, CloseIcon, LightbulbIcon, TrophyIcon } from '../icons';
import { Mascot } from '../Mascot';
import { QuestionView } from '../questions/QuestionView';
import { TIME_WARNINGS } from './bossCopy';
import { BossResults } from './BossResults';
import { BossTimer } from './BossTimer';

interface BossBattlePlayerProps {
  unit: Unit;
  /** Questions the learner has already answered correctly in this unit. */
  pool: readonly Question[];
  /** Picks and orders the questions; a new seed gives a new round. */
  seed: number;
  onExit: () => void;
  onPlayAgain: () => void;
  /** Called once when the round ends. Returns what was earned, to show on the results. */
  onFinish: (score: BossScore) => BossOutcome;
}

/** A timed round of mixed questions. Wrong answers do not come back; the clock decides. */
export function BossBattlePlayer({
  unit,
  pool,
  seed,
  onExit,
  onPlayAgain,
  onFinish,
}: BossBattlePlayerProps) {
  const questions = useMemo(() => selectBossQuestions(pool, seed), [pool, seed]);
  const byId = useMemo(
    () => new Map(questions.map((question) => [question.id, question])),
    [questions],
  );
  const [session, dispatch] = useReducer(
    bossSessionReducer,
    questions.map((question) => question.id),
    (ids) => createBossSession(ids),
  );
  const [extraTime, setExtraTime] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [draft, setDraft] = useState<{ key: string; answer: Answer | null } | null>(null);
  const [flash, setFlash] = useState<{ correct: boolean; count: number } | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [outcome, setOutcome] = useState<BossOutcome | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const finishReported = useRef(false);
  const warned = useRef(new Set<number>());
  const shownAt = useRef(0);
  const reducedMotion = usePrefersReducedMotion();
  const events = useEvents();
  const extraTimeId = useId();

  const questionId = currentBossQuestionId(session);
  const question = questionId ? (byId.get(questionId) ?? null) : null;
  const answer = draft?.key === questionId ? draft.answer : null;
  const total = session.questionIds.length;
  const secondsLeft = bossSecondsLeft(session, now);
  const correctSoFar = session.results.filter((result) => result.correct).length;

  const apply = (action: BossSessionAction) => {
    const next: BossSessionState = bossSessionReducer(session, action);
    dispatch(action);
    if (next.phase === 'finished' && !finishReported.current) {
      finishReported.current = true;
      const score = scoreBoss(next);
      events.record({
        type: 'boss_finished',
        unitId: unit.id,
        correct: score.correct,
        answered: score.answered,
        total: score.total,
        endReason: next.endReason ?? 'time_up',
        ms: (next.finishedAt ?? 0) - (next.startedAt ?? 0),
      });
      setAnnouncement(
        next.endReason === 'time_up'
          ? `Time’s up. ${score.correct} correct.`
          : `All answered. ${score.correct} correct.`,
      );
      setOutcome(onFinish(score));
    }
  };

  const start = () => {
    const durationMs = extraTime ? BOSS_RULES.extendedDurationMs : BOSS_RULES.durationMs;
    const startedAt = Date.now();
    events.record({ type: 'boss_started', unitId: unit.id, questions: total, durationMs });
    setNow(startedAt);
    apply({ type: 'start', now: startedAt, durationMs });
  };

  const submit = () => {
    if (!question || !isAnswerReady(answer)) return;
    const correct = gradeAnswer(question, answer);
    const at = Date.now();
    events.record({
      type: 'question_answered',
      questionId: question.id,
      questionType: question.type,
      source: 'boss',
      lessonId: null,
      // Boss questions were all answered before, so they never count as first tries.
      firstAttempt: false,
      correct,
      ms: at - shownAt.current,
    });
    setFlash({ correct, count: session.results.length + 1 });
    setAnnouncement(correct ? 'Correct.' : 'Not quite.');
    setNow(at);
    apply({ type: 'answer', answer, correct, now: at });
  };

  // The clock: check a few times a second, so the numbers stay honest even if a tick is late.
  const onTick = useEffectEvent(() => {
    const at = Date.now();
    setNow(at);
    const left = bossSecondsLeft(session, at);
    for (const warning of TIME_WARNINGS) {
      if (left <= warning.at && left > 0 && !warned.current.has(warning.at)) {
        warned.current.add(warning.at);
        if (session.durationMs / 1000 > warning.at) setAnnouncement(warning.text);
      }
    }
    apply({ type: 'tick', now: at });
  });
  useEffect(() => {
    if (session.phase !== 'playing') return;
    const timer = setInterval(() => onTick(), 250);
    return () => clearInterval(timer);
  }, [session.phase]);

  // Enter answers. Buttons and links keep their own Enter behaviour.
  const onEnter = useEffectEvent(() => submit());
  useEffect(() => {
    if (session.phase !== 'playing' || exitOpen) return;
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

  const reportAbandoned = useEffectEvent(() => {
    if (session.phase !== 'playing') return;
    events.record({
      type: 'boss_abandoned',
      unitId: unit.id,
      answered: session.results.length,
      total,
    });
  });
  useEffect(() => () => reportAbandoned(), []);

  if (session.phase === 'finished' && outcome) {
    return (
      <>
        <BossResults
          session={session}
          questions={byId}
          unit={unit}
          outcome={outcome}
          onPlayAgain={onPlayAgain}
          onExit={onExit}
        />
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </>
    );
  }

  const exit = () => (session.phase === 'playing' ? setExitOpen(true) : onExit());
  const minutes = (extraTime ? BOSS_RULES.extendedDurationMs : BOSS_RULES.durationMs) / 60_000;

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-2xl items-center gap-3 px-3">
          <button
            type="button"
            aria-label="Exit boss battle"
            className={buttonStyles.icon}
            onClick={exit}
          >
            <CloseIcon className="text-2xl" />
          </button>
          {session.phase === 'playing' ? (
            <>
              <BossTimer
                secondsLeft={secondsLeft}
                totalSeconds={session.durationMs / 1000}
                animate={!reducedMotion}
              />
              <p className="flex shrink-0 items-center gap-1 rounded-full bg-correct-100 px-2.5 py-1 text-sm font-bold text-correct-ink-800 tabular-nums">
                <CheckIcon aria-hidden="true" />
                {correctSoFar}
                <span className="sr-only"> right so far</span>
              </p>
            </>
          ) : (
            <p className="font-bold text-slate-900">Boss battle</p>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-32">
        {session.phase === 'intro' && (
          <section aria-labelledby="boss-intro-title" className="space-y-5 pt-2">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="flex items-center gap-1.5 text-sm font-bold tracking-wide text-streak-ink-700 uppercase">
                  <TrophyIcon aria-hidden="true" />
                  Boss battle · {unit.title}
                </p>
                <h1 id="boss-intro-title" className="text-3xl font-bold text-slate-900">
                  Beat the clock
                </h1>
              </div>
              <Mascot pose="thumbs-up" eager className="h-24 w-auto shrink-0" />
            </div>
            <p className="text-lg leading-relaxed text-slate-700">
              Answer as many as you can in {minutes === 1 ? '60 seconds' : `${minutes} minutes`}.
              Every question is one you have got right before, mixed from the whole unit.
            </p>
            <ul className="space-y-2 text-slate-700">
              <li className="flex gap-2">
                <span aria-hidden="true">•</span>
                {total} questions. Each one is asked once: no second tries.
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true">•</span>
                {XP_RULES.bossPerCorrect} XP for each right answer, and a{' '}
                {XP_RULES.bossAccuracyBonus} XP bonus for 80% accuracy.
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true">•</span>
                You see what you missed, with explanations, at the end.
              </li>
            </ul>
            {total < BOSS_RULES.minQuestions && (
              <p className="rounded-xl bg-incorrect-50 p-3 font-medium text-incorrect-ink-900 ring-1 ring-incorrect-200">
                The boss battle needs at least {BOSS_RULES.minQuestions} questions you have got
                right before. Play a lesson or two, then come back.
              </p>
            )}
            <label
              htmlFor={extraTimeId}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200 has-focus-visible:ring-3 has-focus-visible:ring-current-600"
            >
              <input
                id={extraTimeId}
                type="checkbox"
                checked={extraTime}
                onChange={(event) => setExtraTime(event.target.checked)}
                className="size-5 shrink-0 accent-current-600"
              />
              <span className="text-slate-800">
                Give me more time (2 minutes). The XP is the same.
              </span>
            </label>
          </section>
        )}

        {session.phase === 'playing' && question && (
          <div key={question.id} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-600">
                Question {session.index + 1} of {total}
              </p>
              {flash && (
                <p
                  key={flash.count}
                  aria-hidden="true"
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-bold motion-safe:animate-pop-in ${
                    flash.correct
                      ? 'bg-correct-100 text-correct-ink-800'
                      : 'bg-incorrect-100 text-incorrect-ink-900'
                  }`}
                >
                  {flash.correct ? <CheckIcon /> : <LightbulbIcon />}
                  {flash.correct ? 'Correct!' : 'Missed that one'}
                </p>
              )}
            </div>
            <QuestionView
              question={question}
              answer={answer}
              onAnswer={(next) => setDraft({ key: question.id, answer: next })}
              reveal={false}
              locked={false}
              shortcuts={!exitOpen}
              animate={!reducedMotion}
              headingRef={headingRef}
            />
          </div>
        )}
      </main>

      {session.phase !== 'finished' && (
        <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-surface pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto max-w-2xl px-4 py-3">
            {session.phase === 'intro' ? (
              <button
                type="button"
                autoFocus
                className={`w-full ${buttonStyles.primary}`}
                disabled={total < BOSS_RULES.minQuestions}
                onClick={start}
              >
                Start the clock
              </button>
            ) : (
              <button
                type="button"
                className={`w-full ${buttonStyles.primary}`}
                disabled={!isAnswerReady(answer)}
                onClick={submit}
              >
                Answer
              </button>
            )}
          </div>
        </footer>
      )}

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <ConfirmDialog
        open={exitOpen}
        title="Leave the boss battle?"
        description="This round won’t count. You can start a new one whenever you like."
        cancelLabel="Keep playing"
        confirmLabel="Leave"
        onCancel={() => setExitOpen(false)}
        onConfirm={onExit}
      />
    </div>
  );
}
