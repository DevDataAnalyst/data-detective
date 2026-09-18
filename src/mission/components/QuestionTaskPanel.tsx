import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { buttonStyles } from '../../components/buttonStyles';
import { handlesEnterNatively, usePrefersReducedMotion } from '../../components/hooks';
import { wrongAnswerNote } from '../../components/questions/challengeCopy';
import { QuestionView } from '../../components/questions/QuestionView';
import { fillQuestionText } from '../../content/template';
import type { QuestionTask } from '../../content/types';
import { gradeAnswer, isAnswerReady, type Answer } from '../../game/grading';
import { TaskFeedbackPanel, type ShownFeedback } from './TaskFeedbackPanel';

interface QuestionTaskPanelProps {
  task: QuestionTask;
  /** Already passed: show the answer and explanation straight away. */
  passed: boolean;
  /** Called on every check. Returns the XP the check earned. */
  onCheck: (correct: boolean, ms: number) => number;
  next: { label: string; title: string; onSelect: () => void } | null;
  summaryHref: string | null;
}

const TRY_AGAIN = 'Look at the evidence again, then try another answer.';

/**
 * A mission task answered with a challenge question. A wrong answer explains what is wrong with
 * the pick, without giving the right one away, and the learner tries again.
 */
export function QuestionTaskPanel({
  task,
  passed,
  onCheck,
  next,
  summaryHref,
}: QuestionTaskPanelProps) {
  const { question } = task;
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [feedback, setFeedback] = useState<ShownFeedback | null>(null);
  const [attempt, setAttempt] = useState(0);
  const reducedMotion = usePrefersReducedMotion();
  const shownAt = useRef(0);
  const solved = passed || feedback?.kind === 'passed';
  const explanation = fillQuestionText(question, question.explanation);

  useEffect(() => {
    shownAt.current = Date.now();
  }, [attempt]);

  const check = () => {
    if (solved || !isAnswerReady(answer)) return;
    const correct = gradeAnswer(question, answer);
    const xp = onCheck(correct, Date.now() - shownAt.current);
    setFeedback(
      correct
        ? { kind: 'passed', message: explanation, xp }
        : { kind: 'not_yet', message: wrongAnswerNote(question, answer) ?? TRY_AGAIN, xp: 0 },
    );
  };

  const tryAgain = () => {
    setAnswer(null);
    setFeedback(null);
    setAttempt((count) => count + 1);
  };

  // Enter checks, as in lessons. Buttons and links keep their own Enter behaviour.
  const onEnter = useEffectEvent(() => check());
  useEffect(() => {
    if (solved) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.repeat || event.isComposing) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (handlesEnterNatively(event.target)) return;
      event.preventDefault();
      onEnter();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [solved]);

  const wrong = feedback?.kind === 'not_yet';

  return (
    <div className="space-y-4">
      <QuestionView
        key={attempt}
        question={question}
        answer={solved && !feedback ? null : answer}
        onAnswer={(nextAnswer) => {
          if (wrong) setFeedback(null);
          setAnswer(nextAnswer);
        }}
        reveal={solved}
        locked={solved}
        shortcuts={!solved}
        animate={!reducedMotion}
        headingLevel="h3"
      />

      {!solved && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={check}
            disabled={!isAnswerReady(answer)}
            className={buttonStyles.primary}
          >
            Check
          </button>
          {wrong && (
            <button type="button" onClick={tryAgain} className={buttonStyles.secondary}>
              Start this question again
            </button>
          )}
        </div>
      )}

      {feedback ? (
        <TaskFeedbackPanel
          feedback={feedback}
          next={feedback.kind === 'passed' ? next : null}
          summaryHref={feedback.kind === 'passed' ? summaryHref : null}
          hint={null}
        />
      ) : (
        passed && (
          <TaskFeedbackPanel
            feedback={{ kind: 'passed', message: explanation, xp: 0 }}
            next={next}
            summaryHref={summaryHref}
            hint={null}
          />
        )
      )}
    </div>
  );
}
