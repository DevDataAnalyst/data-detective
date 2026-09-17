import { Outlet } from 'react-router';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';

export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-white px-4 py-3 font-semibold focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <TopBar />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-28 md:pb-10">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
