import { useParams } from 'react-router';

export function LessonPage() {
  const { lessonId } = useParams();
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-bold">Lesson</h1>
      <p className="text-slate-600">The lesson player for “{lessonId}” will appear here.</p>
    </section>
  );
}
