import { dailyQuestions } from '../content/daily';
import { courseUnits } from '../content/index';
import { missions } from '../content/missions';
import type { Question } from '../content/types';
import { PREVIEW_QUESTIONS } from '../dev/previewQuestions';

/**
 * Every question the app can show, with where it lives: lessons, checkpoints, mission question
 * tasks, daily challenges and the development previews. For tests that check all content.
 */
export function contentQuestions(): Array<{ path: string; question: Question }> {
  return [
    ...courseUnits.flatMap((unit) => [
      ...unit.lessons.flatMap((lesson) =>
        lesson.questions.map((question) => ({ path: `${unit.id}/${lesson.id}`, question })),
      ),
      ...unit.checkpoint.items.map(({ question }) => ({
        path: `${unit.id}/${unit.checkpoint.id}`,
        question,
      })),
    ]),
    ...missions.flatMap((mission) =>
      mission.tasks.flatMap((task) =>
        task.kind === 'question'
          ? [{ path: `${mission.id}/${task.id}`, question: task.question }]
          : [],
      ),
    ),
    ...dailyQuestions.map((question) => ({ path: 'daily', question })),
    ...PREVIEW_QUESTIONS.map((question) => ({ path: 'preview', question })),
  ];
}
