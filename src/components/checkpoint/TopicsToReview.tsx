import { Link } from 'react-router';
import type { Lesson } from '../../content/types';
import type { LessonStatus } from '../../game/unlocks';
import { buttonStyles } from '../buttonStyles';
import { LockIcon } from '../icons';
import { questionsMissed } from './checkpointCopy';

interface TopicsToReviewProps {
  lessons: readonly Lesson[];
  missedLessonIds: readonly string[];
  /** Missed questions per lesson, when known. */
  missedByLesson?: Readonly<Record<string, number>>;
  statusOf: (lessonId: string) => LessonStatus;
}

/** The lessons behind missed checkpoint questions, each linked to its lesson while it is open. */
export function TopicsToReview({
  lessons,
  missedLessonIds,
  missedByLesson,
  statusOf,
}: TopicsToReviewProps) {
  if (missedLessonIds.length === 0) return null;
  return (
    <section
      aria-labelledby="topics-to-review"
      className="space-y-3 rounded-2xl bg-surface p-4 ring-1 ring-slate-200"
    >
      <h2 id="topics-to-review" className="text-lg font-bold text-slate-900">
        Topics to review
      </h2>
      <ul className="space-y-2">
        {missedLessonIds.map((lessonId) => {
          const index = lessons.findIndex((lesson) => lesson.id === lessonId);
          const lesson = lessons[index];
          if (!lesson) return null;
          const status = statusOf(lessonId);
          const missed = missedByLesson?.[lessonId];
          return (
            <li
              key={lessonId}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-slate-50 p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">
                  Lesson {index + 1}: {lesson.title}
                </p>
                {missed !== undefined && (
                  <p className="text-sm text-slate-600">{questionsMissed(missed)}</p>
                )}
              </div>
              {status === 'locked' ? (
                <p className="flex items-center gap-1.5 text-sm text-slate-600">
                  <LockIcon className="shrink-0 text-locked-500" aria-hidden="true" />
                  Opens after “{lessons[index - 1]?.title}”
                </p>
              ) : (
                <Link
                  to={`/lesson/${lesson.id}`}
                  aria-label={`${status === 'completed' ? 'Practise' : 'Start'} lesson ${index + 1}: ${lesson.title}`}
                  className={`${buttonStyles.secondary} min-h-11 text-sm`}
                >
                  {status === 'completed' ? 'Practise' : 'Start'}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
