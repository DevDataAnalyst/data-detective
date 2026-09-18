import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { DailyGoalRing } from '../components/DailyGoalRing';
import { FlameIcon, SnowflakeIcon } from '../components/icons';
import { Mascot } from '../components/Mascot';
import { unitAnchor } from '../components/path/unitAnchor';
import { UnitSection } from '../components/path/UnitSection';
import { courseUnits } from '../content';
import { courseStanding, currentUnitIndex } from '../game/course';
import { isOnboarded, markHookSeen } from '../game/progress';
import { dailyStatus } from '../game/streak';
import { useToday } from '../storage/clock';
import { useProgress, useProgressStore } from '../storage/progressContext';

export function PathPage() {
  const progress = useProgress();
  const store = useProgressStore();
  const today = useToday();
  const status = dailyStatus(progress.activity, today, progress.dailyGoal);
  const standings = courseStanding(courseUnits, progress);
  const current = currentUnitIndex(standings);
  const location = useLocation();
  const navigate = useNavigate();

  // Open on the unit the learner is working on, below the units already finished: its anchor goes
  // in the URL, and the router's scroll restoration scrolls to it.
  useEffect(() => {
    if (current > 0 && !location.hash) {
      void navigate(
        { hash: unitAnchor(current + 1) },
        { replace: true, preventScrollReset: false },
      );
    }
  }, [current, location.hash, navigate]);

  if (!isOnboarded(progress)) return <Navigate to="/welcome" replace />;

  return (
    <div className="space-y-5">
      <h1 className="sr-only">Your learning path</h1>
      <section
        aria-labelledby="daily-goal-title"
        className="space-y-3 rounded-2xl bg-surface p-4 ring-1 ring-slate-200"
      >
        <div className="flex items-center gap-4">
          <DailyGoalRing xpToday={status.xpToday} dailyGoal={status.dailyGoal} />
          <div className="min-w-0 flex-1">
            <h2 id="daily-goal-title" className="font-bold text-slate-900">
              Daily goal
            </h2>
            <p className="text-sm text-slate-600" data-testid="daily-goal-text">
              {status.goalMetToday
                ? `Done for today: ${status.xpToday} of ${status.dailyGoal} XP.`
                : `${status.xpToday} of ${status.dailyGoal} XP today. ${status.xpToGoal} XP to go.`}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold">
              <span
                className={`flex items-center gap-1 ${status.goalMetToday ? 'text-streak-ink-700' : 'text-slate-600'}`}
              >
                <FlameIcon aria-hidden="true" />
                {status.streak} day streak
              </span>
              {status.freezesHeld > 0 && (
                <span className="flex items-center gap-1 text-current-ink-700">
                  <SnowflakeIcon aria-hidden="true" />
                  Streak freeze ready
                </span>
              )}
            </p>
          </div>
        </div>
        {!status.goalMetToday && status.streak > 0 && (
          <p
            data-testid="streak-nudge"
            className="flex items-center gap-3 rounded-xl bg-streak-100 py-1.5 pr-3 pl-2 text-sm font-semibold text-streak-ink-800"
          >
            <Mascot pose="sleeping" className="h-12 w-auto shrink-0" />
            Your {status.streak}-day streak is snoozing. Earn {status.xpToGoal} more XP today to
            keep it going.
          </p>
        )}
      </section>

      <div className="space-y-8">
        {standings.map((standing, index) => (
          <UnitSection
            key={standing.unit.id}
            standing={standing}
            previous={standings[index - 1] ?? null}
            current={index === current}
            onDismissHook={() => store.update((state) => markHookSeen(state, standing.unit.id))}
          />
        ))}
      </div>
    </div>
  );
}
