import { Link, useNavigate, useParams } from 'react-router';
import { buttonStyles } from '../components/buttonStyles';
import { LessonPlayer } from '../components/lesson/LessonPlayer';
import { findLesson } from '../content';

export function LessonPage() {
  const { lessonId = '' } = useParams();
  const navigate = useNavigate();
  const location = findLesson(lessonId);

  if (!location) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4">
        <h1 className="text-2xl font-bold">We couldn’t find that lesson</h1>
        <p className="text-slate-600">The link might be old or mistyped.</p>
        <Link to="/" className={buttonStyles.primary}>
          Back to path
        </Link>
      </main>
    );
  }

  return (
    <LessonPlayer
      key={location.lesson.id}
      lesson={location.lesson}
      lessonNumber={location.index + 1}
      onExit={() => navigate('/')}
    />
  );
}
