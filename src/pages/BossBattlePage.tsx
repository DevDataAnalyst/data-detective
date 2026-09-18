import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { BossBattlePlayer } from '../components/boss/BossBattlePlayer';
import { buttonStyles } from '../components/buttonStyles';
import { LockIcon } from '../components/icons';
import { useRewards } from '../components/rewards/useRewards';
import { courseUnits } from '../content';
import { bossQuestionPool, masteredQuestionIds } from '../game/bossBattle';
import { completedLessonIds, hasPassedCheckpoint } from '../game/progress';
import { isMissionUnlocked } from '../game/unlocks';
import { useProgress, useProgressStore } from '../storage/progressContext';

/** The end-of-unit boss battle. It opens with the mission: all lessons done, or tested out. */
export function BossBattlePage() {
  const { unitId = '' } = useParams();
  const navigate = useNavigate();
  const rewards = useRewards();
  const progress = useProgress();
  const store = useProgressStore();
  const [round, setRound] = useState(() => Date.now());
  const unit = courseUnits.find((candidate) => candidate.id === unitId) ?? null;

  // The pool is fixed for a round: XP earned while playing must not reshuffle the questions.
  const pool = useMemo(
    () => (unit ? bossQuestionPool(unit, masteredQuestionIds(unit, store.getSnapshot())) : []),
    // A new round (and a new unit) picks from the latest progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unit, round],
  );

  if (!unit) {
    return (
      <Message title="We couldn’t find that boss battle">
        The link might be old or mistyped.
      </Message>
    );
  }

  const unlocked = isMissionUnlocked(
    unit.lessons.map((lesson) => lesson.id),
    completedLessonIds(progress),
    hasPassedCheckpoint(progress, unit.checkpoint.id),
  );
  if (!unlocked) {
    return (
      <Message title="The boss battle is still locked" locked>
        Finish all {unit.lessons.length} lessons in “{unit.title}”, or pass its test-out checkpoint,
        to take on the boss.
      </Message>
    );
  }

  return (
    <BossBattlePlayer
      key={round}
      unit={unit}
      pool={pool}
      seed={round}
      onExit={() => void navigate('/')}
      onPlayAgain={() => setRound(Date.now())}
      onFinish={(score) => rewards.finishBossBattle(unit.id, score.correct, score.answered)}
    />
  );
}

function Message({
  title,
  locked = false,
  children,
}: {
  title: string;
  locked?: boolean;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4">
      {locked && (
        <span className="flex size-16 items-center justify-center rounded-full bg-locked-200 text-3xl text-locked-600">
          <LockIcon aria-hidden="true" />
        </span>
      )}
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="text-slate-600">{children}</p>
      <Link to="/" className={buttonStyles.primary}>
        Back to path
      </Link>
    </main>
  );
}
