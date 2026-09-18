import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { buttonStyles } from '../components/buttonStyles';
import { DailyXpChart } from '../components/charts/DailyXpChart';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { BoltIcon, FlameIcon, SnowflakeIcon, StarIcon } from '../components/icons';
import { useRewards } from '../components/rewards/useRewards';
import { courseUnits } from '../content';
import { unitMission } from '../content/missions';
import { courseStanding, type UnitStanding } from '../game/course';
import { gradedTasksLabel } from '../game/missionRules';
import { markLessonCompleted } from '../game/progress';
import { DAILY_GOAL_CHOICES, dailyStatus, recentDays } from '../game/streak';
import { devDayOffset, setDevDayOffset, useToday } from '../storage/clock';
import { useProgress, useProgressStore } from '../storage/progressContext';
import type { ThemePreference } from '../storage/theme';
import { useTheme } from '../storage/themeContext';

export function ProfilePage() {
  const progress = useProgress();
  const today = useToday();
  const standings = courseStanding(courseUnits, progress);
  const status = dailyStatus(progress.activity, today, progress.dailyGoal);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total XP" value={progress.activity.totalXp} icon={<BoltIcon />} tone="xp" />
        <Stat
          label="Current streak"
          value={`${status.streak} ${status.streak === 1 ? 'day' : 'days'}`}
          icon={<FlameIcon />}
          tone="streak"
        />
        <Stat
          label="Longest streak"
          value={`${status.longestStreak} ${status.longestStreak === 1 ? 'day' : 'days'}`}
          icon={<StarIcon />}
          tone="slate"
        />
        <Stat
          label="Streak freezes"
          value={`${status.freezesHeld} held`}
          icon={<SnowflakeIcon />}
          tone="current"
        />
      </dl>

      <DailyGoalSetting dailyGoal={progress.dailyGoal} />
      <AppearanceSetting />

      <section
        aria-labelledby="xp-history-title"
        className="rounded-2xl bg-surface p-4 ring-1 ring-slate-200"
      >
        <h2 id="xp-history-title" className="font-bold">
          Your last 14 days
        </h2>
        <p className="mb-3 text-sm text-slate-600">
          Daily goal: {progress.dailyGoal} XP. Completing a mission earns a streak freeze that
          covers one missed day.
        </p>
        <DailyXpChart
          days={recentDays(progress.activity, today, 14)}
          dailyGoal={progress.dailyGoal}
        />
      </section>

      <section aria-labelledby="units-title" className="space-y-3">
        <h2 id="units-title" className="font-bold">
          Your units
        </h2>
        {standings.map((standing) => (
          <UnitStats key={standing.unit.id} standing={standing} />
        ))}
      </section>

      <section className="rounded-2xl bg-surface p-4 ring-1 ring-slate-200">
        <h2 className="font-bold">Playtest data</h2>
        <p className="text-sm text-slate-600">
          While this prototype is being tested, the app keeps a log of what you do on this device.
          You can see it, export it and clear it.
        </p>
        <Link to="/playtest" className={`mt-3 ${buttonStyles.secondary}`}>
          Open playtest data
        </Link>
      </section>

      {import.meta.env.DEV && <DevTools today={today} />}
    </div>
  );
}

const GOAL_NAMES: Record<string, string> = {
  casual: 'Casual',
  regular: 'Regular',
  serious: 'Serious',
};

