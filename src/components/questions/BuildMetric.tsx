import { useEffect, useId, useRef, useState, type PointerEvent } from 'react';
import { formatNumber } from '../../content/template';
import type { BuildMetricQuestion } from '../../content/types';
import type { BuildMetricAnswer } from '../../game/grading';
import { CheckIcon, CloseIcon, TargetIcon } from '../icons';
import type { QuestionProps } from './types';

type Slot = 'numerator' | 'denominator';
type Placement = Record<Slot, number | null>;

const SLOT_NAMES: Record<Slot, string> = { numerator: 'Top', denominator: 'Bottom' };

/** The metric's value from the cards' numbers, e.g. "4%" or "2.5". */
function metricValue(question: BuildMetricQuestion, placement: Placement): string | null {
  const { numerator, denominator } = placement;
  if (numerator === null || denominator === null) return null;
  const top = question.cards[numerator]?.value;
  const bottom = question.cards[denominator]?.value;
  if (top === undefined || bottom === undefined || bottom === 0) return null;
  const ratio = top / bottom;
  return question.percent
    ? `${formatNumber(ratio * 100, 1)}%`
    : `${question.prefix ?? ''}${formatNumber(ratio, 2)}`;
}

/**
 * Build a metric by placing one card on top of the fraction and one underneath. Cards can be
 * dragged into place, or tapped (or picked with the keyboard) to fill the next empty box.
 */
