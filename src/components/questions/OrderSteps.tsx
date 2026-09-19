import { useEffect, useEffectEvent, useId, useMemo, useRef, useState } from 'react';
import type { OrderStepsQuestion } from '../../content/types';
import type { OrderStepsAnswer } from '../../game/grading';
import { stepOfferOrder } from '../../game/orderSteps';
import { DataTableView } from '../data/DatasetView';
import { isTextEntryTarget } from '../hooks';
import { CheckIcon, CloseIcon } from '../icons';
import type { QuestionProps } from './types';

/**
 * Put steps in order, word-bank style: tap a step to add it to the end of your order, tap a placed
 * step to take it back. Number keys place the nth step still to place and Backspace takes back the
 * last one. Once every step is placed, focus moves to the finished list, where Enter checks.
 */
export function OrderSteps({
  question,
  answer,
  onAnswer,
  reveal,
  locked,
  shortcuts,
}: QuestionProps<OrderStepsQuestion, OrderStepsAnswer>) {
  const total = question.steps.length;
  const offered = useMemo(() => stepOfferOrder(question.id, total), [question.id, total]);
  const order = useMemo(() => answer?.order ?? [], [answer]);
  const placed = new Set(order);
  const remaining = offered.filter((step) => !placed.has(step));
  const [status, setStatus] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const trayRef = useRef<HTMLUListElement>(null);
  const focusNext = useRef<'list' | 'tray' | null>(null);
  const orderTitleId = useId();
  const trayTitleId = useId();
  const code = question.language !== undefined;
  const stepText = code ? 'font-mono text-sm whitespace-pre-wrap' : '';

  // Keep keyboard focus somewhere useful after a step moves: the next step to place, or the
  // finished list, where Enter checks the answer.
  useEffect(() => {
    const target = focusNext.current;
    focusNext.current = null;
    if (target === 'list') listRef.current?.focus();
    if (target === 'tray') trayRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [order]);

  const save = (next: number[]) =>
    onAnswer(next.length === 0 ? null : { type: 'order_steps', order: next, total });

  const place = (step: number) => {
    if (locked || placed.has(step)) return;
    const next = [...order, step];
    focusNext.current = next.length === total ? 'list' : 'tray';
    setStatus(
      next.length === total
        ? 'Every step is placed. Check your answer, or tap a step to take it back.'
        : `Placed as step ${next.length}.`,
    );
    save(next);
  };

  const takeBack = (position: number) => {
    if (locked || position < 0 || position >= order.length) return;
    focusNext.current = 'tray';
    setStatus(`Step ${position + 1} taken back.`);
    save(order.filter((_, index) => index !== position));
  };

  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey || isTextEntryTarget(event.target)) return;
    if (event.key === 'Backspace') {
      if (order.length === 0) return;
      event.preventDefault();
      takeBack(order.length - 1);
      return;
    }
    if (!/^[1-9]$/.test(event.key)) return;
    const step = remaining[Number(event.key) - 1];
    if (step === undefined) return;
    event.preventDefault();
    place(step);
  });
  useEffect(() => {
    if (!shortcuts || locked) return;
    const listener = (event: KeyboardEvent) => onKey(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [shortcuts, locked]);

  const allRight = order.length === total && order.every((step, position) => step === position);

  return (
    <div className="space-y-4">
      {question.tables?.map((table) => (
        <DataTableView key={table.caption} table={table} sqlNames />
      ))}

      <div
        ref={listRef}
        tabIndex={-1}
        role="group"
        aria-labelledby={orderTitleId}
        className="space-y-2 rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-current-600 focus-visible:ring-offset-2"
      >
        <p id={orderTitleId} className="text-sm font-bold text-slate-700">
          Your order{' '}
          <span className="font-normal text-slate-600">
            ({order.length} of {total} placed)
          </span>
        </p>
        <ol className="space-y-2">
          {Array.from({ length: total }, (_, position) => {
            const step = order[position];
            if (step === undefined) {
              return (
                <li
                  key={`empty-${position}`}
                  className="flex min-h-12 items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 px-3 text-slate-500"
                >
                  <span aria-hidden="true" className="w-6 text-center font-bold">
                    {position + 1}
                  </span>
                  <span className="sr-only">Step {position + 1}: empty</span>
                </li>
              );
            }
            const rightPlace = step === position;
            const tone = !reveal
              ? 'border-current-600 bg-current-50 text-current-ink-800'
              : rightPlace
                ? 'border-correct-600 bg-correct-50 text-correct-ink-900'
                : 'border-incorrect-600 bg-incorrect-50 text-incorrect-ink-900';
            return (
              <li key={`step-${step}`}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => takeBack(position)}
                  className={`flex min-h-12 w-full items-center gap-3 rounded-xl border-2 px-3 py-2 text-left font-medium focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-current-600 disabled:cursor-default ${tone}`}
                >
                  <span aria-hidden="true" className="w-6 shrink-0 text-center font-bold">
                    {position + 1}
                  </span>
                  <span className="sr-only">Step {position + 1}:</span>{' '}
                  <span className={`min-w-0 flex-1 break-words ${stepText}`}>
                    {question.steps[step]}
                  </span>
                  {reveal &&
                    (rightPlace ? (
                      <CheckIcon aria-hidden="true" className="shrink-0 text-lg" />
                    ) : (
                      <CloseIcon aria-hidden="true" className="shrink-0 text-lg" />
                    ))}
                  {reveal && (
                    <span className="sr-only">
                      {rightPlace ? ', right place' : ', wrong place'}
                    </span>
                  )}
                  {!locked && <span className="sr-only">, take back</span>}
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {!locked && remaining.length > 0 && (
        <section aria-labelledby={trayTitleId} className="space-y-2">
          <p id={trayTitleId} className="text-sm font-bold text-slate-700">
            Steps to place: tap them in order
          </p>
          <ul ref={trayRef} className="grid gap-2">
            {remaining.map((step, index) => (
              <li key={`offer-${step}`}>
                <button
                  type="button"
                  onClick={() => place(step)}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl border-2 border-slate-300 bg-surface px-3 py-2 text-left font-medium text-slate-800 shadow-[0_3px_0_var(--color-slate-300)] hover:border-current-500 hover:bg-current-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-current-600"
                >
                  {shortcuts && (
                    <span
                      aria-hidden="true"
                      className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-current/30 text-sm font-bold"
                    >
                      {index + 1}
                    </span>
                  )}
                  <span className={`min-w-0 flex-1 break-words ${stepText}`}>
                    {question.steps[step]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {reveal && !allRight && (
        <section
          aria-label="The right order"
          className="space-y-2 rounded-2xl bg-correct-50 p-3 ring-1 ring-correct-200"
        >
          <p className="font-bold text-correct-ink-900">The right order</p>
          <ol className="list-decimal space-y-1 ps-6 text-slate-800 marker:font-bold">
            {question.steps.map((step) => (
              <li key={step} className={stepText}>
                {step}
              </li>
            ))}
          </ol>
        </section>
      )}

      <p aria-live="polite" className="sr-only">
        {status}
      </p>
    </div>
  );
}
