import { Link } from 'react-router';

export function PathPage() {
  return (
    <section aria-labelledby="path-title" className="space-y-4">
      <p className="text-sm font-semibold text-current-700">Unit 1</p>
      <h1 id="path-title" className="text-2xl font-bold">
        Data Detective
      </h1>
      <p className="text-slate-600">Your lesson path will appear here.</p>
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link className="text-current-700 underline" to="/lesson/placeholder">
            Sample lesson
          </Link>
        </li>
        <li>
          <Link className="text-current-700 underline" to="/checkpoint">
            Checkpoint
          </Link>
        </li>
        <li>
          <Link className="text-current-700 underline" to="/mission">
            Mission
          </Link>
        </li>
      </ul>
    </section>
  );
}
