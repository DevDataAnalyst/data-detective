import { useState } from 'react';
import { Link } from 'react-router';
import { buttonStyles } from '../components/buttonStyles';
import { LessonPlayer } from '../components/lesson/LessonPlayer';
import type { Lesson, QuestionType } from '../content/types';
import { PREVIEW_QUESTIONS } from '../dev/previewQuestions';

const TYPES: ReadonlyArray<{ type: QuestionType; name: string; about: string }> = [
  {
    type: 'inbox_triage',
    name: 'Inbox triage',
    about: 'Pick the one question the data can answer.',
  },
  { type: 'spot_the_lie', name: 'Spot the lie', about: 'Find what a misleading chart does.' },
  { type: 'courtroom', name: 'Courtroom', about: 'Name the lurking variable behind a claim.' },
  { type: 'build_metric', name: 'Build the metric', about: 'Place the numerator and denominator.' },
];

/**
 * Development only: plays placeholder questions for the challenge types through the real lesson
 * player, so they can be checked with a mouse, touch or keyboard. Nothing here earns XP.
 */
export default function QuestionPreviewPage() {
  const [playing, setPlaying] = useState<QuestionType | null>(null);

  if (playing) {
    const type = TYPES.find((entry) => entry.type === playing);
    const lesson: Lesson = {
      id: `preview-${playing}`,
      title: `Preview: ${type?.name ?? playing}`,
      estimatedMinutes: 3,
      intro:
        'Placeholder questions for checking a challenge type. Answer some wrongly too, to see the feedback. Nothing here is saved.',
      questions: PREVIEW_QUESTIONS.filter((question) => question.type === playing),
    };
    return (
      <LessonPlayer
        key={playing}
        lesson={lesson}
        lessonNumber={1}
        onExit={() => setPlaying(null)}
      />
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      <header className="space-y-1">
        <p className="text-sm font-bold tracking-wide text-current-ink-700 uppercase">
          Development only
        </p>
        <h1 className="text-2xl font-bold text-slate-900">Question preview</h1>
        <p className="text-slate-600">
          Play the placeholder questions for each challenge type in the lesson player.
        </p>
      </header>
      <ul className="grid gap-3">
        {TYPES.map((entry) => {
          const count = PREVIEW_QUESTIONS.filter((question) => question.type === entry.type).length;
          return (
            <li key={entry.type}>
              <button
                type="button"
                onClick={() => setPlaying(entry.type)}
                className="flex min-h-14 w-full flex-col items-start rounded-2xl bg-surface px-4 py-3 text-left ring-1 ring-slate-200 hover:bg-slate-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-current-600"
              >
                <span className="font-bold text-slate-900">
                  {entry.name} ({count})
                </span>
                <span className="text-sm text-slate-600">{entry.about}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <Link to="/" className={buttonStyles.secondary}>
        Back to path
      </Link>
    </main>
  );
}
