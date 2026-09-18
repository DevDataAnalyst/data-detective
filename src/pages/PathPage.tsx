import { Link, Navigate } from 'react-router';
import { buttonStyles } from '../components/buttonStyles';
import { DailyGoalRing } from '../components/DailyGoalRing';
import { FlameIcon, SnowflakeIcon } from '../components/icons';
import { Mascot } from '../components/Mascot';
import { PathMap } from '../components/path/PathMap';
import { findMission } from '../content/missions';
import { unit1 } from '../content/unit1';
import { missionProgress } from '../game/missionProgress';
import { gradedTasksLabel, missionState, missionTaskCounts } from '../game/missionRules';
import { checkpointAvailability } from '../game/checkpoint';
import {
  bossProgress,
  checkpointProgress,
  completedLessonIds,
  hasPassedCheckpoint,
  isOnboarded,
  testedOutLessonIds,
} from '../game/progress';
import { isMissionUnlocked } from '../game/unlocks';
import { dailyStatus } from '../game/streak';
import { XP_RULES } from '../game/xp';
import { describeMinutes } from '../components/checkpoint/checkpointCopy';
import { useNow, useToday } from '../storage/clock';
import { useProgress } from '../storage/progressContext';

export function PathPage() {
  const progress = useProgress();
  const today = useToday();
  const currentTime = useNow();
  const unit = unit1;
  const completed = completedLessonIds(progress);
  const completedCount = unit.lessons.filter((lesson) => completed.has(lesson.id)).length;
  const mission = findMission(unit.missionId);
  const status = dailyStatus(progress.activity, today, progress.dailyGoal);
  const checkpointPassed = hasPassedCheckpoint(progress, unit.checkpoint.id);
  const missionUnlocked = isMissionUnlocked(
    unit.lessons.map((lesson) => lesson.id),
    completed,
    checkpointPassed,
  );
  const checkpoint = checkpointAvailability(
    checkpointProgress(progress, unit.checkpoint.id),
    unit.checkpoint.retakeDelayMinutes,
    currentTime,
  );
  const showTestOut = !checkpointPassed && completedCount < unit.lessons.length;
  const savedMission = mission ? missionProgress(progress, mission.id) : null;
  const savedBoss = bossProgress(progress, unit.id);
  const counts = mission && savedMission ? missionTaskCounts(mission, savedMission) : null;

  if (!isOnboarded(progress)) return <Navigate to="/welcome" replace />;

  return (
    <div className="space-y-5">
      <header className="rounded-3xl bg-current-600 p-5 text-white shadow-[0_6px_0_var(--color-current-800)]">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold tracking-wide uppercase">Unit 1</p>
            <h1 className="text-2xl font-bold">{unit.title}</h1>
            <p className="mt-1 text-white">{unit.description}</p>
          </div>
          <Mascot pose="waving" eager className="-mt-1 -mr-1 h-20 w-auto shrink-0 sm:h-28" />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div
            role="progressbar"
            aria-label="Lessons completed"
            aria-valuemin={0}
            aria-valuemax={unit.lessons.length}
            aria-valuenow={completedCount}
            className="h-3 flex-1 overflow-hidden rounded-full bg-white/25"
          >
            <div
              className="h-full rounded-full bg-white"
              style={{ width: `${(completedCount / unit.lessons.length) * 100}%` }}
            />
          </div>
          <p className="text-sm font-bold whitespace-nowrap">
            {completedCount} of {unit.lessons.length} lessons
          </p>
        </div>
      </header>

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

      {showTestOut && (
        <section
          aria-labelledby="test-out-title"
          className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface p-4 ring-1 ring-slate-200"
        >
          <div className="min-w-0 flex-1">
            <h2 id="test-out-title" className="font-bold text-slate-900">
              Already know this?
            </h2>
            <p className="text-sm text-slate-600">
              {checkpoint.kind === 'waiting'
                ? `You can take the checkpoint again in ${describeMinutes(checkpoint.minutesLeft)}.`
                : `Pass a ${unit.checkpoint.items.length}-question checkpoint to skip ahead to the mission.`}
            </p>
          </div>
          <Link to="/checkpoint" className={buttonStyles.secondary}>
            {checkpoint.kind === 'waiting' ? 'See what to review' : 'Test out'}
          </Link>
        </section>
      )}

      <PathMap
        unit={unit}
        completed={completed}
        testedOut={testedOutLessonIds(progress)}
        boss={{
          state: !missionUnlocked ? 'locked' : savedBoss.plays > 0 ? 'played' : 'available',
          bestCorrect: savedBoss.bestCorrect,
          bonusEarnedToday: savedBoss.lastXpDay === today,
        }}
        mission={{
          title: mission?.title ?? 'Mission',
          xp: XP_RULES.missionBase,
          state:
            mission && savedMission
              ? missionState(mission, savedMission, missionUnlocked)
              : missionUnlocked
                ? 'available'
                : 'locked',
          codeTasksPassed: counts?.requiredPassed ?? 0,
          codeTaskCount: counts?.requiredTotal ?? 0,
          taskLabel: mission ? gradedTasksLabel(mission) : 'tasks',
        }}
      />
    </div>
  );
}
