import { Link } from 'react-router';
import { unit1 } from '../content/unit1';

export function PathPage() {
  return (
    <section aria-labelledby="path-title" className="space-y-4">
      <p className="text-sm font-semibold text-current-700">Unit 1</p>
      <h1 id="path-title" className="text-2xl font-bold">
        Data Detective
      </h1>
      <p className="text-slate-600">The lesson path map arrives in build step 4.</p>
      <ol className="list-decimal space-y-2 pl-6">
        {unit1.lessons.map((lesson) => (
          <li key={lesson.id}>
            <Link className="text-current-700 underline" to={`/lesson/${lesson.id}`}>
              {lesson.title}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
