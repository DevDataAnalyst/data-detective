import { Link, NavLink } from 'react-router';
import { BoltIcon, FlameIcon } from './icons';

const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold',
    isActive ? 'bg-current-50 text-current-700' : 'text-slate-600 hover:bg-slate-100',
  ].join(' ');

export function TopBar() {
  // Placeholder values until the progression system lands in build step 5.
  const xp = 0;
  const streak = 0;
  const goalMetToday = false;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
        <Link
          to="/"
          className="flex min-h-11 items-center gap-2 rounded-lg font-bold tracking-tight text-slate-900"
        >
          <img src="/favicon.svg" alt="" width={28} height={28} />
          <span>Data Detective</span>
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            <li>
              <NavLink to="/" end className={desktopLinkClass}>
                Path
              </NavLink>
            </li>
            <li>
              <NavLink to="/profile" className={desktopLinkClass}>
                Profile
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <p
            className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-sm font-bold text-slate-700"
            aria-label={`${streak} day streak`}
          >
            <FlameIcon className={goalMetToday ? 'text-streak-500' : 'text-locked-400'} />
            <span aria-hidden="true">{streak}</span>
          </p>
          <p
            className="flex items-center gap-1 rounded-full bg-xp-50 px-2.5 py-1 text-sm font-bold text-xp-700"
            aria-label={`${xp} XP`}
          >
            <BoltIcon />
            <span aria-hidden="true">{xp} XP</span>
          </p>
        </div>
      </div>
    </header>
  );
}
