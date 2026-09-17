import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-bold">We couldn’t find that page</h1>
      <p className="text-slate-600">The link might be old or mistyped.</p>
      <Link
        to="/"
        className="inline-flex min-h-11 items-center rounded-xl bg-current-600 px-4 font-semibold text-white"
      >
        Back to path
      </Link>
    </section>
  );
}
