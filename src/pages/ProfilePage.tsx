import { useState, type ReactNode } from 'react';
import { buttonStyles } from '../components/buttonStyles';
import { DailyXpChart } from '../components/charts/DailyXpChart';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { BoltIcon, FlameIcon, SnowflakeIcon, StarIcon } from '../components/icons';
import { unit1 } from '../content/unit1';
import { completedLessonIds, markLessonCompleted } from '../game/progress';
import { dailyStatus, recentDays } from '../game/streak';
import { devDayOffset, setDevDayOffset, useToday } from '../storage/clock';
import { useProgress, useProgressStore } from '../storage/progressContext';

export function ProfilePage() {
  const progress = useProgress();
  const today = useToday();
  const completed = completedLessonIds(progress);
  const completedCount = unit1.lessons.filter((lesson) => completed.has(lesson.id)).length;
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

      <section
        aria-labelledby="xp-history-title"
        className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
      >
        <h2 id="xp-history-title" className="font-bold">
          Your last 14 days
        </h2>
        <p className="mb-3 text-sm text-slate-600">
          Daily goal: {progress.dailyGoal} XP. Completing the mission earns a streak freeze that
          covers one missed day.
        </p>
        <DailyXpChart
          days={recentDays(progress.activity, today, 14)}
          dailyGoal={progress.dailyGoal}
        />
      </section>

      <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <h2 className="font-bold">Unit 1: {unit1.title}</h2>
        <p className="text-slate-600">
          {completedCount} of {unit1.lessons.length} lessons completed
        </p>
      </section>

      {import.meta.env.DEV && <DevTools today={today} />}
    </div>
  );
}

const TONES = {
  xp: 'bg-xp-50 text-xp-700',
  streak: 'bg-streak-100 text-streak-600',
  slate: 'bg-slate-100 text-slate-700',
  current: 'bg-current-50 text-current-700',
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
    <div className="flex flex-col-reverse gap-1 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
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
              unit1.lessons.reduce(
                (next, lesson) => markLessonCompleted(next, lesson.id, new Date()),
                state,
              ),
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
