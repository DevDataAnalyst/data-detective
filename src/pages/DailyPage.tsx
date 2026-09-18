import { useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { buttonStyles } from '../components/buttonStyles';
import { ShareCard } from '../components/daily/ShareCard';
import { formatCardDate } from '../components/daily/shareCardLayout';
import { renderShareImage } from '../components/daily/shareImage';
import { handlesEnterNatively, usePrefersReducedMotion } from '../components/hooks';
import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  DownloadIcon,
  LightbulbIcon,
  ShareIcon,
} from '../components/icons';
import { Mascot } from '../components/Mascot';
import { wrongAnswerNote } from '../components/questions/challengeCopy';
import { QuestionView } from '../components/questions/QuestionView';
import { dailyQuestions, type DailyQuestion } from '../content/daily';
import { fillQuestionText } from '../content/template';
import {
  DAILY_TITLES,
  dailyNumber,
  dailyNumberText,
  dailyQuestionFor,
  dailyShareHeadline,
  dailyShareText,
  formatDailyTime,
  saveDailyResult,
  secondsTaken,
  type DailyResult,
} from '../game/daily';
import { gradeAnswer, isAnswerReady, type Answer } from '../game/grading';
import { isOnboarded } from '../game/progress';
import type { DateKey } from '../game/streak';
import { useToday } from '../storage/clock';
import { useEvents } from '../storage/eventsContext';
import { useProgress, useProgressStore } from '../storage/progressContext';

const INTROS: Record<DailyQuestion['type'], string> = {
  spot_the_lie:
    'Someone is making a claim with a chart. Work out what the chart is hiding, as fast as you can.',
  courtroom:
    'Two witnesses read opposite causes into the same evidence. Find the hidden cause behind both, as fast as you can.',
};

/**
 * /daily: one question a day, the same for everyone, against the clock, with a result card to
 * share. It needs no lessons and leaves course progress alone, so anyone can play from a link.
 */
export function DailyPage() {
  const today = useToday();
  const progress = useProgress();
  const store = useProgressStore();
  const events = useEvents();
  // Once the clock starts, the challenge stays the one it started as, even past midnight.
  const [play, setPlay] = useState<{ date: DateKey; startedAt: number } | null>(null);
  const date = play?.date ?? today;
  const result = progress.daily[date] ?? null;
  const question =
    (result && dailyQuestions.find((item) => item.id === result.questionId)) ||
    dailyQuestionFor(date, dailyQuestions);
  const number = dailyNumber(date);

  if (result) {
    return (
      <DailyResultView
        date={date}
        number={number}
        question={question}
        result={result}
        onboarded={isOnboarded(progress)}
      />
    );
  }

  if (play) {
    const finish = (answer: Answer) => {
      const answeredAt = Date.now();
      const correct = gradeAnswer(question, answer);
      const saved: DailyResult = {
        questionId: question.id,
        selectedIndex: 'selectedIndex' in answer ? answer.selectedIndex : 0,
        correct,
        seconds: secondsTaken(play.startedAt, answeredAt),
      };
      events.record({
        type: 'daily_answered',
        number,
        questionId: question.id,
        questionType: question.type,
        correct,
        ms: answeredAt - play.startedAt,
      });
      store.update((state) => saveDailyResult(state, play.date, saved));
    };
    return (
      <DailyPlay
        date={play.date}
        question={question}
        startedAt={play.startedAt}
        onAnswered={finish}
      />
    );
  }

  return (
    <section aria-labelledby="daily-title" className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="flex items-center gap-1.5 text-sm font-bold tracking-wide text-current-ink-700 uppercase">
            <CalendarIcon aria-hidden="true" />
            Daily challenge{dailyNumberText(date)}
          </p>
          <h1 id="daily-title" className="text-3xl font-bold text-slate-900">
            {DAILY_TITLES[question.type]}
          </h1>
          <p className="text-sm font-semibold text-slate-600">{formatCardDate(date)}</p>
        </div>
        <Mascot pose="thinking" eager className="h-24 w-auto shrink-0" />
      </div>
      <p className="text-lg leading-relaxed text-slate-700">{INTROS[question.type]}</p>
      <ul className="space-y-2 text-slate-700">
        <li className="flex gap-2">
          <span aria-hidden="true">•</span>
          One question, the same for everyone today.
        </li>
        <li className="flex gap-2">
          <span aria-hidden="true">•</span>
          One try. The clock starts when you do.
        </li>
        <li className="flex gap-2">
          <span aria-hidden="true">•</span>
          Then see the full answer, and share your time.
        </li>
      </ul>
      <button
        type="button"
        autoFocus
        className={`w-full ${buttonStyles.primary}`}
        onClick={() => setPlay({ date: today, startedAt: Date.now() })}
      >
        Start the clock
      </button>
      <p className="text-sm text-slate-600">
        No lessons needed, and it doesn’t change your course progress.
      </p>
    </section>
  );
}

