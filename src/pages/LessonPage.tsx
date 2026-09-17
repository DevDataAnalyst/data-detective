import type { ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { buttonStyles } from '../components/buttonStyles';
import { LockIcon } from '../components/icons';
import { LessonPlayer } from '../components/lesson/LessonPlayer';
import { useRewards } from '../components/rewards/useRewards';
import { MicroSurvey } from '../components/survey/MicroSurvey';
import { findLesson } from '../content';
import { completedLessonIds } from '../game/progress';
import { lessonStatus, unlockingLessonId } from '../game/unlocks';
import { useProgress } from '../storage/progressContext';

export function LessonPage() {
  const { lessonId = '' } = useParams();
  const navigate = useNavigate();
  const rewards = useRewards();
  const progress = useProgress();
  const location = findLesson(lessonId);

  if (!location) {
    return (
      <LessonMessage title="We couldn’t find that lesson">
        The link might be old or mistyped.
      </LessonMessage>
    );
  }

  const { unit, lesson, index } = location;
  const lessonIds = unit.lessons.map((item) => item.id);
  const completed = completedLessonIds(progress);

  if (lessonStatus(lessonIds, completed, lesson.id) === 'locked') {
    const unlockedBy = unit.lessons.find(
      (item) => item.id === unlockingLessonId(lessonIds, lesson.id),
    );
    return (
      <LessonMessage title={`“${lesson.title}” is still locked`} locked>
        Complete “{unlockedBy?.title}” first, and this lesson opens up.
      </LessonMessage>
    );
  }

  return (
    <LessonPlayer
      key={lesson.id}
      lesson={lesson}
      lessonNumber={index + 1}
      summaryExtra={
        completed.size >= 3 ? (
          <MicroSurvey
            surveyId="lessons_feel"
            question="How did the lessons feel so far?"
            options={[
              { value: 'too_easy', label: 'Too easy' },
              { value: 'about_right', label: 'About right' },
              { value: 'too_hard', label: 'Too hard' },
            ]}
          />
        ) : null
      }
      onExit={() => navigate('/')}
      onFinish={(result) =>
        rewards.completeLesson(result.lessonId, result.firstAttemptAccuracy).award
      }
    />
  );
}

function LessonMessage({
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
