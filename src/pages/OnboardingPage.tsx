import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from 'react';
import { useNavigate } from 'react-router';
import { buttonStyles } from '../components/buttonStyles';
import { FlameIcon, SearchIcon, StarIcon } from '../components/icons';
import { unit1 } from '../content/unit1';
import type { LearnerGoal } from '../game/progress';
import { completeOnboarding } from '../game/rewards';
import { DAILY_GOAL_CHOICES } from '../game/streak';
import { now } from '../storage/clock';
import { useEvents } from '../storage/eventsContext';
import { useProgressStore } from '../storage/progressContext';

const GOALS: ReadonlyArray<{ id: LearnerGoal; title: string; detail: string }> = [
  { id: 'data_analyst', title: 'Data analyst', detail: 'Turn data into answers and reports' },
  { id: 'data_scientist', title: 'Data scientist', detail: 'Find patterns and make predictions' },
  {
    id: 'ml_engineer',
    title: 'Machine learning engineer',
    detail: 'Build systems that learn from data',
  },
  { id: 'curious', title: 'Just curious', detail: 'See what working with data is like' },
];

const DAILY_GOAL_COPY: Record<
  (typeof DAILY_GOAL_CHOICES)[number]['id'],
  { title: string; time: string }
> = {
  casual: { title: 'Casual', time: 'About 5 minutes a day' },
  regular: { title: 'Regular', time: 'About 10 minutes a day' },
  serious: { title: 'Serious', time: 'About 20 minutes a day' },
};

const STEPS = 3;

/** First visit: a welcome, the learner's goal and a daily goal, then straight into lesson 1. */
export function OnboardingPage() {
  const store = useProgressStore();
  const events = useEvents();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState<LearnerGoal | null>(null);
  const [dailyGoal, setDailyGoal] = useState<number | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Each new step takes focus, so screen readers start at its question.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo?.({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, [step]);

  const finish = () => {
    if (!goal || dailyGoal === null) return;
    store.update((state) => completeOnboarding(state, { goal, dailyGoal, now: now() }));
    events.record({ type: 'onboarding_completed', goal, dailyGoal });
    void navigate(`/lesson/${unit1.lessons[0].id}`, { replace: true });
  };

  const action =
    step === 1
      ? { label: 'Get started', disabled: false, onClick: () => setStep(2) }
      : step === 2
        ? { label: 'Continue', disabled: goal === null, onClick: () => setStep(3) }
        : { label: 'Start lesson 1', disabled: dailyGoal === null, onClick: finish };

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="mx-auto flex h-16 w-full max-w-lg items-center gap-3 px-4">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-current-ink-700 hover:bg-current-50"
          >
            ← Back
          </button>
        ) : (
          <span className="min-h-11" />
        )}
        <p className="ml-auto text-sm font-semibold text-slate-600">
          Step {step} of {STEPS}
        </p>
        <span aria-hidden="true" className="flex gap-1.5">
          {Array.from({ length: STEPS }, (_, index) => (
            <span
              key={index}
              className={`h-2 rounded-full transition-[width] motion-reduce:transition-none ${
                index + 1 === step
                  ? 'w-6 bg-current-600'
                  : index + 1 < step
                    ? 'w-2 bg-current-600'
                    : 'w-2 bg-slate-300'
              }`}
            />
          ))}
        </span>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-4 pb-32">
        {step === 1 && (
          <section aria-labelledby="welcome-title" className="space-y-6 pt-4">
            <img src="/favicon.svg" alt="" width={72} height={72} />
            <div className="space-y-3">
              <h1
                ref={heading}
                id="welcome-title"
                tabIndex={-1}
                className="text-3xl font-bold text-slate-900 outline-none"
              >
                Welcome to Data Detective
              </h1>
              <p className="text-lg leading-relaxed text-slate-700">
                Learn the statistics behind data work in short lessons. Then use Python to crack a
                case hidden in messy data.
              </p>
            </div>
            <ul className="space-y-3">
              <Feature icon={<StarIcon />}>
                Lessons take 3 to 5 minutes, on your phone or laptop
              </Feature>
              <Feature icon={<SearchIcon />}>
                A hands-on Python mission that runs in your browser
              </Feature>
              <Feature icon={<FlameIcon />}>A small daily goal to help you keep going</Feature>
            </ul>
          </section>
        )}

        {step === 2 && (
          <ChoiceStep
            headingRef={heading}
            title="What brings you here?"
            description="Pick the one that fits best. Everyone gets the same lessons."
            name="learner-goal"
            options={GOALS.map((option) => ({
              value: option.id,
              title: option.title,
              detail: option.detail,
            }))}
            value={goal}
            onChange={(value) => setGoal(value as LearnerGoal)}
          />
        )}

        {step === 3 && (
          <ChoiceStep
            headingRef={heading}
            title="Pick a daily goal"
            description="You earn XP (experience points) for lessons and the mission. Reach your goal each day to build a streak. You can change it later on your profile."
            name="daily-goal"
            options={DAILY_GOAL_CHOICES.map((choice) => ({
              value: String(choice.xp),
              title: `${DAILY_GOAL_COPY[choice.id].title} · ${choice.xp} XP a day`,
              detail: DAILY_GOAL_COPY[choice.id].time,
            }))}
            value={dailyGoal === null ? null : String(dailyGoal)}
            onChange={(value) => setDailyGoal(Number(value))}
          />
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-surface pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-lg px-4 py-3">
          <button
            type="button"
            className={`w-full ${buttonStyles.primary}`}
            disabled={action.disabled}
            onClick={action.onClick}
          >
            {action.label}
          </button>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 text-slate-800">
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-current-50 text-xl text-current-ink-700"
      >
        {icon}
      </span>
      {children}
    </li>
  );
}

interface ChoiceStepProps {
  headingRef: Ref<HTMLHeadingElement>;
  title: string;
  description: string;
  name: string;
  options: Array<{ value: string; title: string; detail: string }>;
  value: string | null;
  onChange: (value: string) => void;
}

/** One question with large radio cards. Arrow keys move between options, as with any radio group. */
function ChoiceStep({
  headingRef,
  title,
  description,
  name,
  options,
  value,
  onChange,
}: ChoiceStepProps) {
  const titleId = useId();
  const descriptionId = useId();
  return (
    <section className="space-y-5 pt-2">
      <div className="space-y-2">
        <h1
          ref={headingRef}
          id={titleId}
          tabIndex={-1}
          className="text-3xl font-bold text-slate-900 outline-none"
        >
          {title}
        </h1>
        <p id={descriptionId} className="leading-relaxed text-slate-700">
          {description}
        </p>
      </div>
      <div
        role="radiogroup"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="space-y-3"
      >
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 transition-colors has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-current-600 ${
                checked
                  ? 'border-current-600 bg-current-50'
                  : 'border-slate-200 bg-surface hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="size-5 shrink-0 accent-current-600"
              />
              <span>
                <span className="block font-bold text-slate-900">{option.title}</span>
                <span className="block text-sm text-slate-600">{option.detail}</span>
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
