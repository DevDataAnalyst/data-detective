import { NavLink } from 'react-router';
import { PathIcon, UserIcon } from './icons';

// The active tab gets a bar as well as colour, so colour is not the only signal.
const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-semibold',
    isActive
      ? 'text-current-ink-700 before:absolute before:inset-x-1/4 before:top-0 before:h-1 before:rounded-b-full before:bg-current-600'
      : 'text-slate-600',
  ].join(' ');

export function BottomNav() {
  return (
    <nav
      aria-label="Main"
      data-testid="bottom-nav"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-2">
        <li>
          <NavLink to="/" end className={linkClass}>
            <PathIcon className="text-2xl" />
            Path
          </NavLink>
        </li>
        <li>
          <NavLink to="/profile" className={linkClass}>
            <UserIcon className="text-2xl" />
            Profile
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}