export function BuildMetric({
  question,
  answer,
  onAnswer,
  reveal,
  locked,
}: QuestionProps<BuildMetricQuestion, BuildMetricAnswer>) {
  const instructionsId = useId();
  const statusId = useId();
  const placement: Placement = {
    numerator: answer?.numerator ?? null,
    denominator: answer?.denominator ?? null,
  };
  const [armed, setArmed] = useState<Slot | null>(null);
  const [status, setStatus] = useState('');
  const [drag, setDrag] = useState<{ index: number; x: number; y: number } | null>(null);
  const pointer = useRef<{ index: number; x: number; y: number; moved: boolean } | null>(null);
  const skipClick = useRef(false);
  const fractionRef = useRef<HTMLDivElement>(null);
  const trayRef = useRef<HTMLUListElement>(null);
  const focusNext = useRef<'fraction' | 'tray' | null>(null);

  // After a card moves, keep keyboard focus somewhere useful: the next card, or the finished
  // fraction, where Enter checks the answer.
  useEffect(() => {
    const target = focusNext.current;
    focusNext.current = null;
    if (target === 'fraction') fractionRef.current?.focus();
    if (target === 'tray') trayRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [placement.numerator, placement.denominator]);

  const save = (next: Placement) =>
    onAnswer({ type: 'build_metric', numerator: next.numerator, denominator: next.denominator });

  const place = (index: number, slot?: Slot) => {
    if (locked) return;
    const target =
      slot ??
      armed ??
      (placement.numerator === null
        ? 'numerator'
        : placement.denominator === null
          ? 'denominator'
          : null);
    if (!target) {
      setStatus('Both boxes are full. Tap a box to take its card back first.');
      return;
    }
    const next: Placement = {
      numerator: placement.numerator === index ? null : placement.numerator,
      denominator: placement.denominator === index ? null : placement.denominator,
    };
    next[target] = index;
    setArmed(null);
    const complete = next.numerator !== null && next.denominator !== null;
    focusNext.current = complete ? 'fraction' : 'tray';
    setStatus(
      `${question.cards[index].label} placed in the ${SLOT_NAMES[target].toLowerCase()} box.`,
    );
    save(next);
  };

  const pressSlot = (slot: Slot) => {
    if (locked) return;
    const index = placement[slot];
    if (index === null) {
      setArmed(armed === slot ? null : slot);
      setStatus(
        armed === slot ? '' : `The next card goes in the ${SLOT_NAMES[slot].toLowerCase()} box.`,
      );
      return;
    }
    setArmed(null);
    setStatus(`${question.cards[index].label} taken back.`);
    save({ ...placement, [slot]: null });
  };

  const onPointerDown = (index: number) => (event: PointerEvent<HTMLButtonElement>) => {
    if (locked || event.button !== 0) return;
    pointer.current = { index, x: event.clientX, y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const start = pointer.current;
    if (!start) return;
    if (!start.moved && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 8) return;
    start.moved = true;
    setDrag({ index: start.index, x: event.clientX, y: event.clientY });
  };
  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const start = pointer.current;
    pointer.current = null;
    if (!start?.moved) return;
    skipClick.current = true;
    setDrag(null);
    const target = document
      .elementFromPoint?.(event.clientX, event.clientY)
      ?.closest('[data-metric-slot]')
      ?.getAttribute('data-metric-slot');
    if (target === 'numerator' || target === 'denominator') place(start.index, target);
  };
  const onPointerCancel = () => {
    pointer.current = null;
    setDrag(null);
  };

  const unplaced = question.cards
    .map((card, index) => ({ card, index }))
    .filter(({ index }) => index !== placement.numerator && index !== placement.denominator);
  const correct: Placement = {
    numerator: question.numeratorIndex,
    denominator: question.denominatorIndex,
  };
  const value = metricValue(question, reveal ? correct : placement);
  const complete = placement.numerator !== null && placement.denominator !== null;

  const renderSlot = (slot: Slot) => {
    const index = placement[slot];
    const card = index === null ? null : question.cards[index];
    const right = index === correct[slot];
    const state = reveal ? (right ? 'correct' : 'incorrect') : card ? 'filled' : 'empty';
    const expected = question.cards[correct[slot] ?? 0].label;
    const action = reveal
      ? right
        ? ' Correct.'
        : ` It should be ${expected}.`
      : locked
        ? ''
        : card
          ? ' Press to take it back.'
          : armed === slot
            ? ' The next card goes here.'
            : ' Press to put the next card here.';
    const label = `${SLOT_NAMES[slot]} box${card ? `: ${card.label}.` : ', empty.'}${action}`;
    return (
      <button
        type="button"
        data-metric-slot={slot}
        aria-label={label}
        aria-disabled={locked || undefined}
        onClick={() => pressSlot(slot)}
        className={`flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 px-3 py-2 text-base font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-current-600 ${
          state === 'correct'
            ? 'border-correct-600 bg-correct-50 text-correct-ink-900'
            : state === 'incorrect'
              ? 'border-incorrect-600 bg-incorrect-50 text-incorrect-ink-900'
              : state === 'filled'
                ? 'border-current-600 bg-current-50 text-current-ink-800'
                : armed === slot || drag
                  ? 'border-dashed border-current-600 bg-current-50 text-slate-700'
                  : 'border-dashed border-slate-300 bg-surface text-slate-600'
        }`}
      >
        {state === 'correct' && <CheckIcon aria-hidden="true" />}
        {state === 'incorrect' && <CloseIcon aria-hidden="true" />}
        {card ? card.label : armed === slot ? 'Next card goes here' : 'Drop a card here'}
      </button>
    );
  };

  return (
    <div className="space-y-5">
      <section
        aria-label="The question to answer"
        className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
      >
        <TargetIcon aria-hidden="true" className="mt-1 shrink-0 text-xl text-current-ink-700" />
        <p className="text-lg font-semibold text-slate-900">{question.goal}</p>
      </section>

      <div
        ref={fractionRef}
        tabIndex={-1}
        role="group"
        aria-label={`${question.metricName} equals top box divided by bottom box`}
        aria-describedby={reveal ? undefined : instructionsId}
        className="rounded-2xl bg-surface p-4 ring-1 ring-slate-200 outline-none focus-visible:ring-3 focus-visible:ring-current-600"
      >
        <p className="mb-3 text-center font-bold text-slate-900">{question.metricName} =</p>
        <div className="mx-auto max-w-sm space-y-2">
          {renderSlot('numerator')}
          <div aria-hidden="true" className="h-1 rounded-full bg-slate-800" />
          {renderSlot('denominator')}
        </div>
        {value && (reveal || complete) && (
          <p className="mt-3 text-center text-slate-700 tabular-nums">
            {reveal && 'The right metric works out at '}
            {!reveal && 'That works out at '}
            <strong className="text-slate-900">{value}</strong>
          </p>
        )}
      </div>

      {!reveal && (
        <div className="space-y-2">
          <p id={instructionsId} className="text-sm text-slate-600">
            Drag a card into a box, or tap it to fill the next empty box. Tap a filled box to take
            its card back.
          </p>
          <ul ref={trayRef} aria-label="Cards" className="flex flex-wrap gap-2">
            {unplaced.map(({ card, index }) => (
              <li key={card.label}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    if (skipClick.current) {
                      skipClick.current = false;
                      return;
                    }
                    place(index);
                  }}
                  onPointerDown={onPointerDown(index)}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerCancel}
                  className={`min-h-12 touch-none rounded-xl border-2 border-slate-300 bg-surface px-3 py-2 font-semibold text-slate-800 shadow-[0_3px_0_var(--color-slate-300)] select-none hover:border-current-500 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-current-600 ${
                    drag?.index === index ? 'opacity-40' : ''
                  }`}
                >
                  {card.label}
                </button>
              </li>
            ))}
          </ul>
          <p id={statusId} aria-live="polite" className="text-sm font-medium text-slate-700">
            {status}
          </p>
        </div>
      )}

      {reveal && (
        <p className="rounded-2xl bg-slate-50 p-3 text-slate-800 ring-1 ring-slate-200">
          {question.metricName} = {question.cards[question.numeratorIndex].label} ÷{' '}
          {question.cards[question.denominatorIndex].label}
        </p>
      )}

      {drag && (
        <span
          aria-hidden="true"
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-current-600 px-3 py-2 font-semibold text-white shadow-lg"
          style={{ left: drag.x, top: drag.y }}
        >
          {question.cards[drag.index].label}
        </span>
      )}
    </div>
  );
}