const APPEARANCE: ReadonlyArray<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'Match my device' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function AppearanceSetting() {
  const { preference, setPreference } = useTheme();
  return (
    <section
      aria-labelledby="appearance-setting"
      className="rounded-2xl bg-surface p-4 ring-1 ring-slate-200"
    >
      <h2 id="appearance-setting" className="font-bold">
        Appearance
      </h2>
      <p className="text-sm text-slate-600">Dark mode is easier on the eyes at night.</p>
      <div
        role="radiogroup"
        aria-labelledby="appearance-setting"
        className="mt-3 grid gap-2 sm:grid-cols-3"
      >
        {APPEARANCE.map((option) => {
          const checked = option.value === preference;
          return (
            <label
              key={option.value}
              className={`flex min-h-12 cursor-pointer items-center gap-2.5 rounded-xl border-2 px-3 py-2 has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-current-600 ${
                checked ? 'border-current-600 bg-current-50' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="profile-appearance"
                checked={checked}
                onChange={() => setPreference(option.value)}
                className="size-5 shrink-0 accent-current-600"
              />
              <span className="font-semibold text-slate-900">{option.label}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

function DailyGoalSetting({ dailyGoal }: { dailyGoal: number }) {
  const rewards = useRewards();
  return (
    <section
      aria-labelledby="daily-goal-setting"
      className="rounded-2xl bg-surface p-4 ring-1 ring-slate-200"
    >
      <h2 id="daily-goal-setting" className="font-bold">
        Daily goal
      </h2>
      <p className="text-sm text-slate-600">XP to earn each day to keep your streak going.</p>
      <div
        role="radiogroup"
        aria-labelledby="daily-goal-setting"
        className="mt-3 grid gap-2 sm:grid-cols-3"
      >
        {DAILY_GOAL_CHOICES.map((choice) => {
          const checked = choice.xp === dailyGoal;
          return (
            <label
              key={choice.id}
              className={`flex min-h-12 cursor-pointer items-center gap-2.5 rounded-xl border-2 px-3 py-2 has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-current-600 ${
                checked ? 'border-current-600 bg-current-50' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="profile-daily-goal"
                checked={checked}
                onChange={() => rewards.setDailyGoal(choice.xp)}
                className="size-5 shrink-0 accent-current-600"
              />
              <span className="font-semibold text-slate-900">
                {GOAL_NAMES[choice.id]} · {choice.xp} XP
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

const TONES = {
  xp: 'bg-xp-50 text-xp-ink-700',
  streak: 'bg-streak-100 text-streak-ink-800',
  slate: 'bg-slate-100 text-slate-700',
  current: 'bg-current-50 text-current-ink-700',
} as const;

function Stat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone: keyof typeof TONES;
}) {
  return (
    <div className="flex flex-col-reverse gap-1 rounded-2xl bg-surface p-4 ring-1 ring-slate-200">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className="flex items-center gap-2 text-xl font-bold text-slate-900 tabular-nums">
        <span
          aria-hidden="true"
          className={`flex size-8 items-center justify-center rounded-full ${TONES[tone]}`}
        >
          {icon}
        </span>
        {value}
      </dd>
    </div>
  );
}

/** Development helpers. Stripped from production builds. */
function DevTools({ today }: { today: string }) {
  const store = useProgressStore();
  const [confirming, setConfirming] = useState(false);
  const offset = devDayOffset();

  return (
    <section
      aria-labelledby="dev-tools-title"
      className="space-y-3 rounded-2xl border-2 border-dashed border-slate-300 p-4"
    >
      <div>
        <h2 id="dev-tools-title" className="font-bold text-slate-700">
          Developer tools
        </h2>
        <p className="text-sm text-slate-600">Only visible in development builds.</p>
      </div>

      <div>
        <p className="text-sm text-slate-700">
          App date: <strong data-testid="dev-today">{today}</strong>
          {offset !== 0 && ` (${offset > 0 ? '+' : ''}${offset} days)`}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonStyles.secondary}
            onClick={() => setDevDayOffset(offset + 1)}
          >
            Skip to next day
          </button>
          <button
            type="button"
            className={buttonStyles.secondary}
            disabled={offset === 0}
            onClick={() => setDevDayOffset(0)}
          >
            Back to real date
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonStyles.secondary}
          onClick={() =>
            store.update((state) =>
              courseUnits
                .flatMap((unit) => unit.lessons)
                .reduce((next, lesson) => markLessonCompleted(next, lesson.id, new Date()), state),
            )
          }
        >
          Complete all lessons
        </button>
        <button
          type="button"
          className={buttonStyles.secondary}
          onClick={() => setConfirming(true)}
        >
          Reset progress
        </button>
      </div>
      <ConfirmDialog
        open={confirming}
        title="Reset all progress?"
        description="This clears lessons, XP and streaks on this device."
        cancelLabel="Keep my progress"
        confirmLabel="Reset progress"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          store.reset();
          setConfirming(false);
        }}
      />
    </section>
  );
}

const MISSION_STATE_TEXT: Record<UnitStanding['missionState'], string> = {
  locked: 'Locked',
  available: 'Ready to start',
  in_progress: 'In progress',
  completed: 'Completed',
};

/** One unit's numbers: lessons, checkpoint, boss battle and mission. */
function UnitStats({ standing }: { standing: UnitStanding }) {
  const { unit, number } = standing;
  const mission = unitMission(unit);
  const rows: Array<[string, string]> = [
    ['Lessons', `${standing.lessonsCompleted} of ${unit.lessons.length} completed`],
    ['Checkpoint', standing.checkpointPassed ? 'Passed' : 'Not passed yet'],
    [
      'Boss battle',
      standing.boss.plays === 0
        ? 'Not played yet'
        : `Best: ${standing.boss.bestCorrect} right in ${standing.boss.plays} round${standing.boss.plays === 1 ? '' : 's'}`,
    ],
    [
      `Mission: ${mission.title}`,
      standing.missionState === 'in_progress'
        ? `${standing.graded.passed} of ${standing.graded.total} ${gradedTasksLabel(mission)} passed`
        : MISSION_STATE_TEXT[standing.missionState],
    ],
  ];
  return (
    <section
      aria-labelledby={`profile-unit-${number}`}
      className="rounded-2xl bg-surface p-4 ring-1 ring-slate-200"
    >
      <h3 id={`profile-unit-${number}`} className="font-bold text-slate-900">
        Unit {number}: {unit.title}
        {!standing.unlocked && (
          <>
            {' '}
            <span className="font-normal text-slate-600">(locked)</span>
          </>
        )}
      </h3>
      <dl className="mt-2 space-y-1 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-wrap justify-between gap-x-3">
            <dt className="text-slate-700">{label}</dt>
            <dd className="font-semibold text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
