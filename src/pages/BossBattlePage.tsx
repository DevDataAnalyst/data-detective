import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { BossBattlePlayer } from '../components/boss/BossBattlePlayer';
import { FullScreenMessage } from '../components/FullScreenMessage';
import { useRewards } from '../components/rewards/useRewards';
import type { Unit } from '../content/types';
import { bossQuestionPool, masteredQuestionIds } from '../game/bossBattle';
import { useProgressStore } from '../storage/progressContext';
import { unitLockReason, useUnitRoute } from './unitRoute';

/** The end-of-unit boss battle. It opens with the mission: all lessons done, or tested out. */
export function BossBattlePage() {
  const route = useUnitRoute();
  if (!route) {
    return (
      <FullScreenMessage title="We couldn’t find that boss battle">
        The link might be old or mistyped.
      </FullScreenMessage>
    );
  }
  const { standing, previous } = route;
  if (!standing.missionUnlocked) {
    return (
      <FullScreenMessage title="The boss battle is still locked" locked>
        {standing.unlocked
          ? `Finish all ${standing.unit.lessons.length} lessons in “${standing.unit.title}”, or pass its test-out checkpoint, to take on the boss.`
          : unitLockReason(previous)}
      </FullScreenMessage>
    );
  }
  return <UnitBossBattle key={standing.unit.id} unit={standing.unit} />;
}

function UnitBossBattle({ unit }: { unit: Unit }) {
  const navigate = useNavigate();
  const rewards = useRewards();
  const store = useProgressStore();
  const [round, setRound] = useState(() => Date.now());

  // The pool is fixed for a round: XP earned while playing must not reshuffle the questions.
  const pool = useMemo(
    () => bossQuestionPool(unit, masteredQuestionIds(unit, store.getSnapshot())),
    // A new round picks from the latest progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unit, round],
  );

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
