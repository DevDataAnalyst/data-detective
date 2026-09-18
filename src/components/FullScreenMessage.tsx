import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { buttonStyles } from './buttonStyles';
import { LockIcon } from './icons';

interface FullScreenMessageProps {
  title: string;
  /** Shows a lock above the title. */
  locked?: boolean;
  children: ReactNode;
}

/** A page-sized note, such as a locked lesson or an unknown link, with a way back to the path. */
export function FullScreenMessage({ title, locked = false, children }: FullScreenMessageProps) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4">
      {locked && (
        <span className="flex size-16 items-center justify-center rounded-full bg-locked-200 text-3xl text-locked-600">
          <LockIcon aria-hidden="true" />
        </span>
      )}
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="text-slate-600">{children}</p>
      <Link to="/" className={buttonStyles.primary}>
        Back to path
      </Link>
    </main>
  );
}