function clockText(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

interface DailyPlayProps {
  date: DateKey;
  question: DailyQuestion;
  startedAt: number;
  onAnswered: (answer: Answer) => void;
}

function DailyPlay({ date, question, startedAt, onAnswered }: DailyPlayProps) {
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [now, setNow] = useState(startedAt);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const ready = isAnswerReady(answer);

  // The question takes focus, so screen readers read the prompt first.
  useEffect(() => {
    window.scrollTo?.({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);

  const submit = () => {
    if (answer && isAnswerReady(answer)) onAnswered(answer);
  };

  // Enter checks, as in lessons. Buttons and links keep their own Enter behaviour.
  const onEnter = useEffectEvent(() => submit());
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.repeat || event.isComposing) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (handlesEnterNatively(event.target)) return;
      event.preventDefault();
      onEnter();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold tracking-wide text-current-ink-700 uppercase">
          Daily{dailyNumberText(date)} · {DAILY_TITLES[question.type]}
        </p>
        <p
          role="timer"
          aria-label="Time taken"
          className="flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-800 tabular-nums"
        >
          <ClockIcon aria-hidden="true" />
          {clockText(elapsed)}
        </p>
      </div>
      <QuestionView
        question={question}
        answer={answer}
        onAnswer={setAnswer}
        reveal={false}
        locked={false}
        shortcuts
        animate={!reducedMotion}
        headingRef={headingRef}
      />
      <button
        type="button"
        className={`w-full ${buttonStyles.primary}`}
        disabled={!ready}
        onClick={submit}
      >
        Check
      </button>
    </div>
  );
}

type ShareImage = { blob: Blob; url: string } | 'failed' | null;

interface DailyResultViewProps {
  date: DateKey;
  number: number;
  question: DailyQuestion;
  result: DailyResult;
  onboarded: boolean;
}

function DailyResultView({ date, number, question, result, onboarded }: DailyResultViewProps) {
  const events = useEvents();
  const reducedMotion = usePrefersReducedMotion();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const cardRef = useRef<SVGSVGElement>(null);
  const [image, setImage] = useState<ShareImage>(null);
  const [status, setStatus] = useState('');
  const [copyFailed, setCopyFailed] = useState(false);
  const shareTitleId = useId();
  const answerTitleId = useId();

  const headline = dailyShareHeadline(question.type, result);
  const link = new URL('/daily', window.location.origin).href;
  const text = dailyShareText(headline, date, link);
  const subtitle = `Daily challenge${dailyNumberText(date)} · ${formatCardDate(date)}`;
  const fileName = `data-detective-daily-${date}.png`;
  const answer = { type: question.type, selectedIndex: result.selectedIndex } as Answer;
  const note = result.correct ? null : wrongAnswerNote(question, answer);
  const canShare = typeof navigator.share === 'function';

  useEffect(() => {
    window.scrollTo?.({ top: 0 });
    titleRef.current?.focus({ preventScroll: true });
  }, []);

  // Make the image as soon as the card is on screen, so sharing it needs no wait: some phones
  // only allow sharing straight after a tap.
  useEffect(() => {
    const svg = cardRef.current;
    if (!svg) return;
    let cancelled = false;
    let url: string | null = null;
    renderShareImage(svg)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setImage({ blob, url });
      })
      .catch(() => {
        if (!cancelled) setImage('failed');
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [headline, subtitle, link]);

  const share = async () => {
    const title = 'Data Detective daily challenge';
    try {
      const file =
        image && image !== 'failed'
          ? new File([image.blob], fileName, { type: 'image/png' })
          : null;
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title, text });
      } else {
        await navigator.share({ title, text });
      }
      events.record({ type: 'daily_shared', number, method: 'share' });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setStatus('Sharing didn’t work here. Try downloading the image or copying the text.');
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFailed(false);
      setStatus('Copied. Paste it into any chat.');
      events.record({ type: 'daily_shared', number, method: 'copy' });
    } catch {
      setCopyFailed(true);
      setStatus('Couldn’t copy here. Select the text below and copy it yourself.');
    }
  };

  return (
    <div className="space-y-6">
      <section aria-labelledby="daily-result-title" className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-bold tracking-wide text-current-ink-700 uppercase">
              <CalendarIcon aria-hidden="true" />
              Daily challenge{dailyNumberText(date)}
            </p>
            <h1
              id="daily-result-title"
              ref={titleRef}
              tabIndex={-1}
              className={`flex items-center gap-2 text-2xl font-bold outline-none sm:text-3xl ${
                result.correct ? 'text-correct-ink-800' : 'text-incorrect-ink-800'
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex size-8 shrink-0 items-center justify-center rounded-full text-base text-white ${
                  result.correct ? 'bg-correct-700' : 'bg-incorrect-700'
                }`}
              >
                {result.correct ? <CheckIcon /> : <LightbulbIcon />}
              </span>
              {result.correct
                ? `Solved in ${formatDailyTime(result.seconds)}`
                : 'This one fooled you'}
            </h1>
          </div>
          <Mascot
            pose={result.correct ? 'thumbs-up' : 'thinking'}
            eager
            className="h-20 w-auto shrink-0 sm:h-24"
          />
        </div>
        {!result.correct && (
          <p className="font-semibold text-slate-800">
            It fools plenty of people. Here’s the trick.
          </p>
        )}
        <p className="text-base leading-relaxed text-slate-800">
          {fillQuestionText(question, question.explanation)}
        </p>
        {note && (
          <p className="text-sm text-slate-600">
            <span className="font-semibold">About your pick: </span>
            {note}
          </p>
        )}
      </section>

      <section
        aria-labelledby={shareTitleId}
        className="space-y-4 rounded-2xl bg-surface p-4 ring-1 ring-slate-200"
      >
        <h2 id={shareTitleId} className="text-xl font-bold text-slate-900">
          Share your result
        </h2>
        <div className="mx-auto w-full max-w-sm overflow-hidden rounded-xl shadow-md ring-1 ring-slate-200">
          <ShareCard
            ref={cardRef}
            question={question}
            headline={headline}
            subtitle={subtitle}
            link={link.replace(/^https?:\/\//, '')}
            mascot={result.correct ? 'thumbs-up' : 'thinking'}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {canShare && (
            <button type="button" className={buttonStyles.primary} onClick={share}>
              <ShareIcon aria-hidden="true" />
              Share
            </button>
          )}
          {image && image !== 'failed' ? (
            <a
              href={image.url}
              download={fileName}
              className={buttonStyles.secondary}
              onClick={() => events.record({ type: 'daily_shared', number, method: 'download' })}
            >
              <DownloadIcon aria-hidden="true" />
              Download image
            </a>
          ) : (
            <button type="button" className={buttonStyles.secondary} disabled>
              <DownloadIcon aria-hidden="true" />
              {image === 'failed' ? 'Image not available' : 'Preparing image…'}
            </button>
          )}
          <button type="button" className={buttonStyles.secondary} onClick={copy}>
            <CopyIcon aria-hidden="true" />
            Copy text
          </button>
        </div>
        <p role="status" className="min-h-6 text-sm font-medium text-slate-700">
          {status}
        </p>
        {copyFailed && (
          <textarea
            readOnly
            aria-label="Your result, to copy"
            value={text}
            rows={3}
            className="w-full rounded-xl bg-slate-50 p-3 text-sm text-slate-800 ring-1 ring-slate-200"
            onFocus={(event) => event.currentTarget.select()}
          />
        )}
      </section>

      <section aria-labelledby={answerTitleId} className="space-y-3">
        <h2 id={answerTitleId} className="text-xl font-bold text-slate-900">
          The full answer
        </h2>
        <QuestionView
          question={question}
          answer={answer}
          onAnswer={() => {}}
          reveal
          locked
          shortcuts={false}
          animate={!reducedMotion}
          headingLevel="h3"
        />
      </section>

      <section className="space-y-3 rounded-2xl bg-current-50 p-4 ring-1 ring-current-200">
        <p className="font-semibold text-slate-900">
          A new challenge arrives at midnight. Come back tomorrow.
        </p>
        {onboarded ? (
          <Link to="/" className={`w-full ${buttonStyles.primary}`}>
            Back to your path
          </Link>
        ) : (
          <>
            <p className="text-slate-700">
              Data Detective teaches the statistics behind puzzles like this in short lessons, then
              lets you try it on real data.
            </p>
            <Link to="/" className={`w-full ${buttonStyles.primary}`}>
              Start learning
            </Link>
          </>
        )}
      </section>
    </div>
  );
}
