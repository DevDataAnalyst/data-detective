import { Link, NavLink } from 'react-router';
import { dailyStatus } from '../game/streak';
import { useToday } from '../storage/clock';
import { useProgress } from '../storage/progressContext';
import { BoltIcon, CheckIcon, FlameIcon } from './icons';

const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold',
    isActive ? 'bg-current-50 text-current-700' : 'text-slate-600 hover:bg-slate-100',
  ].join(' ');

export function TopBar() {
  const progress = useProgress();
  const today = useToday();
  const status = dailyStatus(progress.activity, today, progress.dailyGoal);
  const streakLabel = `${status.streak} day streak${status.goalMetToday ? '' : ', today’s goal not met yet'}`;

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
            data-testid="streak-counter"
            title={streakLabel}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-bold ${
              status.goalMetToday ? 'bg-streak-100 text-streak-800' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <FlameIcon aria-hidden="true" />
            <span aria-hidden="true">{status.streak}</span>
            {status.goalMetToday && <CheckIcon aria-hidden="true" className="text-xs" />}
            <span className="sr-only">{streakLabel}</span>
          </p>
          <p
            data-testid="xp-counter"
            className="flex items-center gap-1 rounded-full bg-xp-50 px-2.5 py-1 text-sm font-bold text-xp-700"
          >
            <BoltIcon aria-hidden="true" />
            <span aria-hidden="true">{progress.activity.totalXp} XP</span>
            <span className="sr-only">{progress.activity.totalXp} XP in total</span>
          </p>
        </div>
      </div>
    </header>
  );
}
