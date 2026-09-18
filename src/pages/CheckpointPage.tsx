import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { buttonStyles } from '../components/buttonStyles';
import { CheckpointPlayer } from '../components/checkpoint/CheckpointPlayer';
import {
  CheckpointResults,
  CheckpointScreen,
  ScreenTitle,
} from '../components/checkpoint/CheckpointResults';
import { describeMinutes } from '../components/checkpoint/checkpointCopy';
import { TopicsToReview } from '../components/checkpoint/TopicsToReview';
import { Mascot } from '../components/Mascot';
import { useRewards } from '../components/rewards/useRewards';
import type { Unit } from '../content/types';
import { FullScreenMessage } from '../components/FullScreenMessage';
import { missionPath } from '../content/paths';
import {
  checkpointAvailability,
  correctByQuestion,
  correctNeeded,
  reviewStartLessonId,
  type CheckpointAnswerRecord,
} from '../game/checkpoint';
import { checkpointProgress, completedLessonIds } from '../game/progress';
import type { CheckpointOutcome } from '../game/rewards';
import { lessonStatus } from '../game/unlocks';
import { checkpointXp } from '../game/xp';
import { useNow } from '../storage/clock';
import { useEvents } from '../storage/eventsContext';
import { useProgress } from '../storage/progressContext';
import { unitLockReason, useUnitRoute } from './unitRoute';

export function CheckpointPage() {
  const route = useUnitRoute();
  if (!route) {
    return (
      <FullScreenMessage title="We couldn’t find that checkpoint">
        The link might be old or mistyped.
      </FullScreenMessage>
    );
  }
  if (!route.standing.unlocked) {
    return (
      <FullScreenMessage title="This checkpoint is still locked" locked>
        {unitLockReason(route.previous)}
      </FullScreenMessage>
    );
  }
  return <UnitCheckpoint key={route.standing.unit.id} unit={route.standing.unit} />;
}

function UnitCheckpoint({ unit }: { unit: Unit }) {
  const { checkpoint } = unit;
  const progress = useProgress();
  const rewards = useRewards();
  const events = useEvents();
  const navigate = useNavigate();
  const currentTime = useNow();
  const [result, setResult] = useState<{
    outcome: CheckpointOutcome;
    answers: Record<string, CheckpointAnswerRecord>;
  } | null>(null);

  const lessonIds = unit.lessons.map((lesson) => lesson.id);
  const completed = completedLessonIds(progress);
  const statusOf = (lessonId: string) => lessonStatus(lessonIds, completed, lessonId) ?? 'locked';
  const retakeDelay = describeMinutes(checkpoint.retakeDelayMinutes);

  if (result) {
    return (
      <CheckpointResults
        unit={unit}
        outcome={result.outcome}
        answers={result.answers}
        statusOf={statusOf}
        reviewStartLessonId={reviewStartLessonId(
          lessonIds,
          completed,
          result.outcome.score.missedLessonIds,
        )}
        retakeDelay={retakeDelay}
      />
    );
  }

  const saved = checkpointProgress(progress, checkpoint.id);
  const availability = checkpointAvailability(saved, checkpoint.retakeDelayMinutes, currentTime);

  if (availability.kind === 'passed') {
    const passedOn = new Date(availability.passedAt).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'long',
    });
    return (
      <CheckpointScreen>
        <section className="space-y-4 rounded-3xl bg-surface px-4 py-6 text-center ring-1 ring-slate-200">
          <ScreenTitle icon={<Mascot pose="thumbs-up" eager className="mx-auto h-28 w-auto" />}>
            You already tested out
          </ScreenTitle>
          <p className="text-slate-700">
            You passed the checkpoint on {passedOn}
            {saved.lastAttempt?.passed &&
              ` with ${saved.lastAttempt.correct} of ${saved.lastAttempt.total} right`}
            . Every lesson is open for practice, and so is the mission.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to={missionPath(unit.id)} className={`${buttonStyles.primary} sm:flex-1`}>
              Open the mission
            </Link>
            <Link to="/" className={`${buttonStyles.secondary} sm:flex-1`}>
              Back to path
            </Link>
          </div>
        </section>
      </CheckpointScreen>
    );
  }

  if (availability.kind === 'waiting') {
    const last = saved.lastAttempt;
    const missed = last?.missedLessonIds ?? [];
    const startId = reviewStartLessonId(lessonIds, completed, missed);
    const startIndex = lessonIds.indexOf(startId ?? '');
    return (
      <CheckpointScreen>
        <section className="space-y-4 rounded-3xl bg-surface px-4 py-6 text-center ring-1 ring-slate-200">
          <ScreenTitle icon={<Mascot pose="sleeping" eager className="mx-auto h-28 w-auto" />}>
            Review first, then try again
          </ScreenTitle>
          <p className="text-lg text-slate-700">
            You can take the checkpoint again in {describeMinutes(availability.minutesLeft)}.
          </p>
          {last && (
            <p className="text-slate-600">
              Last time you got {last.correct} of {last.total} right. You need{' '}
              {correctNeeded(checkpoint)} to test out.
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            {startIndex !== -1 && (
              <Link
                to={`/lesson/${lessonIds[startIndex]}`}
                className={`${buttonStyles.primary} sm:flex-1`}
              >
                Start lesson {startIndex + 1}
              </Link>
            )}
            <Link to="/" className={`${buttonStyles.secondary} sm:flex-1`}>
              Back to path
            </Link>
          </div>
        </section>
        <TopicsToReview lessons={unit.lessons} missedLessonIds={missed} statusOf={statusOf} />
      </CheckpointScreen>
    );
  }

  return (
    <CheckpointPlayer
      checkpoint={checkpoint}
      lessonCount={unit.lessons.length}
      xp={checkpointXp(false)}
      retakeDelay={retakeDelay}
      onExit={() => void navigate('/')}
      onFinish={(session) => {
        const outcome = rewards.finishCheckpoint(unit, correctByQuestion(session));
        events.record({
          type: 'checkpoint_finished',
          checkpointId: checkpoint.id,
          correct: outcome.score.correct,
          total: outcome.score.total,
          passed: outcome.score.passed,
          ms: (session.finishedAt ?? 0) - (session.startedAt ?? 0),
        });
        setResult({ outcome, answers: session.answers });
      }}
    />
  );
}
