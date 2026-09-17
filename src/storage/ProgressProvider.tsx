import type { ReactNode } from 'react';
import { ProgressContext } from './progressContext';
import type { ProgressStore } from './progressStore';

export function ProgressProvider({
  store,
  children,
}: {
  store: ProgressStore;
  children: ReactNode;
}) {
  return <ProgressContext value={store}>{children}</ProgressContext>;
}
